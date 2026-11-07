'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Flame,
  TrendingUp,
  Search,
  Lock,
  User,
  LogOut,
  Map as MapIcon,
  CheckCircle2,
  XCircle,
  Download,
  Activity,
  RefreshCw,
  Volume2,
  Crown,
  Zap,
} from 'lucide-react';
import { supabase, LiveOnlineRunner } from '@/lib/supabase';

interface RegisteredAthlete {
  id: string;
  name: string;
  email: string;
  avatar: string;
  weightKg: number;
  totalCaloriesBurned: number;
  totalKmRun: number;
  completedRunsCount: number;
  isBanned: boolean;
  hasStreetPass?: boolean;
  streetPassPlan?: 'single' | 'monthly' | 'yearly' | 'season' | 'trial' | null;
  streetPassExpiresAt?: number | null;
  registeredAt: string;
  lastActiveAt: string;
}

const BOSS_LOGIN = 'boss';
const BOSS_PASS = 'A2568989';
const SESSION_KEY = 'rush_boss_auth_session';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginInput, setLoginInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Athletes Directory & Stats State
  const [athletes, setAthletes] = useState<RegisteredAthlete[]>([]);
  const [onlineRunners, setOnlineRunners] = useState<LiveOnlineRunner[]>([]);
  const [stats, setStats] = useState({
    totalAthletes: 0,
    totalCaloriesBurned: 0,
    totalKmRun: 0,
    totalRunsCompleted: 0,
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [banNotification, setBanNotification] = useState<string | null>(null);

  const playBanSound = () => {
    try {
      const audio = new Audio('/sounds/ban.mp3');
      audio.volume = 1.0;
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch((err) => {
          console.warn('Audio play error:', err);
        });
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  // Check saved boss session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSession = sessionStorage.getItem(SESSION_KEY);
      if (savedSession === 'boss_verified_access') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Helper to merge athletes from multiple sources
  const mergeAthletes = (incoming: any[]) => {
    setAthletes((prev: RegisteredAthlete[]): RegisteredAthlete[] => {
      const map = new Map<string, RegisteredAthlete>();

      // Filter out fake mock athletes from existing state
      prev
        .filter((a) => {
          const e = (a.email || '').toLowerCase();
          return (
            !e.includes('turfwars.com') &&
            a.id !== 'athlete-1' &&
            a.id !== 'athlete-2' &&
            a.id !== 'athlete-3'
          );
        })
        .forEach((a) => {
          const key = (a.email || a.id).toLowerCase();
          map.set(key, a);
        });

      // Merge incoming athletes
      incoming
        .filter((item) => {
          const e = (item.email || '').toLowerCase();
          return (
            !e.includes('turfwars.com') &&
            item.id !== 'athlete-1' &&
            item.id !== 'athlete-2' &&
            item.id !== 'athlete-3'
          );
        })
        .forEach((item) => {
          const key = (item.email || item.id).toLowerCase();
          const existing = map.get(key);

          const totalCaloriesBurned = Math.max(
            existing?.totalCaloriesBurned || 0,
            item.totalCaloriesBurned || item.total_calories || item.calories || 0,
          );
          const totalKmRun = Math.max(
            existing?.totalKmRun || 0,
            item.totalKmRun || item.total_distance || item.km || 0,
          );
          const completedRunsCount = Math.max(
            existing?.completedRunsCount || 0,
            item.completedRunsCount || item.total_runs || 0,
          );

          map.set(key, {
            id: item.id || existing?.id || `ath-${Math.random().toString(36).substring(2, 9)}`,
            name: item.name || existing?.name || item.email?.split('@')[0] || 'Атлет Rush',
            email: item.email || existing?.email || '',
            avatar:
              item.avatar ||
              item.picture ||
              existing?.avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${item.email || item.name}`,
            weightKg: item.weightKg || item.weight || existing?.weightKg || 70,
            totalCaloriesBurned,
            totalKmRun: Math.round(totalKmRun * 10) / 10,
            completedRunsCount,
            isBanned: item.isBanned !== undefined ? item.isBanned : existing?.isBanned || false,
            hasStreetPass:
              item.hasStreetPass !== undefined ? item.hasStreetPass : existing?.hasStreetPass || false,
            streetPassPlan: item.streetPassPlan || existing?.streetPassPlan || null,
            streetPassExpiresAt: item.streetPassExpiresAt || existing?.streetPassExpiresAt || null,
            registeredAt: item.registeredAt || item.created_at || existing?.registeredAt || new Date().toISOString(),
            lastActiveAt: item.lastActiveAt || item.updated_at || existing?.lastActiveAt || new Date().toISOString(),
          });
        });

      const result = Array.from(map.values());

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('rush_cached_athletes', JSON.stringify(result));
        } catch (_) {}
      }

      return result;
    });
  };

  const fetchAthletes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/athletes');
      if (res.ok) {
        const data = await res.json();
        if (data.athletes && Array.isArray(data.athletes)) {
          mergeAthletes(data.athletes);
        }
      }
    } catch (e) {
      console.warn('API athletes fetch failed, relying on local cache & realtime:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data loading + LocalStorage cache load + Realtime subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('rush_cached_athletes');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            mergeAthletes(parsed);
          }
        }
      } catch (_) {}
    }

    fetchAthletes();

    const channel = supabase.channel('rush-live-runners', {
      config: { presence: { key: 'boss-admin-monitor' } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const active: LiveOnlineRunner[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.email || p.name) {
              active.push({
                id: p.userId || p.id || 'runner',
                name: p.name || 'Бегун Rush',
                email: p.email || '',
                lat: p.lat || 0,
                lng: p.lng || 0,
                caloriesBurned: p.caloriesBurned || 0,
                avatar: p.avatar,
                onlineAt: new Date().toISOString(),
                lastSeen: Date.now(),
              });
            }
          });
        });

        setOnlineRunners(active);

        if (active.length > 0) {
          mergeAthletes(
            active.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              avatar: u.avatar,
              weightKg: 70,
              totalCaloriesBurned: u.caloriesBurned || 0,
              totalKmRun: 0,
              completedRunsCount: 1,
              isBanned: false,
              registeredAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
            })),
          );
        }
      })
      .on('broadcast', { event: 'user_logged_in' }, (payload) => {
        if (payload?.payload) {
          mergeAthletes([payload.payload]);
        }
      })
      .on('broadcast', { event: 'workout_saved' }, (payload) => {
        if (payload?.payload) {
          mergeAthletes([payload.payload]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  // Recalculate stats whenever athletes change
  useEffect(() => {
    const totalAthletes = athletes.length;
    const totalCaloriesBurned = athletes.reduce((sum, a) => sum + (a.totalCaloriesBurned || 0), 0);
    const totalKmRun = Math.round(athletes.reduce((sum, a) => sum + (a.totalKmRun || 0), 0) * 10) / 10;
    const totalRunsCompleted = athletes.reduce((sum, a) => sum + (a.completedRunsCount || 0), 0);

    setStats({
      totalAthletes,
      totalCaloriesBurned,
      totalKmRun,
      totalRunsCompleted,
    });
  }, [athletes]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (loginInput.trim() === BOSS_LOGIN && passwordInput.trim() === BOSS_PASS) {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, 'boss_verified_access');
      }
    } else {
      setAuthError('Неверный логин или мастер-пароль доступа');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginInput('');
    setPasswordInput('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY);
    }
  };

  const handleToggleBan = async (athleteId: string, currentBanned: boolean) => {
    try {
      const target = athletes.find((a) => a.id === athleteId);
      const newBannedState = !currentBanned;

      if (newBannedState) {
        playBanSound();
      }

      setAthletes((prev) => {
        const next = prev.map((a) => (a.id === athleteId ? { ...a, isBanned: newBannedState } : a));
        if (typeof window !== 'undefined') {
          localStorage.setItem('rush_cached_athletes', JSON.stringify(next));
        }
        return next;
      });

      if (typeof window !== 'undefined' && target?.email) {
        try {
          const rawBanned = localStorage.getItem('rush_banned_emails') || '[]';
          let list: string[] = JSON.parse(rawBanned);
          const emailLower = target.email.toLowerCase();
          if (newBannedState) {
            if (!list.includes(emailLower)) list.push(emailLower);
          } else {
            list = list.filter((e) => e !== emailLower);
          }
          localStorage.setItem('rush_banned_emails', JSON.stringify(list));
        } catch {}
      }

      const channel = supabase.channel('rush-live-runners');
      if (newBannedState) {
        channel
          .send({
            type: 'broadcast',
            event: 'athlete_banned',
            payload: {
              userId: target?.id,
              userEmail: target?.email,
            },
          })
          .catch(() => {});
      }

      fetch('/api/admin/athletes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: athleteId, isBanned: newBannedState }),
      }).catch(() => {});

      if (newBannedState) {
        setBanNotification(`🔨 БАН ВЫДАН: ${target?.name || 'Пользователь'} заблокирован шефом!`);
        setTimeout(() => setBanNotification(null), 4000);
      }
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleGrantPremium = async (athleteId: string, plan: 'monthly' | 'yearly' | null) => {
    try {
      const target = athletes.find((a) => a.id === athleteId);
      const days = plan === 'yearly' ? 365 : plan === 'monthly' ? 30 : 0;
      const expiresAt = plan ? Date.now() + days * 86400000 : null;

      setAthletes((prev) => {
        const next = prev.map((a) => {
          if (a.id === athleteId) {
            return {
              ...a,
              hasStreetPass: Boolean(plan),
              streetPassPlan: plan,
              streetPassExpiresAt: expiresAt,
            };
          }
          return a;
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem('rush_cached_athletes', JSON.stringify(next));
        }
        return next;
      });

      const channel = supabase.channel('rush-live-runners');
      channel
        .send({
          type: 'broadcast',
          event: 'streetpass_granted',
          payload: {
            userId: target?.id,
            userEmail: target?.email,
            plan,
            days,
            expiresAt,
          },
        })
        .catch(() => {});

      fetch('/api/admin/athletes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: athleteId,
          streetPassPlan: plan,
          streetPassDays: days,
        }),
      }).catch(() => {});

      setBanNotification(
        plan
          ? `👑 ПРЕМИУМ ВЫДАН: ${target?.name} получил Street Pass на ${days} дней!`
          : `⚡ Премиум снят с пользователя ${target?.name}`,
      );
      setTimeout(() => setBanNotification(null), 4000);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleClearCache = () => {
    if (confirm('Очистить локальный кэш зарегистрированных атлетов и загрузить заново с сервера?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rush_cached_athletes');
      }
      setAthletes([]);
      fetchAthletes();
    }
  };

  const filteredAthletes = athletes.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleExportCSV = () => {
    const headers = 'ID,Name,Email,Weight,Calories,Km,RunsCount,RegisteredAt\n';
    const rows = athletes
      .map(
        (a) =>
          `"${a.id}","${a.name}","${a.email}",${a.weightKg},${a.totalCaloriesBurned},${a.totalKmRun},${a.completedRunsCount},"${a.registeredAt}"`,
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rush_calory_athletes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- 1. LOGIN SCREEN FOR BOSS ONLY (AI-RULES v3 Sports Cyberpunk Style) ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-screen bg-[#08090C] flex items-center justify-center p-4 text-white font-body relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C6FF33]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#7D39EB]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-sm bg-[#12151F] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-[#C6FF33]/10 border border-[#C6FF33]/30 flex items-center justify-center text-[#C6FF33] mx-auto shadow-[0_0_25px_rgba(198,255,51,0.2)]">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-heading font-black tracking-wider uppercase text-white mt-2">
              КОМАНДНЫЙ ЦЕНТР <span className="text-[#C6FF33]">RUSH CALORY</span>
            </h1>
            <p className="text-xs text-gray-400 font-body">
              Закрытая зона управления. Доступ только для шефа проекта.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 font-body">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-body">
            <div>
              <label className="block text-gray-400 mb-1.5 font-heading font-bold uppercase tracking-wider text-[10px]">
                Логин администратора
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Введите логин boss"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white font-mono focus:outline-none focus:border-[#C6FF33] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1.5 font-heading font-bold uppercase tracking-wider text-[10px]">
                Мастер-пароль доступа
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white font-mono focus:outline-none focus:border-[#C6FF33] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-heading font-black text-xs uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(198,255,51,0.3)] transition active:scale-95 ease-signature mt-2"
            >
              Войти в командный центр
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-[#C6FF33] transition inline-flex items-center gap-1 font-body"
            >
              ← Вернуться на главную карту
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. AUTHENTICATED BOSS CONTROL CENTER (AI-RULES v3 Sports Neon) ---
  return (
    <div className="min-h-screen w-screen bg-[#08090C] text-gray-100 p-4 sm:p-8 font-body space-y-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#C6FF33]/15 border border-[#C6FF33]/40 flex items-center justify-center text-[#C6FF33] shadow-[0_0_20px_rgba(198,255,51,0.25)]">
              <Zap className="w-6 h-6 fill-[#C6FF33]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-heading font-black text-white tracking-wider uppercase">
                  BOSS CONTROL CENTER
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-heading font-black bg-[#C6FF33] text-black uppercase tracking-wider">
                  ШЕФ RUSH
                </span>
              </div>
              <p className="text-xs text-gray-400 font-body">
                Спортивный мониторинг атлетов, калорий и активности в реальном времени
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#12151F] hover:bg-[#1a1e2b] border border-white/10 text-xs font-heading font-bold text-gray-300 hover:text-white transition active:scale-95"
          >
            <MapIcon className="w-3.5 h-3.5 text-[#C6FF33]" />
            <span>На карту</span>
          </Link>

          <button
            onClick={playBanSound}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#7D39EB]/20 hover:bg-[#7D39EB]/35 border border-[#7D39EB]/50 text-purple-200 text-xs font-heading font-bold transition active:scale-95"
            title="Проверить коронный звук бана шефа"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#C6FF33]" />
            <span className="hidden sm:inline">Звук бана</span>
          </button>

          <button
            onClick={fetchAthletes}
            disabled={isLoading}
            className="p-2.5 rounded-full bg-[#12151F] hover:bg-[#1a1e2b] border border-white/10 text-gray-400 hover:text-[#C6FF33] transition active:scale-95"
            title="Обновить данные"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#C6FF33]' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-heading font-bold transition active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto space-y-6">
        {banNotification && (
          <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-black border-2 border-rose-500 text-rose-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚡</span>
              <span className="font-heading font-black text-sm tracking-wide">{banNotification}</span>
            </div>
            <button
              onClick={() => setBanNotification(null)}
              className="text-xs text-rose-400 hover:text-white px-2 py-1 bg-rose-950 rounded-full"
            >
              ✕
            </button>
          </div>
        )}

        {/* KPI Stat Cards (AI-RULES v3 Sports HUD) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Realtime Online */}
          <div className="bg-[#12151F] border border-[#C6FF33]/40 p-4 rounded-3xl col-span-2 lg:col-span-1 shadow-[0_0_20px_rgba(198,255,51,0.1)]">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading uppercase tracking-wide">
              <span className="text-[#C6FF33] font-bold">В сети (Realtime)</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6FF33] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C6FF33]"></span>
              </span>
            </div>
            <div className="text-3xl font-heading font-black text-[#C6FF33] mt-2 font-mono">
              {onlineRunners.length}
            </div>
            <div className="text-[10px] text-gray-400 mt-1 font-body">Supabase WebSockets</div>
          </div>

          {/* Total Registered */}
          <div className="bg-[#12151F] border border-white/10 p-4 rounded-3xl hover:border-white/20 transition">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading uppercase tracking-wide">
              <span>Зарегистрировано</span>
              <Users className="w-4 h-4 text-[#C6FF33]" />
            </div>
            <div className="text-3xl font-heading font-black text-white mt-2 font-mono">
              {stats.totalAthletes}
            </div>
            <div className="text-[10px] text-gray-400 mt-1 font-body">Google атлетов</div>
          </div>

          {/* Burned Calories */}
          <div className="bg-[#12151F] border border-white/10 p-4 rounded-3xl hover:border-white/20 transition">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading uppercase tracking-wide">
              <span>Сожжено калорий</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-heading font-black text-amber-400 mt-2 font-mono">
              {stats.totalCaloriesBurned.toLocaleString()}{' '}
              <span className="text-xs font-body text-gray-400">ккал</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1 font-body">Суммарно сожгли</div>
          </div>

          {/* Total Distance */}
          <div className="bg-[#12151F] border border-white/10 p-4 rounded-3xl hover:border-white/20 transition">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading uppercase tracking-wide">
              <span>Общий километраж</span>
              <TrendingUp className="w-4 h-4 text-[#C6FF33]" />
            </div>
            <div className="text-3xl font-heading font-black text-[#C6FF33] mt-2 font-mono">
              {stats.totalKmRun}{' '}
              <span className="text-xs font-body text-gray-400">км</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1 font-body">Пройдено дистанций</div>
          </div>

          {/* Completed Runs */}
          <div className="bg-[#12151F] border border-white/10 p-4 rounded-3xl hover:border-white/20 transition">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading uppercase tracking-wide">
              <span>Завершённых забегов</span>
              <Activity className="w-4 h-4 text-[#7D39EB]" />
            </div>
            <div className="text-3xl font-heading font-black text-white mt-2 font-mono">
              {stats.totalRunsCompleted}
            </div>
            <div className="text-[10px] text-purple-300 mt-1 font-body">В режиме Active HUD</div>
          </div>
        </div>

        {/* Athletes Directory Section */}
        <div className="bg-[#12151F] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-heading font-black text-white tracking-wider uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-[#C6FF33]" />
                РЕЕСТР АТЛЕТОВ RUSH CALORY ({athletes.length})
              </h2>
              <p className="text-xs text-gray-400 font-body">
                Полный список спортсменов с историей сожжённых калорий и статусом Street Pass
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Поиск по имени или email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C6FF33] w-48 sm:w-64 font-body transition"
                />
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 bg-[#12151F] hover:bg-[#1a1e2b] border border-white/10 rounded-full text-xs font-heading font-bold text-gray-300 hover:text-white transition flex items-center gap-1.5 active:scale-95"
                title="Экспорт в CSV"
              >
                <Download className="w-3.5 h-3.5 text-[#C6FF33]" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/40 rounded-full text-xs font-heading font-bold text-rose-300 transition flex items-center gap-1.5 active:scale-95"
                title="Очистить старый кэш"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Сброс</span>
              </button>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< md screens) */}
          <div className="block md:hidden space-y-3">
            {filteredAthletes.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-black/40 rounded-2xl border border-white/10 font-body">
                {searchTerm ? 'Ничего не найдено по вашему запросу' : 'Пока нет зарегистрированных атлетов'}
              </div>
            ) : (
              filteredAthletes.map((a) => {
                const isOnline = onlineRunners.some(
                  (o) => (o.email || '').toLowerCase() === (a.email || '').toLowerCase() || o.id === a.id,
                );
                const hasPass = Boolean(a.hasStreetPass && a.streetPassExpiresAt && a.streetPassExpiresAt > Date.now());
                const daysRemaining = hasPass && a.streetPassExpiresAt ? Math.max(1, Math.ceil((a.streetPassExpiresAt - Date.now()) / 86400000)) : 0;

                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 shadow-xl"
                  >
                    {/* Athlete Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-black/60 border-2 border-[#C6FF33]/50 shrink-0">
                          {a.avatar ? (
                            <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-heading font-bold text-[#C6FF33] text-sm flex items-center justify-center w-full h-full">
                              {a.name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-heading font-black text-white text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{a.name}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#C6FF33] shrink-0" />
                          </div>
                          <span className="text-[11px] font-mono text-gray-400 block">{a.email}</span>
                        </div>
                      </div>

                      {/* Online Status */}
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold bg-[#C6FF33]/15 text-[#C6FF33] border border-[#C6FF33]/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF33] animate-pulse"></span>
                          В сети
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900 text-gray-500 border border-white/5">
                          Офлайн
                        </span>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#12151F] border border-white/5 text-center">
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase font-mono">Вес</span>
                        <span className="font-mono text-xs font-bold text-white">{a.weightKg} кг</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase font-mono">Калории</span>
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {(a.totalCaloriesBurned || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase font-mono">Пробег</span>
                        <span className="font-mono text-xs font-bold text-[#C6FF33]">
                          {(a.totalKmRun || 0).toFixed(1)} км
                        </span>
                      </div>
                    </div>

                    {/* Street Pass Status */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#7D39EB]/15 border border-[#7D39EB]/30">
                      <div className="flex items-center gap-1.5">
                        <Crown className={`w-4 h-4 ${hasPass ? 'text-[#C6FF33]' : 'text-gray-500'}`} />
                        <div>
                          <span className="text-[9px] text-gray-400 block font-mono">Street Pass:</span>
                          <span className="text-xs font-heading font-bold text-white">
                            {hasPass
                              ? `${a.streetPassPlan === 'yearly' ? '👑 ПРЕМИУМ ГОД' : '👑 ПРЕМИУМ МЕСЯЦ'} (${daysRemaining} дн)`
                              : '⚪ Нет подписки'}
                          </span>
                        </div>
                      </div>
                      {hasPass && (
                        <button
                          type="button"
                          onClick={() => handleGrantPremium(a.id, null)}
                          className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-full text-[10px] font-heading font-bold uppercase transition"
                        >
                          ✕ Снять
                        </button>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1 font-heading text-xs uppercase tracking-wider font-bold">
                      <button
                        type="button"
                        onClick={() => handleGrantPremium(a.id, 'monthly')}
                        className="py-2.5 px-1 bg-[#7D39EB] hover:bg-[#6c28d9] text-white rounded-full transition active:scale-95 text-center shadow-md shadow-[#7D39EB]/20"
                      >
                        + Месяц
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGrantPremium(a.id, 'yearly')}
                        className="py-2.5 px-1 bg-[#C6FF33] hover:bg-[#b0f020] text-black rounded-full transition active:scale-95 text-center shadow-md shadow-[#C6FF33]/20"
                      >
                        + Год
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBan(a.id, a.isBanned)}
                        className={`py-2.5 px-1 rounded-full transition active:scale-95 text-center ${
                          a.isBanned
                            ? 'bg-[#C6FF33]/20 text-[#C6FF33] border border-[#C6FF33]/50 hover:bg-[#C6FF33]/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/40 hover:bg-rose-900'
                        }`}
                      >
                        {a.isBanned ? '✔ Разбан' : '⛔ Бан'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs font-body">
              <thead className="bg-black/60 text-gray-400 border-b border-white/10 font-heading uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 font-bold">Атлет</th>
                  <th className="p-3.5 font-bold">Email</th>
                  <th className="p-3.5 font-bold">Дата входа</th>
                  <th className="p-3.5 font-bold text-center">Вес</th>
                  <th className="p-3.5 font-bold text-right">Сожжено ккал</th>
                  <th className="p-3.5 font-bold text-right">Пробег</th>
                  <th className="p-3.5 font-bold text-center">Street Pass</th>
                  <th className="p-3.5 font-bold text-center">Статус</th>
                  <th className="p-3.5 font-bold text-right">Управление</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {filteredAthletes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500 font-body">
                      {searchTerm ? 'Ничего не найдено по вашему запросу' : 'Пока нет зарегистрированных атлетов'}
                    </td>
                  </tr>
                ) : (
                  filteredAthletes.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition">
                      {/* Avatar & Name */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-black/60 border-2 border-[#C6FF33]/50 shrink-0">
                            {a.avatar ? (
                              <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-heading font-black text-[#C6FF33] text-xs flex items-center justify-center w-full h-full">
                                {a.name[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-heading font-black text-white flex items-center gap-1.5 flex-wrap">
                              <span>{a.name}</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#C6FF33] shrink-0" />
                              {a.hasStreetPass && a.streetPassExpiresAt && a.streetPassExpiresAt > Date.now() ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-heading font-black bg-[#7D39EB] text-white">
                                  👑 {a.streetPassPlan === 'yearly' ? 'ГОД' : 'МЕСЯЦ'}
                                </span>
                              ) : null}
                              {onlineRunners.some(
                                (o) => (o.email || '').toLowerCase() === (a.email || '').toLowerCase(),
                              ) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-heading font-bold bg-[#C6FF33]/15 text-[#C6FF33] border border-[#C6FF33]/50">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF33] animate-pulse"></span>
                                  В сети
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 block font-mono">ID: {a.id.slice(0, 12)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-3.5 font-mono text-gray-300 text-[11px]">
                        {a.email}
                      </td>

                      {/* Registration Date */}
                      <td className="p-3.5 text-gray-400 text-[11px]">
                        {new Date(a.registeredAt).toLocaleDateString([], {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Weight */}
                      <td className="p-3.5 text-center font-mono text-white font-bold">
                        {a.weightKg} кг
                      </td>

                      {/* Calories */}
                      <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                        {(a.totalCaloriesBurned || 0).toLocaleString()} ккал
                      </td>

                      {/* Distance */}
                      <td className="p-3.5 text-right font-mono font-bold text-[#C6FF33]">
                        {(a.totalKmRun || 0).toFixed(1)} км
                      </td>

                      {/* Street Pass / Premium Control */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {a.hasStreetPass && a.streetPassExpiresAt && a.streetPassExpiresAt > Date.now() ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-black bg-[#7D39EB]/30 text-[#C6FF33] border border-[#C6FF33]/50">
                              <Crown className="w-3 h-3 text-[#C6FF33]" />
                              <span>
                                {a.streetPassPlan === 'yearly'
                                  ? 'Премиум 1 Год'
                                  : a.streetPassPlan === 'monthly'
                                  ? 'Премиум 1 Месяц'
                                  : 'Активен'}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500 font-mono">— Нет</span>
                          )}

                          <div className="flex items-center gap-1 font-heading text-[10px] uppercase font-bold">
                            <button
                              type="button"
                              onClick={() => handleGrantPremium(a.id, 'monthly')}
                              className="px-2.5 py-0.5 bg-[#7D39EB] hover:bg-[#6c28d9] text-white rounded-full transition active:scale-95"
                              title="Выдать Street Pass на 30 дней"
                            >
                              + Месяц
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGrantPremium(a.id, 'yearly')}
                              className="px-2.5 py-0.5 bg-[#C6FF33] hover:bg-[#b0f020] text-black rounded-full transition active:scale-95"
                              title="Выдать Street Pass на 365 дней"
                            >
                              + Год
                            </button>
                            {a.hasStreetPass && (
                              <button
                                type="button"
                                onClick={() => handleGrantPremium(a.id, null)}
                                className="px-2 py-0.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-full transition"
                                title="Снять Street Pass"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {a.isBanned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold bg-rose-950 text-rose-400 border border-rose-500/40 uppercase">
                            <XCircle className="w-3 h-3" /> Забанен
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold bg-[#C6FF33]/15 text-[#C6FF33] border border-[#C6FF33]/40 uppercase">
                            <CheckCircle2 className="w-3 h-3" /> Активен
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleBan(a.id, a.isBanned)}
                          className={`px-3 py-1 rounded-full text-[11px] font-heading font-black uppercase tracking-wider transition active:scale-95 ${
                            a.isBanned
                              ? 'bg-[#C6FF33] text-black hover:bg-[#b0f020] shadow-md shadow-[#C6FF33]/20'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/40 hover:bg-rose-900'
                          }`}
                        >
                          {a.isBanned ? 'Разбан' : 'Бан'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
