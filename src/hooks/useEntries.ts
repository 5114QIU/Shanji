/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabase';
import { DramaEntry } from '../types';
import type { User } from '@supabase/supabase-js';

export function useEntries(user: User | null, authChecked: boolean) {
  const [entries, setEntries] = useState<DramaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 当认证状态确认后，如果用户未登录，停止加载
  useEffect(() => {
    if (authChecked && !user) {
      setLoading(false);
    }
  }, [authChecked, user]);

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 尝试按 order 字段排序，如果数据库中没有该字段，会自动忽略这个排序条件
      const { data, error } = await supabase
        .from('dramas')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 转换数据库字段到前端格式
      const formattedData: DramaEntry[] = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        title: item.title,
        poster: item.poster || '',
        rating: item.rating || 0,
        tags: item.tags || [],
        actors: item.actors || [],
        platform: item.platform || '',
        summary: item.summary || '',
        reflection: item.reflection || '',
        reflections: item.reflections || [],
        date: item.date || '',
        releaseDate: item.release_date || '',
        watchCount: item.watch_count || 1,
        firstEncounter: item.first_encounter,
        completionDate: item.completion_date,
        status: item.status || 'completed',
        isMustWatch: item.is_must_watch || false,
        currentEpisode: item.current_episode,
        totalEpisodes: item.total_episodes,
        type: item.type || 'tv',
      }));

      setEntries(formattedData);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveEntry = useCallback(async (entry: DramaEntry) => {
    if (!user) return;
    setSaving(true);

    try {
      console.log('开始保存影集到数据库:', { id: entry.id, title: entry.title });

      // 转换前端字段到数据库格式
      const dbData: any = {
        user_id: user.id,
        title: entry.title,
        poster: entry.poster,
        rating: entry.rating,
        tags: entry.tags,
        actors: entry.actors,
        platform: entry.platform,
        summary: entry.summary,
        reflection: entry.reflection,
        reflections: entry.reflections || [],
        date: entry.date,
        release_date: entry.releaseDate,
        watch_count: entry.watchCount,
        first_encounter: entry.firstEncounter,
        completion_date: entry.completionDate,
        status: entry.status,
        is_must_watch: entry.isMustWatch,
        current_episode: entry.currentEpisode,
        total_episodes: entry.totalEpisodes,
        type: entry.type || 'tv',
      };

      console.log('准备保存的数据:', { reflections: dbData.reflections });

      // 只在 entry.order 存在时添加 order 字段
      if (entry.order !== undefined) {
        dbData.order = entry.order;
      }

      if (entry.id) {
        console.log('更新现有影集:', entry.id);
        const { error } = await supabase
          .from('dramas')
          .update(dbData)
          .eq('id', entry.id);

        if (error) {
          console.error('数据库更新错误:', error);
          throw error;
        }
        console.log('影集更新成功');
      } else {
        console.log('创建新影集');
        const { error } = await supabase
          .from('dramas')
          .insert(dbData);

        if (error) {
          console.error('数据库插入错误:', error);
          throw error;
        }
        console.log('影集创建成功');
      }

      // 重新获取数据
      await fetchEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [user, fetchEntries]);

  const deleteEntry = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('dramas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 重新获取数据
      await fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  }, [fetchEntries]);

  const deleteEntries = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      const { error } = await supabase
        .from('dramas')
        .delete()
        .in('id', ids);

      if (error) throw error;

      // 重新获取数据
      await fetchEntries();
    } catch (error) {
      console.error('Error deleting entries:', error);
      throw error;
    }
  }, [fetchEntries]);

  const updateEntryOrder = useCallback(async (orderedIds: string[]) => {
    if (!user || orderedIds.length === 0) return;

    try {
      // 批量更新数据库中的排序
      // 这里使用 Promise.all 来并行执行所有更新操作
      const updatePromises = orderedIds.map((id, index) => {
        return supabase
          .from('dramas')
          .update({ order: index })
          .eq('id', id)
          .eq('user_id', user.id);
      });

      const results = await Promise.all(updatePromises);

      // 检查是否有错误
      results.forEach((result, index) => {
        if (result.error) {
          console.warn('Error updating order for entry', orderedIds[index], result.error);
        }
      });

      // 不立即重新获取数据，而是在前端更新排序
      // 这样可以避免页面自动下滑
      // await fetchEntries();
    } catch (error) {
      console.error('Error updating entry order:', error);
      // 即使出错也继续执行，确保前端排序功能正常
    }
  }, [user]);

  return {
    entries,
    loading,
    saving,
    fetchEntries,
    saveEntry,
    deleteEntry,
    deleteEntries,
    updateEntryOrder,
    setEntries
  };
}
