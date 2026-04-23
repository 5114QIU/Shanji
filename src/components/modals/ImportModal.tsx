/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DramaEntry } from '../../types';

interface ParsedItem {
  title: string;
  year: string;
  actors: string[];
  rating: number;
  tags: string[];
  comment: string;
  date: string;
  selected: boolean;
}

interface ImportModalProps {
  onClose: () => void;
  onImport: (entries: DramaEntry[]) => Promise<void>;
}

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 解析简介字段：年份 / 国家 / 类型 / 导演 / 主演
  const parseIntro = (intro: string): { year: string; actors: string[] } => {
    if (!intro) return { year: '', actors: [] };

    const parts = intro.split(' / ');
    const year = parts[0]?.trim() || '';
    // 主演通常在最后一部分
    const actorsPart = parts[parts.length - 1] || '';
    const actors = actorsPart.split(/\s+/).filter(a => a.length > 0 && a.length < 10);

    return { year, actors: actors.slice(0, 5) };
  };

  // 处理文件上传
  const handleFile = async (file: File) => {
    setError(null);

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('请上传 Excel (.xlsx/.xls) 或 CSV 文件');
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, string | number>[];

      if (jsonData.length === 0) {
        setError('文件中没有数据');
        return;
      }

      // 检查必需的列
      const firstRow = jsonData[0];
      if (!('标题' in firstRow)) {
        setError('文件格式不正确，需要包含"标题"列');
        return;
      }

      // 解析数据
      const parsed: ParsedItem[] = jsonData.map((row) => {
        const intro = String(row['简介'] || '');
        const { year, actors } = parseIntro(intro);

        // 处理评分（豆瓣5分制直接对应）
        let rating = 3;
        if (row['我的评分']) {
          const score = Number(row['我的评分']);
          if (!isNaN(score) && score >= 1 && score <= 5) {
            rating = Math.round(score);
          }
        }

        // 处理标签
        const tags: string[] = [];
        if (row['标签'] && String(row['标签']) !== 'nan') {
          const tagStr = String(row['标签']);
          tags.push(...tagStr.split(/[,，\s]+/).filter(t => t.length > 0));
        }

        // 处理日期
        let date = '';
        if (row['创建时间']) {
          const createStr = String(row['创建时间']);
          const match = createStr.match(/^(\d{4}-\d{2}-\d{2})/);
          if (match) {
            date = match[1];
          }
        }

        return {
          title: String(row['标题'] || ''),
          year,
          actors,
          rating,
          tags,
          comment: row['评论'] && String(row['评论']) !== 'nan' ? String(row['评论']) : '',
          date,
          selected: true,
        };
      });

      setParsedData(parsed);
      setStep('preview');
    } catch (err) {
      console.error('Parse error:', err);
      setError('文件解析失败，请检查文件格式');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const toggleSelect = (index: number) => {
    setParsedData(prev => prev.map((item, i) =>
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = parsedData.every(item => item.selected);
    setParsedData(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const handleImport = async () => {
    const selectedItems = parsedData.filter(item => item.selected);
    if (selectedItems.length === 0) {
      setError('请至少选择一条记录');
      return;
    }

    setStep('importing');

    const entries: DramaEntry[] = selectedItems.map(item => ({
      id: '',
      title: item.title,
      poster: `https://picsum.photos/seed/${encodeURIComponent(item.title)}/600/900`,
      rating: item.rating,
      tags: item.tags,
      actors: item.actors,
      platform: '',
      summary: '',
      reflection: item.comment,
      reflections: [],
      date: item.date || new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
      releaseDate: item.year ? `${item.year}-01-01` : '',
      watchCount: 1,
      firstEncounter: item.date,
      status: 'completed' as const,
    }));

    try {
      await onImport(entries);
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      setError('导入失败，请重试');
      setStep('preview');
    }
  };

  const selectedCount = parsedData.filter(item => item.selected).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-background/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline/10">
          <h2 className="font-serif text-xl text-on-surface">导入豆瓣数据</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 上传步骤 */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-outline/30 hover:border-primary/50'
                  }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto text-primary/40 mb-4" />
                <p className="text-on-surface font-medium mb-2">点击或拖拽文件到此处</p>
                <p className="text-sm text-on-surface-variant">支持 Excel (.xlsx/.xls) 或 CSV 文件</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-error bg-error/10 rounded-lg p-3">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="bg-surface-container-low rounded-lg p-4">
                <h3 className="font-medium text-on-surface mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  支持的字段
                </h3>
                <ul className="text-sm text-on-surface-variant space-y-1">
                  <li>• <strong>标题</strong> - 剧名（必需）</li>
                  <li>• <strong>简介</strong> - 解析年份和主演</li>
                  <li>• <strong>我的评分</strong> - 1-5 分</li>
                  <li>• <strong>标签</strong> - 情感标签</li>
                  <li>• <strong>评论</strong> - 个人感悟</li>
                  <li>• <strong>创建时间</strong> - 首次观看时间</li>
                </ul>
              </div>
            </div>
          )}

          {/* 预览步骤 */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">
                  共 {parsedData.length} 条记录，已选择 {selectedCount} 条
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  {parsedData.every(item => item.selected) ? '取消全选' : '全选'}
                </button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {parsedData.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => toggleSelect(index)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${item.selected
                        ? 'border-primary bg-primary/5'
                        : 'border-outline/20 hover:border-outline/40'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${item.selected
                        ? 'bg-primary border-primary'
                        : 'border-outline/40'
                      }`}>
                      {item.selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-on-surface truncate">{item.title}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                          {item.rating}分
                        </span>
                      </div>
                      <div className="text-xs text-on-surface-variant mt-1">
                        {item.year && <span>{item.year} · </span>}
                        {item.actors.length > 0 && <span>{item.actors.join(' / ')}</span>}
                      </div>
                      {item.comment && (
                        <p className="text-xs text-on-surface-variant/80 mt-1 line-clamp-2">{item.comment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-error bg-error/10 rounded-lg p-3">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* 导入中步骤 */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-on-surface font-medium">正在导入 {selectedCount} 条记录...</p>
              <p className="text-sm text-on-surface-variant mt-1">请稍候</p>
            </div>
          )}
        </div>

        {/* 底部栏 */}
        {step !== 'importing' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline/10 bg-surface-container-low">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-on-surface-variant font-medium rounded-lg hover:bg-surface-container transition-colors"
            >
              取消
            </button>
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                导入 {selectedCount} 条记录
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
