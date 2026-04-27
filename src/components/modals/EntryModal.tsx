/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, X, Plus, BookOpen, Image, Edit3, Database, Mic, MicOff } from 'lucide-react';
import { useToast } from '../../App';

// 简化的 SpeechRecognition 类型声明
type SpeechRecognition = any;
interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}
import { DramaEntry } from '../../types';
import {
  searchAll,
  getTVDetail,
  getMovieDetail,
  getPosterUrl,
  isTVShow,
  TMDBSearchResult,
  TMDBMovieResult
} from '../../tmdb';


interface EntryModalProps {
  onClose: () => void;
  onSave: (entry: DramaEntry) => void;
  initialData?: DramaEntry;
  isSaving?: boolean;
}

export function EntryModal({ onClose, onSave, initialData, isSaving }: EntryModalProps) {
  const { addToast } = useToast();
  // 录入模式：'tmdb' = TMDB搜索 | 'manual' = 手工录入
  const [inputMode, setInputMode] = useState<'tmdb' | 'manual'>('tmdb');
  // 手机端步骤控制：'search' | 'form'
  const [mobileStep, setMobileStep] = useState<'search' | 'form'>('search');

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    actors: initialData?.actors?.join(' / ') || '',
    platform: initialData?.platform || '',
    summary: initialData?.summary || '',
    releaseDate: initialData?.releaseDate || '',
    watchCount: initialData?.watchCount || 1,
    rating: initialData?.rating || 5,
    tags: initialData?.tags || [] as string[],
    poster: initialData?.poster || 'https://picsum.photos/seed/new/600/900',
    status: initialData?.status || 'completed' as 'completed' | 'watching' | 'planned',
    firstEncounter: initialData?.firstEncounter || initialData?.releaseDate || '',
    currentEpisode: initialData?.currentEpisode || 0,
    totalEpisodes: initialData?.totalEpisodes || 0,
    type: initialData?.type || 'tv' as 'tv' | 'movie',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(TMDBSearchResult | TMDBMovieResult)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'all' | 'tv' | 'movie'>('all');

  const [newTag, setNewTag] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  const startVoiceRecognition = () => {
    const windowWithSpeech = window as WindowWithSpeechRecognition;
    if (windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition) {
      const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.lang = 'zh-CN';
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.start();
      setRecognition(recognitionInstance);
      setIsListening(true);
    } else {
      addToast('您的浏览器不支持语音识别功能', 'error');
    }
  };

  const stopVoiceRecognition = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
      setIsListening(false);
    }
  };

  // 当播出时间变化且首次观看时间为空时，自动同步
  useEffect(() => {
    if (formData.releaseDate && !formData.firstEncounter) {
      setFormData(prev => ({ ...prev, firstEncounter: prev.releaseDate }));
    }
  }, [formData.releaseDate]);

  // 搜索 TMDB（带防抖）
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAll(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 选择搜索结果
  const handleSelect = async (item: TMDBSearchResult | TMDBMovieResult) => {
    try {
      const isTV = isTVShow(item);
      const detail = isTV ? await getTVDetail(item.id) : await getMovieDetail(item.id);

      // 获取演员信息
      const actors = detail.credits?.cast?.slice(0, 5).map(c => c.name).join(' / ') || '';

      // 获取类型标签
      const tags = detail.genres?.slice(0, 3).map(g => g.name) || [];

      // 获取播出平台
      const platform = detail.networks?.[0]?.name || '';

      // 获取总集数（电视剧）
      let totalEpisodes = 0;
      if (isTV && detail.number_of_episodes) {
        totalEpisodes = detail.number_of_episodes;
      }

      setFormData({
        ...formData,
        title: detail.name || '',
        actors: actors,
        platform: platform,
        summary: detail.overview || '',
        tags: tags,
        releaseDate: detail.first_air_date || '',
        poster: getPosterUrl(detail.poster_path, 'w500'),
        type: isTV ? 'tv' : 'movie',
        totalEpisodes: totalEpisodes,
      });

      // 手机端：选择后跳转到表单页面
      setMobileStep('form');
    } catch (error) {
      console.error('Failed to get detail:', error);
    }
  };

  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag('');
    }
  };

  const handleSave = () => {
    if (!formData.title) {
      addToast('请输入剧集名称', 'error');
      return;
    }
    const newEntry: DramaEntry = {
      id: initialData?.id || '',
      title: formData.title,
      actors: formData.actors.split(' / ').filter(a => a.trim()),
      platform: formData.platform,
      summary: formData.summary,
      reflection: '',
      reflections: initialData?.reflections || [],
      releaseDate: formData.releaseDate,
      watchCount: formData.watchCount,
      rating: formData.rating,
      tags: formData.tags,
      poster: formData.poster,
      date: initialData?.date || new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
      status: formData.status,
      firstEncounter: formData.firstEncounter || undefined,
      currentEpisode: formData.currentEpisode || undefined,
      totalEpisodes: formData.totalEpisodes || undefined,
      type: formData.type,
    };

    if (initialData?.completionDate) newEntry.completionDate = initialData.completionDate;
    if (initialData?.isMustWatch !== undefined) newEntry.isMustWatch = initialData.isMustWatch;

    onSave(newEntry);
  };

  const getRatingEmoji = (rating: number) => {
    if (rating <= 1) return '😞';
    if (rating <= 2) return '😕';
    if (rating <= 3) return '😐';
    if (rating <= 4) return '😊';
    return '😍';
  };

  const getRatingText = (rating: number) => {
    if (rating <= 1) return '不喜欢';
    if (rating <= 2) return '一般';
    if (rating <= 3) return '还行';
    if (rating <= 4) return '喜欢';
    return '超爱';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-background/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`relative w-full ${initialData
          ? 'max-w-4xl'
          : inputMode === 'manual'
            ? 'max-w-3xl'
            : 'max-w-6xl'
          } bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[750px]`}
      >
        {/* Left Page: Discovery - Only show when creating new entry and in TMDB mode */}
        {/* 电脑端：并排显示 | 手机端：根据步骤显示 */}
        {!initialData && inputMode === 'tmdb' && (
          <section
            className={`
              w-full md:w-1/3 p-6 md:p-8 border-r border-outline/15 flex flex-col gap-4 md:gap-6 bg-gray-50
              ${mobileStep === 'form' ? 'hidden md:flex' : 'flex'}
              h-full overflow-hidden
            `}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-on-surface">搜索剧集</h2>
              <span className="text-xs font-medium tracking-widest text-primary/60 uppercase">TMDB 数据</span>
            </div>
            <div className="relative flex-shrink-0 flex items-center">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              <input
                className="w-full border-none border-b border-outline bg-transparent pl-8 pr-12 py-3 focus:ring-0 focus:border-primary placeholder:italic text-lg"
                placeholder="输入剧名搜索..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              <button
                onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors"
                title={isListening ? "停止语音录入" : "语音录入"}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5 text-primary" />
                ) : (
                  <Mic className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            {/* 筛选按钮 */}
            <div className="flex gap-2 flex-shrink-0">
              {(['all', 'tv', 'movie'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSearchFilter(filter)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${searchFilter === filter
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                >
                  {filter === 'all' ? '全部' : filter === 'tv' ? '电视剧' : '电影'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar min-h-0">
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}
              {!isSearching && searchQuery && searchResults.filter(item => {
                if (searchFilter === 'all') return true;
                if (searchFilter === 'tv') return isTVShow(item);
                return !isTVShow(item);
              }).length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant">
                    未找到相关{searchFilter === 'tv' ? '电视剧' : searchFilter === 'movie' ? '电影' : '剧集'}
                  </div>
                )}
              {!isSearching && searchResults.filter(item => {
                if (searchFilter === 'all') return true;
                if (searchFilter === 'tv') return isTVShow(item);
                return !isTVShow(item);
              }).map((item) => {
                const title = isTVShow(item) ? item.name : item.title;
                const date = isTVShow(item) ? item.first_air_date : item.release_date;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="group flex gap-4 p-3 rounded-lg hover:bg-primary/5 cursor-pointer transition-all border border-transparent hover:border-primary/20"
                  >
                    <div className="w-14 h-20 rounded bg-surface-variant overflow-hidden flex-shrink-0 shadow-sm">
                      <img
                        src={getPosterUrl(item.poster_path, 'w200')}
                        alt={title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex flex-col justify-center overflow-hidden">
                      <span className="font-bold text-on-surface group-hover:text-primary transition-colors truncate">{title}</span>
                      <div className="flex gap-1 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-bold">
                          {item.vote_average?.toFixed(1) || 'N/A'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-surface-variant text-on-surface-variant rounded">
                          {date?.substring(0, 4) || '未知'}
                        </span>
                        {isTVShow(item) ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-tertiary/20 text-tertiary rounded">电视剧</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 bg-secondary/20 text-secondary rounded">电影</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Right Page: Diary Entry (Editable) */}
        {/* 电脑端：并排显示 | 手机端：根据步骤显示 */}
        <section className={`
          p-8 flex flex-col gap-6 bg-white overflow-y-auto custom-scrollbar
          ${!initialData && inputMode === 'tmdb' && mobileStep === 'search' ? 'hidden md:flex' : 'flex'}
          ${!initialData && inputMode === 'tmdb' ? 'flex-1' : 'flex-1'}
        `}>
          {/* 录入模式切换 - 仅创建新模式时显示 */}
          {!initialData && (
            <div className="flex items-center justify-between">
              <div className="flex gap-2 p-1 bg-surface-container rounded-lg">
                <button
                  onClick={() => {
                    setInputMode('tmdb');
                    setMobileStep('search');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMode === 'tmdb'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                >
                  <Database className="w-4 h-4" />
                  <span className="hidden sm:inline">TMDB 搜索</span>
                  <span className="sm:hidden">搜索</span>
                </button>
                <button
                  onClick={() => {
                    setInputMode('manual');
                    setMobileStep('form');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMode === 'manual'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">手工录入</span>
                  <span className="sm:hidden">手工</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant italic">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Info Column */}
            <div className="md:col-span-2 space-y-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary">剧集名称</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-surface-container-lowest border border-outline/10 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  placeholder="输入剧名"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary">主演阵容</label>
                  <input
                    value={formData.actors}
                    onChange={(e) => setFormData({ ...formData, actors: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline/10 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    placeholder="如：范伟 / 秦昊"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary">播出平台</label>
                  <input
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline/10 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    placeholder="如：腾讯视频"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary">播出时间</label>
                  <input
                    type="date"
                    value={formData.releaseDate}
                    onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline/10 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary">首次观看</label>
                  <input
                    type="date"
                    value={formData.firstEncounter}
                    onChange={(e) => setFormData({ ...formData, firstEncounter: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline/10 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary">观看状态</label>
                <div className="flex gap-2">
                  {(['completed', 'watching', 'planned'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFormData({ ...formData, status: s })}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${formData.status === s
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-lowest text-on-surface-variant border-outline/10 hover:border-primary/30'
                        }`}
                    >
                      {s === 'completed' ? '已看完' : s === 'watching' ? '在看' : '想看'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary">类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, type: 'tv' })}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${formData.type === 'tv'
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-lowest text-on-surface-variant border-outline/10 hover:border-primary/30'
                      }`}
                  >
                    电视剧
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, type: 'movie' })}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${formData.type === 'movie'
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-lowest text-on-surface-variant border-outline/10 hover:border-primary/30'
                      }`}
                  >
                    电影
                  </button>
                </div>
              </div>

              {/* 分集进度 - 仅在看状态显示 */}
              {formData.status === 'watching' && (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary">观看进度</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="number"
                          min="0"
                          max={formData.totalEpisodes || 999}
                          value={formData.currentEpisode}
                          onChange={(e) => setFormData({
                            ...formData,
                            currentEpisode: Math.max(0, parseInt(e.target.value) || 0)
                          })}
                          className="w-16 bg-surface-container-lowest border border-outline/10 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary outline-none"
                        />
                        <span className="text-on-surface-variant">/</span>
                        <input
                          type="number"
                          min="1"
                          value={formData.totalEpisodes || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            totalEpisodes: Math.max(1, parseInt(e.target.value) || 0)
                          })}
                          placeholder="总集数"
                          className="w-16 bg-surface-container-lowest border border-outline/10 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-primary outline-none"
                        />
                        <span className="text-on-surface-variant text-sm">集</span>
                      </div>
                      {/* 进度条 */}
                      {formData.totalEpisodes > 0 && (
                        <div className="relative h-2 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="absolute h-full bg-primary rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, (formData.currentEpisode / formData.totalEpisodes) * 100)}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {/* +1集 按钮 */}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        currentEpisode: Math.min(
                          (formData.totalEpisodes || 999),
                          formData.currentEpisode + 1
                        )
                      })}
                      className="flex-shrink-0 px-3 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
                      title="看完一集"
                    >
                      +1集
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary">刷过次数</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={formData.watchCount}
                    onChange={(e) => setFormData({ ...formData, watchCount: parseInt(e.target.value) || 1 })}
                    className="flex-1 bg-surface-container-lowest border border-outline/10 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, watchCount: formData.watchCount + 1 })}
                    className="px-4 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center"
                    title="增加一次"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Poster Column - 支持本地上传 */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary">剧集海报</label>
                <input
                  type="file"
                  accept="image/*"
                  id="poster-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({ ...formData, poster: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <div
                  className="relative group w-full aspect-[3/4] bg-surface-container-lowest border border-outline/10 rounded-lg overflow-hidden cursor-pointer shadow-md"
                  onClick={() => document.getElementById('poster-upload')?.click()}
                >
                  <img src={formData.poster} alt="Poster Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                    <Image className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">点击上传海报</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary">剧情简介</label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="w-full h-[80px] bg-surface-container-lowest border border-outline/10 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none resize-none leading-relaxed"
              placeholder="简要概括剧情..."
            />
          </div>

          <div className="h-px bg-outline/10 my-2"></div>

          <div className="space-y-6">
            {/* 爱心按钮评分 */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary">喜爱程度</label>
              <div className="text-center">
                <div className="flex justify-center flex-wrap gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setFormData({ ...formData, rating: level });
                      }}
                      className={`text-lg transition-all duration-200 cursor-pointer ${formData.rating >= level ? 'text-red-500 scale-110' : 'text-gray-300'}`}
                      title={`${level} 颗心`}
                    >
                      {formData.rating >= level ? '❤️' : '🤍'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary">情感标签</label>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(t => (
                  <span key={t} className="px-3 py-1 rounded-full text-xs bg-primary text-on-primary flex items-center gap-1.5">
                    {t}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== t) })} />
                  </span>
                ))}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="新标签"
                    className="w-24 bg-surface-container-lowest border border-outline/10 rounded-full px-3 py-1 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                  <button
                    onClick={handleAddTag}
                    className="p-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-outline/10 flex justify-end gap-4">
            {/* 手机端：在TMDB模式的表单页面显示返回搜索按钮 */}
            {!initialData && inputMode === 'tmdb' && (
              <button
                onClick={() => setMobileStep('search')}
                className="md:hidden px-6 py-2.5 text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-colors rounded-lg"
              >
                返回搜索
              </button>
            )}
            <button onClick={onClose} className="px-6 py-2.5 text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-colors rounded-lg">
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-3 px-10 py-3 bg-primary text-on-primary rounded-lg font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
              <span>{isSaving ? '保存中...' : '保存到日记本'}</span>
            </button>
          </div>
        </section>

        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-primary transition-colors z-10">
          <X className="w-6 h-6" />
        </button>
      </motion.div>


    </div>
  );
}
