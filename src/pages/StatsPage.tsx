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
    totalHours: 0,
    streak: 0,
    typeDistribution: {} as Record<string, number>,
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
          return sum + 90;
        } else if (entry.type === 'tv' && entry.totalEpisodes) {
          return sum + (entry.totalEpisodes * 45);
        }
        return sum + 60;
      }, 0);

      const totalHours = Math.floor(totalMinutes / 60);

      // 计算连续观影天数（streak）
      const streak = calculateStreak(entries);

      // 类型分布
      const typeDistribution = entries.reduce((acc, entry) => {
        const type = entry.type === 'movie' ? '电影' : entry.type === 'tv' ? '电视剧' :
          entry.type === 'variety' ? '综艺' : '纪录片';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 如果没有数据，设置默认类型分布
      if (Object.keys(typeDistribution).length === 0) {
        typeDistribution['电视剧'] = 1;
        typeDistribution['电影'] = 1;
        typeDistribution['综艺'] = 1;
        typeDistribution['纪录片'] = 1;
      }

      // 月度分布
      const monthlyData = calculateMonthlyData(entries);

      setStats({
        total,
        totalHours,
        streak,
        typeDistribution,
        monthlyData,
      });
    }
  }, [entries]);

  // 计算连续观影天数
  const calculateStreak = (entries: any[]) => {
    if (entries.length === 0) return 0;

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

    if (watchDates[0] !== today && watchDates[0] !== yesterday) {
      return 0;
    }

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

  // 获取环形图颜色
  const getColor = (type: string) => {
    const colors: Record<string, string> = {
      '电视剧': '#3B82F6',
      '电影': '#8B5CF6',
      '综艺': '#10B981',
      '纪录片': '#F59E0B',
    };
    return colors[type] || '#6B7280';
  };

  // 计算环形图路径
  const calculateCirclePath = (percentage: number, startAngle: number) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = startAngle * (circumference / 360);
    const length = percentage * circumference;

    return {
      strokeDasharray: `${length} ${circumference}`,
      strokeDashoffset: -offset,
    };
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

  const sortedMonthlyData = Object.entries(stats.monthlyData).sort(([a], [b]) => a.localeCompare(b));
  const maxMonthlyCount = Math.max(...Object.values(stats.monthlyData), 1);

  const totalTypeCount = Object.values(stats.typeDistribution).reduce((a, b) => a + b, 0);
  let currentAngle = 0;

  // 获取当前年份
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 标题 */}
        <h1 className="text-xl font-bold text-on-surface mb-6 text-center">
          {currentYear}年1月-12月
        </h1>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-container rounded-xl p-5 text-center shadow-sm">
            <p className="text-on-surface-variant text-xs mb-2">观影时长(小时)</p>
            <p className="text-3xl font-bold text-on-surface">{stats.totalHours}</p>
            <p className="text-sm text-on-surface-variant mt-1">h</p>
          </div>
          <div className="bg-surface-container rounded-xl p-5 text-center shadow-sm">
            <p className="text-on-surface-variant text-xs mb-2">记录作品(部)</p>
            <p className="text-3xl font-bold text-on-surface">{stats.total}</p>
            <p className="text-sm text-on-surface-variant mt-1">部</p>
          </div>
        </div>

        {/* 条形图 */}
        <div className="bg-surface rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-on-surface mb-6">月度观影</h2>
          <div className="flex items-end justify-between h-48 gap-2">
            {sortedMonthlyData.map(([month, count]) => {
              const height = (count / maxMonthlyCount) * 100;
              const [, monthNum] = month.split('-');
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-primary to-info rounded-t-md transition-all duration-500 ease-out"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  ></div>
                  <span className="text-xs text-on-surface-variant">{parseInt(monthNum)}月</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 环形图 */}
        <div className="bg-surface rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-on-surface mb-6">类型分布</h2>
          <div className="flex items-center gap-8">
            {/* 环形图 */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="12"
                />
                {Object.entries(stats.typeDistribution).map(([type, count]) => {
                  const percentage = count / totalTypeCount;
                  const pathProps = calculateCirclePath(percentage, currentAngle);
                  const color = getColor(type);
                  currentAngle += percentage * 360;
                  return (
                    <circle
                      key={type}
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={color}
                      strokeWidth="12"
                      strokeLinecap="round"
                      style={pathProps}
                      className="transition-all duration-700"
                    />
                  );
                })}
              </svg>
              {/* 中心圆 */}
              <div className="absolute inset-3 rounded-full bg-surface flex items-center justify-center">
                <span className="text-lg font-bold text-on-surface">{stats.total}</span>
              </div>
            </div>

            {/* 图例 */}
            <div className="flex-1 space-y-3">
              {Object.entries(stats.typeDistribution).map(([type, count]) => {
                const percentage = ((count / totalTypeCount) * 100).toFixed(0);
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getColor(type) }}
                    ></div>
                    <span className="text-on-surface font-medium text-sm">{type}</span>
                    <span className="text-on-surface-variant text-sm ml-auto">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}