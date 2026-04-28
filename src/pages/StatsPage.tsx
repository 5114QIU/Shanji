/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEntries } from '../hooks/useEntries';
import { analytics, events } from '../services/analytics';

/**
 * 统计回顾页面
 * 显示用户的影集统计信息
 */
export function StatsPage() {
  const { user, authChecked } = useAuth();
  const { entries, loading, fetchEntries } = useEntries(user, authChecked);
  const [stats, setStats] = useState({
    total: 0,
    totalMinutes: 0,
    streak: 0,
    genreDistribution: {} as Record<string, number>,
    monthlyData: {} as Record<string, number>,
  });

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user, fetchEntries]);

  useEffect(() => {
    analytics.event(events.statsView);
  }, []);

  useEffect(() => {
    if (entries.length > 0) {
      const total = entries.length;

      // 计算总时长（假设电影90分钟，电视剧每集45分钟）
      const totalMinutes = entries.reduce((sum, entry) => {
        if (entry.type === 'movie') {
          return sum + 90; // 假设电影平均90分钟
        } else if (entry.type === 'tv' && entry.totalEpisodes) {
          return sum + (entry.totalEpisodes * 45); // 假设每集45分钟
        }
        return sum + 60; // 默认60分钟
      }, 0);

      // 计算连续观影天数（streak）
      const streak = calculateStreak(entries);

      // 类型分布
      const genreDistribution = entries.reduce((acc, entry) => {
        entry.tags?.forEach((tag: string) => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      // 月度分布
      const monthlyData = calculateMonthlyData(entries);

      setStats({
        total,
        totalMinutes,
        streak,
        genreDistribution,
        monthlyData,
      });
    }
  }, [entries]);

  // 计算连续观影天数
  const calculateStreak = (entries: any[]) => {
    if (entries.length === 0) return 0;

    // 提取所有观看日期并去重排序
    const watchDates = entries
      .map(entry => {
        if (entry.watchDate) {
          return new Date(entry.watchDate).toISOString().split('T')[0];
        }
        return null;
      })
      .filter((date): date is string => date !== null)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (watchDates.length === 0) return 0;

    let streak = 1;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 检查最近的日期是否是今天或昨天
    if (watchDates[0] !== today && watchDates[0] !== yesterday) {
      return 0;
    }

    // 计算连续天数
    for (let i = 0; i < watchDates.length - 1; i++) {
      const currentDate = new Date(watchDates[i]);
      const nextDate = new Date(watchDates[i + 1]);
      const dayDiff = (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24);

      if (dayDiff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  // 计算月度数据
  const calculateMonthlyData = (entries: any[]) => {
    const monthly: Record<string, number> = {};

    entries.forEach(entry => {
      if (entry.watchDate) {
        const date = new Date(entry.watchDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthly[monthKey] = (monthly[monthKey] || 0) + 1;
      }
    });

    // 生成过去12个月的数据
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[monthKey]) {
        monthly[monthKey] = 0;
      }
    }

    return monthly;
  };

  // 格式化时长
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分钟`;
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-8 text-center">观影统计</h1>

        {/* 观影总览 */}
        <div className="bg-surface rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-on-surface mb-6">观影总览</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container rounded-lg p-4 text-center">
              <p className="text-on-surface-variant text-sm mb-2">总观影数量</p>
              <p className="text-3xl font-bold text-on-surface">{stats.total}</p>
              <p className="text-xs text-on-surface-variant mt-1">部作品</p>
            </div>
            <div className="bg-surface-container rounded-lg p-4 text-center">
              <p className="text-on-surface-variant text-sm mb-2">总观影时长</p>
              <p className="text-3xl font-bold text-on-surface">{formatDuration(stats.totalMinutes)}</p>
              <p className="text-xs text-on-surface-variant mt-1">观看时间</p>
            </div>
            <div className="bg-surface-container rounded-lg p-4 text-center">
              <p className="text-on-surface-variant text-sm mb-2">连续观影</p>
              <p className="text-3xl font-bold text-on-surface">{stats.streak}</p>
              <p className="text-xs text-on-surface-variant mt-1">天</p>
            </div>
          </div>
        </div>

        {/* 偏好画像 */}
        <div className="bg-surface rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-on-surface mb-6">偏好画像</h2>
          <div className="space-y-4">
            {Object.entries(stats.genreDistribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([genre, count]) => {
                const percentage = ((count / stats.total) * 100).toFixed(1);
                return (
                  <div key={genre} className="flex items-center justify-between">
                    <span className="text-on-surface font-medium">{genre}</span>
                    <div className="flex items-center gap-3 flex-1 max-w-md">
                      <div className="flex-1 bg-surface-container rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${percentage}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-on-surface-variant text-sm min-w-[60px] text-right">
                        {count}部 ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 时间趋势 */}
        <div className="bg-surface rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-on-surface mb-6">时间趋势</h2>
          <div className="h-64 relative">
            {/* 折线图 */}
            <div className="h-full w-full">
              {/* Y轴刻度 */}
              <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-on-surface-variant">
                {[0, 2, 4, 6, 8, 10].map(num => (
                  <div key={num} className="transform -translate-y-1/2">{num}</div>
                ))}
              </div>

              {/* 图表区域 */}
              <div className="ml-12 h-full relative">
                {/* 网格线 */}
                <div className="absolute inset-0 grid grid-rows-5">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="border-b border-outline/10"></div>
                  ))}
                </div>

                {/* 折线 */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    points={Object.entries(stats.monthlyData)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([, count], index, array) => {
                        const maxCount = Math.max(...Object.values(stats.monthlyData));
                        const x = (index / (array.length - 1)) * 100;
                        const y = 100 - (count / (maxCount || 1)) * 100;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />

                  {/* 数据点 */}
                  {Object.entries(stats.monthlyData)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([, count], index, array) => {
                      const maxCount = Math.max(...Object.values(stats.monthlyData));
                      const x = (index / (array.length - 1)) * 100;
                      const y = 100 - (count / (maxCount || 1)) * 100;
                      return (
                        <circle
                          key={index}
                          cx={x}
                          cy={y}
                          r="3"
                          fill="#3b82f6"
                        />
                      );
                    })}
                </svg>

                {/* X轴标签 */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-on-surface-variant">
                  {Object.entries(stats.monthlyData)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([month]) => {
                      const [year, monthNum] = month.split('-');
                      return (
                        <div key={month} className="transform -translate-x-1/2">
                          {monthNum}/{year.slice(2)}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
