import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 检测 iOS
    const detectIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(detectIOS);

    // 检查是否已经安装（standalone 模式）
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 检查是否已经关闭过提示
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      // 如果是 iOS，每次访问都显示引导
      if (detectIOS) {
        setShowPrompt(true);
        setTimeout(() => setIsVisible(true), 100);
      }
      return;
    }

    // iOS 始终显示引导提示
    if (detectIOS) {
      setShowPrompt(true);
      setTimeout(() => setIsVisible(true), 100);
      return;
    }

    // Android/其他平台：监听 beforeinstallprompt 事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
      setTimeout(() => setIsVisible(true), 100);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsInstalled(true);
      }
    } catch (err) {
      console.error('Install failed:', err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShowPrompt(false);
      // Android 保存关闭状态，iOS 不保存（每次都引导）
      if (!isIOS) {
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      }
    }, 300);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 100 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-4 mx-auto max-w-sm border border-outline/10">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 mb-1">添加到主屏幕</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {isIOS
                    ? '点击 Safari 底部的分享按钮，然后选择"添加到主屏幕"，即可像 APP 一样使用'
                    : '将 Drama Diary 添加到主屏幕，随时记录看剧感悟'
                  }
                </p>
              </div>

              <button
                onClick={handleDismiss}
                className="p-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isIOS && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  稍后
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  添加
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Service Worker 注册钩子
export function useServiceWorker() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered:', registration.scope);
          })
          .catch((error) => {
            console.log('SW registration failed:', error);
          });
      });
    }
  }, []);
}
