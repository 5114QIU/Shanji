/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Edit3, Trash2, Heart, Plus, Play, Pause, Image, Loader2, Upload, Share2 } from 'lucide-react';
import { DramaEntry, Reflection } from '../../types';
import { supabase } from '../../supabase';
import { MoodCard } from '../card/MoodCard';

interface JournalModalProps {
  entry: DramaEntry;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveReflections?: (entryId: string, reflections: Reflection[]) => Promise<void>;
}

export function JournalModal({ entry, onClose, onEdit, onDelete, onSaveReflections }: JournalModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'reflections'>('info');
  const [newReflection, setNewReflection] = useState('');
  const [reflections, setReflections] = useState<Reflection[]>(entry.reflections || []);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showMoodCard, setShowMoodCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isTooLarge = file.size > 10 * 1024 * 1024;
      if (isTooLarge) {
        setErrorMessage('图片大小不能超过10MB');
        return false;
      }
      return isImage;
    });

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles]);
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const fileName = `reflections/${entry.id}/${Date.now()}-${i}.${file.name.split('.').pop()}`;

        console.log('开始上传图片:', { fileName, fileType: file.type, fileSize: file.size });

        const { data, error } = await supabase.storage
          .from('audio')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('上传图片失败:', error);
          throw new Error('上传图片失败');
        }

        console.log('上传成功:', data);

        const { data: urlData } = await supabase.storage
          .from('audio')
          .getPublicUrl(fileName);

        if (urlData.publicUrl) {
          console.log('获取图片URL成功:', urlData.publicUrl);
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      console.log('所有图片上传完成:', uploadedUrls);
      return uploadedUrls;
    } catch (error) {
      console.error('上传图片失败:', error);
      setErrorMessage('上传图片失败，请重试');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const addReflection = async () => {
    if (!newReflection.trim() && selectedImages.length === 0) {
      setErrorMessage('请输入感悟内容或上传图片');
      return;
    }

    setErrorMessage(null);

    try {
      let imageUrls: string[] = [];

      if (selectedImages.length > 0) {
        imageUrls = await uploadImages();
        console.log('上传图片成功，返回URLs:', imageUrls);
      }

      const newRef: Reflection = {
        id: `${entry.id}-${Date.now()}`,
        content: newReflection.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
        timestamp: new Date().toISOString(),
      };

      console.log('创建新感悟对象:', newRef);

      const updatedReflections = [...reflections, newRef];
      console.log('更新后的感悟列表长度:', updatedReflections.length);
      console.log('更新后的感悟列表:', JSON.stringify(updatedReflections));
      setReflections(updatedReflections);
      setNewReflection('');
      setSelectedImages([]);
      setPreviewUrls([]);

      if (onSaveReflections) {
        console.log('调用onSaveReflections函数');
        await onSaveReflections(entry.id, updatedReflections);
        console.log('感悟已保存到数据库');
      } else {
        console.log('onSaveReflections未定义，跳过数据库保存');
      }

      console.log('感悟保存成功！');
    } catch (error) {
      console.error('保存感悟失败:', error);
      if (!errorMessage) {
        setErrorMessage('保存到数据库失败，但本地记录已保存');
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const playAudio = (audioUrl: string, reflectionId: string) => {
    if (isPlaying === reflectionId) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }
      setIsPlaying(null);
    } else {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      setIsPlaying(reflectionId);

      audio.play().catch(error => {
        console.error('播放失败:', error);
        setErrorMessage('音频播放失败');
        setIsPlaying(null);
      });

      audio.onended = () => {
        setIsPlaying(null);
      };
    }
  };

  const deleteReflection = async (reflectionId: string) => {
    if (window.confirm('确定要删除这条感悟记录吗？')) {
      try {
        const updatedReflections = reflections.filter(ref => ref.id !== reflectionId);
        setReflections(updatedReflections);

        if (onSaveReflections) {
          await onSaveReflections(entry.id, updatedReflections);
          console.log('感悟删除成功并保存到数据库');
        }
      } catch (error) {
        console.error('删除感悟失败:', error);
        setErrorMessage('删除感悟失败，请重试');
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center bg-on-background/40 backdrop-blur-md p-0 md:p-4 overflow-y-auto" onClick={onClose}>
        <motion.div
          layoutId={`poster-${entry.id}`}
          className="relative w-full md:max-w-6xl md:aspect-[16/10] min-h-screen md:min-h-0 bg-surface-container-low rounded-none md:rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden paper-texture"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 手机端顶部操作按钮 */}
          <div className="md:hidden absolute top-4 left-4 right-4 flex justify-between z-10">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 shadow-sm"
              title="返回"
            >
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMoodCard(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 shadow-sm"
                title="生成海报"
              >
                <Share2 className="w-5 h-5 text-primary" />
              </button>
              <button
                onClick={onEdit}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 shadow-sm"
                title="编辑"
              >
                <Edit3 className="w-5 h-5 text-on-surface-variant" />
              </button>
              <button
                onClick={onDelete}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 shadow-sm"
                title="删除"
              >
                <Trash2 className="w-5 h-5 text-error" />
              </button>
            </div>
          </div>

          {/* Poster Section */}
          <section className="w-full md:flex-1 p-4 md:p-12 flex flex-col items-center justify-center relative md:border-r border-outline/20">
            <div className="relative w-full max-w-[200px] md:max-w-sm aspect-[3/4] bg-surface-container-high rounded-sm shadow-xl p-2 md:p-3 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
              <img src={entry.poster} alt={entry.title} className="w-full h-full object-cover rounded-sm grayscale-[10%]" referrerPolicy="no-referrer" />
            </div>
          </section>

          {/* Journal Spine */}
          <div className="hidden md:flex w-10 journal-spine flex-col justify-between py-12">
            {[...Array(3)].map((_, i) => <div key={i} className="w-full h-px bg-on-surface/5"></div>)}
          </div>

          {/* Content Section */}
          <section className="flex-1 p-4 md:p-16 flex flex-col relative overflow-y-auto">
            {/* 电脑端操作按钮 */}
            <div className="hidden md:flex absolute top-6 right-8 gap-3">
              <button
                onClick={() => setShowMoodCard(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
                title="生成海报"
              >
                <Share2 className="w-5 h-5 text-primary" />
              </button>
              <button
                onClick={onEdit}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                title="编辑"
              >
                <Edit3 className="w-5 h-5 text-on-surface-variant" />
              </button>
              <button
                onClick={onDelete}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-error/10 transition-colors"
                title="删除"
              >
                <Trash2 className="w-5 h-5 text-error" />
              </button>
            </div>

            {/* 标签页导航 */}
            <div className="flex gap-4 mb-6 border-b border-outline/20">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'info' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                基本信息
              </button>
              <button
                onClick={() => setActiveTab('reflections')}
                className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'reflections' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                感悟记录
              </button>
            </div>

            {activeTab === 'info' ? (
              <>
                <header className="mb-6 md:mb-10">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">{entry.status === 'completed' ? '已看完' : '在看'}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2 md:mb-4">
                    <h1 className="font-serif text-3xl md:text-5xl text-on-background leading-tight">
                      {entry.title}
                    </h1>
                    {entry.watchCount > 1 && (
                      <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full font-bold">×{entry.watchCount}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 md:mt-4">
                    {entry.tags.map(tag => (
                      <span key={tag} className="bg-white border border-outline/20 px-2 md:px-3 py-1 text-xs rounded-sm shadow-sm">{tag}</span>
                    ))}
                    <span className="bg-primary/5 border border-primary/20 px-2 md:px-3 py-1 text-xs rounded-sm shadow-sm text-primary font-bold">{entry.platform}</span>
                  </div>
                  <div className="mt-3 md:mt-4 text-xs md:text-sm text-on-surface-variant space-y-1">
                    <div><span className="font-bold opacity-60">主演：</span>{entry.actors.join(' / ')}</div>
                    <div><span className="font-bold opacity-60">播出：</span>{entry.releaseDate}</div>
                    <div><span className="font-bold opacity-60">首次观看：</span>{entry.firstEncounter || '未记录'}</div>
                    {entry.status === 'watching' && entry.totalEpisodes && entry.totalEpisodes > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold opacity-60">观看进度：</span>
                          <span className="text-primary font-bold">{entry.currentEpisode || 0} / {entry.totalEpisodes} 集</span>
                        </div>
                        <div className="mt-1.5 h-2 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, ((entry.currentEpisode || 0) / entry.totalEpisodes) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </header>

                <article className="flex-grow space-y-6 md:space-y-8">
                  <section className="space-y-2 md:space-y-3">
                    <h3 className="text-xs font-bold text-primary tracking-[0.2em] uppercase">剧情简介</h3>
                    <p className="text-on-surface-variant leading-relaxed text-xs md:text-sm opacity-80">
                      {entry.summary}
                    </p>
                  </section>
                </article>

                <footer className="mt-6 md:mt-12 pt-4 md:pt-8 border-t border-outline/20 flex items-center">
                  {entry.isMustWatch && (
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-primary flex items-center justify-center">
                        <Heart className="w-3 h-3 md:w-4 md:h-4 text-primary fill-current" />
                      </div>
                      <span className="text-xs md:text-sm text-on-surface-variant">必看推荐</span>
                    </div>
                  )}
                </footer>
              </>
            ) : (
              <div className="flex flex-col h-full">
                {/* 文字感悟录入 */}
                <div className="mb-6 p-4 bg-surface-container rounded-lg border border-outline/20">
                  <h3 className="text-xs font-bold text-primary tracking-[0.2em] uppercase mb-3">写感悟</h3>
                  <div className="flex flex-col gap-3">
                    {errorMessage && (
                      <div className="p-3 bg-error/10 text-error text-sm rounded-lg flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{errorMessage}</span>
                      </div>
                    )}
                    <textarea
                      value={newReflection}
                      onChange={(e) => setNewReflection(e.target.value)}
                      placeholder="写下你的感悟..."
                      className="w-full p-3 border border-outline/20 rounded-lg text-sm resize-none min-h-[100px]"
                      disabled={isUploading}
                    />

                    {/* 图片预览 */}
                    {previewUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {previewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`预览 ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => removeSelectedImage(index)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {isUploading && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>正在上传图片...</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-full transition-colors"
                          disabled={isUploading}
                        >
                          <Image className="w-4 h-4" />
                          <span>添加图片</span>
                        </button>
                      </div>
                      <button
                        onClick={addReflection}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                        disabled={isUploading}
                      >
                        <Plus className="w-4 h-4" />
                        <span>添加感悟</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 感悟时间线 */}
                <div className="flex-grow overflow-y-auto">
                  <h3 className="text-xs font-bold text-primary tracking-[0.2em] uppercase mb-4">感悟记录</h3>
                  {reflections.length === 0 ? (
                    <div className="text-center py-12 text-on-surface-variant text-sm">
                      暂无感悟记录，开始添加你的第一条感悟吧！
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {reflections.map((reflection) => (
                        <div key={reflection.id} className="relative pl-6 border-l-2 border-primary/20">
                          <div className="absolute left-[-9px] top-1 w-4 h-4 bg-primary rounded-full"></div>
                          <div className="bg-surface-container p-4 rounded-lg shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-on-surface-variant">{formatTime(reflection.timestamp)}</span>
                              <button
                                onClick={() => deleteReflection(reflection.id)}
                                className="text-xs text-error hover:text-error/80 transition-colors flex items-center gap-1"
                                title="删除感悟"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>删除</span>
                              </button>
                            </div>
                            <p className="text-sm text-on-surface/80 leading-relaxed whitespace-pre-wrap">
                              {reflection.content}
                            </p>
                            {reflection.images && reflection.images.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {reflection.images.map((imageUrl, index) => (
                                  <img
                                    key={index}
                                    src={imageUrl}
                                    alt={`感悟图片 ${index + 1}`}
                                    className="max-w-[200px] max-h-[200px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(imageUrl, '_blank')}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </motion.div>
      </div>

      {/* 精美海报 */}
      {showMoodCard && (
        <MoodCard
          title={entry.title}
          reflection={entry.reflection || ''}
          tags={entry.tags}
          poster={entry.poster}
          onClose={() => setShowMoodCard(false)}
        />
      )}
    </>
  );
}
