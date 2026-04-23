/**
 * TMDB 代理 API - 通过 Supabase Edge Function 访问 TMDB
 * 解决国内无法直接访问 TMDB 的问题
 */

import { supabase } from '../supabase';

export interface TMDBSearchResult {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  origin_country: string[];
  original_language: string;
}

export interface TMDBMovieResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
}

export interface TMDBCredit {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TMDBDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  networks: { id: number; name: string; logo_path: string }[];
  credits?: {
    cast: TMDBCredit[];
  };
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  original_language: string;
  origin_country: string[];
}

/**
 * 通过 Supabase Edge Function 代理请求 TMDB
 */
async function proxyToTMDB(path: string, params: Record<string, any> = {}): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('tmdb-proxy', {
      body: { path, params },
    });
    
    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(error.message || 'Proxy request failed');
    }
    
    if (data?.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error) {
    console.error('TMDB Proxy error:', error);
    throw error;
  }
}

/**
 * 搜索电视剧
 */
export async function searchTVShows(query: string, page: number = 1): Promise<TMDBSearchResult[]> {
  if (!query.trim()) return [];
  
  try {
    const data = await proxyToTMDB('/search/tv', { 
      query: query.trim(), 
      page 
    });
    return data.results || [];
  } catch (error) {
    console.error('Search TV shows error:', error);
    return [];
  }
}

/**
 * 搜索电影
 */
export async function searchMovies(query: string, page: number = 1): Promise<TMDBMovieResult[]> {
  if (!query.trim()) return [];
  
  try {
    const data = await proxyToTMDB('/search/movie', { 
      query: query.trim(), 
      page 
    });
    return data.results || [];
  } catch (error) {
    console.error('Search movies error:', error);
    return [];
  }
}

/**
 * 综合搜索（电视剧 + 电影）
 */
export async function searchAll(query: string): Promise<(TMDBSearchResult | TMDBMovieResult)[]> {
  if (!query.trim()) return [];
  
  try {
    // 添加超时控制
    const timeoutPromise = new Promise<[]>((_, reject) => {
      setTimeout(() => reject(new Error('Search timeout')), 15000);
    });
    
    const searchPromise = Promise.all([
      searchTVShows(query),
      searchMovies(query),
    ]);
    
    const [tvResults, movieResults] = await Promise.race([
      searchPromise,
      timeoutPromise.catch(() => [[], []] as [TMDBSearchResult[], TMDBMovieResult[]]),
    ]);

    // 合并结果，按热度排序
    return [...tvResults, ...movieResults]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 20);
  } catch (error) {
    console.error('SearchAll error:', error);
    return [];
  }
}

/**
 * 获取电视剧详情
 */
export async function getTVDetail(id: number): Promise<TMDBDetail | null> {
  try {
    const data = await proxyToTMDB(`/tv/${id}`, { 
      append_to_response: 'credits' 
    });
    return data;
  } catch (error) {
    console.error('Get TV detail error:', error);
    return null;
  }
}

/**
 * 获取电影详情
 */
export async function getMovieDetail(id: number): Promise<TMDBDetail | null> {
  try {
    const data = await proxyToTMDB(`/movie/${id}`, { 
      append_to_response: 'credits' 
    });
    // 统一字段名
    return {
      ...data,
      name: data.title,
      first_air_date: data.release_date,
    } as TMDBDetail;
  } catch (error) {
    console.error('Get movie detail error:', error);
    return null;
  }
}

/**
 * 判断是电视剧还是电影
 */
export function isTVShow(result: TMDBSearchResult | TMDBMovieResult): result is TMDBSearchResult {
  return 'name' in result;
}

/**
 * 剧照/海报图片接口返回
 */
export interface TMDBImage {
  file_path: string;
  aspect_ratio: number;
  height: number;
  width: number;
  vote_average: number;
  vote_count: number;
}

/**
 * 获取电视剧剧照
 */
export async function getTVImages(id: number): Promise<TMDBImage[]> {
  try {
    const data = await proxyToTMDB(`/tv/${id}/images`, {
      include_image_language: 'zh,null'
    });
    return data.stills || [];
  } catch (error) {
    console.error('Get TV images error:', error);
    return [];
  }
}

/**
 * 获取电影剧照
 */
export async function getMovieImages(id: number): Promise<TMDBImage[]> {
  try {
    const data = await proxyToTMDB(`/movie/${id}/images`, {
      include_image_language: 'zh,null'
    });
    return data.backdrops || [];
  } catch (error) {
    console.error('Get movie images error:', error);
    return [];
  }
}

/**
 * 根据剧名搜索并获取剧照
 */
export async function getStillsByTitle(title: string): Promise<string[]> {
  try {
    const results = await searchAll(title);
    if (results.length === 0) return [];

    const firstResult = results[0];
    const isTV = isTVShow(firstResult);

    const images = isTV
      ? await getTVImages(firstResult.id)
      : await getMovieImages(firstResult.id);

    // 返回图片 URL 列表
    const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
    return images
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 6)
      .map(img => `${TMDB_IMAGE_BASE}/w780${img.file_path}`);
  } catch (error) {
    console.error('Get stills by title error:', error);
    return [];
  }
}
