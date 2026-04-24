/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase';
import { Settings, Shield, Database, Info, ChevronRight, LogOut, User, Bell, Download, Trash2, HelpCircle, Heart } from 'lucide-react';

/**
 * 个人中心页面
 * 显示用户信息和设置选项
 */
export function ProfilePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      setIsLoading(true);
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('退出登录失败:', error);
        alert('退出登录失败，请重试');
      } finally {
        setIsLoading(false);
      }
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

  // 菜单项组件
  const MenuItem = ({ icon, title, subtitle, right, onClick }: any) => (
    <div
      className="flex items-center justify-between p-3 hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <p className="text-on-surface font-medium">{title}</p>
          {subtitle && <p className="text-on-surface-variant text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {right}
        <ChevronRight className="w-5 h-5 text-on-surface-variant" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-primary mb-6 text-center">个人中心</h1>

        {/* 用户信息 */}
        <div className="bg-surface rounded-xl p-6 shadow-sm mb-8 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
            <span className="text-primary text-3xl font-bold">
              {user.email?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-on-surface">{user.email}</h2>
          <p className="text-on-surface-variant text-sm mt-1">账号创建于: {new Date(user.created_at).toLocaleDateString()}</p>
          <p className="text-on-surface-variant text-sm mt-1">用户ID: {user.id.slice(0, 8)}...</p>
        </div>

        {/* 设置选项 */}
        <div className="space-y-6">
          {/* 账号设置 */}
          <div className="bg-surface rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              账号设置
            </h3>
            <div className="space-y-2">
              <MenuItem
                icon={<Shield className="w-5 h-5" />}
                title="修改密码"
                subtitle="定期更新密码以保护账号安全"
                right={null}
                onClick={() => alert('修改密码功能开发中')}
              />
              <MenuItem
                icon={<Bell className="w-5 h-5" />}
                title="通知设置"
                subtitle="管理应用通知"
                right={null}
                onClick={() => alert('通知设置功能开发中')}
              />
            </div>
          </div>

          {/* 数据管理 */}
          <div className="bg-surface rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              数据管理
            </h3>
            <div className="space-y-2">
              <MenuItem
                icon={<Download className="w-5 h-5" />}
                title="导出数据"
                subtitle="将你的影集数据导出为JSON格式"
                right={null}
                onClick={() => alert('导出数据功能开发中')}
              />
              <MenuItem
                icon={<Trash2 className="w-5 h-5" />}
                title="清除缓存"
                subtitle="清理应用缓存，释放存储空间"
                right={null}
                onClick={() => {
                  if (window.confirm('确定要清除缓存吗？')) {
                    // 清除缓存逻辑
                    alert('缓存已清除');
                  }
                }}
              />
            </div>
          </div>

          {/* 关于 */}
          <div className="bg-surface rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              关于
            </h3>
            <div className="space-y-2">
              <MenuItem
                icon={<HelpCircle className="w-5 h-5" />}
                title="帮助与反馈"
                subtitle="获取帮助或提交反馈"
                right={null}
                onClick={() => alert('帮助与反馈功能开发中')}
              />
              <MenuItem
                icon={<Heart className="w-5 h-5" />}
                title="关于应用"
                subtitle="版本信息及隐私政策"
                right={<span className="text-on-surface-variant text-sm">1.0.0</span>}
                onClick={() => alert('关于应用功能开发中')}
              />
            </div>
          </div>

          {/* 退出登录按钮 */}
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full py-3 bg-error text-white rounded-xl font-medium hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            <span>{isLoading ? '退出中...' : '退出登录'}</span>
          </button>

          {/* 版权信息 */}
          <div className="text-center text-on-surface-variant text-xs mt-8">
            <p>© 2026 闪记 - 剧影日记</p>
            <p className="mt-1">记录你的观影时光</p>
          </div>
        </div>
      </div>
    </div>
  );
}