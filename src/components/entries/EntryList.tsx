/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { History, Settings, Trash2, X } from 'lucide-react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DramaEntry } from '../../types';
import { DiaryEntryCard } from './DiaryEntryCard';

interface EntryListProps {
  entries: DramaEntry[];
  activeStatus: 'watching' | 'completed' | 'planned';
  activeType: 'all' | 'tv' | 'movie';
  sortMode: 'year';
  searchQuery: string;
  searchResults: DramaEntry[];
  onStatusChange: (status: 'watching' | 'completed' | 'planned') => void;
  onEntryClick: (entry: DramaEntry) => void;
  onDragEnd: (event: DragEndEvent) => void;
  selectMode?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
}

// 排序项目组件
const SortableItem = ({ entry, onClick, selectMode, selected, onSelect }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DiaryEntryCard
        entry={entry}
        onClick={onClick}
        selectMode={selectMode}
        selected={selected}
        onSelect={onSelect}
      />
    </div>
  );
};

export function EntryList({
  entries,
  activeStatus,
  activeType,
  sortMode,
  searchQuery,
  searchResults,
  onStatusChange,
  onEntryClick,
  onDragEnd,
  selectMode = false,
  selectedIds = [],
  onSelect
}: EntryListProps) {
  // 创建传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );
  // 当有搜索词时，显示搜索结果（不受状态标签限制）
  if (searchQuery.trim()) {
    if (searchResults.length === 0) {
      return (
        <div className="text-center py-20 bg-surface-container-low rounded-xl border border-dashed border-outline/20">
          <p className="text-on-surface-variant opacity-60 italic">
            没有找到 "{searchQuery}" 相关的剧集
          </p>
        </div>
      );
    }
    return (
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={searchResults.map(entry => entry.id)}>
          <div className="grid grid-cols-2 min-[600px]:grid-cols-3 min-[900px]:grid-cols-4 min-[1200px]:grid-cols-5 min-[1500px]:grid-cols-6 gap-4">
            {searchResults.map((entry) => (
              <SortableItem
                key={entry.id}
                entry={entry}
                onClick={() => onEntryClick(entry)}
                selectMode={selectMode}
                selected={selectedIds.includes(entry.id)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  // 无搜索词时，按状态标签和类型显示
  const statusEntries = entries.filter(e => e.status === activeStatus && (activeType === 'all' || e.type === activeType));

  if (statusEntries.length === 0) {
    return (
      <div className="text-center py-20 bg-surface-container-low rounded-xl border border-dashed border-outline/20">
        <p className="text-on-surface-variant opacity-60 italic">
          {activeStatus === 'watching' ? '没有正在追的剧' :
            activeStatus === 'completed' ? '还没有看完的剧' : '还没有想看的剧'}
        </p>
      </div>
    );
  }

  // 所有状态都使用相同的布局，避免页面自动下滑
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext items={statusEntries.map(entry => entry.id)}>
        <div className="grid grid-cols-2 min-[600px]:grid-cols-3 min-[900px]:grid-cols-4 min-[1200px]:grid-cols-5 min-[1500px]:grid-cols-6 gap-4">
          {statusEntries.map((entry) => (
            <SortableItem
              key={entry.id}
              entry={entry}
              onClick={() => onEntryClick(entry)}
              selectMode={selectMode}
              selected={selectedIds.includes(entry.id)}
              onSelect={onSelect}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface EntryHeaderProps {
  entries: DramaEntry[];
  activeStatus: 'watching' | 'completed' | 'planned';
  activeType: 'all' | 'tv' | 'movie';
  selectMode?: boolean;
  selectedCount?: number;
  onStatusChange: (status: 'watching' | 'completed' | 'planned') => void;
  onTypeChange: (type: 'all' | 'tv' | 'movie') => void;
  onToggleSelectMode?: () => void;
  onSelectAll?: () => void;
  onDeleteSelected?: () => void;
}

export function EntryHeader({
  entries,
  activeStatus,
  activeType,
  selectMode = false,
  selectedCount = 0,
  onStatusChange,
  onTypeChange,
  onToggleSelectMode,
  onSelectAll,
  onDeleteSelected
}: EntryHeaderProps) {
  const statusCount = {
    completed: entries.filter(e => e.status === 'completed' && (activeType === 'all' || e.type === activeType)).length,
    watching: entries.filter(e => e.status === 'watching' && (activeType === 'all' || e.type === activeType)).length,
    planned: entries.filter(e => e.status === 'planned' && (activeType === 'all' || e.type === activeType)).length
  };

  return (
    <header className="mb-6">
      {/* 选择模式下的操作栏 */}
      {selectMode && (
        <div className="flex items-center justify-between mb-4 p-3 bg-primary/10 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSelectMode}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-on-surface-variant text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
              取消
            </button>
            <span className="text-sm text-on-surface-variant">
              已选择 <span className="font-bold text-primary">{selectedCount}</span> 项
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAll}
              className="px-3 py-1.5 rounded-lg bg-white text-on-surface-variant text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              {selectedCount === statusCount[activeStatus] ? '取消全选' : '全选'}
            </button>
            <button
              onClick={onDeleteSelected}
              disabled={selectedCount === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error text-white text-sm font-medium hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </div>
      )}

      {/* 状态标签切换 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        {/* 状态标签组 - 顺序：已看完、在看、想看 */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => onStatusChange('completed')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeStatus === 'completed'
              ? 'bg-primary text-on-primary shadow-md'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
          >
            已看完 <span className="opacity-80">({statusCount.completed})</span>
          </button>
          <button
            onClick={() => onStatusChange('watching')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeStatus === 'watching'
              ? 'bg-primary text-on-primary shadow-md'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
          >
            在看 <span className="opacity-80">({statusCount.watching})</span>
          </button>
          <button
            onClick={() => onStatusChange('planned')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeStatus === 'planned'
              ? 'bg-primary text-on-primary shadow-md'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
          >
            想看 <span className="opacity-80">({statusCount.planned})</span>
          </button>
        </div>

        {/* 右侧按钮组 */}
        <div className="flex items-center gap-2">
          {/* 类型切换 - 非选择模式时显示 */}
          {!selectMode && (
            <div className="flex items-center gap-1 p-1 bg-surface-container rounded-lg">
              <button
                onClick={() => onTypeChange('all')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${activeType === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
              >
                全部
              </button>
              <button
                onClick={() => onTypeChange('tv')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${activeType === 'tv'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
              >
                剧集
              </button>
              <button
                onClick={() => onTypeChange('movie')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${activeType === 'movie'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
              >
                电影
              </button>
            </div>
          )}
          {/* 管理按钮 - 非选择模式时显示 */}
          {!selectMode && (
            <button
              onClick={onToggleSelectMode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs font-medium hover:bg-surface-container-high transition-colors"
            >
              <Settings className="w-4 h-4" />
              管理
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
