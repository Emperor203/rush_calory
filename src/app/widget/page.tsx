'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  Flame,
  ArrowLeft,
  TrendingUp,
  Trophy,
  Activity,
  Award,
  Sparkles,
} from 'lucide-react';
import {
  StreakResultsWidgetState,
  getDefaultStreakResultsState,
  getTodayWeekdayIndex,
} from '@/lib/telegramWidget';
import { getWorkoutHistory } from '@/lib/history';
import { getSavedGoogleUser } from '@/lib/auth';
import { calculateUserRank } from '@/lib/ranks';

const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

export default function StreakResultsWidgetPage() {
  const [state, setState] = useState<StreakResultsWidgetState>(() => getDefaultStreakResultsState());
  const [justLitToday, setJustLitToday] = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayIdx = getTodayWeekdayIndex();

    try {
      const savedRaw = localStorage.getItem('rush_streak_results_v1');
      let loaded: StreakResultsWidgetState = savedRaw
        ? JSON.parse(savedRaw)
        : getDefaultStreakResultsState();

      if (!Array.isArray(loaded.days) || loaded.days.length !== 7) {
        loaded = getDefaultStreakResultsState();
      }

      loaded.todayIdx = todayIdx;
      const lastFlameDate = localStorage.getItem('rush_last_flame_date_v2');
      if (lastFlameDate !== todayStr) {
        loaded.days[todayIdx] = true;
        loaded.streak = Math.max(1, loaded.days.filter(Boolean).length);
        loaded.note = `🔥 Огонёк за вход зажжён! Стрик: ${loaded.streak} дн.`;
        localStorage.setItem('rush_last_flame_date_v2', todayStr);
        setJustLitToday(true);
      }

      // Sync real workout stats from history & user profile
      const workouts = getWorkoutHistory();
      const user = getSavedGoogleUser();
      const histKm = workouts.reduce((s, w) => s + (w.distanceKm || 0), 0);
      const histKcal = workouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);
      const bestKm = workouts.reduce((m, w) => Math.max(m, w.distanceKm || 0), 0);

      loaded.totalKm = Math.round(Math.max(user?.totalKmRun || 0, histKm) * 10) / 10;
      loaded.totalKcal = Math.max(user?.totalCaloriesBurned || 0, histKcal);
      loaded.runsCount = Math.max(user?.completedRunsCount || 0, workouts.length);
      loaded.bestKm = Math.round(bestKm * 10) / 10;

      localStorage.setItem('rush_streak_results_v1', JSON.stringify(loaded));
      setState(loaded);
    } catch {
      // keep default state
    }
  }, []);

  const rank = calculateUserRank(state.totalKm || 0);

  return (
    <div className="min-h-screen bg-[#08090C] text-white flex flex-col items-center justify-center p-4 font-body relative overflow-hidden">
      {/* Glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#7D39EB]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm bg-[#12151F] border border-[#C6FF33]/30 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping shadow-[0_0_10px_#FF6B00]" />
            <span className="font-heading font-black text-xs tracking-wider uppercase text-[#C6FF33]">
              СТРИК &amp; РЕЗУЛЬТАТЫ
            </span>
          </div>
          <div className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/60 text-xs font-heading font-bold text-orange-200 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-500" />
            <span>{state.streak} ДН ПОДРЯД</span>
          </div>
        </div>

        {/* Auto-Flame Banner */}
        {justLitToday && (
          <div className="rounded-2xl p-2.5 border bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-600/20 border-orange-500/50 text-center">
            <span className="text-[11px] font-heading font-bold text-orange-300 tracking-wide uppercase flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C6FF33]" />
              <span>Сегодняшний огонёк за вход зажжён 🔥!</span>
            </span>
          </div>
        )}

        {/* 7-Day Flame Streak */}
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

        {/* Rank & Progression Card */}
        <div className="bg-black/50 border border-[#7D39EB]/50 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{rank.currentTier.icon}</span>
              <div>
                <span className="text-[9px] font-heading uppercase tracking-wider text-purple-300 block">
                  Мой ранг атлета
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
          <div className="bg-black/40 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-heading uppercase">
              <span>Пробег</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#C6FF33]" />
            </div>
            <div className="font-heading font-black text-2xl text-[#C6FF33] mt-1">
              {(state.totalKm || 0).toFixed(1)}{' '}
              <span className="text-xs font-body text-gray-400 font-normal">км</span>
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-heading uppercase">
              <span>Сожжено</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-heading font-black text-2xl text-white mt-1">
              {(state.totalKcal || 0).toLocaleString()}{' '}
              <span className="text-xs font-body text-gray-400 font-normal">ккал</span>
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-heading uppercase">
              <span>Забегов</span>
              <Activity className="w-3.5 h-3.5 text-[#7D39EB]" />
            </div>
            <div className="font-heading font-black text-2xl text-white mt-1">
              {state.runsCount || 0}
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-heading uppercase">
              <span>Рекорд</span>
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-heading font-black text-2xl text-amber-400 mt-1">
              {(state.bestKm || 0).toFixed(1)}{' '}
              <span className="text-xs font-body text-gray-400 font-normal">км</span>
            </div>
          </div>
        </div>

        {/* CTA to Launch Main App */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
          <Link
            href="/"
            className="w-full py-3.5 px-4 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-heading font-black text-xs uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(198,255,51,0.3)] transition flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>Выйти на пробежку</span>
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
