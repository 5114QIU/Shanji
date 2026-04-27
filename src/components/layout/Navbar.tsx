/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, LogOut, Upload, Mic, MicOff, ArrowLeft } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useToast } from '../../App';

// 简化的 SpeechRecognition 类型声明
type SpeechRecognition = any;
interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

interface NavbarProps {
  user: User | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLogout: () => void;
  onImport: () => void;
  onBack?: () => void;
}

export function Navbar({ user, searchQuery, onSearchChange, onLogout, onImport, onBack }: NavbarProps) {
  const location = useLocation();
  const { addToast } = useToast();
  const isHomePage = location.pathname === '/';
  const isStatsPage = location.pathname === '/stats';
  const isProfilePage = location.pathname === '/profile';
  if (!user) return null;

  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  const startVoiceRecognition = () => {
    const windowWithSpeech = window as WindowWithSpeechRecognition;
    if (windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition) {
      const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.lang = 'zh-CN';
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onSearchChange(transcript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.start();
      setRecognition(recognitionInstance);
      setIsListening(true);
    } else {
      addToast('您的浏览器不支持语音识别功能', 'error');
    }
  };

  const stopVoiceRecognition = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
      setIsListening(false);
    }
  };

  return (
    <nav className={`sticky top-0 z-50 ${isHomePage ? 'bg-surface/80 backdrop-blur-md border-b border-outline/10' : 'bg-surface'} px-4 py-3`}>
      {/* 首页导航 */}
      {isHomePage && (
        <>
          {/* 桌面端导航 */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex-1">
              <div className="relative flex items-center bg-gray-100 rounded-full px-4 py-2.5">
                <Search className="w-4 h-4 text-gray-400 mr-2.5" />
                <input
                  type="text"
                  placeholder="搜索你的档案..."
                  className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 w-full text-gray-700 placeholder:text-gray-400 text-sm"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                <button
                  onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors ml-1"
                  title={isListening ? "停止语音录入" : "语音录入"}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 text-primary" />
                  ) : (
                    <Mic className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={onImport}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors text-sm font-medium"
              title="导入数据"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">导入</span>
            </button>
          </div>

          {/* 移动端导航 */}
          <div className="md:hidden">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="relative flex items-center bg-gray-100 rounded-full px-3 py-2">
                  <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="搜索你的档案..."
                    className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 w-full text-gray-700 placeholder:text-gray-400 text-sm"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                  <button
                    onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                    className="p-1.5 hover:bg-gray-200 rounded-full transition-colors ml-1 flex-shrink-0"
                    title={isListening ? "停止语音录入" : "语音录入"}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4 text-primary" />
                    ) : (
                      <Mic className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={onImport}
                className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors flex-shrink-0"
                title="导入数据"
              >
                <Upload className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* 统计页和个人主页导航 */}
      {(isStatsPage || isProfilePage) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
                title="返回"
              >
                <ArrowLeft className="w-5 h-5 text-on-surface" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-on-surface">
              {isStatsPage ? '观影统计' : '个人中心'}
            </h1>
          </div>
        </div>
      )}
    </nav>
  );
}
