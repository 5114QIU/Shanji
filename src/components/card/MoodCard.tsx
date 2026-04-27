/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Download, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Plus, Pencil } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getStillsByTitle } from '../../tmdb';
import { useToast } from '../../App';

interface MoodCardProps {
  title: string;
  reflection: string;
  tags: string[];
  quote?: string;
  poster?: string;
  onClose: () => void;
}

const FONTS = [
  { value: 'font-serif', label: '默认' },
  { value: 'font-sans', label: '现代' },
  { value: 'font-mono', label: '等宽' },
  { value: 'font-serif', label: '衬线' },
  { value: 'font-serif', label: '艺术' },
];

export function MoodCard({ title, reflection, tags, quote, poster, onClose }: MoodCardProps) {
  const { addToast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [stills, setStills] = useState<string[]>([]);
  const [selectedStillIndex, setSelectedStillIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const [customLine, setCustomLine] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].value);
  const [isEditing, setIsEditing] = useState(false);
  const [editingLine, setEditingLine] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);

  useEffect(() => {
    const fetchStills = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (poster) {
          setStills([poster]);
          setSelectedStillIndex(0);
        } else {
          const images = await getStillsByTitle(title);
          console.log('获取到剧照数量:', images.length);
          if (images.length > 0) {
            setStills(images);
            setSelectedStillIndex(0);
          } else {
            setError('未找到剧照');
            setStills([]);
          }
        }
      } catch (err) {
        console.error('Fetch stills error:', err);
        setError('获取剧照失败');
        setStills([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStills();
  }, [title, poster]);

  useEffect(() => {
    console.log('处理台词:', { quote, reflection });
    const extractedLines: string[] = [];

    if (quote) {
      extractedLines.push(quote);
    }

    if (reflection) {
      const quoteMatches = reflection.match(/"([^"]+)"/g);
      if (quoteMatches) {
        quoteMatches.forEach(match => {
          const line = match.replace(/"/g, '');
          if (line.length > 5 && line.length < 100) {
            extractedLines.push(line);
          }
        });
      }

      if (extractedLines.length === 0) {
        const paragraphs = reflection.trim().split('\n').filter(p => p.trim().length > 0);
        if (paragraphs.length > 0) {
          const firstLine = paragraphs[0].slice(0, 100);
          if (firstLine) {
            extractedLines.push(firstLine);
          }
        }
      }
    }

    if (extractedLines.length === 0) {
      extractedLines.push('这部作品给我留下了深刻的印象');
      extractedLines.push('剧情扣人心弦，演员表演出色');
      extractedLines.push('每一个细节都值得细细品味');
    }

    console.log('提取到的台词:', extractedLines);
    setLines(extractedLines);
    setSelectedLineIndex(0);
  }, [reflection, quote]);

  const handleExport = async () => {
    if (!cardRef.current) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `${title}-宣传海报.png`;
      link.href = dataUrl;
      link.click();
      addToast('海报已保存', 'success');
    } catch (err) {
      console.error('Export error:', err);
      addToast('导出失败，请重试', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleNextStill = () => {
    if (stills.length <= 1) return;
    setSelectedStillIndex((prev) => (prev + 1) % stills.length);
  };

  const handlePrevStill = () => {
    if (stills.length <= 1) return;
    setSelectedStillIndex((prev) => (prev - 1 + stills.length) % stills.length);
  };

  const handleAddCustomLine = () => {
    if (customLine.trim()) {
      setLines([...lines, customLine.trim()]);
      setSelectedLineIndex(lines.length);
      setCustomLine('');
      setShowCustomInput(false);
    }
  };

  const handleEditLine = (index: number) => {
    setEditingLine(lines[index]);
    setEditingIndex(index);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editingLine.trim() && editingIndex >= 0) {
      const updatedLines = [...lines];
      updatedLines[editingIndex] = editingLine.trim();
      setLines(updatedLines);
      if (selectedLineIndex === editingIndex) {
        setSelectedLineIndex(editingIndex);
      }
    }
    setIsEditing(false);
    setEditingLine('');
    setEditingIndex(-1);
  };

  const selectedStill = stills[selectedStillIndex] || '';
  const selectedLine = lines[selectedLineIndex] || '';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-on-background/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline/10 flex-shrink-0">
          <div>
            <h2 className="font-serif text-xl text-on-surface">精美海报</h2>
            <p className="text-sm text-on-surface-variant">宣传海报风格</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-center mb-6">
            {isLoading ? (
              <div className="w-[320px] h-[480px] bg-surface-container rounded-xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="relative">
                <div
                  ref={cardRef}
                  className="relative w-[320px] h-[480px] rounded-xl overflow-hidden shadow-xl"
                  style={{
                    background: selectedStill
                      ? `url(${selectedStill}) center/cover`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  <div className="absolute inset-0 flex flex-col justify-center items-center p-8 text-white">
                    <div className={`text-center ${selectedFont}`} style={{ fontSize: '1.25rem', lineHeight: '1.5' }}>
                      <p className="opacity-90">"{selectedLine}"</p>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                    <span className="font-serif text-lg font-medium">《{title}》</span>
                    <span className="text-xs opacity-60 font-serif">闪记</span>
                  </div>
                </div>

                {stills.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevStill}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextStill}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 rounded-full px-2 py-0.5 text-xs text-white">
                      {selectedStillIndex + 1} / {stills.length}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 字体选择 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-on-surface-variant font-medium">字体选择</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {FONTS.map((font) => (
                <button
                  key={font.value}
                  onClick={() => setSelectedFont(font.value)}
                  className={`px-3 py-1.5 rounded-lg border-2 transition-all ${
                    selectedFont === font.value
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-surface-container'
                  }`}
                >
                  <span className={`${font.value} text-sm`}>{font.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 经典台词选择 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-on-surface-variant font-medium">经典台词</span>
              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加台词
              </button>
            </div>

            {showCustomInput && (
              <div className="mb-4 bg-surface-container rounded-lg p-3">
                <textarea
                  value={customLine}
                  onChange={(e) => setCustomLine(e.target.value)}
                  placeholder="输入自定义台词..."
                  className="w-full p-2 border border-outline/20 rounded-lg text-sm resize-none min-h-[60px]"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setShowCustomInput(false)}
                    className="px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddCustomLine}
                    className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    添加
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className={`p-4 bg-surface-container rounded-lg cursor-pointer transition-all ${
                    selectedLineIndex === index
                      ? 'border-2 border-primary'
                      : 'border border-transparent hover:border-outline/20'
                  }`}
                  onClick={() => setSelectedLineIndex(index)}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-on-surface leading-relaxed">"{line}"</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditLine(index);
                      }}
                      className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 海报选择 */}
          {stills.length > 1 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-on-surface-variant font-medium">选择海报</span>
                <span className="text-sm text-on-surface-variant">
                  {stills.length} 张可选
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {stills.map((still, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedStillIndex(index)}
                    className={`flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedStillIndex === index
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

          {error && (
            <div className="mb-4 text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {error}
            </div>
          )}

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

      {/* 编辑台词弹窗 */}
      {isEditing && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-on-background/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <h3 className="font-medium text-lg text-on-surface mb-4">编辑台词</h3>
            <textarea
              value={editingLine}
              onChange={(e) => setEditingLine(e.target.value)}
              className="w-full p-3 border border-outline/20 rounded-lg text-sm resize-none min-h-[100px] mb-4"
              placeholder="编辑台词..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-5 py-2 text-on-surface-variant font-medium rounded-lg hover:bg-surface-container transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
