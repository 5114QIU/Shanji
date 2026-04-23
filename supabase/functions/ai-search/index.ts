/**
 * AI 语义搜索 Edge Function
 * 使用智谱 AI 理解自然语言查询，返回匹配的剧集
 */

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

interface SearchEntry {
  id: string;
  title: string;
  actors: string[];
  tags: string[];
  summary: string;
  rating: number;
  status: string;
  type: string;
  platform: string;
  releaseDate: string;
  reflection: string;
}

interface AISearchRequest {
  query: string;
  entries: SearchEntry[];
}

Deno.serve(async (req: Request) => {
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { query, entries }: AISearchRequest = await req.json();

    if (!query || !entries) {
      return new Response(JSON.stringify({ error: 'Query and entries are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY') || '0319cb1c4e5a4559a2daf203f174ce0b.xpVnhycdsE1Ivysl';
    if (!ZHIPU_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 构建剧集信息上下文
    const entriesContext = entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      actors: entry.actors.join(' / '),
      tags: entry.tags.join('、'),
      summary: entry.summary,
      rating: entry.rating,
      status: entry.status,
      type: entry.type === 'tv' ? '电视剧' : '电影',
      platform: entry.platform,
      releaseYear: entry.releaseDate ? entry.releaseDate.substring(0, 4) : '未知',
      reflection: entry.reflection || ''
    }));

    const systemPrompt = `你是一个智能剧集推荐助手，擅长根据用户的描述找到匹配的剧集。

用户会用一个自然语言描述来搜索，比如：
- "找我之前看过的高分悬疑剧"
- "最近看的治愈系电影"
- "范伟演的剧"
- "2023年的高分剧"
- "恐怖悬疑类的"

你的任务是：
1. 理解用户的搜索意图（关键词、类型偏好、演员、评分、年份等）
2. 从提供的剧集列表中找到匹配的条目
3. 返回匹配条目的 ID 列表

匹配规则：
- 支持标题、演员、标签、简介、感悟等字段的语义匹配
- 支持类型筛选（如：电影 vs 电视剧）
- 支持评分筛选（如：高分指 rating >= 4）
- 支持状态筛选（如："看过"指 status='completed'）
- 支持年份筛选
- 支持复合条件（如：高分 + 悬疑 + 治愈）

返回格式：
- 返回 JSON 数组，包含匹配的条目 ID
- 按匹配度从高到低排序
- 如果没有匹配的，返回空数组 []

只返回 JSON 数组，不要其他内容。`;

    const userPrompt = `用户搜索："${query}"

剧集列表：
${JSON.stringify(entriesContext, null, 2)}

请找出匹配的剧集ID，只返回JSON数组。`;

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
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    console.log('Zhipu API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zhipu API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'AI service error',
        details: errorText,
        status: response.status
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await response.json();
    console.log('Zhipu API response data:', data);
    
    const aiContent = data.choices?.[0]?.message?.content || '';
    console.log('AI content:', aiContent);

    // 解析返回的 ID 数组
    let matchedIds: string[] = [];
    try {
      // 尝试直接解析整个响应
      if (Array.isArray(aiContent)) {
        matchedIds = aiContent;
      } else if (typeof aiContent === 'string') {
        // 尝试匹配 JSON 数组
        const jsonMatch = aiContent.match(/\[.*\]/s);
        if (jsonMatch) {
          matchedIds = JSON.parse(jsonMatch[0]);
        } else {
          // 尝试匹配单独的 ID
          const idMatches = aiContent.match(/\b[0-9a-f-]+\b/g);
          if (idMatches) {
            matchedIds = idMatches;
          }
        }
      }
      console.log('Parsed matched IDs:', matchedIds);
    } catch (error) {
      console.error('Failed to parse AI response:', error, 'Content:', aiContent);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        ids: matchedIds,
        query: query
      }
    }), {
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});