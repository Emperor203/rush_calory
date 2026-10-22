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
  Map,
  CheckCircle2,
  XCircle,
  Download,
  Activity,
  RefreshCw,
  Mail,
  Calendar,
  Volume2,
} from 'lucide-react';

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
      audio.play().catch((err) => {
        console.warn('Audio play error:', err);
      });
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

  const fetchAthletes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/athletes');
      if (res.ok) {
        const data = await res.json();
        setAthletes(data.athletes || []);
        setStats(
          data.stats || {
            totalAthletes: 0,
            totalCaloriesBurned: 0,
            totalKmRun: 0,
            totalRunsCompleted: 0,
          },
        );
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
      // If we are banning an athlete (not unbanning), play the custom boss sound!
      if (!currentBanned) {
        playBanSound();
      }

      const res = await fetch('/api/admin/athletes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: athleteId, isBanned: !currentBanned }),
      });
      if (res.ok) {
        setAthletes((prev) =>
          prev.map((a) => (a.id === athleteId ? { ...a, isBanned: !currentBanned } : a)),
        );

        if (!currentBanned) {
          const target = athletes.find((a) => a.id === athleteId);
          setBanNotification(`🔨 БАН ВЫДАН: ${target?.name || 'Пользователь'} заблокирован шефом!`);
          setTimeout(() => setBanNotification(null), 4000);
        }
      }
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
            <Map className="w-3.5 h-3.5 text-cyan-400" />
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#0E1420] border border-gray-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
              <span>Зарегистрировано атлетов</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white mt-2 font-mono">
              {stats.totalAthletes}
            </div>
            <div className="text-[10px] text-emerald-400 mt-1">В базе пользователей</div>
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
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-800/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="p-3.5 font-bold">Атлет</th>
                  <th className="p-3.5 font-bold">Email</th>
                  <th className="p-3.5 font-bold">Дата входа</th>
                  <th className="p-3.5 font-bold text-center">Вес</th>
                  <th className="p-3.5 font-bold text-right">Сожжено ккал</th>
                  <th className="p-3.5 font-bold text-right">Пробег (км)</th>
                  <th className="p-3.5 font-bold text-center">Статус</th>
                  <th className="p-3.5 font-bold text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {filteredAthletes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
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
                            <div className="font-bold text-white flex items-center gap-1">
                              <span>{a.name}</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            </div>
                            <span className="text-[10px] text-gray-500">ID: {a.id.slice(0, 12)}</span>
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
