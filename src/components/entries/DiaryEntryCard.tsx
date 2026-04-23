/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Heart, Check } from 'lucide-react';
import { DramaEntry } from '../../types';

interface DiaryEntryCardProps {
  entry: DramaEntry;
  onClick: () => void;
  rank?: number;
  selectMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export const DiaryEntryCard: React.FC<DiaryEntryCardProps> = ({
  entry,
  onClick,
  rank,
  selectMode = false,
  selected = false,
  onSelect
}) => {
  const getRatingEmoji = (rating: number) => {
    if (rating <= 1) return '😞';
    if (rating <= 2) return '😕';
    if (rating <= 3) return '😐';
    if (rating <= 4) return '😊';
    return '😍';
  };

  const getRatingText = (rating: number) => {
    if (rating <= 1) return '不喜欢';
    if (rating <= 2) return '一般';
    if (rating <= 3) return '还行';
    if (rating <= 4) return '喜欢';
    return '超爱';
  };

  const handleClick = (e: React.MouseEvent) => {
    if (selectMode && onSelect) {
      e.stopPropagation();
      onSelect(entry.id);
    } else {
      onClick();
    }
  };

  return (
    <motion.div
      layoutId={`entry-${entry.id}`}
      onClick={handleClick}
      className={`group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col border-2 ${selectMode && selected ? 'border-primary ring-2 ring-primary/30' : 'border-gray-100'
        }`}
    >
      {/* 海报区域 - 2:3 宽高比 */}
      <div className="relative w-full aspect-[2/3] bg-gray-200 overflow-hidden">
        {entry.poster ? (
          <img
            src={entry.poster}
            alt={entry.title}
            className={`w-full h-full object-cover transition-transform duration-300 ${!selectMode ? 'group-hover:scale-105' : ''}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            海报
          </div>
        )}
        {/* 选择模式下的复选框 */}
        {selectMode && (
          <div
            className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-colors ${selected
              ? 'bg-primary text-white'
              : 'bg-white/90 text-gray-400 border-2 border-gray-300'
              }`}
          >
            {selected && <Check className="w-4 h-4" />}
          </div>
        )}
        {/* 排名序号 - 非选择模式时显示 */}
        {!selectMode && rank && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
            {rank}
          </div>
        )}
        {/* 必看标记 */}
        {entry.isMustWatch && (
          <div className="absolute top-2 right-2">
            <Heart className="w-4 h-4 fill-red-500 text-red-500 drop-shadow" />
          </div>
        )}
        {/* 爱心数量标签 - 右上角偏下 */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-0.5">
          <span>{entry.rating}</span>
          <span className="text-red-400">❤</span>
        </div>
      </div>

      {/* 卡片内容区域 */}
      <div className="p-2 flex flex-col flex-grow">
        {/* 剧名 - 一行截断 */}
        <h3 className="font-bold text-gray-900 truncate text-xs min-[400px]:text-sm min-[600px]:text-base group-hover:text-primary transition-colors">
          {entry.title}
        </h3>

        {/* 演员 - 一行截断 */}
        <p className="mt-1 text-gray-600 text-[10px] min-[400px]:text-xs truncate">
          {entry.actors.join(' / ')}
        </p>

        {/* 观看进度 - 仅在看状态且有集数信息时显示 */}
        {entry.status === 'watching' && entry.totalEpisodes && entry.totalEpisodes > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
              <span>进度</span>
              <span className="text-primary font-medium">{entry.currentEpisode || 0}/{entry.totalEpisodes}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((entry.currentEpisode || 0) / entry.totalEpisodes) * 100)}%`
                }}
              />
            </div>
          </div>
        )}

        {/* 播出平台和集数 */}
        <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-gray-400">
          <div className="truncate">
            {entry.platform}
          </div>
          {entry.type === 'tv' && entry.totalEpisodes && (
            <div className="flex items-center gap-1">
              <span>共{entry.totalEpisodes}集</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
