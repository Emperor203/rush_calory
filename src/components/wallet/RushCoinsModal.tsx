'use client';

import React from 'react';
import {
  X,
  Flame,
  TrendingUp,
  Trophy,
  Activity,
  Award,
  Zap,
  History,
} from 'lucide-react';
import { StreakResultsWidgetState } from '@/lib/telegramWidget';
import { calculateUserRank } from '@/lib/ranks';

const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

interface StreakResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: StreakResultsWidgetState;
  onOpenFullHistory: () => void;
}

export default function RushCoinsModal({
  isOpen,
  onClose,
  state,
  onOpenFullHistory,
}: StreakResultsModalProps) {
  if (!isOpen) return null;

  const rank = calculateUserRank(state.totalKm || 0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in safe-bottom"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-[#08090C] border border-[#C6FF33]/35 rounded-3xl p-5 text-white shadow-2xl space-y-4 overflow-hidden"
      >
        {/* Subtle ambient glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-60 h-60 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Flame className="w-5 h-5 fill-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-heading font-black tracking-wider uppercase text-white">
                СТРИК &amp; РЕЗУЛЬТАТЫ
              </h2>
              <p className="text-[11px] text-gray-400 font-body">
                Ежедневный огонёк и личная статистика
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 7-Day Flame Streak */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-heading uppercase tracking-wide">
            <span>Стрик недели (авто-огонёк за вход)</span>
            <span className="text-orange-400 font-bold">🔥 {state.streak} ДН ПОДРЯД</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_LABELS.map((lbl, idx) => {
              const on = Boolean(state.days?.[idx]);
              const cur = idx === state.todayIdx;
              return (
                <div
                  key={lbl}
                  className={`rounded-xl py-2 px-1 text-center border transition ${
                    on
                      ? 'bg-orange-500/15 border-orange-500/50'
                      : cur
                      ? 'bg-[#C6FF33]/10 border-[#C6FF33]'
                      : 'bg-[#12151F] border-white/5'
                  }`}
                >
                  <span
                    className={`block text-[9px] font-heading font-bold mb-1 ${
                      on ? 'text-orange-300' : 'text-gray-400'
                    }`}
                  >
                    {lbl}
                  </span>
                  <div
                    className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs ${
                      on
                        ? 'bg-gradient-to-br from-orange-400 to-red-600 text-white shadow-[0_0_10px_rgba(255,107,0,0.45)]'
                        : 'bg-white/5 text-gray-500'
                    }`}
                  >
                    {on ? '🔥' : '•'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rank Progress Card */}
        <div className="bg-[#12151F] border border-[#7D39EB]/45 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{rank.currentTier.icon}</span>
              <div>
                <span className="text-[9px] font-heading uppercase tracking-wider text-purple-300 block">
                  Текущий ранг
                </span>
                <span className="text-sm font-heading font-black text-white">
                  {rank.currentTier.name} — {rank.currentTier.subtitle}
                </span>
              </div>
            </div>
            <Award className="w-4 h-4 text-[#C6FF33]" />
          </div>

          <div className="h-2.5 w-full bg-[#08090C] rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#C6FF33] to-[#7D39EB] rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, rank.progressPercent)}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-body text-gray-400">
            <span>Прогресс: {rank.progressPercent}%</span>
            <span className="text-[#C6FF33] font-bold">
              {rank.nextTier
                ? `До ${rank.nextTier.icon} ${rank.nextTier.name}: ${rank.remainingKm.toFixed(1)} км`
                : 'Максимальный ранг!'}
            </span>
          </div>
        </div>

        {/* Real Sports Results Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#12151F] border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-heading uppercase">
              <span>Общий пробег</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#C6FF33]" />
            </div>
            <div className="font-heading font-black text-2xl text-[#C6FF33] mt-1">
              {(state.totalKm || 0).toFixed(1)}{' '}
              <span className="text-xs font-body text-gray-400 font-normal">км</span>
            </div>
          </div>

          <div className="bg-[#12151F] border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-heading uppercase">
              <span>Сожжено</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-heading font-black text-2xl text-white mt-1">
              {(state.totalKcal || 0).toLocaleString()}{' '}
              <span className="text-xs font-body text-gray-400 font-normal">ккал</span>
            </div>
          </div>

          <div className="bg-[#12151F] border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-heading uppercase">
              <span>Забегов</span>
              <Activity className="w-3.5 h-3.5 text-[#7D39EB]" />
            </div>
            <div className="font-heading font-black text-2xl text-white mt-1">
              {state.runsCount || 0}
            </div>
          </div>

          <div className="bg-[#12151F] border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-heading uppercase">
              <span>Рекорд за 1 раз</span>
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-heading font-black text-2xl text-amber-400 mt-1">
              {(state.bestKm || 0).toFixed(1)}{' '}
              <span className="text-xs font-body text-gray-400 font-normal">км</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullHistory();
            }}
            className="w-full py-2.5 px-4 bg-[#12151F] hover:bg-[#1a1f2e] border border-white/10 text-gray-200 font-heading font-bold text-xs uppercase tracking-wider rounded-full transition flex items-center justify-center gap-2 active:scale-95"
          >
            <History className="w-4 h-4 text-[#C6FF33]" />
            <span>Открыть историю всех забегов</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-heading font-black text-xs uppercase tracking-wider rounded-full shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>Вернуться на карту и бежать</span>
          </button>
        </div>
      </div>
    </div>
  );
}
