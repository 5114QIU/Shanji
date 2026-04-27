/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Edit3, Menu, Home, BarChart3, User } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthForm } from './components/auth/AuthForm';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { Navbar } from './components/layout/Navbar';
import { EntryHeader, EntryList } from './components/entries/EntryList';
import { DiaryEntryCard } from './components/entries/DiaryEntryCard';
import { EntryModal } from './components/modals/EntryModal';
import { JournalModal } from './components/modals/JournalModal';
import { ImportModal } from './components/modals/ImportModal';
import { PWAInstallPrompt, useServiceWorker } from './components/PWAInstallPrompt';
import { useAuth } from './hooks/useAuth';
import { useEntries } from './hooks/useEntries';
import { useSearch } from './hooks/useSearch';
import { DramaEntry, Reflection } from './types';
import { RecordPage } from './pages/RecordPage';
import { StatsPage } from './pages/StatsPage';
import { ProfilePage } from './pages/ProfilePage';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { ToastProvider } from './components/ui/Toast';

// 创建 Toast 上下文
type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextType>({
  addToast: (message: string, type: ToastType = 'info') => {
    console.log(`${type}: ${message}`);
  }
});

export const useToast = () => React.useContext(ToastContext);

export default function App() {
  // 注册 Service Worker
  // useServiceWorker();

  return (
    <Router>
      <ErrorBoundary>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ErrorBoundary>
      {/* PWA 安装提示 - 放在 ErrorBoundary 外部 */}
      <PWAInstallPrompt />
    </Router>
  );
}

function AppContent() {
  const { user, authChecked, handleLogout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // 检查是否是从重置密码链接进入（放在最前面，优先处理）
  // 支持从 query、hash（#...）或路径中识别重置标志，以兼容不同打开方式（右键新标签、邮件跳转等）
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const pathname = window.location.pathname || '';
  const isRecoveryLink =
    searchParams.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery' ||
    pathname.endsWith('/reset-password') ||
    pathname === '/reset-password';

  if (isRecoveryLink) {
    return <ResetPasswordPage />;
  }
  const { entries, loading, saving, fetchEntries, saveEntry, deleteEntry, deleteEntries, updateEntryOrder, setEntries } = useEntries(user, authChecked);
  const { searchQuery, setSearchQuery, searchResults } = useSearch(entries);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DramaEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DramaEntry | null>(null);
  const [activeStatus, setActiveStatus] = useState<'watching' | 'completed' | 'planned'>('completed');
  const [activeType, setActiveType] = useState<'all' | 'tv' | 'movie'>('all');
  const [sortMode, setSortMode] = useState<'year' | 'rating'>('year');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 用户登录后加载数据
  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user, fetchEntries]);

  // 弹窗打开时禁止背景滚动
  useEffect(() => {
    if (isEntryModalOpen || selectedEntry) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isEntryModalOpen, selectedEntry]);

  const handleSaveEntry = async (entry: DramaEntry) => {
    await saveEntry(entry);
    setIsEntryModalOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？此操作无法撤销。')) return;

    try {
      await deleteEntry(id);
      setSelectedEntry(null);
    } catch {
      addToast('删除失败，请重试', 'error');
    }
  };

  // 保存感悟到数据库
  const handleSaveReflections = async (entryId: string, reflections: Reflection[]) => {
    if (!user) {
      console.error('用户未登录');
      return;
    }

    try {
      console.log('开始保存感悟...', { entryId, reflectionsCount: reflections.length });

      // 找到对应的 entry
      const entry = entries.find(e => e.id === entryId);
      if (!entry) {
        console.error('找不到对应的影集', { entryId, availableEntries: entries.map(e => e.id) });
        throw new Error('找不到对应的影集');
      }

      console.log('找到对应的影集:', entry.title);

      // 更新 entry 的 reflections
      const updatedEntry: DramaEntry = {
        ...entry,
        reflections: reflections,
      };

      console.log('准备保存到数据库:', { reflections: JSON.stringify(reflections) });

      // 保存到数据库
      await saveEntry(updatedEntry);
      console.log('感悟已保存到数据库');

      // 更新 selectedEntry，确保页面显示最新的感悟
      if (selectedEntry && selectedEntry.id === entryId) {
        setSelectedEntry(updatedEntry);
        console.log('已更新selectedEntry，确保页面显示最新感悟');
      }
    } catch (error) {
      console.error('保存感悟失败:', error);
      throw error;
    }
  };

  const handleOpenAddModal = () => {
    setEditingEntry(null);
    setIsEntryModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (selectedEntry) {
      setEditingEntry(selectedEntry);
      setIsEntryModalOpen(true);
      setSelectedEntry(null);
    }
  };

  const handleCloseEntryModal = () => {
    setIsEntryModalOpen(false);
    setEditingEntry(null);
  };

  // 切换状态标签时清空选择
  const handleStatusChange = (status: 'watching' | 'completed' | 'planned') => {
    setActiveStatus(status);
    setSelectedIds([]);
  };

  // 切换类型时清空选择
  const handleTypeChange = (type: 'all' | 'tv' | 'movie') => {
    setActiveType(type);
    setSelectedIds([]);
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
    const statusEntries = entries.filter(e => e.status === activeStatus);
    if (selectedIds.length === statusEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(statusEntries.map(e => e.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 条记录吗？此操作无法撤销。`)) return;

    try {
      await deleteEntries(selectedIds);
      setSelectedIds([]);
      setSelectMode(false);
    } catch {
      addToast('删除失败，请重试', 'error');
    }
  };

  // 批量导入处理
  const handleImport = async (importedEntries: DramaEntry[]) => {
    // 逐条保存
    for (const entry of importedEntries) {
      await saveEntry(entry);
    }
    // 刷新列表
    await fetchEntries();
  };

  // 处理拖拽结束事件
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // 确定要排序的条目列表
    let itemsToSort = entries;

    // 如果有搜索词，使用搜索结果进行排序
    if (searchQuery.trim()) {
      itemsToSort = searchResults;
    } else {
      // 否则按状态筛选
      itemsToSort = entries.filter(e => e.status === activeStatus);
    }

    const newOrder = Array.from(itemsToSort);
    const activeIndex = newOrder.findIndex(item => item.id === active.id);
    const overIndex = newOrder.findIndex(item => item.id === over.id);

    // 重新排序
    const [movedItem] = newOrder.splice(activeIndex, 1);
    newOrder.splice(overIndex, 0, movedItem);

    // 更新数据库中的顺序
    const orderedIds = newOrder.map(entry => entry.id);
    await updateEntryOrder(orderedIds);
  };

  // 创建传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  // 排序项目组件
  const SortableItem = ({ entry, onEntryClick, selectMode, selected, onSelect }: any) => {
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
          onClick={() => onEntryClick(entry)}
          selectMode={selectMode}
          selected={selected}
          onSelect={onSelect}
        />
      </div>
    );
  };

  // 加载状态 - 只在记录页面显示加载状态
  const location = useLocation();
  if ((loading || !authChecked) && location.pathname === '/') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 未登录状态
  if (!user) {
    return <AuthForm onAuthSuccess={() => { }} />;
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
        onImport={() => setIsImportModalOpen(true)}
        onBack={() => navigate(-1)}
      />

      {/* Main Content */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={
            <div className="max-w-7xl mx-auto px-4 py-8 w-full">
              <EntryHeader
                entries={entries}
                activeStatus={activeStatus}
                activeType={activeType}
                sortMode={sortMode}
                selectMode={selectMode}
                selectedCount={selectedIds.length}
                onStatusChange={handleStatusChange}
                onTypeChange={handleTypeChange}
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
                onStatusChange={handleStatusChange}
                onEntryClick={setSelectedEntry}
                onDragEnd={handleDragEnd}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onSelect={handleSelect}
              />
            </div>
          } />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>

      {/* 底部导航栏 */}
      <BottomNavigation />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-24 right-8 z-40 flex flex-col gap-4">
        {/* Add Entry Button */}
        <button
          onClick={handleOpenAddModal}
          className="w-14 h-14 bg-primary-container text-on-primary rounded-xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
          title="添加影集"
        >
          <Edit3 className="w-7 h-7" />
        </button>
      </div>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {isEntryModalOpen && (
          <EntryModal
            onClose={handleCloseEntryModal}
            onSave={handleSaveEntry}
            initialData={editingEntry || undefined}
            isSaving={saving}
          />
        )}
        {selectedEntry && (
          <JournalModal
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
            onEdit={handleOpenEditModal}
            onDelete={() => handleDeleteEntry(selectedEntry.id)}
            onSaveReflections={handleSaveReflections}
          />
        )}
      </AnimatePresence>

      {/* Import Modal */}
      {isImportModalOpen && (
        <ImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImport}
        />
      )}

      {/* Subtle Background Tint */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-tr from-primary/5 to-transparent mix-blend-multiply z-0"></div>
    </div>
  );
}
