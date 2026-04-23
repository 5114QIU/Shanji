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
      throw new Error(`Edge Function error: ${error.message}`);
    }

    if (!data.success) {
      console.error('AI search failed:', data.error);
      throw new Error(data.error || 'AI search error');
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
    throw error;
  }
}