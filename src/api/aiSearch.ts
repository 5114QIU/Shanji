/**
 * AI 搜索服务
 * 调用 Supabase Edge Function 使用 AI 进行语义搜索
 */

import { supabase } from '../supabase';
import { DramaEntry } from '../types';

interface SearchResult {
  ids: string[];
  query: string;
}

export async function aiSemanticSearch(
  query: string,
  entries: DramaEntry[]
): Promise<DramaEntry[]> {
  console.log('AI search started:', {
    query,
    entriesCount: entries.length,
  });
  
  try {
    const { data, error } = await supabase.functions.invoke('ai-search', {
      body: { query, entries },
    });

    console.log('AI search response:', { data, error });

    if (error) {
      console.error('Edge Function error:', error);
      // 当Edge Function调用失败时，回退到简单的关键词搜索
      console.log('Falling back to keyword search...');
      return fallbackKeywordSearch(query, entries);
    }

    if (!data.success) {
      console.error('AI search failed:', data.error);
      // 当AI搜索失败时，回退到简单的关键词搜索
      console.log('Falling back to keyword search...');
      return fallbackKeywordSearch(query, entries);
    }

    const matchedIds: string[] = data.data.ids;
    console.log('AI search matched IDs:', matchedIds);
    
    // 根据返回的 ID 列表过滤并保持原有顺序
    const idSet = new Set(matchedIds);
    const matchedEntries = entries.filter(entry => idSet.has(entry.id));
    console.log('Matched entries count:', matchedEntries.length);
    
    // 按照 AI 返回的顺序排序
    const result = matchedIds
      .map(id => matchedEntries.find(entry => entry.id === id))
      .filter((entry): entry is DramaEntry => entry !== undefined);
    
    console.log('AI search final result count:', result.length);
    return result;
  } catch (error) {
    console.error('AI search error:', error);
    // 当发生异常时，回退到简单的关键词搜索
    console.log('Falling back to keyword search...');
    return fallbackKeywordSearch(query, entries);
  }
}

/**
 * 回退的关键词搜索
 * 当AI搜索失败时使用
 */
function fallbackKeywordSearch(query: string, entries: DramaEntry[]): DramaEntry[] {
  const lowerQuery = query.toLowerCase();
  
  return entries.filter(entry => {
    // 搜索标题
    if (entry.title.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // 搜索演员
    if (entry.actors.some(actor => actor.toLowerCase().includes(lowerQuery))) {
      return true;
    }
    
    // 搜索标签
    if (entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
      return true;
    }
    
    // 搜索简介
    if (entry.summary.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // 搜索感悟
    if (entry.reflection && entry.reflection.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    return false;
  });
}