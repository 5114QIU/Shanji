/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, LogOut, Upload, Mic, MicOff, Sparkles } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

// 简化的 SpeechRecognition 类型声明
type SpeechRecognition = any;
interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

interface NavbarProps {
  user: User | null;
  searchQuery: string;
  aiSearchMode: boolean;
  onSearchChange: (query: string) => void;
  onAiSearchModeChange: (enabled: boolean) => void;
  onLogout: () => void;
  onImport: () => void;
}

export function Navbar({ user, searchQuery, aiSearchMode, onSearchChange, onAiSearchModeChange, onLogout, onImport }: NavbarProps) {
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
      alert('您的浏览器不支持语音识别功能');
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
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md px-4 py-3 border-b border-outline/10">
      {/* 桌面端导航 */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">闪记</h1>
          <span className="font-serif text-lg text-outline ml-2 opacity-60">剧影日记</span>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <div className="relative flex items-center bg-gray-100 rounded-full px-4 py-2.5">
            <Search className="w-4 h-4 text-gray-400 mr-2.5" />
            <input
              type="text"
              placeholder={aiSearchMode ? "尝试：找我之前看过的高分悬疑剧..." : "搜索你的档案..."}
              className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 w-full text-gray-700 placeholder:text-gray-400 text-sm"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <button
              onClick={() => onAiSearchModeChange(!aiSearchMode)}
              className={`p-1.5 rounded-full transition-colors ml-2 ${aiSearchMode ? 'bg-primary text-white' : 'hover:bg-gray-200 text-gray-400'}`}
              title={aiSearchMode ? "关闭AI搜索" : "开启AI语义搜索"}
            >
              <Sparkles className="w-4 h-4" />
            </button>
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

        <div className="flex items-center gap-2">
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors text-sm font-medium"
            title="导入数据"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">导入</span>
          </button>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
            title="退出登录"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-surface-container-high bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      </div>

      {/* 移动端导航 */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl font-bold text-primary tracking-tight">闪记</h1>
            <span className="font-serif text-sm text-outline opacity-60">剧影日记</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onImport}
              className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
              title="导入数据"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full border-2 border-surface-container-high bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
        {/* 移动端搜索框 */}
        <div className="relative flex items-center bg-gray-100 rounded-full px-3 py-2">
          <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder={aiSearchMode ? "尝试：找我之前看过的高分悬疑剧..." : "搜索你的档案..."}
            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 w-full text-gray-700 placeholder:text-gray-400 text-sm"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            onClick={() => onAiSearchModeChange(!aiSearchMode)}
            className={`p-1.5 rounded-full transition-colors ml-1 flex-shrink-0 ${aiSearchMode ? 'bg-primary text-white' : 'hover:bg-gray-200 text-gray-400'}`}
            title={aiSearchMode ? "关闭AI搜索" : "开启AI语义搜索"}
          >
            <Sparkles className="w-4 h-4" />
          </button>
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
    </nav>
  );
}
