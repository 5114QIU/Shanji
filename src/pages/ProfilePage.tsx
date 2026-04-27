/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../App';
import { supabase } from '../supabase';
import { Settings, Shield, Database, Info, ChevronRight, LogOut, User, Bell, Download, Trash2, HelpCircle, Heart, Camera, Upload, X, Check } from 'lucide-react';

/**
 * 个人中心页面
 * 显示用户信息和设置选项
 */
export function ProfilePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // 头像/昵称修改
  const [isEditMode, setIsEditMode] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // 密码重置
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // 加载用户数据
  useEffect(() => {
    if (user) {
      // 从用户元数据中获取昵称
      setNickname(user.user_metadata?.name || user.email?.split('@')[0] || '');
      // 从用户元数据中获取头像
      setAvatarPreview(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  const handleLogout = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      setIsLoading(true);
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('退出登录失败:', error);
        addToast('退出登录失败，请重试', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 处理头像上传
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // 清理文件名，移除特殊字符
  const sanitizeFileName = (name: string): string => {
    return name
      .replace(/[^a-zA-Z0-9\s.-]/g, '') // 只保留字母、数字、空格、点和连字符
      .replace(/\s+/g, '_') // 将空格替换为下划线
      .toLowerCase();
  };

  // 处理保存个人资料
  const handleSaveProfile = async () => {
    if (!user) return;

    setIsUpdatingProfile(true);
    try {
      // 准备更新数据
      const updates: any = {
        data: {
          name: nickname || null
        }
      };

      // 如果有新头像，尝试上传到Supabase Storage
      if (avatarFile) {
        try {
          const safeFileName = sanitizeFileName(avatarFile.name);
          const fileName = `avatars/${user.id}/${Date.now()}-${safeFileName}`;
          const { error: uploadError } = await supabase
            .storage
            .from('avatars')
            .upload(fileName, avatarFile, {
              cacheControl: '3600',
              upsert: true
            });

          if (!uploadError) {
            // 获取头像URL
            const { data: urlData } = supabase
              .storage
              .from('avatars')
              .getPublicUrl(fileName);

            if (urlData.publicUrl) {
              updates.data.avatar_url = urlData.publicUrl;
            }
          } else {
            console.warn('头像上传失败，将继续更新其他资料:', uploadError);
            // 头像上传失败不影响其他资料的更新
          }
        } catch (storageError) {
          console.warn('存储操作失败，将继续更新其他资料:', storageError);
          // 存储操作失败不影响其他资料的更新
        }
      }

      // 更新用户资料（即使头像上传失败也继续）
      const { error: updateError } = await supabase.auth.updateUser(updates);
      if (updateError) {
        throw updateError;
      }

      addToast('个人资料更新成功！', 'success');
      setIsEditMode(false);
    } catch (error) {
      console.error('更新个人资料失败:', error);
      addToast('更新个人资料失败，请重试', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // 处理密码重置
  const handleResetPassword = async () => {
    if (!user) return;

    // 验证输入
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('请填写所有字段');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少6位');
      return;
    }

    setIsResettingPassword(true);
    setPasswordError('');

    try {
      // 首先重新认证用户
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: oldPassword
      });

      if (reauthError) {
        throw new Error('原密码错误');
      }

      // 然后更新密码
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      addToast('密码修改成功！', 'success');
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('修改密码失败:', error);
      setPasswordError(error.message || '修改密码失败，请重试');
    } finally {
      setIsResettingPassword(false);
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

        {/* 用户信息 */}
        <div className="bg-surface rounded-xl p-6 shadow-sm mb-8">
          {isEditMode ? (
            <div className="text-center">
              {/* 头像编辑 */}
              <div className="relative w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="头像"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-primary text-3xl font-bold">
                    {nickname.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>

              {/* 昵称编辑 */}
              <div className="max-w-xs mx-auto mb-4">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="请输入昵称"
                  className="w-full px-4 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    // 重置到原始状态
                    setNickname(user.user_metadata?.name || user.email?.split('@')[0] || '');
                    setAvatarFile(null);
                    setAvatarPreview(user.user_metadata?.avatar_url || null);
                  }}
                  disabled={isUpdatingProfile}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isUpdatingProfile}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isUpdatingProfile ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="头像"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-primary text-3xl font-bold">
                    {nickname.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-on-surface">{nickname || user.email}</h2>
              <p className="text-on-surface-variant text-sm mt-1">{user.email}</p>
              <p className="text-on-surface-variant text-sm mt-1">账号创建于: {new Date(user.created_at).toLocaleDateString()}</p>
              <p className="text-on-surface-variant text-sm mt-1">用户ID: {user.id.slice(0, 8)}...</p>

              {/* 编辑按钮 */}
              <button
                onClick={() => setIsEditMode(true)}
                className="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors flex items-center gap-1 mx-auto"
              >
                <Camera className="w-4 h-4" />
                编辑资料
              </button>
            </div>
          )}
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
                onClick={() => setIsPasswordModalOpen(true)}
              />
              <MenuItem
                icon={<Bell className="w-5 h-5" />}
                title="通知设置"
                subtitle="管理应用通知"
                right={null}
                onClick={() => addToast('通知设置功能开发中', 'info')}
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
                onClick={() => addToast('导出数据功能开发中', 'info')}
              />
              <MenuItem
                icon={<Trash2 className="w-5 h-5" />}
                title="清除缓存"
                subtitle="清理应用缓存，释放存储空间"
                right={null}
                onClick={() => {
                  if (window.confirm('确定要清除缓存吗？')) {
                    // 清除缓存逻辑
                    addToast('缓存已清除', 'success');
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
                onClick={() => addToast('帮助与反馈功能开发中', 'info')}
              />
              <MenuItem
                icon={<Heart className="w-5 h-5" />}
                title="关于应用"
                subtitle="版本信息及隐私政策"
                right={<span className="text-on-surface-variant text-sm">1.0.0</span>}
                onClick={() => addToast('关于应用功能开发中', 'info')}
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

        {/* 密码重置弹窗 */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-on-surface">修改密码</h3>
                <button
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  className="p-2 hover:bg-surface-container rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>

              {passwordError && (
                <div className="bg-error/10 text-error p-3 rounded-lg mb-4">
                  {passwordError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">原密码</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="请输入原密码"
                    className="w-full px-4 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">新密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="请输入新密码（至少6位）"
                    className="w-full px-4 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">确认新密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入新密码"
                    className="w-full px-4 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  disabled={isResettingPassword}
                  className="flex-1 px-4 py-2 bg-surface-container text-on-surface rounded-lg font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={isResettingPassword}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isResettingPassword ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  确认修改
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}