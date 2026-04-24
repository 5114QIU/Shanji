import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

/**
 * AI 对话页面
 * 允许用户与 AI 对话，搜索已添加的影集
 */
export default function AIChatPage() {
  const [messages, setMessages] = useState<{
    role: 'user' | 'assistant';
    content: string;
  }[]>([
    {
      role: 'assistant',
      content: '你好！我是你的智能影集助手。你可以问我关于你添加的影集的问题，比如：\n- 找我之前看过的高分悬疑剧\n- 范伟演的剧\n- 2023年的高分电影\n- 治愈系的剧集推荐',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);

  // 加载所有影集数据
  useEffect(() => {
    const loadEntries = async () => {
      try {
        // 这里应该从实际的数据源获取影集数据
        // 暂时使用模拟数据
        const mockEntries = [
          {
            id: '1',
            title: '狂飙',
            actors: ['张译', '张颂文'],
            tags: ['犯罪', '悬疑'],
            summary: '讲述了一群警察与黑恶势力斗智斗勇的故事',
            rating: 9.1,
            status: 'completed',
            type: 'tv',
            releaseDate: '2023-01-14',
          },
          {
            id: '2',
            title: '流浪地球2',
            actors: ['吴京', '刘德华'],
            tags: ['科幻', '灾难'],
            summary: '太阳即将膨胀为红巨星，人类启动流浪地球计划',
            rating: 8.3,
            status: 'completed',
            type: 'movie',
            releaseDate: '2023-01-22',
          },
          {
            id: '3',
            title: '漫长的季节',
            actors: ['范伟', '秦昊'],
            tags: ['悬疑', '犯罪'],
            summary: '讲述了一个跨越20年的悬疑故事',
            rating: 9.4,
            status: 'completed',
            type: 'tv',
            releaseDate: '2023-04-22',
          },
        ];
        setEntries(mockEntries);
      } catch (error) {
        console.error('加载影集数据失败:', error);
      }
    };

    loadEntries();
  }, []);

  // 处理用户输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // 处理发送消息
  const handleSend = async () => {
    if (!input.trim()) return;

    // 添加用户消息
    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // 这里应该调用实际的AI服务
      // 暂时使用模拟响应
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟AI响应
      const aiResponse = generateAIResponse(input, entries);
      setMessages([...newMessages, { role: 'assistant' as const, content: aiResponse }]);
    } catch (error) {
      console.error('AI 响应失败:', error);
      setMessages([...newMessages, { role: 'assistant' as const, content: '抱歉，我暂时无法回答你的问题。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 生成AI响应（模拟）
  const generateAIResponse = (query: string, entries: any[]) => {
    const lowerQuery = query.toLowerCase();
    
    // 检查是否包含演员名字
    if (lowerQuery.includes('范伟')) {
      const fanWeiEntries = entries.filter(entry => 
        entry.actors.some((actor: string) => actor.includes('范伟'))
      );
      if (fanWeiEntries.length > 0) {
        return `范伟演的剧有：\n${fanWeiEntries.map(entry => `- ${entry.title} (${entry.releaseDate.substring(0, 4)})`).join('\n')}`;
      }
    }

    // 检查是否包含类型
    if (lowerQuery.includes('悬疑')) {
      const suspenseEntries = entries.filter(entry => 
        entry.tags.some((tag: string) => tag.includes('悬疑'))
      );
      if (suspenseEntries.length > 0) {
        return `悬疑类影集：\n${suspenseEntries.map(entry => `- ${entry.title} (评分: ${entry.rating})`).join('\n')}`;
      }
    }

    // 检查是否包含年份
    if (lowerQuery.includes('2023')) {
      const year2023Entries = entries.filter(entry => 
        entry.releaseDate && entry.releaseDate.startsWith('2023')
      );
      if (year2023Entries.length > 0) {
        return `2023年的影集：\n${year2023Entries.map(entry => `- ${entry.title} (${entry.type === 'tv' ? '电视剧' : '电影'})`).join('\n')}`;
      }
    }

    // 检查是否包含评分
    if (lowerQuery.includes('高分')) {
      const highRatingEntries = entries.filter(entry => entry.rating >= 9);
      if (highRatingEntries.length > 0) {
        return `高分影集：\n${highRatingEntries.map(entry => `- ${entry.title} (评分: ${entry.rating})`).join('\n')}`;
      }
    }

    return '抱歉，我没有找到与你的问题相关的影集。你可以尝试其他问题，比如：\n- 找我之前看过的高分悬疑剧\n- 范伟演的剧\n- 2023年的高分电影';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-surface-container-low p-4">
      <div className="max-w-2xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">AI 影集助手</h1>
          </div>
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-full hover:bg-surface-variant transition-colors"
            title="返回"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* 对话区域 */}
        <div className="bg-surface-container rounded-xl shadow-lg p-4 mb-4 max-h-[70vh] overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block max-w-[80%] p-3 rounded-2xl ${message.role === 'user' ? 'bg-primary text-white' : 'bg-surface-variant'}`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center justify-start mb-4">
              <div className="bg-surface-variant p-3 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入你的问题..."
            className="flex-1 px-4 py-2 border border-outline rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* 提示信息 */}
        <div className="mt-4 text-center text-sm text-on-surface-variant/60">
          提示：你可以问我关于你添加的影集的问题，如"范伟演的剧"、"高分悬疑剧"等
        </div>
      </div>
    </div>
  );
}