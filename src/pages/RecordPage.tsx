/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EntryHeader, EntryList } from '../components/entries/EntryList';
import { useAuth } from '../hooks/useAuth';
import { useEntries } from '../hooks/useEntries';
import { useSearch } from '../hooks/useSearch';
import { DramaEntry } from '../types';
import { DragEndEvent } from '@dnd-kit/core';

/**
 * 记录主页面
 * 显示用户添加的影集列表
 */
export function RecordPage() {
  const { user, authChecked } = useAuth();
  const { entries, loading, fetchEntries, deleteEntry, deleteEntries, updateEntryOrder } = useEntries(user, authChecked);
  const { searchQuery, setSearchQuery, searchResults } = useSearch(entries);
  const [activeStatus, setActiveStatus] = useState<'watching' | 'completed' | 'planned'>('completed');
  const [activeType, setActiveType] = useState<'all' | 'tv' | 'movie'>('all');
  const [sortMode, setSortMode] = useState<'year' | 'rating'>('year');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DramaEntry | null>(null);

  React.useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user, fetchEntries]);

  const handleEntryClick = (entry: DramaEntry) => {
    setSelectedEntry(entry);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    // 重新排序
    const oldIndex = entries.findIndex((entry) => entry.id === active.id);
    const newIndex = entries.findIndex((entry) => entry.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newEntries = [...entries];
    const [movedEntry] = newEntries.splice(oldIndex, 1);
    newEntries.splice(newIndex, 0, movedEntry);

    // 更新排序
    const orderedIds = newEntries.map((entry) => entry.id);
    await updateEntryOrder(orderedIds);
  };

  const handleToggleSelectMode = () => {
    setSelectMode(prev => !prev);
    setSelectedIds([]);
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const statusEntries = entries.filter(e => e.status === activeStatus && (activeType === 'all' || e.type === activeType));
    if (selectedIds.length === statusEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(statusEntries.map(e => e.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm('确定要删除选中的记录吗？此操作无法撤销。')) return;
    try {
      await deleteEntries(selectedIds);
      setSelectMode(false);
      setSelectedIds([]);
    } catch {
      alert('删除失败，请重试');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-on-surface-variant">请先登录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <EntryHeader
          entries={entries}
          activeStatus={activeStatus}
          activeType={activeType}
          sortMode={sortMode}
          selectMode={selectMode}
          selectedCount={selectedIds.length}
          onStatusChange={setActiveStatus}
          onTypeChange={setActiveType}
          onSortModeChange={setSortMode}
          onToggleSelectMode={handleToggleSelectMode}
          onSelectAll={handleSelectAll}
          onDeleteSelected={handleDeleteSelected}
        />
        <EntryList
          entries={entries}
          activeStatus={activeStatus}
          activeType={activeType}
          sortMode={sortMode}
          searchQuery={searchQuery}
          searchResults={searchResults}
          onStatusChange={setActiveStatus}
          onEntryClick={handleEntryClick}
          onDragEnd={handleDragEnd}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}