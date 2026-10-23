'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import RunnerMap from '@/components/RunnerMap';
import { fetchLiveWeather, WeatherData } from '@/lib/weather';
import {
  calculateTargetDistanceKm,
  generateLoopRoute,
  exportToGPX,
  haversineDistance,
  RouteResult,
} from '@/lib/routing';
import {
  requestStrictGps,
  GPS_ACCURACY_THRESHOLD_METERS,
  GpsStatus,
} from '@/lib/gps';
import { GoogleUser, getSavedGoogleUser, saveGoogleUser } from '@/lib/auth';
import GoogleAuthModal from '@/components/auth/GoogleAuthModal';
import UserProfileButton from '@/components/auth/UserProfileButton';
import {
  Flame,
  CloudRain,
  Crosshair,
  Download,
  RotateCw,
  Zap,
  TrendingUp,
  MapPin,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  TreePine,
  Play,
  Square,
  AlertTriangle,
  RefreshCw,
  Gauge,
  Navigation2,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';

const PRESETS = [
  { label: 'Сникерс', kcal: 250, icon: '🍫' },
  { label: 'Круассан', kcal: 350, icon: '🥐' },
  { label: 'Бургер', kcal: 550, icon: '🍔' },
  { label: 'Пицца (2к)', kcal: 720, icon: '🍕' },
  { label: 'Донат', kcal: 300, icon: '🍩' },
  { label: 'Кола (0.5)', kcal: 210, icon: '🥤' },
];

const PACES = [
  { label: 'Лёгкий', minPerKm: 6.5, display: '6:30' },
  { label: 'Оптимальный', minPerKm: 5.5, display: '5:30' },
  { label: 'Быстрый', minPerKm: 4.5, display: '4:30' },
];

export default function RunnerApp() {
  // Google User State
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);

  // GPS & Location State
  const [startPos, setStartPos] = useState<[number, number]>([41.311081, 69.279737]);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus | null>(null);
  const [gpsModalDismissed, setGpsModalDismissed] = useState<boolean>(false);
  const [isCheckingGps, setIsCheckingGps] = useState<boolean>(false);

  // Calorie & Runner Settings
  const [calories, setCalories] = useState<number>(500);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [pace, setPace] = useState<number>(5.5);
  const [bearingOffset, setBearingOffset] = useState<number>(45);
  const [preferParks, setPreferParks] = useState<boolean>(true);

  // Route & Weather State
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite' | 'streets'>('dark');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showSteps, setShowSteps] = useState<boolean>(false);

  // Mobile Bottom Sheet Expand / Collapse State
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);

  // Active Live Tracking HUD State
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(false);
  const [liveRunnerPos, setLiveRunnerPos] = useState<[number, number] | null>(null);
  const [traversedCoords, setTraversedCoords] = useState<[number, number][]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [distanceTraversedKm, setDistanceTraversedKm] = useState<number>(0);

  const watchIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Strict GPS Verification
  const runStrictGpsVerification = async () => {
    setIsCheckingGps(true);
    const status = await requestStrictGps();
    setGpsStatus(status);
    setIsCheckingGps(false);

    if (status.coords) {
      setStartPos(status.coords);
    }
  };

  useEffect(() => {
    // Load saved athlete profile & Google user
    const savedUser = getSavedGoogleUser();
    if (savedUser) {
      setGoogleUser(savedUser);
      if (savedUser.weightKg) {
        setWeightKg(savedUser.weightKg);
      }
      // Sync with admin roster
      fetch('/api/admin/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedUser),
      }).catch(() => {});
    } else {
      setIsAuthModalOpen(true);
    }
    setIsAuthChecked(true);

    const savedWeight = localStorage.getItem('runner_weight');
    if (savedWeight && !savedUser?.weightKg) {
      setWeightKg(parseFloat(savedWeight));
    }
    runStrictGpsVerification();

    return () => {
      stopTracking();
    };
  }, []);

  const handleUserLogin = (user: GoogleUser) => {
    setGoogleUser(user);
    if (user.weightKg) {
      setWeightKg(user.weightKg);
    }
    setIsAuthModalOpen(false);
    // Sync with Admin panel registered athletes roster
    fetch('/api/admin/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    }).catch(() => {});
  };

  const handleLogout = () => {
    setGoogleUser(null);
    saveGoogleUser(null);
    setIsAuthModalOpen(true);
  };

  // Fetch Weather on position change
  useEffect(() => {
    fetchLiveWeather(startPos[0], startPos[1])
      .then((data) => setWeather(data))
      .catch((e) => console.error('Weather error:', e));
  }, [startPos]);

  // Target Calculations
  const targetKm = calculateTargetDistanceKm(calories, weightKg);
  const estimatedMinutes = Math.round(targetKm * pace);

  // Live Burned Calories
  const activeCaloriesBurned = Math.round(distanceTraversedKm * weightKg * 1.036);
  const remainingCalories = Math.max(0, calories - activeCaloriesBurned);
  const caloriePercent = Math.min(100, Math.round((activeCaloriesBurned / calories) * 100));

  const handleWeightChange = (val: number) => {
    setWeightKg(val);
    localStorage.setItem('runner_weight', val.toString());
  };

  const handleGenerateRoute = async (offset = bearingOffset, parks = preferParks) => {
    if (!googleUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsGenerating(true);
    try {
      const generated = await generateLoopRoute(
        startPos[0],
        startPos[1],
        targetKm,
        weightKg,
        pace,
        offset,
        parks,
      );
      setRoute(generated);
      // On mobile, collapse sheet so the full route on map is visible immediately!
      setIsMobileExpanded(false);
    } catch (e) {
      console.error('Route generation error', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRotateDirection = () => {
    const nextOffset = (bearingOffset + 60) % 360;
    setBearingOffset(nextOffset);
    handleGenerateRoute(nextOffset, preferParks);
  };

  // --- Active Live Tracking ---
  const startTracking = () => {
    if (!googleUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!route) return;

    setIsTrackingActive(true);
    setElapsedSeconds(0);
    setDistanceTraversedKm(0);
    setTraversedCoords([startPos]);
    setLiveRunnerPos(startPos);
    setIsMobileExpanded(false);

    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6 * 10) / 10 : 9.5;

          setLiveRunnerPos(newPos);
          setCurrentSpeedKmh(speed);

          setTraversedCoords((prev) => {
            if (prev.length > 0) {
              const last = prev[prev.length - 1];
              const addedMeters = haversineDistance(last[0], last[1], newPos[0], newPos[1]);
              if (addedMeters > 3) {
                setDistanceTraversedKm((d) => Math.round((d + addedMeters / 1000) * 100) / 100);
                return [...prev, newPos];
              }
              return prev;
            }
            return [newPos];
          });
        },
        (err) => console.warn('watchPosition error:', err),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
      );
    }
  };

  const stopTracking = () => {
    setIsTrackingActive(false);

    // Save run stats to Google User profile if active
    if (distanceTraversedKm > 0.05) {
      setGoogleUser((prev) => {
        if (!prev) return null;
        const updated: GoogleUser = {
          ...prev,
          totalCaloriesBurned: (prev.totalCaloriesBurned || 0) + activeCaloriesBurned,
          totalKmRun: (prev.totalKmRun || 0) + distanceTraversedKm,
          completedRunsCount: (prev.completedRunsCount || 0) + 1,
        };
        saveGoogleUser(updated);

        // Sync with admin roster
        fetch('/api/admin/athletes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }).catch(() => {});

        return updated;
      });
    }

    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  };

  // Movement Simulator for testing on PC
  const simulateMovementAlongRoute = () => {
    if (!route || route.coordinates.length < 2) return;
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
      return;
    }

    let currentIndex = 0;
    setCurrentSpeedKmh(10.5);

    simIntervalRef.current = setInterval(() => {
      currentIndex = (currentIndex + 1) % route.coordinates.length;
      const pt = route.coordinates[currentIndex];
      setLiveRunnerPos(pt);
      setTraversedCoords((prev) => [...prev, pt]);
      setDistanceTraversedKm((d) => Math.round((d + 0.05) * 100) / 100);
    }, 1200);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadGPX = () => {
    if (!route) return;
    const gpxData = exportToGPX(route, `CalorieRunner_${route.distanceKm}km_${calories}kcal`);
    const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run_loop_${route.distanceKm}km_${calories}kcal.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showGpsLock =
    gpsStatus && (!gpsStatus.hasPermission || !gpsStatus.isAccurate) && !gpsModalDismissed;

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#0A0E17] text-gray-100 font-sans safe-top">
      {/* Fullscreen Map Canvas */}
      <div className="absolute inset-0 z-0">
        <RunnerMap
          startPos={startPos}
          onStartPosChange={(pos) => {
            if (!isTrackingActive) {
              setStartPos(pos);
              if (route) setRoute(null);
            }
          }}
          route={route}
          mapStyle={mapStyle}
          liveRunnerPos={liveRunnerPos}
          traversedCoords={traversedCoords}
          isTrackingActive={isTrackingActive}
        />
      </div>

      {/* --- STRICT GPS LOCK SCREEN MODAL --- */}
      {showGpsLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in safe-bottom">
          <div className="relative w-full max-w-sm sm:max-w-md bg-[#0E1420] border-2 border-rose-500/70 rounded-3xl p-5 sm:p-6 text-white shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 mx-auto">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <h2 className="text-base sm:text-lg font-black text-center mb-1">
              ТРЕБУЕТСЯ ТОЧНЫЙ GPS ДЛЯ БЕГА
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-400 text-center mb-4">
              Точность геопозиции должна быть{' '}
              <strong className="text-white">не хуже ±{GPS_ACCURACY_THRESHOLD_METERS} метров</strong>.
            </p>

            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3.5 mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Статус:</span>
                <span className="text-rose-400 font-bold">
                  {gpsStatus.permissionState === 'denied'
                    ? 'Заблокировано в браузере'
                    : gpsStatus.hasPermission
                    ? 'Слабый сигнал'
                    : 'Ожидает разрешения'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Погрешность:</span>
                <span className="font-mono font-bold text-amber-400">
                  {gpsStatus.accuracy ? `±${gpsStatus.accuracy}м` : 'Не определена'}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-800 text-[11px] text-gray-300 space-y-1">
                <p className="font-semibold text-emerald-400">Как включить на телефоне:</p>
                <p>1. В шторке телефона включите «Геолокация» и выберите «Высокая точность».</p>
                <p>2. В браузере нажмите на значок 🔒/настройки слева от адреса и выберите «Разрешить».</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={runStrictGpsVerification}
                disabled={isCheckingGps}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 active:scale-98"
              >
                {isCheckingGps ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation2 className="w-4 h-4 fill-black" />
                )}
                <span>Повторить проверку GPS</span>
              </button>

              <button
                type="button"
                onClick={() => setGpsModalDismissed(true)}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-400 hover:text-white rounded-xl transition"
              >
                Продолжить в демо-режиме (ПК)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOP HEADER (Adaptive Mobile & Desktop) --- */}
      <header className="absolute top-2 sm:top-4 left-3 right-3 sm:left-4 sm:right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Brand Chip */}
        <div className="pointer-events-auto flex items-center gap-2 bg-black/85 backdrop-blur-md border border-gray-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl shadow-2xl">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase flex items-center gap-1">
              CALORIE <span className="text-emerald-400">RUNNER</span>
            </h1>
            <p className="hidden sm:block text-[9px] text-gray-400 font-mono -mt-0.5">
              {preferParks ? '🌲 Парковый режим' : 'Кольцевые маршруты'}
            </p>
          </div>
        </div>

        {/* Map Styles & GPS Target + Google User */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-black/85 backdrop-blur-md border border-gray-800 p-1 sm:p-1.5 rounded-2xl shadow-2xl">
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-2 sm:px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                mapStyle === 'dark' ? 'bg-emerald-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Тёмная карта"
            >
              <span>🌙</span>
              <span className="hidden md:inline">Тёмная</span>
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-2 sm:px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                mapStyle === 'satellite' ? 'bg-emerald-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Спутник"
            >
              <span>🛰</span>
              <span className="hidden md:inline">Спутник</span>
            </button>
            <button
              onClick={() => setMapStyle('streets')}
              className={`px-2 sm:px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                mapStyle === 'streets' ? 'bg-emerald-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Улицы"
            >
              <span>🗺</span>
              <span className="hidden md:inline">Улицы</span>
            </button>
            <button
              onClick={runStrictGpsVerification}
              className="p-1 sm:p-1.5 rounded-xl text-gray-300 hover:text-emerald-400 hover:bg-gray-800 transition flex items-center justify-center"
              title="Определить точный GPS"
            >
              <Crosshair className={`w-4 h-4 text-emerald-400 ${isCheckingGps ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/admin"
              className="p-1 sm:p-1.5 rounded-xl text-gray-400 hover:text-cyan-400 hover:bg-gray-800 transition flex items-center justify-center"
              title="Панель администратора (boss)"
            >
              <Lock className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Google Sign-in / Profile Button */}
          <UserProfileButton
            user={googleUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onUserLogin={handleUserLogin}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* --- ACTIVE RUNNING HUD (Live Mode) --- */}
      {isTrackingActive ? (
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 z-30 bg-[#0E1420]/95 backdrop-blur-xl border border-emerald-500/50 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 safe-bottom animate-slide-up">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                АКТИВНЫЙ БЕГ
              </span>
            </div>
            <span className="font-mono text-xs sm:text-sm font-bold text-white bg-gray-900 px-2.5 py-0.5 rounded-lg border border-gray-800">
              ⏱ {formatTimer(elapsedSeconds)}
            </span>
          </div>

          {/* Calorie Progress */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11px] text-gray-400 font-semibold">Калории:</span>
              <span className="font-mono text-xs sm:text-sm font-black text-emerald-400">
                {activeCaloriesBurned} / {calories} ккал ({caloriePercent}%)
              </span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2.5 overflow-hidden border border-gray-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${caloriePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>Осталось сжечь:</span>
              <strong className="text-amber-400 font-mono">-{remainingCalories} ккал</strong>
            </div>
          </div>

          {/* Speed & Distance Cards */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-gray-900/80 p-2.5 rounded-2xl border border-gray-800">
              <span className="text-[9px] uppercase font-bold text-gray-400 block flex items-center justify-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" /> Скорость
              </span>
              <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5">
                {currentSpeedKmh} <span className="text-[11px] font-sans text-gray-400">км/ч</span>
              </div>
            </div>

            <div className="bg-gray-900/80 p-2.5 rounded-2xl border border-gray-800">
              <span className="text-[9px] uppercase font-bold text-gray-400 block flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Пройдено
              </span>
              <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5">
                {distanceTraversedKm} / {route?.distanceKm || targetKm}{' '}
                <span className="text-[11px] font-sans text-gray-400">км</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={simulateMovementAlongRoute}
              className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-semibold text-cyan-400 transition"
            >
              🏃 Симулятор
            </button>
            <button
              type="button"
              onClick={stopTracking}
              className="py-2.5 px-4 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Стоп</span>
            </button>
          </div>
        </div>
      ) : (
        /* --- MOBILE BOTTOM SHEET & DESKTOP SIDEBAR PANEL --- */
        <div
          className={`absolute bottom-0 left-0 right-0 md:bottom-auto md:left-4 md:top-20 md:right-auto md:w-96 z-20 bg-[#0E1420]/95 backdrop-blur-xl border-t md:border border-gray-800/80 rounded-t-3xl md:rounded-3xl shadow-2xl safe-bottom bottom-sheet ${
            isMobileExpanded
              ? 'max-h-[85vh] overflow-y-auto p-4 sm:p-5'
              : 'max-h-[190px] sm:max-h-none overflow-hidden md:overflow-y-auto md:max-h-[82vh] p-4 sm:p-5'
          }`}
        >
          {/* Mobile Drag Handle & Toggle Header */}
          <div
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            className="md:hidden flex flex-col items-center pb-2 cursor-pointer touch-none"
          >
            <div className="w-10 h-1 bg-gray-700 rounded-full mb-2"></div>
            <div className="w-full flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {calories} ккал
                </span>
                <span className="text-gray-500">•</span>
                <span className="font-mono font-bold text-white text-sm">
                  {targetKm} км
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 text-xs">~{estimatedMinutes} мин</span>
              </div>
              <button
                type="button"
                className="text-[11px] text-gray-400 flex items-center gap-0.5 hover:text-white"
              >
                <span>{isMobileExpanded ? 'Свернуть' : 'Параметры'}</span>
                {isMobileExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Primary Quick CTA for Mobile Peek Mode */}
          <div className="md:hidden pt-1 pb-2">
            {!route ? (
              <button
                type="button"
                onClick={() => handleGenerateRoute()}
                disabled={isGenerating}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 active:scale-98"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>Сгенерировать круговой маршрут</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={startTracking}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 active:scale-98"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Начать пробежку ({route.distanceKm} км)</span>
              </button>
            )}
          </div>

          {/* Full Expandable Controls (Always visible on Desktop, Expandable on Mobile) */}
          <div className={`${isMobileExpanded ? 'block' : 'hidden md:block'} space-y-3.5 pt-2 md:pt-0`}>
            {/* Live Weather Radar Widget */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-semibold flex items-center gap-1 text-[11px]">
                  <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                  Погода
                </span>
                {weather && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      weather.suitability === 'EXCELLENT'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                        : weather.suitability === 'GOOD'
                        ? 'bg-blue-950 text-blue-400 border border-blue-500/40'
                        : weather.suitability === 'CAUTION'
                        ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                        : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {weather.suitabilityText}
                  </span>
                )}
              </div>

              {weather && (
                <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center">
                  <div className="bg-gray-950/60 p-1.5 rounded-xl border border-gray-800">
                    <span className="text-[9px] text-gray-400 block">Темп.</span>
                    <strong className="text-xs font-bold text-white">
                      {weather.temperature > 0 ? `+${weather.temperature}` : weather.temperature}°C
                    </strong>
                  </div>
                  <div className="bg-gray-950/60 p-1.5 rounded-xl border border-gray-800">
                    <span className="text-[9px] text-gray-400 block">Ветер</span>
                    <strong className="text-xs font-bold text-cyan-300">
                      {weather.windSpeed} км/ч
                    </strong>
                  </div>
                  <div className="bg-gray-950/60 p-1.5 rounded-xl border border-gray-800">
                    <span className="text-[9px] text-gray-400 block">Дождь</span>
                    <strong
                      className={`text-xs font-bold ${
                        weather.rainProbabilityNext2h >= 40 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {weather.rainProbabilityNext2h}%
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Park / Nature Filter Toggle */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <TreePine className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Через парки и зелёные зоны</span>
                  <span className="text-[10px] text-gray-400 block">
                    Приоритет пешеходных дорожек
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !preferParks;
                  setPreferParks(next);
                  if (route) handleGenerateRoute(bearingOffset, next);
                }}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-300 ${
                  preferParks ? 'bg-emerald-500 justify-end' : 'bg-gray-800 justify-start'
                }`}
              >
                <div className="bg-black w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>

            {/* Food Presets Grid */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">
                  Что сжигаем?
                </label>
                <span className="text-emerald-400 font-mono text-xs font-bold">{calories} ккал</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setCalories(p.kcal)}
                    className={`p-2 rounded-xl border text-left transition active:scale-95 ${
                      calories === p.kcal
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                        : 'bg-gray-900/70 border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="text-sm">{p.icon}</div>
                    <div className="text-[10px] font-semibold truncate leading-tight mt-0.5">
                      {p.label}
                    </div>
                    <div className="text-[9px] text-emerald-400 font-mono">~{p.kcal}к</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min={100}
                max={1500}
                step={25}
                value={calories}
                onChange={(e) => setCalories(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer h-2"
              />
            </div>

            {/* Weight & Pace */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-400 font-semibold mb-1">
                  Вес (кг)
                </label>
                <input
                  type="number"
                  min={40}
                  max={160}
                  value={weightKg}
                  onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 70)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-semibold mb-1">
                  Темп бега
                </label>
                <select
                  value={pace}
                  onChange={(e) => setPace(parseFloat(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  {PACES.map((pc) => (
                    <option key={pc.minPerKm} value={pc.minPerKm}>
                      {pc.label} ({pc.display})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Calculation Banner (Visible on Desktop) */}
            <div className="hidden md:flex p-3 bg-gradient-to-r from-emerald-950/60 via-cyan-950/60 to-gray-900 border border-emerald-500/30 rounded-2xl items-center justify-between">
              <div>
                <span className="text-[9px] text-emerald-400 uppercase font-black tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Дистанция
                </span>
                <div className="text-xl font-black text-white font-mono">
                  {targetKm} <span className="text-xs font-sans text-gray-400">км</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-cyan-400 uppercase font-black tracking-wider flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3" /> Время
                </span>
                <div className="text-lg font-bold text-cyan-200 font-mono">
                  ~{estimatedMinutes} <span className="text-xs font-sans text-gray-400">мин</span>
                </div>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleGenerateRoute()}
                disabled={isGenerating}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black" />
                    <span>Сгенерировать круговой маршрут</span>
                  </>
                )}
              </button>

              {route && (
                <>
                  <button
                    type="button"
                    onClick={startTracking}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Начать пробежку (GPS Live)</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRotateDirection}
                      className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold text-gray-200 transition flex items-center justify-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Другая петля</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadGPX}
                      className="py-2 px-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold text-emerald-400 transition flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>GPX</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Route Details Card */}
            {route && (
              <div className="pt-2 border-t border-gray-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1 text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Фактический трек:
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    {route.distanceKm} км • {route.durationMinutes} мин
                  </span>
                </div>

                {route.steps.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSteps(!showSteps)}
                      className="w-full text-[10px] text-gray-400 hover:text-white flex items-center justify-between py-1"
                    >
                      <span>Навигационные шаги ({route.steps.length})</span>
                      {showSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {showSteps && (
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-[10px] text-gray-300 pt-0.5">
                        {route.steps.map((st, i) => (
                          <div key={i} className="flex items-start justify-between gap-1.5 p-1 rounded-lg bg-gray-950/60 border border-gray-800">
                            <span className="truncate">{st.instruction}</span>
                            <span className="text-gray-500 font-mono shrink-0">{st.distanceMeters}м</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen || (isAuthChecked && !googleUser)}
        isRequired={!googleUser}
        onClose={() => {
          if (googleUser) {
            setIsAuthModalOpen(false);
          }
        }}
        onUserLogin={handleUserLogin}
        currentUserWeight={weightKg}
      />
    </div>
  );
}
