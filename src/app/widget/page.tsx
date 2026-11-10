'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  Flame,
  ArrowLeft,
  RefreshCw,
  Wind,
  CloudRain,
  Thermometer,
  Sun,
  Cloud,
  CloudLightning,
  Snowflake,
} from 'lucide-react';
import {
  WeatherStreakState,
  getDefaultWeatherStreakState,
  getTodayWeekdayIndex,
} from '@/lib/telegramWidget';
import { fetchLiveWeather } from '@/lib/weather';

const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

function getWeatherIcon(condition: string, rainProb: number) {
  const s = (condition || '').toLowerCase();
  if (s.includes('гроз')) return <CloudLightning className="w-8 h-8 text-amber-400" />;
  if (s.includes('дожд') || s.includes('морос') || rainProb >= 50)
    return <CloudRain className="w-8 h-8 text-sky-400" />;
  if (s.includes('снег')) return <Snowflake className="w-8 h-8 text-cyan-200" />;
  if (s.includes('облач') || s.includes('пасмур') || s.includes('туман'))
    return <Cloud className="w-8 h-8 text-gray-300" />;
  return <Sun className="w-8 h-8 text-[#C6FF33]" />;
}

export default function WeatherStreakWidgetPage() {
  const [state, setState] = useState<WeatherStreakState>(() => getDefaultWeatherStreakState());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [flameJustClaimed, setFlameJustClaimed] = useState(false);

  const loadWeather = async () => {
    setIsRefreshing(true);
    let lat = 41.2995;
    let lon = 69.2401;
    let city = 'Ташкент';

    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3500,
            maximumAge: 60000,
          });
        }).catch(() => null);

        if (pos) {
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          city = 'Ваша локация (GPS)';
        }
      }

      const w = await fetchLiveWeather(lat, lon);
      setState((prev) => ({
        ...prev,
        temp: w.temperature,
        feelsLike: w.feelsLike,
        windSpeed: w.windSpeed,
        rainProb: w.rainProbabilityNext2h,
        condition: w.conditionText,
        suitabilityText: w.suitabilityText,
        city,
        note: '🌤️ Погода обновлена в реальном времени',
      }));
    } catch {
      // keep existing weather if fetch fails
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayIdx = getTodayWeekdayIndex();
    let days = [false, false, false, false, false, false, false];

    try {
      const savedDaysRaw = localStorage.getItem('rush_flame_days_v1');
      if (savedDaysRaw) {
        const parsed = JSON.parse(savedDaysRaw);
        if (Array.isArray(parsed) && parsed.length === 7) days = parsed;
      } else {
        for (let i = Math.max(0, todayIdx - 2); i < todayIdx; i++) {
          days[i] = true;
        }
      }

      const lastClaimDate = localStorage.getItem('rush_last_flame_date');
      if (lastClaimDate !== todayStr) {
        days[todayIdx] = true;
        localStorage.setItem('rush_last_flame_date', todayStr);
        localStorage.setItem('rush_flame_days_v1', JSON.stringify(days));
        setFlameJustClaimed(true);
      } else {
        days[todayIdx] = true;
      }
    } catch {
      days[todayIdx] = true;
    }

    const streak = Math.max(1, days.filter(Boolean).length);
    setState((prev) => ({
      ...prev,
      days,
      todayIdx,
      streak,
      flameClaimedToday: true,
      note: '🔥 Огонёк за сегодняшний вход зажжён!',
    }));

    loadWeather();
  }, []);

  const tempLabel = state.temp > 0 ? `+${state.temp}°` : `${state.temp}°`;
  const feelsLabel = state.feelsLike > 0 ? `+${state.feelsLike}°` : `${state.feelsLike}°`;

  return (
    <div className="min-h-screen bg-[#08090C] text-white flex flex-col items-center justify-center p-4 font-body relative overflow-hidden">
      {/* Glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#C6FF33]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm bg-[#12151F] border border-[#C6FF33]/30 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping shadow-[0_0_10px_#FF6B00]" />
            <span className="font-heading font-black text-xs tracking-wider uppercase text-[#C6FF33]">
              ПОГОДА &amp; СТРИК
            </span>
          </div>
          <div className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/50 text-xs font-heading font-bold text-orange-200 flex items-center gap-1">
            <span>🔥 СТРИК:</span>
            <span className="text-orange-400 font-black">{state.streak} ДН</span>
          </div>
        </div>

        {/* Auto-Flame Reward Banner */}
        <div
          className={`rounded-2xl p-3 border text-center transition-all ${
            flameJustClaimed
              ? 'bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-600/20 border-orange-500/50 shadow-[0_0_20px_rgba(255,107,0,0.2)]'
              : 'bg-orange-500/10 border-orange-500/30'
          }`}
        >
          <span className="text-xs font-heading font-bold text-orange-300 tracking-wide uppercase">
            {flameJustClaimed
              ? '🎉 Ты зашёл сегодня — лови +1 огонёк 🔥!'
              : '🔥 Сегодняшний огонёк уже горит!'}
          </span>
        </div>

        {/* 7-Day Flame Streak Grid */}
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
                      ? 'bg-gradient-to-br from-orange-400 to-red-600 text-white shadow-[0_0_12px_rgba(255,107,0,0.55)]'
                      : 'bg-white/5 text-gray-500'
                  }`}
                >
                  {on ? '🔥' : '•'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Weather Telemetry Card */}
        <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getWeatherIcon(state.condition, state.rainProb)}
              <div>
                <div className="font-heading font-black text-3xl text-white leading-none">
                  {tempLabel}
                </div>
                <span className="text-[11px] text-gray-400 font-body mt-1 block">
                  {state.city}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-heading font-bold text-sm text-[#C6FF33] block">
                {state.condition}
              </span>
              <span className="text-[10px] text-gray-400 font-body">Сейчас на трассе</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
            <div className="bg-[#12151F] rounded-xl p-2">
              <Thermometer className="w-3.5 h-3.5 text-orange-400 mx-auto mb-0.5" />
              <span className="text-[9px] text-gray-400 block">Ощущается</span>
              <strong className="font-mono text-xs text-white">{feelsLabel}</strong>
            </div>
            <div className="bg-[#12151F] rounded-xl p-2">
              <Wind className="w-3.5 h-3.5 text-[#C6FF33] mx-auto mb-0.5" />
              <span className="text-[9px] text-gray-400 block">Ветер</span>
              <strong className="font-mono text-xs text-white">{state.windSpeed} км/ч</strong>
            </div>
            <div className="bg-[#12151F] rounded-xl p-2">
              <CloudRain className="w-3.5 h-3.5 text-sky-400 mx-auto mb-0.5" />
              <span className="text-[9px] text-gray-400 block">Дождь</span>
              <strong className="font-mono text-xs text-white">{state.rainProb}%</strong>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#C6FF33]/10 border border-[#C6FF33]/25 text-center text-xs font-heading font-bold text-[#C6FF33]">
            {state.suitabilityText}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={loadWeather}
            disabled={isRefreshing}
            className="py-2.5 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-heading font-bold text-[#C6FF33] flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>

          <div className="py-2.5 px-3 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-xs font-heading font-black text-white flex items-center justify-center gap-1 shadow-lg shadow-orange-500/25">
            <Flame className="w-3.5 h-3.5 fill-white" />
            <span>Огонёк активен</span>
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
