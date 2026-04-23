/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, Bold, Italic, List, ListOrdered, Quote, Heading2, Undo, Redo, Wand2, Tag, Loader2, Sparkles, Image } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { polishText, extractTags } from '../../api/aiAssist';
import { MoodCard } from '../card/MoodCard';

interface ReflectionModalProps {
  content: string;
  title: string;
  tags?: string[];
  onClose: () => void;
  onSave: (content: string, tags?: string[]) => void;
}

export function ReflectionModal({ content, title, tags: initialTags = [], onClose, onSave }: ReflectionModalProps) {
  const [localContent, setLocalContent] = useState(content);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [aiTags, setAiTags] = useState<string[]>([]); // AI 推荐的标签
  const [isPolishing, setIsPolishing] = useState(false);
  const [isExtractingTags, setIsExtractingTags] = useState(false);
  const [showPolishResult, setShowPolishResult] = useState(false);
  const [polishedText, setPolishedText] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [showMoodCard, setShowMoodCard] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: '写下那一刻的真实感悟...\n\n可以记录剧情触动你的地方\n可以写下自己的心情\n可以记录与谁一起看的...',
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      setLocalContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[150px] sm:min-h-[300px] font-handwriting text-lg sm:text-2xl leading-relaxed text-on-surface',
      },
    },
  });

  // 按 Escape 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!editor) {
    return null;
  }

  // 获取纯文本内容
  const getPlainText = () => {
    return editor.getText().trim();
  };

  // AI 润色
  const handlePolish = async () => {
    const text = getPlainText();
    console.log('Polish clicked, text length:', text?.length, 'text:', text);
    if (!text) {
      setAiError('请先写一些内容');
      return;
    }

    setIsPolishing(true);
    setAiError(null);

    try {
      const result = await polishText(text, title);
      setPolishedText(result);
      setShowPolishResult(true);
    } catch (err: any) {
      console.error('Polish error:', err);
      setAiError(err.message || '润色失败，请稍后重试');
    } finally {
      setIsPolishing(false);
    }
  };

  // 采用润色结果
  const handleApplyPolish = () => {
    editor.commands.setContent(`<p>${polishedText}</p>`);
    setLocalContent(`<p>${polishedText}</p>`);
    setShowPolishResult(false);
    setPolishedText('');
  };

  // AI 提取标签
  const handleExtractTags = async () => {
    const text = getPlainText();
    if (!text) {
      setAiError('请先写一些内容');
      return;
    }

    setIsExtractingTags(true);
    setAiError(null);

    try {
      const result = await extractTags(text);
      setAiTags(result);
    } catch (err) {
      console.error('Extract tags error:', err);
      setAiError('提取标签失败，请稍后重试');
    } finally {
      setIsExtractingTags(false);
    }
  };

  // 添加标签
  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    // 从 AI 推荐中移除
    setAiTags(aiTags.filter(t => t !== tag));
  };

  // 移除标签
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // 撤销所有 AI 推荐的标签
  const handleUndoAiTags = () => {
    setAiTags([]);
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
    disabled
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : isActive
            ? 'bg-primary text-on-primary'
            : 'text-on-surface-variant hover:bg-surface-container-high'
      }`}
    >
      {children}
    </button>
  );

  const handleSave = () => {
    onSave(localContent, tags);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-on-background/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden m-4 my-4"
      >
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline/10">
          <div>
            <h2 className="font-serif text-xl text-on-surface">写感悟</h2>
            {title && (
              <p className="text-sm text-on-surface-variant mt-0.5">《{title}》</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-outline/10 bg-surface-container-low">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="粗体 (Ctrl+B)"
          >
            <Bold className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="斜体 (Ctrl+I)"
          >
            <Italic className="w-5 h-5" />
          </ToolbarButton>

          <div className="w-px h-5 bg-outline/20 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="标题"
          >
            <Heading2 className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="引用"
          >
            <Quote className="w-5 h-5" />
          </ToolbarButton>

          <div className="w-px h-5 bg-outline/20 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="无序列表"
          >
            <List className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="有序列表"
          >
            <ListOrdered className="w-5 h-5" />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            title="撤销 (Ctrl+Z)"
          >
            <Undo className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="重做 (Ctrl+Y)"
          >
            <Redo className="w-5 h-5" />
          </ToolbarButton>
        </div>

        {/* 编辑区域 */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <EditorContent editor={editor} />

          {/* AI 润色结果预览 */}
          {showPolishResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI 润色结果</span>
              </div>
              <p className="text-on-surface leading-relaxed mb-4">{polishedText}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleApplyPolish}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  采用此版本
                </button>
                <button
                  onClick={() => setShowPolishResult(false)}
                  className="px-4 py-2 text-on-surface-variant rounded-lg text-sm font-medium hover:bg-surface-container transition-colors"
                >
                  保留原稿
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* AI 功能区 */}
        <div className="px-6 py-4 border-t border-outline/10 bg-surface-container-lowest">
          {/* AI 按钮 */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handlePolish}
              onTouchStart={(e) => {
                e.preventDefault();
                handlePolish();
              }}
              disabled={isPolishing || isExtractingTags}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-on-primary rounded-lg text-sm font-medium hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isPolishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              AI 润色
            </button>
            <button
              onClick={handleExtractTags}
              onTouchStart={(e) => {
                e.preventDefault();
                handleExtractTags();
              }}
              disabled={isPolishing || isExtractingTags}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container text-on-surface-variant rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isExtractingTags ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Tag className="w-4 h-4" />
              )}
              提取标签
            </button>
          </div>

          {/* 错误提示 */}
          {aiError && (
            <div className="mb-3 text-sm text-error bg-error/10 rounded-lg px-3 py-2">
              {aiError}
            </div>
          )}

          {/* 情感标签区 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-on-surface-variant">情感标签</span>
              {aiTags.length > 0 && (
                <button
                  onClick={handleUndoAiTags}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  撤销 AI 推荐
                </button>
              )}
            </div>

            {/* 已选标签 */}
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-on-primary rounded-full text-xs font-medium"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-on-primary/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* AI 推荐标签 */}
            {aiTags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-outline/10">
                <span className="text-xs text-on-surface-variant w-full mb-1">AI 推荐：</span>
                {aiTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors border border-dashed border-outline/30"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部栏 */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-outline/10 bg-surface-container-low">
          <button
            onClick={() => setShowMoodCard(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-primary font-medium rounded-lg hover:bg-primary/10 transition-colors"
          >
            <Image className="w-5 h-5" />
            生成情绪卡片
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-on-surface-variant font-medium rounded-lg hover:bg-surface-container transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Check className="w-5 h-5" />
              完成编辑
            </button>
          </div>
        </div>
      </motion.div>

      {/* 情绪卡片 */}
      {showMoodCard && (
        <MoodCard
          title={title}
          reflection={localContent}
          tags={tags}
          onClose={() => setShowMoodCard(false)}
        />
      )}
    </div>
  );
}
