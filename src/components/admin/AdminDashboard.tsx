'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Flame,
  TrendingUp,
  Award,
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
  Mail,
  Calendar,
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

  // Helper to merge athletes from multiple sources (API, localStorage, Realtime presence, Realtime announce)
  // Strips out any fake mock accounts (aziz@turfwars.com, beka@turfwars.com, etc.)
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
          if (!item) return false;
          const e = (item.email || '').toLowerCase();
          return (
            !e.includes('turfwars.com') &&
            item.id !== 'athlete-1' &&
            item.id !== 'athlete-2' &&
            item.id !== 'athlete-3'
          );
        })
        .forEach((r) => {
          const key = (r.email || r.id).toLowerCase();
          const existing = map.get(key);
          if (existing) {
            map.set(key, {
              ...existing,
              name: r.name || existing.name,
              avatar: r.avatar || existing.avatar,
              weightKg: r.weightKg || existing.weightKg,
              totalCaloriesBurned: Math.max(
                existing.totalCaloriesBurned || 0,
                r.caloriesBurned || r.totalCaloriesBurned || 0,
              ),
              totalKmRun: Math.max(existing.totalKmRun || 0, r.totalKmRun || 0),
              completedRunsCount: Math.max(existing.completedRunsCount || 0, r.completedRunsCount || 0),
              hasStreetPass:
                r.hasStreetPass !== undefined ? Boolean(r.hasStreetPass) : existing.hasStreetPass,
              streetPassPlan: r.streetPassPlan !== undefined ? r.streetPassPlan : existing.streetPassPlan,
              streetPassExpiresAt:
                r.streetPassExpiresAt !== undefined ? r.streetPassExpiresAt : existing.streetPassExpiresAt,
              isBanned: existing.isBanned || Boolean(r.isBanned),
              lastActiveAt: new Date().toISOString(),
            });
          } else {
            map.set(key, {
              id: r.id || `athlete-${Date.now()}`,
              name: r.name || 'Атлет',
              email: r.email || `${r.id}@runner.app`,
              avatar:
                r.avatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.name || 'Athlete')}`,
              weightKg: r.weightKg || 70,
              totalCaloriesBurned: r.caloriesBurned || r.totalCaloriesBurned || 0,
              totalKmRun: r.totalKmRun || 0,
              completedRunsCount: r.completedRunsCount || 0,
              isBanned: Boolean(r.isBanned),
              hasStreetPass: Boolean(
                r.hasStreetPass && r.streetPassExpiresAt && r.streetPassExpiresAt > Date.now(),
              ),
              streetPassPlan: r.streetPassPlan || null,
              streetPassExpiresAt: r.streetPassExpiresAt || null,
              registeredAt: r.registeredAt || r.onlineAt || new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
            });
          }
        });

      const list: RegisteredAthlete[] = Array.from(map.values());
      if (typeof window !== 'undefined') {
        localStorage.setItem('rush_cached_athletes', JSON.stringify(list));
      }
      return list;
    });
  };

  const handleClearCache = () => {
    if (confirm('Очистить список и удалить старый кэш?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rush_cached_athletes');
      }
      setAthletes([]);
      fetchAthletes();
    }
  };

  const fetchAthletes = async () => {
    setIsLoading(true);
    try {
      // 1. Load locally cached real athletes first
      let localCached: RegisteredAthlete[] = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('rush_cached_athletes');
          if (raw) {
            localCached = JSON.parse(raw);
          }
        } catch {}
      }

      const res = await fetch('/api/admin/athletes');
      if (res.ok) {
        const data = await res.json();
        const rawBanned =
          typeof window !== 'undefined' ? localStorage.getItem('rush_banned_emails') || '[]' : '[]';
        let localBannedEmails: string[] = [];
        try {
          localBannedEmails = JSON.parse(rawBanned);
        } catch {}

        const serverAthletes = (data.athletes || []).map((a: RegisteredAthlete) => ({
          ...a,
          isBanned: a.isBanned || localBannedEmails.includes((a.email || '').toLowerCase()),
        }));

        mergeAthletes([...localCached, ...serverAthletes]);
        setStats(
          data.stats || {
            totalAthletes: 0,
            totalCaloriesBurned: 0,
            totalKmRun: 0,
            totalRunsCompleted: 0,
          },
        );
      } else if (localCached.length > 0) {
        mergeAthletes(localCached);
      }
    } catch (e) {
      console.error('Error fetching athletes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAthletes();

      const channel = supabase.channel('rush-live-runners');
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const runners: LiveOnlineRunner[] = [];
          Object.keys(state).forEach((key) => {
            const presences = state[key] as any[];
            presences.forEach((p) => runners.push(p));
          });
          setOnlineRunners(runners);
          mergeAthletes(runners);
        })
        .on('broadcast', { event: 'athlete_announce' }, ({ payload }) => {
          if (payload?.athlete) {
            mergeAthletes([payload.athlete]);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Ping all currently running athlete web apps to announce themselves immediately
            channel
              .send({
                type: 'broadcast',
                event: 'admin_ping',
                payload: {},
              })
              .catch(() => {});
          }
        });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [isAuthenticated]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (loginInput.trim() === BOSS_LOGIN && passwordInput.trim() === BOSS_PASS) {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, 'boss_verified_access');
      }
    } else {
      setAuthError('Доступ запрещён! Неверный логин или пароль администратора.');
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

      // If we are banning an athlete (not unbanning), play the custom boss sound!
      if (newBannedState) {
        playBanSound();
      }

      // Optimistic state update in UI & localStorage
      setAthletes((prev) => {
        const next = prev.map((a) => (a.id === athleteId ? { ...a, isBanned: newBannedState } : a));
        if (typeof window !== 'undefined') {
          localStorage.setItem('rush_cached_athletes', JSON.stringify(next));
        }
        return next;
      });

      // Persist in localStorage so it stays banned across sessions and tabs
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

      // Broadcast ban live to runner's device
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

      // Update state and localStorage
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

      // Broadcast to user device live via Supabase Realtime!
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

  // --- 1. LOGIN SCREEN FOR BOSS ONLY ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-screen bg-[#070A10] flex items-center justify-center p-4 text-white font-sans">
        <div className="relative w-full max-w-sm bg-[#0E1420] border-2 border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/10">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-black tracking-wider uppercase">
              АДМИН-ПАНЕЛЬ <span className="text-cyan-400">RUSH CALORY</span>
            </h1>
            <p className="text-xs text-gray-400">
              Закрытая зона управления. Доступ только для владельца.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">
                Логин
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Введите логин boss"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">
                Пароль доступа
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-98"
            >
              Войти в систему
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-cyan-400 transition inline-flex items-center gap-1"
            >
              ← Вернуться на главную карту
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. AUTHENTICATED BOSS CONTROL CENTER ---
  return (
    <div className="min-h-screen w-screen bg-[#070A10] text-gray-100 p-4 sm:p-8 font-sans space-y-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-black font-black">
              👑
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide uppercase">
                BOSS CONTROL CENTER
              </h1>
              <p className="text-xs text-gray-400">
                Мониторинг зарегистрированных атлетов и активности Rush Calory
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-bold text-gray-300 transition"
          >
            <MapIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>На карту</span>
          </Link>

          <button
            onClick={playBanSound}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-bold transition"
            title="Проверить коронный звук бана шефа"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Звук бана</span>
          </button>

          <button
            onClick={fetchAthletes}
            disabled={isLoading}
            className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white transition"
            title="Обновить данные"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold transition"
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
              <span className="text-2xl">⚡</span>
              <span className="font-black text-sm tracking-wide">{banNotification}</span>
            </div>
            <button
              onClick={() => setBanNotification(null)}
              className="text-xs text-rose-400 hover:text-white px-2 py-1 bg-rose-950 rounded-lg"
            >
              ✕
            </button>
          </div>
        )}
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-[#0E1420] border border-emerald-500/50 p-4 rounded-2xl col-span-2 lg:col-span-1 shadow-lg shadow-emerald-950/40">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
              <span className="text-emerald-300">В сети (Realtime)</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
              {onlineRunners.length}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Supabase WebSockets</div>
          </div>

          <div className="bg-[#0E1420] border border-gray-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
              <span>Зарегистрировано</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white mt-2 font-mono">
              {stats.totalAthletes}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Всего в базе</div>
          </div>

          <div className="bg-[#0E1420] border border-gray-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
              <span>Сожжено калорий</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
              {stats.totalCaloriesBurned.toLocaleString()} <span className="text-xs font-sans text-gray-400">ккал</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Суммарный прогресс</div>
          </div>

          <div className="bg-[#0E1420] border border-gray-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
              <span>Общий километраж</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
              {stats.totalKmRun} <span className="text-xs font-sans text-gray-400">км</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Сгенерировано треков</div>
          </div>

          <div className="bg-[#0E1420] border border-gray-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
              <span>Завершённых забегов</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white mt-2 font-mono">
              {stats.totalRunsCompleted}
            </div>
            <div className="text-[10px] text-cyan-400 mt-1">В режиме Active HUD</div>
          </div>
        </div>

        {/* Athletes Directory Section */}
        <div className="bg-[#0E1420] border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                РЕЕСТР ЗАРЕГИСТРИРОВАННЫХ АТЛЕТОВ GOOGLE ({athletes.length})
              </h2>
              <p className="text-xs text-gray-400">
                Полный список пользователей, вошедших через аккаунт Google
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Поиск по имени / email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 w-48 sm:w-64"
                />
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold text-gray-300 transition flex items-center gap-1.5"
                title="Экспорт в CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Экспорт</span>
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/40 rounded-xl text-xs font-bold text-rose-300 transition flex items-center gap-1.5"
                title="Очистить старый кэш"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Сброс кэша</span>
              </button>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< md screens) - NO HORIZONTAL SCROLL NEEDED! */}
          <div className="block md:hidden space-y-3">
            {filteredAthletes.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-[#090D14] rounded-2xl border border-gray-800">
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
                    className="p-4 rounded-2xl bg-[#090D14] border border-gray-800 space-y-3 shadow-xl"
                  >
                    {/* Athlete Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center border border-cyan-400/50 shrink-0">
                          {a.avatar ? (
                            <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-black text-sm">{a.name[0]}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{a.name}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          </div>
                          <span className="text-[11px] font-mono text-gray-400 block">{a.email}</span>
                        </div>
                      </div>

                      {/* Online Status */}
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          В сети
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900 text-gray-500 border border-gray-800">
                          Офлайн
                        </span>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#0E1420] border border-gray-800/80 text-center">
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
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {(a.totalKmRun || 0).toFixed(1)} км
                        </span>
                      </div>
                    </div>

                    {/* Street Pass Status */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-950/30 border border-purple-900/40">
                      <div className="flex items-center gap-1.5">
                        <Crown className={`w-4 h-4 ${hasPass ? 'text-[#C6FF33]' : 'text-gray-500'}`} />
                        <div>
                          <span className="text-[9px] text-gray-400 block font-mono">Street Pass:</span>
                          <span className="text-xs font-bold text-white font-mono">
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
                          className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-[10px] font-bold transition"
                        >
                          ✕ Снять
                        </button>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleGrantPremium(a.id, 'monthly')}
                        className="py-2.5 px-1 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-500/50 rounded-xl text-xs font-black transition active:scale-95 text-center"
                      >
                        👑 + Месяц
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGrantPremium(a.id, 'yearly')}
                        className="py-2.5 px-1 bg-[#C6FF33]/20 hover:bg-[#C6FF33]/30 text-[#C6FF33] border border-[#C6FF33]/50 rounded-xl text-xs font-black transition active:scale-95 text-center"
                      >
                        👑 + Год
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBan(a.id, a.isBanned)}
                        className={`py-2.5 px-1 rounded-xl text-xs font-bold transition active:scale-95 text-center ${
                          a.isBanned
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-900'
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
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-800/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="p-3.5 font-bold">Атлет</th>
                  <th className="p-3.5 font-bold">Email</th>
                  <th className="p-3.5 font-bold">Дата входа</th>
                  <th className="p-3.5 font-bold text-center">Вес</th>
                  <th className="p-3.5 font-bold text-right">Сожжено ккал</th>
                  <th className="p-3.5 font-bold text-right">Пробег (км)</th>
                  <th className="p-3.5 font-bold text-center">Street Pass (Премиум)</th>
                  <th className="p-3.5 font-bold text-center">Статус</th>
                  <th className="p-3.5 font-bold text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {filteredAthletes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      {searchTerm ? 'Ничего не найдено по вашему запросу' : 'Пока нет зарегистрированных атлетов'}
                    </td>
                  </tr>
                ) : (
                  filteredAthletes.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-900/50 transition">
                      {/* Avatar & Name */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center border border-cyan-400/50 shrink-0">
                            {a.avatar ? (
                              <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-black text-xs">{a.name[0]}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                              <span>{a.name}</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              {a.hasStreetPass && a.streetPassExpiresAt && a.streetPassExpiresAt > Date.now() ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-950 text-[#C6FF33] border border-[#C6FF33]/40 font-mono">
                                  👑 {a.streetPassPlan === 'yearly' ? 'ПРЕМИУМ ГОД' : 'ПРЕМИУМ МЕСЯЦ'}
                                </span>
                              ) : null}
                              {onlineRunners.some(
                                (o) => (o.email || '').toLowerCase() === (a.email || '').toLowerCase(),
                              ) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/50">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  В сети
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 block">ID: {a.id.slice(0, 12)}</span>

                            {/* Mobile Quick Premium Buttons (Directly visible on phones without horizontal scroll) */}
                            <div className="flex items-center gap-1 mt-1 sm:hidden">
                              <button
                                type="button"
                                onClick={() => handleGrantPremium(a.id, 'monthly')}
                                className="px-1.5 py-0.5 bg-purple-950 text-purple-300 border border-purple-500/50 rounded text-[9px] font-bold"
                              >
                                + Месяц
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGrantPremium(a.id, 'yearly')}
                                className="px-1.5 py-0.5 bg-[#C6FF33]/20 text-[#C6FF33] border border-[#C6FF33]/50 rounded text-[9px] font-bold"
                              >
                                + Год
                              </button>
                              {a.hasStreetPass && (
                                <button
                                  type="button"
                                  onClick={() => handleGrantPremium(a.id, null)}
                                  className="px-1 py-0.5 bg-rose-950 text-rose-300 border border-rose-500/50 rounded text-[9px] font-bold"
                                >
                                  Снять
                                </button>
                              )}
                            </div>
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
                      <td className="p-3.5 text-center font-mono">
                        {a.weightKg} кг
                      </td>

                      {/* Calories */}
                      <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                        {(a.totalCaloriesBurned || 0).toLocaleString()} ккал
                      </td>

                      {/* Distance */}
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        {(a.totalKmRun || 0).toFixed(1)} км
                      </td>

                      {/* Street Pass / Premium Control */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {a.hasStreetPass && a.streetPassExpiresAt && a.streetPassExpiresAt > Date.now() ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-950 text-[#C6FF33] border border-[#C6FF33]/50 font-mono">
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

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleGrantPremium(a.id, 'monthly')}
                              className="px-2 py-0.5 bg-purple-950 hover:bg-purple-900 border border-purple-600/50 text-purple-300 rounded text-[9px] font-bold transition active:scale-95"
                              title="Выдать Street Pass на 30 дней"
                            >
                              + Месяц
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGrantPremium(a.id, 'yearly')}
                              className="px-2 py-0.5 bg-[#C6FF33]/20 hover:bg-[#C6FF33]/30 border border-[#C6FF33]/50 text-[#C6FF33] rounded text-[9px] font-bold transition active:scale-95"
                              title="Выдать Street Pass на 365 дней"
                            >
                              + Год
                            </button>
                            {a.hasStreetPass && (
                              <button
                                type="button"
                                onClick={() => handleGrantPremium(a.id, null)}
                                className="px-1.5 py-0.5 bg-gray-900 hover:bg-rose-950 text-gray-400 hover:text-rose-400 border border-gray-700 rounded text-[9px] font-bold transition"
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-500/40">
                            <XCircle className="w-3 h-3" /> Заблокирован
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3" /> Активен
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleBan(a.id, a.isBanned)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                            a.isBanned
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-900'
                              : 'bg-rose-950 text-rose-400 border border-rose-500/40 hover:bg-rose-900'
                          }`}
                        >
                          {a.isBanned ? 'Разблокировать' : 'Бан'}
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
