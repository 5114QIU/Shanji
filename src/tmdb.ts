/**
 * TMDB API 模块
 * 
 * 注意：此模块现在通过 Supabase Edge Function 代理访问 TMDB API
 * 以解决国内网络无法直接访问 TMDB 的问题
 * 
 * 所有函数都从 src/api/tmdbProxy.ts 重新导出
 */

export {
  // 类型定义
  type TMDBSearchResult,
  type TMDBMovieResult,
  type TMDBCredit,
  type TMDBDetail,
  type TMDBImage,

  // 搜索函数
  searchTVShows,
  searchMovies,
  searchAll,

  // 详情函数
  getTVDetail,
  getMovieDetail,

  // 剧照函数
  getTVImages,
  getMovieImages,
  getStillsByTitle,

  // 工具函数
  isTVShow,
} from './api/tmdbProxy';

// 保留原有的工具函数
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// 类型映射（TMDB ID -> 中文名）
const GENRE_MAP: Record<number, string> = {
  10759: '动作冒险',
  16: '动画',
  35: '喜剧',
  80: '犯罪',
  99: '纪录片',
  18: '剧情',
  10751: '家庭',
  10762: '儿童',
  9648: '悬疑',
  10763: '新闻',
  10764: '真人秀',
  10765: '奇幻科幻',
  10766: '肥皂剧',
  10767: '脱口秀',
  10768: '战争政治',
  37: '西部',
  28: '动作',
  12: '冒险',
  14: '奇幻',
  36: '历史',
  27: '恐怖',
  10402: '音乐',
  10749: '爱情',
  878: '科幻',
  10770: '电视电影',
  53: '惊悚',
  10752: '战争',
};

export function getGenreName(genreId: number): string {
  return GENRE_MAP[genreId] || '其他';
}

export function getPosterUrl(path: string | null, size: 'w200' | 'w300' | 'w500' | 'original' = 'w500'): string {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
