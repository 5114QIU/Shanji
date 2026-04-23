/**
 * AI 助手服务
 * 调用 Supabase Edge Function 代理智谱 AI
 */

import { supabase } from '../supabase';

interface PolishResult {
  text: string;
}

interface TagResult {
  items: string[];
}

interface QuoteResult {
  items: Array<{
    quote: string;
    source: string;
  }>;
}

async function callAI<T>(
  action: 'polish' | 'extract-tags' | 'recommend-quote',
  content: string,
  title?: string,
  context?: { actors?: string[]; summary?: string }
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-assist', {
    body: { action, content, title, context },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.success) {
    throw new Error(data.error || 'AI service error');
  }

  return data.data;
}

// 润色文本
export async function polishText(
  content: string,
  title?: string
): Promise<string> {
  const result = await callAI<PolishResult>('polish', content, title);
  return result.text;
}

// 提取情感标签
export async function extractTags(
  content: string
): Promise<string[]> {
  const result = await callAI<TagResult>('extract-tags', content);
  return result.items || [];
}

// 推荐台词
export async function recommendQuotes(
  content: string,
  title?: string,
  context?: { actors?: string[]; summary?: string }
): Promise<Array<{ quote: string; source: string }>> {
  const result = await callAI<QuoteResult>('recommend-quote', content, title, context);
  return result.items || [];
}
