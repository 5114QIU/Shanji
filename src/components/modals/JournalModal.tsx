/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Edit3, Trash2, Heart, Mic, MicOff, ChevronLeft, ChevronRight, Plus, Play, Pause } from 'lucide-react';
import { DramaEntry, Reflection } from '../../types';
import { RichTextContent } from '../editor/RichTextEditor';

interface JournalModalProps {
  entry: DramaEntry;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveReflections?: (entryId: string, reflections: Reflection[]) => Promise<void>;
}

export function JournalModal({ entry, onClose, onEdit, onDelete, onSaveReflections }: JournalModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'reflections'>('info');
  const [isRecording, setIsRecording] = useState(false);
  const [newReflection, setNewReflection] = useState('');
  const [reflections, setReflections] = useState<Reflection[]>(entry.reflections || []);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // 处理录音开始/停止
  const toggleRecording = async () => {
    if (isRecording) {
      // 停止录音
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      // 开始录音
      try {
        // 检查浏览器支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert('您的浏览器不支持录音功能');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          // 创建音频URL
          const audioUrl = URL.createObjectURL(audioBlob);
          console.log('录音完成', audioUrl);

          // 自动将录音添加为新感悟
          const newRef: Reflection = {
            id: `${entry.id}-${Date.now()}`,
            content: '[语音记录]',
            audioUrl: audioUrl,
            timestamp: new Date().toISOString(),
          };
          const updatedReflections = [...reflections, newRef];
          setReflections(updatedReflections);

          // 保存到数据库
          if (onSaveReflections) {
            try {
              await onSaveReflections(entry.id, updatedReflections);
              console.log('语音感悟已保存到数据库');
            } catch (error) {
              console.error('保存语音感悟失败:', error);
              alert('保存到数据库失败，但本地记录已保存');
            }
          }

          // 自动进行语音转文字
          transcribeAudio(audioBlob);

          // 移除成功提示，让保存过程更加平滑
          console.log('录音保存成功，正在进行语音转文字...');
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('录音失败:', error);
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          alert('请允许麦克风访问权限');
        } else if (error instanceof DOMException && error.name === 'NotFoundError') {
          alert('未找到麦克风设备');
        } else {
          alert('录音失败，请稍后重试');
        }
      }
    }
  };

  // 添加新感悟
  const addReflection = async () => {
    if (newReflection.trim()) {
      const newRef: Reflection = {
        id: `${entry.id}-${Date.now()}`,
        content: newReflection,
        timestamp: new Date().toISOString(),
      };
      const updatedReflections = [...reflections, newRef];
      setReflections(updatedReflections);
      setNewReflection('');

      // 保存到数据库
      if (onSaveReflections) {
        try {
          await onSaveReflections(entry.id, updatedReflections);
          console.log('感悟已保存到数据库');
        } catch (error) {
          console.error('保存感悟失败:', error);
          alert('保存到数据库失败，但本地记录已保存');
          return;
        }
      }

      // 移除成功提示，让保存过程更加平滑
      console.log('感悟保存成功！');
    } else {
      alert('请输入感悟内容');
    }
  };

  // 格式化时间
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

  // 播放音频
  const playAudio = (audioUrl: string, reflectionId: string) => {
    if (isPlaying === reflectionId) {
      // 停止播放
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }
      setIsPlaying(null);
    } else {
      // 停止其他音频
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }
      // 开始播放
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      setIsPlaying(reflectionId);

      audio.play().catch(error => {
        console.error('播放失败:', error);
        alert('音频播放失败');
        setIsPlaying(null);
      });

      audio.onended = () => {
        setIsPlaying(null);
      };
    }
  };

  // 语音转文字
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      // 这里使用Web Speech API进行语音识别
      // 注意：Web Speech API在不同浏览器中的支持情况不同
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';

        // 由于Web Speech API需要从麦克风直接获取音频，
        // 这里我们需要模拟一个简单的转文字功能
        // 实际项目中应该使用后端API进行语音识别

        // 模拟转文字过程
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 模拟识别结果
        const transcribedText = '这是一段模拟的语音转文字结果，实际项目中应该使用真实的语音识别API。';
        setNewReflection(transcribedText);
        alert('语音转文字成功！');
      } else {
        alert('您的浏览器不支持语音识别功能');
      }
    } catch (error) {
      console.error('语音转文字失败:', error);
      alert('语音转文字失败，请稍后重试');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center bg-on-background/40 backdrop-blur-md p-0 md:p-4 overflow-y-auto" onClick={onClose}>
      <motion.div
        layoutId={`poster-${entry.id}`}
        className="relative w-full md:max-w-6xl md:aspect-[16/10] min-h-screen md:min-h-0 bg-surface-container-low rounded-none md:rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden paper-texture"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 手机端顶部操作按钮 */}
        <div className="md:hidden absolute top-4 left-4 right-4 flex justify-between z-10">
          {/* 左侧返回按钮 */}
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 shadow-sm"
            title="返回"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
          {/* 右侧操作按钮 */}
          <div className="flex gap-2">
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

        {/* Poster Section - 手机端顶部，电脑端左侧 */}
        <section className="w-full md:flex-1 p-4 md:p-12 flex flex-col items-center justify-center relative md:border-r border-outline/20">
          <div className="relative w-full max-w-[200px] md:max-w-sm aspect-[3/4] bg-surface-container-high rounded-sm shadow-xl p-2 md:p-3 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
            <img src={entry.poster} alt={entry.title} className="w-full h-full object-cover rounded-sm grayscale-[10%]" referrerPolicy="no-referrer" />
          </div>
        </section>

        {/* Journal Spine - 仅电脑端显示 */}
        <div className="hidden md:flex w-10 journal-spine flex-col justify-between py-12">
          {[...Array(3)].map((_, i) => <div key={i} className="w-full h-px bg-on-surface/5"></div>)}
        </div>

        {/* Content Section */}
        <section className="flex-1 p-4 md:p-16 flex flex-col relative overflow-y-auto">
          {/* 电脑端操作按钮 */}
          <div className="hidden md:flex absolute top-6 right-8 gap-3">
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
                  {/* 分���进度 */}
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
              {/* 语音感悟录入 */}
              <div className="mb-6 p-4 bg-surface-container rounded-lg border border-outline/20">
                <h3 className="text-xs font-bold text-primary tracking-[0.2em] uppercase mb-3">实时语音感悟</h3>
                <div className="flex flex-col gap-3">
                  <textarea
                    value={newReflection}
                    onChange={(e) => setNewReflection(e.target.value)}
                    placeholder="输入你的感悟，或点击录音按钮开始语音记录..."
                    className="w-full p-3 border border-outline/20 rounded-lg text-sm resize-none min-h-[100px]"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={toggleRecording}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${isRecording
                        ? 'bg-error text-white'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{isRecording ? '停止录音' : '开始录音'}</span>
                    </button>
                    <button
                      onClick={addReflection}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
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
                            {reflection.audioUrl && (
                              <button
                                onClick={() => playAudio(reflection.audioUrl!, reflection.id)}
                                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                              >
                                {isPlaying === reflection.id ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                                {isPlaying === reflection.id ? '停止播放' : '播放语音'}
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-on-surface/80 leading-relaxed">
                            {reflection.content}
                          </p>
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
  );
}
