/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Download, Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getStillsByTitle } from '../../tmdb';

interface MoodCardProps {
  title: string;
  reflection: string;
  tags: string[];
  quote?: string;
  onClose: () => void;
}

export function MoodCard({ title, reflection, tags, quote, onClose }: MoodCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [stills, setStills] = useState<string[]>([]);
  const [selectedStill, setSelectedStill] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取剧照
  useEffect(() => {
    const fetchStills = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const images = await getStillsByTitle(title);
        if (images.length > 0) {
          setStills(images);
          setSelectedStill(images[0]);
        } else {
          setError('未找到剧照，使用默认背景');
          setSelectedStill('');
        }
      } catch (err) {
        console.error('Fetch stills error:', err);
        setError('获取剧照失败');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStills();
  }, [title]);

  // 获取纯文本（去除 HTML 标签）
  const getPlainText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // 导出图片
  const handleExport = async () => {
    if (!cardRef.current) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
      });

      // 创建下载链接
      const link = document.createElement('a');
      link.download = `${title}-情绪卡片.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export error:', err);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 换一张剧照
  const handleChangeStill = () => {
    if (stills.length <= 1) return;
    const currentIndex = stills.indexOf(selectedStill);
    const nextIndex = (currentIndex + 1) % stills.length;
    setSelectedStill(stills[nextIndex]);
  };

  // 截取文字预览
  const reflectionText = getPlainText(reflection).slice(0, 150);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-on-background/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline/10">
          <div>
            <h2 className="font-serif text-xl text-on-surface">情绪卡片</h2>
            <p className="text-sm text-on-surface-variant">生成分享海报</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* 卡片预览 */}
          <div className="flex justify-center mb-6">
            {isLoading ? (
              <div className="w-[320px] h-[480px] bg-surface-container rounded-xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div
                ref={cardRef}
                className="relative w-[320px] h-[480px] rounded-xl overflow-hidden shadow-xl"
                style={{
                  background: selectedStill
                    ? `url(${selectedStill}) center/cover`
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {/* 渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* 内容 */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                  {/* 台词 */}
                  {quote && (
                    <div className="mb-4">
                      <p className="text-lg font-light italic opacity-90">"{quote}"</p>
                    </div>
                  )}

                  {/* 分割线 */}
                  <div className="w-12 h-0.5 bg-white/50 mb-4" />

                  {/* 感悟 */}
                  {reflectionText && (
                    <p className="text-sm leading-relaxed opacity-90 mb-4 line-clamp-4">
                      {reflectionText}
                    </p>
                  )}

                  {/* 标签 */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tags.slice(0, 4).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 剧名 */}
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-lg font-medium">《{title}》</span>
                    <span className="text-xs opacity-60">Drama Diary</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 剧照选择 */}
          {stills.length > 1 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-on-surface-variant">选择背景</span>
                <button
                  onClick={handleChangeStill}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                >
                  <RefreshCw className="w-4 h-4" />
                  换一张
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {stills.map((still, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedStill(still)}
                    className={`flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedStill === still
                        ? 'border-primary'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={still}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* 底部操作 */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-on-surface-variant font-medium rounded-lg hover:bg-surface-container transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={isLoading || isExporting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              保存图片
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
