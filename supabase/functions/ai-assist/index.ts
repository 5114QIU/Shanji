/**
 * AI 助手 Edge Function
 * 代理调用智谱 AI API
 */

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

interface AIRequest {
  action: 'polish' | 'extract-tags' | 'recommend-quote';
  content: string;
  title?: string;
  context?: {
    actors?: string[];
    summary?: string;
  };
}

Deno.serve(async (req: Request) => {
  // CORS 处理
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { action, content, title, context }: AIRequest = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY');
    if (!ZHIPU_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 根据动作构建不同的 prompt
    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'polish':
        systemPrompt = `你是一位文学功底深厚的文字编辑，擅长将口语化的表达润色成优美、有文学性的文字。
你的润色风格：
- 保持用户原本的情感和意思
- 增加文学性和画面感
- 适当使用比喻和意象
- 文字要自然流畅，不要过于华丽
- 控制在200字以内

直接输出润色后的文字，不要加任何解释或前缀。`;
        userPrompt = `请润色以下关于《${title || '某部剧'}》的感悟，保持原意但让表达更优美：

"${content}"`;
        break;

      case 'extract-tags':
        systemPrompt = `你是一个情感分析专家，擅长从文字中提取情感标签。

可用的情感标签包括：
治愈、温暖、感动、意难平、怀旧、燃、虐心、搞笑、甜蜜、紧张、压抑、震撼、励志、浪漫、治愈系、成长、友情、亲情、爱情、悬疑、惊悚、科幻、奇幻、现实、深刻、轻松、欢乐、悲伤、愤怒、恐惧、惊喜、期待

任务：
1. 分析用户文字中的情感基调
2. 选择2-4个最匹配的标签
3. 以JSON数组格式返回，如：["治愈", "温暖"]

只返回JSON数组，不要其他内容。`;
        userPrompt = `请从以下感悟中提取情感标签：

"${content}"`;
        break;

      case 'recommend-quote':
        systemPrompt = `你是一位影视剧台词专家，熟悉各种经典影视剧的经典台词。
根据用户描述的剧情或感受，推荐1-2句契合氛围的经典台词。

格式要求：
- 返回 JSON 数组
- 每个元素包含 quote（台词）和 source（出处）
- 如：[{"quote": "人生就是一列开往坟墓的列车...", "source": "千与千寻"}]

只返回JSON数组，不要其他内容。`;
        userPrompt = `请为《${title || '某部剧'}》推荐契合以下感悟氛围的经典台词：

"${content}"

${context?.summary ? `剧情简介：${context.summary}` : ''}`;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    // 调用智谱 AI
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zhipu API error:', errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';

    // 解析结果
    let result;
    if (action === 'polish') {
      result = { text: aiContent.trim() };
    } else {
      // 尝试解析 JSON 数组
      try {
        const jsonMatch = aiContent.match(/\[.*\]/s);
        if (jsonMatch) {
          result = { items: JSON.parse(jsonMatch[0]) };
        } else {
          result = { items: [], raw: aiContent };
        }
      } catch {
        result = { items: [], raw: aiContent };
      }
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
