/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, Bold, Italic, List, ListOrdered, Quote, Heading2, Undo, Redo, Image } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
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

  // 添加标签
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
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
      className={`p-2 rounded-lg transition-colors ${disabled
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
        </div>

        {/* 情感标签区 */}
        <div className="px-6 py-4 border-t border-outline/10 bg-surface-container-lowest">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-on-surface-variant">情感标签</span>
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
