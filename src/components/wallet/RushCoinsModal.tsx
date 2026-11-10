'use client';

import React from 'react';
import {
  X,
  Coins,
  Flame,
  Snowflake,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  CoinsStreakWidgetState,
  getMultiplier,
} from '@/lib/telegramWidget';

const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

interface RushCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CoinsStreakWidgetState;
  onAction: (action: 'buy_freeze' | 'buy_pass' | 'daily') => void;
}

export default function RushCoinsModal({
  isOpen,
  onClose,
  state,
  onAction,
}: RushCoinsModalProps) {
  if (!isOpen) return null;

  const mult = getMultiplier(state.streak || 1);
  const perKmCoins = Math.round(50 * mult);

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
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-60 h-60 bg-[#7D39EB]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#C6FF33]/15 border border-[#C6FF33]/40 flex items-center justify-center text-[#C6FF33]">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-heading font-black tracking-wider uppercase text-white">
                КОШЕЛЁК RUSH &amp; СТРИК
              </h2>
              <p className="text-[11px] text-gray-400 font-body">
                Бегай ежедневно — качай множитель до x3
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

        {/* Balance Card */}
        <div className="relative bg-gradient-to-br from-[#12151F] to-[#1D1536] border border-[#7D39EB]/50 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-purple-300 block mb-1">
              МОЙ БАЛАНС MOVE-TO-EARN
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading font-black text-3xl text-white leading-none">
                {state.coins}
              </span>
              <span className="text-xs font-heading font-black text-[#C6FF33]">🪙 RUSH</span>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/50 text-[10px] font-heading font-bold text-orange-300 mb-1">
              <span>🔥 {state.streak} дн • x{mult}</span>
            </div>
            <span className="font-mono font-bold text-xs text-[#C6FF33] block">
              +{perKmCoins} 🪙 / км
            </span>
          </div>
        </div>

        {/* 7-Day Flame Streak */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-heading uppercase tracking-wide">
            <span>Стрик огоньков недели</span>
            <span className="text-orange-400 font-bold">7 дн = x3.0 фарм</span>
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

        {/* In-App Shop */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-gray-400 font-heading uppercase tracking-wide block">
            Награды за монеты RUSH:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onAction('buy_freeze')}
              className="p-3 rounded-2xl bg-[#12151F] hover:bg-[#1a1f2e] border border-white/10 hover:border-sky-400/50 text-left transition active:scale-95"
            >
              <div className="flex items-center gap-1.5 font-heading font-bold text-xs text-white">
                <Snowflake className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Заморозка ({state.freezes || 0})</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#C6FF33] block mt-1">
                150 🪙 • Щит стрика
              </span>
            </button>

            <button
              type="button"
              onClick={() => onAction('buy_pass')}
              className="p-3 rounded-2xl bg-[#12151F] hover:bg-[#1a1f2e] border border-white/10 hover:border-[#C6FF33]/50 text-left transition active:scale-95"
            >
              <div className="flex items-center gap-1.5 font-heading font-bold text-xs text-white">
                <Crown className="w-4 h-4 text-[#C6FF33] shrink-0" />
                <span>Street Pass 3 дн</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#C6FF33] block mt-1">
                300 🪙 • Сразу в профиль
              </span>
            </button>
          </div>
        </div>

        {/* Status Note */}
        {state.note && (
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-center text-xs font-body text-orange-200 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C6FF33] shrink-0" />
            <span>{state.note}</span>
          </div>
        )}

        {/* Footer CTA */}
        <div className="pt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-heading font-black text-xs uppercase tracking-wider rounded-full shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>Вернуться на карту и бежать</span>
          </button>
          <span className="text-[10px] text-gray-500 text-center font-body">
            Монеты начисляются автоматически после каждой пробежки
          </span>
        </div>
      </div>
    </div>
  );
}
