'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  Flame,
  Check,
  ArrowLeft,
  Coffee,
  Pizza,
  RotateCcw,
} from 'lucide-react';
import {
  BatteryWidgetState,
  getDefaultWidgetState,
  applyWidgetAction,
} from '@/lib/telegramWidget';

const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

export default function BatteryStreakWidgetPage() {
  const [state, setState] = useState<BatteryWidgetState>(() => getDefaultWidgetState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rush_battery_widget_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.kcal === 'number') {
          setState(parsed);
        }
      }
    } catch (_) {}
    setHydrated(true);
  }, []);

  const handleAction = (action: string) => {
    const next = applyWidgetAction(state, action);
    setState(next);
    try {
      localStorage.setItem('rush_battery_widget_v1', JSON.stringify(next));
    } catch (_) {}
  };

  const distanceKm =
    state.kcal <= 0
      ? '0.0'
      : Math.min(5.8, Math.max(1.2, Math.round((state.kcal / 110) * 10) / 10)).toFixed(1);
  const pct = Math.min(100, Math.round((state.kcal / (state.goalKcal || 600)) * 100));
  const isTodayDone = Boolean(state.days?.[state.todayIdx]);

  return (
    <div className="min-h-screen bg-[#08090C] text-white flex flex-col items-center justify-center p-4 font-body relative overflow-hidden">
      {/* Glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#C6FF33]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#7D39EB]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm bg-[#12151F] border border-[#C6FF33]/30 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C6FF33] animate-pulse shadow-[0_0_10px_#C6FF33]" />
            <span className="font-heading font-black text-xs tracking-wider uppercase text-[#C6FF33]">
              БАТАРЕЙКА ДНЯ
            </span>
          </div>
          <div className="px-3 py-1 rounded-full bg-[#7D39EB]/25 border border-[#7D39EB]/60 text-xs font-heading font-bold text-purple-200 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-[#C6FF33] fill-[#C6FF33]" />
            <span>СТРИК:</span>
            <span className="text-[#C6FF33]">{hydrated ? state.streak : 1} ДН</span>
          </div>
        </div>

        {/* 7-Day Streak Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_LABELS.map((lbl, idx) => {
            const on = Boolean(state.days?.[idx]);
            const cur = idx === state.todayIdx;
            return (
              <div
                key={lbl}
                className={`rounded-xl py-2 px-1 text-center border transition ${
                  on
                    ? 'bg-[#C6FF33]/10 border-[#C6FF33]/60'
                    : cur
                    ? 'bg-[#7D39EB]/15 border-[#7D39EB]'
                    : 'bg-black/40 border-white/5'
                }`}
              >
                <span
                  className={`block text-[9px] font-heading font-bold mb-1 ${
                    on ? 'text-[#C6FF33]' : 'text-gray-400'
                  }`}
                >
                  {lbl}
                </span>
                <div
                  className={`w-5 h-5 mx-auto rounded-full flex items-center justify-center text-[10px] font-black ${
                    on
                      ? 'bg-[#C6FF33] text-black shadow-[0_0_10px_rgba(198,255,51,0.5)]'
                      : cur
                      ? 'bg-[#7D39EB] text-white'
                      : 'bg-white/5 text-gray-500'
                  }`}
                >
                  {on ? <Check className="w-3 h-3 stroke-[3]" /> : cur ? <Zap className="w-3 h-3" /> : '•'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Battery Telemetry Card */}
        <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-heading tracking-wider block">
                Накоплено энергии
              </span>
              <div className="font-heading font-black text-3xl text-white leading-none mt-1">
                {state.kcal}{' '}
                <span className="text-xs font-body text-gray-400 font-normal">ккал</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-heading font-black text-xl text-[#C6FF33] block leading-none">
                {distanceKm} км
              </span>
              <span className="text-[10px] text-gray-400 font-body">на маршруте</span>
            </div>
          </div>

          <div className="h-3.5 w-full bg-[#08090C] rounded-full p-0.5 border border-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                state.kcal > 700
                  ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                  : 'bg-gradient-to-r from-[#C6FF33] to-[#7D39EB]'
              }`}
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 font-body">
            <span>{state.note || 'Заряд готов к пробежке'}</span>
            <span className="font-mono font-bold text-[#C6FF33]">{pct}%</span>
          </div>
        </div>

        {/* Interactive Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleAction('add150')}
            className="py-2.5 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-heading font-bold text-white flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>+150 ккал</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('add300')}
            className="py-2.5 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-heading font-bold text-white flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Pizza className="w-3.5 h-3.5 text-rose-400" />
            <span>+300 ккал</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('burn200')}
            className="py-2.5 px-3 rounded-full bg-[#7D39EB] hover:bg-[#6c28d9] text-xs font-heading font-black text-white flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg shadow-[#7D39EB]/25"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>-200 ккал</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('done')}
            className="py-2.5 px-3 rounded-full bg-[#C6FF33] hover:bg-[#b0f020] text-xs font-heading font-black text-black flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg shadow-[#C6FF33]/25"
          >
            {isTodayDone ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
            <span>{isTodayDone ? 'Отменить день' : 'Закрыть день'}</span>
          </button>
        </div>

        {/* CTA to Launch Main App */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
          <Link
            href={`/?calories=${Math.max(150, state.kcal)}`}
            className="w-full py-3.5 px-4 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-heading font-black text-xs uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(198,255,51,0.3)] transition flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>Сжечь {state.kcal} ккал на карте</span>
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
