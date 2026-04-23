import React, { useState, useEffect } from 'react';
import { Lock, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../supabase';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 如果 URL 中包含 Supabase 返回的 access_token/refresh_token（可能在 hash 或 query），
  // 在页面加载时用它们建立会话，并清理 URL，保证后续的 updateUser 能正常工作。
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const access_token = searchParams.get('access_token') || hashParams.get('access_token');
    const refresh_token = searchParams.get('refresh_token') || hashParams.get('refresh_token');

    if (!access_token) return;

    (async () => {
      try {
        // 将从 URL 中解析到的 token 设置为 Supabase 会话
        await supabase.auth.setSession({ access_token, refresh_token: refresh_token || undefined });
      } catch (err) {
        // 不阻塞渲染，提交时会显示错误
        // eslint-disable-next-line no-console
        console.error('Failed to set supabase session from URL', err);
      } finally {
        // 清理 URL 中的敏感参数，避免泄露
        try {
          const url = new URL(window.location.href);
          url.hash = '';
          url.searchParams.delete('access_token');
          url.searchParams.delete('refresh_token');
          url.searchParams.delete('type');
          window.history.replaceState({}, document.title, url.toString());
        } catch (e) {
          // ignore
        }
      }
    })();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('密码至少需要6位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || '重置密码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-surface p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-800">密码重置成功</h2>
            <p className="text-gray-500">您的密码已成功更新，请使用新密码登录。</p>
          </div>
          <button
            onClick={() => {
              // 清除 URL 参数并刷新页面回到登录页
              window.location.href = window.location.origin;
            }}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
          >
            返回登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-surface p-4">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center space-y-2 sm:space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl text-primary font-bold">Drama Diary</h1>
          <p className="text-on-surface-variant text-base sm:text-lg opacity-80">
            设置您的新密码
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 sm:space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">重置密码</h2>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">新密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入新密码（至少6位）"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">确认密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-base"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  设置中...
                </div>
              ) : (
                '确认重置'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = window.location.origin;
              }}
              className="w-full flex items-center justify-center gap-2 py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回登录
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
