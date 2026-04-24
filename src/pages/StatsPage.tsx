/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEntries } from '../hooks/useEntries';

/**
 * 统计回顾页面
 * 显示用户的影集统计信息
 */
export function StatsPage() {
  const { user, authChecked } = useAuth();
  const { entries, loading, fetchEntries } = useEntries(user, authChecked);
  const [stats, setStats] = useState({
    total: 0,
    movies: 0,
    tvShows: 0,
    averageRating: 0,
    genreDistribution: {} as Record<string, number>,
    yearDistribution: {} as Record<string, number>,
  });

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user, fetchEntries]);

  useEffect(() => {
    if (entries.length > 0) {
      const total = entries.length;
      const movies = entries.filter(entry => entry.type === 'movie').length;
      const tvShows = entries.filter(entry => entry.type === 'tv').length;
      const totalRating = entries.reduce((sum, entry) => sum + (entry.rating || 0), 0);
      const averageRating = total > 0 ? (totalRating / total).toFixed(1) : '0';

      // 类型分布
      const genreDistribution = entries.reduce((acc, entry) => {
        entry.tags?.forEach((tag: string) => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      // 年份分布
      const yearDistribution = entries.reduce((acc, entry) => {
        if (entry.releaseDate) {
          const year = entry.releaseDate.substring(0, 4);
          acc[year] = (acc[year] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      setStats({
        total,
        movies,
        tvShows,
        averageRating: parseFloat(averageRating),
        genreDistribution,
        yearDistribution,
      });
    }
  }, [entries]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-on-surface-variant">请先登录</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-on-surface-variant">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-primary mb-6 text-center">统计回顾</h1>

        {/* 基本统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface rounded-xl p-4 shadow-sm">
            <p className="text-on-surface-variant text-sm">总记录</p>
            <p className="text-2xl font-bold text-on-surface">{stats.total}</p>
          </div>
          <div className="bg-surface rounded-xl p-4 shadow-sm">
            <p className="text-on-surface-variant text-sm">电影</p>
            <p className="text-2xl font-bold text-on-surface">{stats.movies}</p>
          </div>
          <div className="bg-surface rounded-xl p-4 shadow-sm">
            <p className="text-on-surface-variant text-sm">电视剧</p>
            <p className="text-2xl font-bold text-on-surface">{stats.tvShows}</p>
          </div>
          <div className="bg-surface rounded-xl p-4 shadow-sm">
            <p className="text-on-surface-variant text-sm">平均评分</p>
            <p className="text-2xl font-bold text-on-surface">{stats.averageRating}</p>
          </div>
        </div>

        {/* 类型分布 */}
        <div className="bg-surface rounded-xl p-4 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-on-surface mb-4">类型分布</h2>
          <div className="space-y-2">
            {Object.entries(stats.genreDistribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([genre, count]) => (
                <div key={genre} className="flex items-center justify-between">
                  <span className="text-on-surface">{genre}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant">{count}</span>
                    <div className="flex-1 max-w-[150px] bg-surface-container rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(count / stats.total) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 年份分布 */}
        <div className="bg-surface rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-on-surface mb-4">年份分布</h2>
          <div className="space-y-2">
            {Object.entries(stats.yearDistribution)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .slice(0, 10)
              .map(([year, count]) => (
                <div key={year} className="flex items-center justify-between">
                  <span className="text-on-surface">{year}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant">{count}</span>
                    <div className="flex-1 max-w-[150px] bg-surface-container rounded-full h-2">
                      <div
                        className="bg-secondary h-2 rounded-full"
                        style={{
                          width: `${(count / stats.total) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}