/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, User } from 'lucide-react';

/**
 * 底部导航栏组件
 */
export function BottomNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    {
      path: '/',
      icon: <Home className="w-5 h-5" />,
      label: '记录',
    },
    {
      path: '/stats',
      icon: <BarChart3 className="w-5 h-5" />,
      label: '统计',
    },
    {
      path: '/profile',
      icon: <User className="w-5 h-5" />,
      label: '我的',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-outline/10 z-40 shadow-lg">
      <div className="flex justify-around items-center h-16 max-w-3xl mx-auto">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}
            >
              <div className={`${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                {item.icon}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}