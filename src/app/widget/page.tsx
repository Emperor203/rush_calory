'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  Flame,
  ArrowLeft,
  Coins,
  Snowflake,
  Crown,
  Sparkles,
} from 'lucide-react';
import {
  CoinsStreakWidgetState,
  getDefaultCoinsStreakState,
  getMultiplier,
  getTodayWeekdayIndex,
  applyCoinsWidgetAction,
} from '@/lib/telegramWidget';
import { getSavedGoogleUser, saveGoogleUser } from '@/lib/auth';

const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

export default function RushCoinsStreakWidgetPage() {
  const [state, setState] = useState<CoinsStreakWidgetState>(() => getDefaultCoinsStreakState());
  const [justLitToday, setJustLitToday] = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayIdx = getTodayWeekdayIndex();

    try {
      const savedRaw = localStorage.getItem('rush_coins_widget_v1');
      let loaded: CoinsStreakWidgetState = savedRaw
        ? JSON.parse(savedRaw)
        : getDefaultCoinsStreakState();

      if (!Array.isArray(loaded.days) || loaded.days.length !== 7) {
        loaded = getDefaultCoinsStreakState();
      }

      loaded.todayIdx = todayIdx;
      const lastFlameDate = localStorage.getItem('rush_last_flame_date_v2');

      if (lastFlameDate !== todayStr) {
        loaded.days[todayIdx] = true;
        loaded.streak = Math.max(1, loaded.days.filter(Boolean).length);
        const mult = getMultiplier(loaded.streak);
        const dailyBonus = Math.round(25 * mult);
        loaded.coins = (loaded.coins || 0) + dailyBonus;
        loaded.dailyClaimed = true;
        loaded.note = `🔥 Огонёк за вход! +${dailyBonus} 🪙 начислено (x${mult})`;
        localStorage.setItem('rush_last_flame_date_v2', todayStr);
        localStorage.setItem('rush_coins_widget_v1', JSON.stringify(loaded));
        setJustLitToday(true);
      }

      setState(loaded);
    } catch {
      // keep default state
    }
  }, []);

  const handleAction = (action: string) => {
    const next = applyCoinsWidgetAction(state, action);

    // Real integration: if user bought Street Pass 3d with coins, grant it to their account!
    if (action === 'buy_pass' && state.coins >= 300) {
      const user = getSavedGoogleUser();
      if (user) {
        const currentExp = user.streetPassExpiresAt && user.streetPassExpiresAt > Date.now()
          ? user.streetPassExpiresAt
          : Date.now();
        saveGoogleUser({
          ...user,
          hasStreetPass: true,
          streetPassPlan: 'trial',
          streetPassExpiresAt: currentExp + 3 * 86400000,
        });
        next.note = '👑 Street Pass +3 дня активирован в вашем профиле!';
      }
    }

    setState(next);
    try {
      localStorage.setItem('rush_coins_widget_v1', JSON.stringify(next));
    } catch {}
  };

  const mult = getMultiplier(state.streak || 1);
  const perKmCoins = Math.round(50 * mult);

  return (
    <div className="min-h-screen bg-[#08090C] text-white flex flex-col items-center justify-center p-4 font-body relative overflow-hidden">
      {/* Glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#7D39EB]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#C6FF33]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm bg-[#12151F] border border-[#C6FF33]/30 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping shadow-[0_0_10px_#FF6B00]" />
            <span className="font-heading font-black text-xs tracking-wider uppercase text-[#C6FF33]">
              RUSH COINS &amp; СТРИК
            </span>
          </div>
          <div className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/60 text-xs font-heading font-bold text-orange-200 flex items-center gap-1.5">
            <span>🔥 {state.streak} ДН</span>
            <span className="text-[#C6FF33] font-black">• x{mult}</span>
          </div>
        </div>

        {/* Auto-Flame Reward Banner */}
        {justLitToday && (
          <div className="rounded-2xl p-2.5 border bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-600/20 border-orange-500/50 text-center">
            <span className="text-[11px] font-heading font-bold text-orange-300 tracking-wide uppercase flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C6FF33]" />
              <span>Огонёк за вход горит! Монеты начислены</span>
            </span>
          </div>
        )}

        {/* Move-to-Earn Wallet Card */}
        <div className="bg-gradient-to-br from-[#161B2A] to-[#1D1536] border border-[#7D39EB]/50 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-purple-300 block mb-1">
              МОЙ БАЛАНС MOVE-TO-EARN
            </span>
            <div className="flex items-baseline gap-1.5">
              <Coins className="w-6 h-6 text-[#C6FF33] self-center" />
              <span className="font-heading font-black text-3xl text-white leading-none">
                {state.coins}
              </span>
              <span className="text-xs font-heading font-black text-[#C6FF33]">RUSH</span>
            </div>
          </div>

          <div className="text-right">
            <span className="font-heading font-black text-base text-[#C6FF33] block leading-tight">
              +{perKmCoins} 🪙 / км
            </span>
            <span className="text-[10px] text-gray-400 font-body">
              За неделю: {state.weekKm} км
            </span>
          </div>
        </div>

        {/* 7-Day Flame Streak Grid */}
        <div>
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-heading uppercase tracking-wide mb-1.5">
            <span>Стрик недели (увеличивает x-множитель)</span>
            <span className="text-orange-400 font-bold">7 дн = x3.0</span>
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
                      : 'bg-black/40 border-white/5'
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
                    className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-black ${
                      on
                        ? 'bg-gradient-to-br from-orange-400 to-red-600 text-white shadow-[0_0_10px_rgba(255,107,0,0.5)]'
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

        {/* Rewards Shop */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-gray-400 font-heading uppercase tracking-wide block">
            Магазин за монеты RUSH:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleAction('buy_freeze')}
              className="p-2.5 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-sky-400/50 text-left transition active:scale-95"
            >
              <div className="flex items-center gap-1.5 font-heading font-bold text-xs text-white">
                <Snowflake className="w-3.5 h-3.5 text-sky-400" />
                <span>Заморозка ({state.freezes || 0})</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#C6FF33] block mt-0.5">
                Цена: 150 🪙
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAction('buy_pass')}
              className="p-2.5 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-[#C6FF33]/50 text-left transition active:scale-95"
            >
              <div className="flex items-center gap-1.5 font-heading font-bold text-xs text-white">
                <Crown className="w-3.5 h-3.5 text-[#C6FF33]" />
                <span>Street Pass 3 дн</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#C6FF33] block mt-0.5">
                Цена: 300 🪙
              </span>
            </button>
          </div>
        </div>

        {/* Live Status Note */}
        <div className="text-center text-xs font-body text-orange-300 font-semibold min-h-[1.25rem]">
          {state.note}
        </div>

        {/* Bottom Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleAction('daily')}
            className="py-2.5 px-3 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-xs font-heading font-black text-white flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg shadow-orange-500/20"
          >
            <Flame className="w-3.5 h-3.5 fill-white" />
            <span>Мой огонёк</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('run1km')}
            className="py-2.5 px-3 rounded-full bg-[#C6FF33] hover:bg-[#b0f020] text-xs font-heading font-black text-black flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg shadow-[#C6FF33]/20"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Фарм +1 км</span>
          </button>
        </div>

        {/* CTA to Launch Main App */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
          <Link
            href="/"
            className="w-full py-3.5 px-4 bg-[#7D39EB] hover:bg-[#6c28d9] text-white font-heading font-black text-xs uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(125,57,235,0.35)] transition flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>На карту (Заработать 🪙)</span>
          </Link>

          <Link
            href="/"
            className="text-center text-xs text-gray-500 hover:text-white transition inline-flex items-center justify-center gap-1 py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>На главную карту</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
