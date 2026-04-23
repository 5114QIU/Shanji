/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Lock, LogIn, UserPlus, ChevronDown, Check, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../supabase';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

const REMEMBERED_EMAILS_KEY = 'drama_diary_emails';
const LAST_USED_EMAIL_KEY = 'drama_diary_last_email';

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgotPassword'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // 记住邮箱相关状态
  const [rememberedEmails, setRememberedEmails] = useState<string[]>([]);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // 用于检测点击外部关闭下拉菜单
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 从 localStorage 加载记住的邮箱 - 直接在初始化时读取
  useEffect(() => {
    try {
      // 加载邮箱列表
      const stored = localStorage.getItem(REMEMBERED_EMAILS_KEY);
      let emails: string[] = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          emails = parsed;
        }
      }
      setRememberedEmails(emails);

      // 加载最后使用的邮箱
      const lastEmail = localStorage.getItem(LAST_USED_EMAIL_KEY);
      if (lastEmail && emails.includes(lastEmail)) {
        setEmail(lastEmail);
      } else if (emails.length > 0) {
        setEmail(emails[0]);
      }

      setIsLoaded(true);
    } catch {
      setIsLoaded(true);
    }
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEmailDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // 保存邮箱到本地存储
  const saveEmailToStorage = useCallback((emailToSave: string) => {
    if (!emailToSave) return;

    // 始终保存最后使用的邮箱
    localStorage.setItem(LAST_USED_EMAIL_KEY, emailToSave);

    // 如果勾选了"记住账号"，则添加到列表
    if (rememberMe) {
      setRememberedEmails(prev => {
        // 去重并将当前邮箱放到最前面
        const filtered = prev.filter(e => e !== emailToSave);
        const updated = [emailToSave, ...filtered].slice(0, 5); // 最多保存5个
        localStorage.setItem(REMEMBERED_EMAILS_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }, [rememberMe]);

  // 删除记住的邮箱
  const removeEmailFromStorage = useCallback((emailToRemove: string, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setRememberedEmails(prev => {
      const updated = prev.filter(e => e !== emailToRemove);
      localStorage.setItem(REMEMBERED_EMAILS_KEY, JSON.stringify(updated));
      return updated;
    });

    // 如果删除的是当前显示的邮箱，清空输入框
    if (email === emailToRemove) {
      setEmail('');
    }

    // 如果删除的是最后使用的邮箱，也清除
    const lastEmail = localStorage.getItem(LAST_USED_EMAIL_KEY);
    if (lastEmail === emailToRemove) {
      localStorage.removeItem(LAST_USED_EMAIL_KEY);
    }

    // 如果删除后没有邮箱了，关闭下拉菜单
    if (rememberedEmails.length <= 1) {
      setShowEmailDropdown(false);
    }
  }, [email, rememberedEmails.length]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 登录成功，保存邮箱
      saveEmailToStorage(email);
      onAuthSuccess();
    } catch (error: any) {
      setAuthError(error.message || '登录失败，请重试');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setAuthError('注册成功！请查收验证邮件后登录。');
      setAuthMode('login');
      // 注册成功也保存邮箱
      saveEmailToStorage(email);
    } catch (error: any) {
      setAuthError(error.message || '注册失败，请重试');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      // 如果在开发环境使用 localhost，手机端点击邮件中的链接通常无法访问本机。
      // 建议在 .env 中设置 VITE_APP_URL 为可被手机访问的地址（例如 http://192.168.1.10:3000 或生产域名）。
      const redirectBase = (import.meta.env as any).VITE_APP_URL || window.location.origin;
      const redirectTo = `${redirectBase.replace(/\/$/, '')}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      setAuthError('重置密码链接已发送到您的邮箱，请查收。');
    } catch (error: any) {
      setAuthError(error.message || '发送失败，请重试');
    } finally {
      setAuthLoading(false);
    }
  };

  const selectEmail = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setShowEmailDropdown(false);
  };

  const toggleDropdown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEmailDropdown(!showEmailDropdown);
  };

  // 如果还没加载完成，显示加载状态
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-surface p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-surface p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center space-y-2 sm:space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl text-primary font-bold">Drama Diary</h1>
          <p className="text-on-surface-variant text-base sm:text-lg opacity-80">
            记录看过的每一部好剧，留下那一刻的真实感悟
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 sm:space-y-6">
          {authMode === 'forgotPassword' ? (
            <h2 className="text-xl font-bold text-center text-gray-800">重置密码</h2>
          ) : (
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${authMode === 'login'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                登录
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                className={`flex-1 py-3 text-center font-medium transition-colors ${authMode === 'signup'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                注册
              </button>
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : authMode === 'signup' ? handleSignup : handleForgotPassword} className="space-y-4 sm:space-y-5">
            {/* 邮箱输入框 - 带下拉选择 */}
            <div className="space-y-2" ref={dropdownRef}>
              <label className="text-sm font-medium text-gray-700">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  required
                  autoComplete="email"
                  className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-base"
                />
                {/* 下拉箭头 - 只在有记住的邮箱且是登录模式时显示 */}
                {authMode === 'login' && rememberedEmails.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleDropdown}
                    onTouchStart={toggleDropdown}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-colors active:bg-gray-300"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showEmailDropdown ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* 记住的邮箱下拉列表 */}
              {authMode === 'login' && showEmailDropdown && rememberedEmails.length > 0 && (
                <div className="relative">
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      {rememberedEmails.map((savedEmail) => (
                        <div
                          key={savedEmail}
                          onClick={() => selectEmail(savedEmail)}
                          onTouchStart={() => selectEmail(savedEmail)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer active:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <span className="flex-1 text-sm text-gray-700 truncate pr-2">
                            {savedEmail}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => removeEmailFromStorage(savedEmail, e)}
                            onTouchStart={(e) => removeEmailFromStorage(savedEmail, e)}
                            className="p-2 hover:bg-red-100 active:bg-red-200 rounded-lg transition-colors flex-shrink-0"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {authMode !== 'forgotPassword' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authMode === 'login' ? '请输入密码' : '请设置密码（至少6位）'}
                    required
                    minLength={authMode === 'signup' ? 6 : undefined}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-base"
                  />
                </div>
              </div>
            )}

            {/* 记住我选项 - 只在登录模式显示 */}
            {authMode === 'forgotPassword' && (
              <p className="text-sm text-gray-500 text-center">
                输入您注册时使用的邮箱，我们会发送重置密码链接
              </p>
            )}
            {authMode === 'login' && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`flex items-center gap-2 text-sm ${rememberMe ? 'text-primary' : 'text-gray-400'}`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-primary border-primary' : 'border-gray-300'
                    }`}>
                    {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  记住账号
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgotPassword'); setAuthError(''); }}
                  className="text-sm text-primary hover:underline"
                >
                  忘记密码？
                </button>
              </div>
            )}

            {authError && (
              <div className={`text-sm p-3 rounded-lg ${authError.includes('成功')
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-500'
                }`}>
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : authMode === 'login' ? (
                <>
                  <LogIn className="w-5 h-5" />
                  登录
                </>
              ) : authMode === 'signup' ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  注册
                </>
              ) : (
                '发送重置链接'
              )}
            </button>

            {/* 返回登录按钮 - 忘记密码模式 */}
            {authMode === 'forgotPassword' && (
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className="w-full flex items-center justify-center gap-2 py-3 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回登录
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
