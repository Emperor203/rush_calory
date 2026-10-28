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
import { GoogleUser, getSavedGoogleUser, saveGoogleUser, getTelegramWebUser } from '@/lib/auth';
import { supabase, LiveOnlineRunner } from '@/lib/supabase';
import { PvpBattle, PvpInvitePayload, PvpRoom, PvpRoomRunner } from '@/lib/pvp';
import { CompletedWorkout, saveCompletedWorkout } from '@/lib/history';
import GoogleAuthModal from '@/components/auth/GoogleAuthModal';
import UserProfileButton from '@/components/auth/UserProfileButton';
import PvpDuelSystem from '@/components/pvp/PvpDuelSystem';
import WorkoutSummaryModal from '@/components/history/WorkoutSummaryModal';
import { isStreetPassActive } from '@/lib/streetpass';
import StreetPassModal from '@/components/streetpass/StreetPassModal';
import PvpPassBlockedModal from '@/components/streetpass/PvpPassBlockedModal';
import {
  Flame,
  CloudRain,
  Cloud,
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
  Swords,
  History,
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
  const [isUserBanned, setIsUserBanned] = useState<boolean>(false);
  const [onlineRunners, setOnlineRunners] = useState<LiveOnlineRunner[]>([]);

  // PVP Battle & Room State
  const [isPvpLobbyOpen, setIsPvpLobbyOpen] = useState<boolean>(false);
  const [activeBattle, setActiveBattle] = useState<PvpBattle | null>(null);
  const [activeRoom, setActiveRoom] = useState<PvpRoom | null>(null);
  const [openRooms, setOpenRooms] = useState<PvpRoom[]>([]);
  const [incomingInvite, setIncomingInvite] = useState<PvpInvitePayload | null>(null);
  const [pvpTraversedKm, setPvpTraversedKm] = useState<number>(0);

  const playBanSound = () => {
    try {
      const audio = new Audio('/sounds/user-banned.mp3');
      audio.volume = 1.0;
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(() => {});
      }
    } catch {}
  };

  const checkBan = async (email: string) => {
    if (!email) return false;
    const emailLower = email.toLowerCase();

    // 1. Check client-side ban list in localStorage
    try {
      const raw = localStorage.getItem('rush_banned_emails') || '[]';
      const bannedList: string[] = JSON.parse(raw);
      if (bannedList.includes(emailLower)) {
        setIsUserBanned(true);
        playBanSound();
        return true;
      }
    } catch {}

    // 2. Check server ban list
    try {
      const res = await fetch(`/api/admin/athletes?email=${encodeURIComponent(emailLower)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.isBanned) {
          setIsUserBanned(true);
          playBanSound();
          return true;
        }
      }
    } catch {}

    return false;
  };

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
  const [completedWorkout, setCompletedWorkout] = useState<CompletedWorkout | null>(null);
  const [isWorkoutSummaryOpen, setIsWorkoutSummaryOpen] = useState<boolean>(false);
  const [historyModalTab, setHistoryModalTab] = useState<'summary' | 'history'>('summary');
  const [isStreetPassModalOpen, setIsStreetPassModalOpen] = useState<boolean>(false);
  const [streetPassTab, setStreetPassTab] = useState<'plans' | 'studio'>('plans');
  const [isPvpPassBlockedOpen, setIsPvpPassBlockedOpen] = useState<boolean>(false);

  const openStreetPass = (tab: 'plans' | 'studio' = 'plans') => {
    setStreetPassTab(tab);
    setIsStreetPassModalOpen(true);
  };

  const openWorkoutHistory = () => {
    setHistoryModalTab('history');
    setIsWorkoutSummaryOpen(true);
  };

  const watchIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simIndexRef = useRef<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const touchStartYRef = useRef<number | null>(null);
  const hasMovedRef = useRef<boolean>(false);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  // Mobile Bottom Sheet Drag & Swipe Gestures
  const handleSheetHeaderTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchStartYRef.current = e.touches[0].clientY;
    hasMovedRef.current = false;
  };

  const handleSheetHeaderTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStartYRef.current - currentY; // > 0 = drag UP

    if (diff > 25 && !isMobileExpanded) {
      setIsMobileExpanded(true);
      hasMovedRef.current = true;
    } else if (diff < -25 && isMobileExpanded) {
      setIsMobileExpanded(false);
      hasMovedRef.current = true;
    }
  };

  const handleSheetHeaderTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchStartYRef.current = null;
  };

  const handleSheetHeaderClick = () => {
    if (!hasMovedRef.current) {
      setIsMobileExpanded((prev) => !prev);
    }
    hasMovedRef.current = false;
  };

  useEffect(() => {
    // 1. Telegram WebApp Integration & Auto-Login
    let savedUser = getSavedGoogleUser();
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.('#000000');
        tg.setBackgroundColor?.('#000000');
      } catch (e) {}

      // If opening in Telegram and not logged in yet, auto-login with Telegram profile!
      if (!savedUser) {
        const tgUser = getTelegramWebUser();
        if (tgUser) {
          savedUser = tgUser;
          saveGoogleUser(tgUser);
        }
      }
    }

    // 2. Load athlete profile
    if (savedUser) {
      if (savedUser.avatar === '/avatar.jpg') {
        savedUser.avatar = '';
        saveGoogleUser(savedUser);
      }
      setGoogleUser(savedUser);
      if (savedUser.weightKg) {
        setWeightKg(savedUser.weightKg);
      }
      checkBan(savedUser.email);
      // Sync with admin roster
      fetch('/api/admin/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedUser),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.isBanned) {
            setIsUserBanned(true);
            playBanSound();
          }
        })
        .catch(() => {});
    } else {
      setIsAuthModalOpen(true);
    }
    setIsAuthChecked(true);

    const savedWeight = localStorage.getItem('runner_weight');
    if (savedWeight && !savedUser?.weightKg) {
      setWeightKg(parseFloat(savedWeight));
    }
    runStrictGpsVerification();

    // 3. Check Telegram / URL Query Params (e.g. ?room=4821 or ?pvp=true)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room') || params.get('startapp');
      const pvpParam = params.get('pvp');

      if (roomParam) {
        const cleanRoom = roomParam.replace('room-', '').replace('pvp-', '').trim().toUpperCase();
        if (cleanRoom) {
          setTimeout(() => {
            handleJoinRoom(cleanRoom);
          }, 800);
        }
      } else if (pvpParam === 'true') {
        setIsPvpLobbyOpen(true);
      }
    }

    return () => {
      stopTracking();
    };
  }, []);

  const handleUserLogin = (user: GoogleUser) => {
    // If switching accounts or logging in anew, tear down previous channel and clear runners
    if (realtimeChannelRef.current) {
      const ch = realtimeChannelRef.current;
      realtimeChannelRef.current = null;
      ch.untrack().catch(() => {});
      supabase.removeChannel(ch).catch(() => {});
    }
    setOnlineRunners([]);
    setGoogleUser(user);
    if (user.weightKg) {
      setWeightKg(user.weightKg);
    }
    setIsAuthModalOpen(false);
    checkBan(user.email);

    // Sync with Admin panel registered athletes roster
    fetch('/api/admin/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.isBanned) {
          setIsUserBanned(true);
          playBanSound();
        }
      })
      .catch(() => {});
  };

  const handleLogout = async () => {
    // 1. Untrack and remove from Supabase Realtime immediately
    if (realtimeChannelRef.current) {
      const channel = realtimeChannelRef.current;
      realtimeChannelRef.current = null;
      try {
        await channel.send({
          type: 'broadcast',
          event: 'runner_leave',
          payload: { id: googleUser?.id, email: googleUser?.email },
        });
      } catch (e) {}
      try {
        await channel.untrack();
      } catch (e) {}
      try {
        await supabase.removeChannel(channel);
      } catch (e) {}
    }

    // 2. Clear state and local credentials
    setOnlineRunners([]);
    setActiveBattle(null);
    setActiveRoom(null);
    setIncomingInvite(null);
    setOpenRooms([]);
    setGoogleUser(null);
    saveGoogleUser(null);
    setIsAuthModalOpen(true);
  };

  // Target Calculations
  const targetKm = calculateTargetDistanceKm(calories, weightKg);
  const estimatedMinutes = Math.round(targetKm * pace);

  // Live Burned Calories
  const activeCaloriesBurned = Math.round(distanceTraversedKm * weightKg * 1.036);
  const pvpCaloriesBurned = Math.round(pvpTraversedKm * (weightKg || 70) * 1.036);
  const remainingCalories = Math.max(0, calories - activeCaloriesBurned);
  const caloriePercent = Math.min(100, Math.round((activeCaloriesBurned / calories) * 100));

  // Ref to hold live state for background presence heartbeat without interval thrashing
  const latestTrackingStateRef = useRef({
    liveRunnerPos,
    startPos,
    currentSpeedKmh,
    activeCaloriesBurned,
    isTrackingActive,
  });
  useEffect(() => {
    latestTrackingStateRef.current = {
      liveRunnerPos,
      startPos,
      currentSpeedKmh,
      activeCaloriesBurned,
      isTrackingActive,
    };
  }, [liveRunnerPos, startPos, currentSpeedKmh, activeCaloriesBurned, isTrackingActive]);

  // Supabase Realtime Online Presence & Live Coordinates
  useEffect(() => {
    if (!googleUser) {
      if (realtimeChannelRef.current) {
        const ch = realtimeChannelRef.current;
        realtimeChannelRef.current = null;
        ch.untrack().catch(() => {});
        supabase.removeChannel(ch).catch(() => {});
      }
      setOnlineRunners([]);
      return;
    }

    const channel = supabase.channel('rush-live-runners', {
      config: {
        presence: {
          key: googleUser.id,
        },
      },
    });

    realtimeChannelRef.current = channel;

    // Helper to safely extract, filter current user & deduplicate runners
    const syncRunners = () => {
      const state = channel.presenceState();
      const runnerMap = new Map<string, LiveOnlineRunner>();
      const now = Date.now();

      Object.keys(state).forEach((key) => {
        const presences = state[key] as any[];
        if (!Array.isArray(presences)) return;
        presences.forEach((p) => {
          if (!p || !p.id || typeof p.lat !== 'number' || typeof p.lng !== 'number') return;

          // STRICT: NEVER show current logged-in user in peer online runners!
          if (
            p.id === googleUser.id ||
            (p.email && googleUser.email && p.email.toLowerCase() === googleUser.email.toLowerCase())
          ) {
            return;
          }

          // Filter out stale ghost runner presence older than 2 minutes (120s)
          const lastSeenTime = p.lastSeen || (p.onlineAt ? new Date(p.onlineAt).getTime() : 0);
          if (lastSeenTime && now - lastSeenTime > 120000) {
            return;
          }

          // Deduplicate by normalized email or id
          const dedupKey = (p.email ? p.email.toLowerCase() : p.id).trim();
          const existing = runnerMap.get(dedupKey);
          if (!existing) {
            runnerMap.set(dedupKey, p);
          } else {
            const existingTime = existing.lastSeen || (existing.onlineAt ? new Date(existing.onlineAt).getTime() : 0);
            if (lastSeenTime >= existingTime) {
              runnerMap.set(dedupKey, p);
            }
          }
        });
      });

      setOnlineRunners(Array.from(runnerMap.values()));
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        syncRunners();
      })
      .on('presence', { event: 'join' }, () => {
        syncRunners();
      })
      .on('presence', { event: 'leave' }, () => {
        syncRunners();
      })
      .on('broadcast', { event: 'runner_leave' }, ({ payload }) => {
        if (payload?.id || payload?.email) {
          setOnlineRunners((prev) =>
            prev.filter(
              (r) =>
                r.id !== payload.id &&
                (!payload.email || !r.email || r.email.toLowerCase() !== payload.email.toLowerCase())
            )
          );
        }
      })
      // PVP Room Announce (A user created an open room)
      .on('broadcast', { event: 'pvp_room_announce' }, ({ payload }) => {
        if (!payload?.room) return;
        setOpenRooms((prev) => {
          const filtered = prev.filter((r) => r.roomCode !== payload.room.roomCode);
          return [...filtered, payload.room];
        });
      })
      // PVP Room Cancel
      .on('broadcast', { event: 'pvp_room_cancel' }, ({ payload }) => {
        if (!payload?.roomCode) return;
        setOpenRooms((prev) => prev.filter((r) => r.roomCode !== payload.roomCode));
        setActiveRoom((prev) => (prev?.roomCode === payload.roomCode ? null : prev));
      })
      // PVP Room Join (Guest entered room code)
      .on('broadcast', { event: 'pvp_room_join' }, ({ payload }) => {
        const { roomCode, guest } = payload || {};
        if (!roomCode || !guest) return;
        setActiveRoom((prev) => {
          if (!prev || prev.roomCode.toUpperCase() !== roomCode.toUpperCase()) return prev;
          const updated: PvpRoom = {
            ...prev,
            guest,
            status: 'ready',
          };
          channel
            .send({
              type: 'broadcast',
              event: 'pvp_room_ready',
              payload: { room: updated },
            })
            .catch(() => {});
          return updated;
        });
      })
      // PVP Room Ready (Both players see each other)
      .on('broadcast', { event: 'pvp_room_ready' }, ({ payload }) => {
        const room = payload?.room as PvpRoom | undefined;
        if (!room) return;
        const myId = googleUser.id;
        const myEmail = googleUser.email?.toLowerCase();
        const isGuest =
          room.guest?.id === myId || (myEmail && room.guest?.email?.toLowerCase() === myEmail);
        const isHost =
          room.host.id === myId || (myEmail && room.host.email?.toLowerCase() === myEmail);
        if (isGuest || isHost) {
          setActiveRoom(room);
          setIsPvpLobbyOpen(false);
        }
      })
      // PVP Battle Start (Host started the duel countdown/race)
      .on('broadcast', { event: 'pvp_battle_start' }, ({ payload }) => {
        const b = payload?.battle as PvpBattle | undefined;
        if (!b) return;
        const myId = googleUser.id;
        const myEmail = googleUser.email?.toLowerCase();
        const isChallenger =
          b.challenger.id === myId || (myEmail && b.challenger.email?.toLowerCase() === myEmail);
        const isOpponent =
          b.opponent.id === myId || (myEmail && b.opponent.email?.toLowerCase() === myEmail);
        if (isChallenger || isOpponent) {
          setActiveBattle(b);
          setPvpTraversedKm(0);
          setActiveRoom(null);
          setIncomingInvite(null);
          setIsPvpLobbyOpen(false);
        }
      })
      // PVP Guest Left Waiting Room
      .on('broadcast', { event: 'pvp_room_guest_leave' }, ({ payload }) => {
        if (!payload?.roomCode) return;
        setActiveRoom((prev) => {
          if (!prev || prev.roomCode.toUpperCase() !== payload.roomCode.toUpperCase()) return prev;
          return {
            ...prev,
            guest: null,
            status: 'waiting',
          };
        });
      })
      // PVP Direct Invite
      .on('broadcast', { event: 'pvp_invite' }, ({ payload }) => {
        const myId = googleUser.id;
        const myEmail = googleUser.email?.toLowerCase();
        const isForMe =
          payload?.toUserId === myId ||
          (payload?.toUserEmail && myEmail && payload.toUserEmail.toLowerCase() === myEmail);
        if (isForMe) {
          setIncomingInvite(payload);
        }
      })
      // PVP Direct Accept
      .on('broadcast', { event: 'pvp_accept' }, ({ payload }) => {
        const b = payload?.battle as PvpBattle | undefined;
        if (!b) return;
        const myId = googleUser.id;
        const myEmail = googleUser.email?.toLowerCase();
        const isChallenger =
          b.challenger.id === myId || (myEmail && b.challenger.email?.toLowerCase() === myEmail);
        const isOpponent =
          b.opponent.id === myId || (myEmail && b.opponent.email?.toLowerCase() === myEmail);
        if (isChallenger || isOpponent) {
          setActiveBattle(b);
          setPvpTraversedKm(0);
          setActiveRoom(null);
          setIncomingInvite(null);
          setIsPvpLobbyOpen(false);
        }
      })
      .on('broadcast', { event: 'pvp_decline' }, ({ payload }) => {
        const myId = googleUser.id;
        const myEmail = googleUser.email?.toLowerCase();
        if (
          payload?.challengerId === myId ||
          (myEmail && payload?.challengerEmail?.toLowerCase() === myEmail)
        ) {
          setActiveRoom(null);
        }
      })
      // PVP Live Progress
      .on('broadcast', { event: 'pvp_progress' }, ({ payload }) => {
        setActiveBattle((prev) => {
          if (!prev || prev.id !== payload?.battleId) return prev;
          const isOppChallenger = prev.challenger.id === payload.userId;
          const updated: PvpBattle = {
            ...prev,
            challenger: isOppChallenger
              ? { ...prev.challenger, currentKm: payload.currentKm, currentKcal: payload.currentKcal }
              : prev.challenger,
            opponent: !isOppChallenger
              ? { ...prev.opponent, currentKm: payload.currentKm, currentKcal: payload.currentKcal }
              : prev.opponent,
          };
          if (payload.currentKm >= prev.targetKm && prev.status === 'active') {
            updated.status = 'finished';
            updated.winnerId = payload.userId;
            updated.winReason = 'target_reached';
            if (payload.userId === googleUser.id && googleUser.mvpAnthemUrl) {
              try {
                const anthemAudio = new Audio(googleUser.mvpAnthemUrl);
                anthemAudio.volume = 0.9;
                anthemAudio.play().catch(() => {});
              } catch {}
            }
          }
          return updated;
        });

        // Keep sender marked active in online runners list so they never vanish after duel
        setOnlineRunners((prev) => {
          return prev.map((r) =>
            r.id === payload.userId ? { ...r, lastSeen: Date.now() } : r
          );
        });
      })
      // PVP Finish
      .on('broadcast', { event: 'pvp_finish' }, ({ payload }) => {
        setActiveBattle((prev) => {
          if (!prev || prev.id !== payload?.battleId) return prev;
          if (payload.winnerId === googleUser.id && googleUser.mvpAnthemUrl) {
            try {
              const anthemAudio = new Audio(googleUser.mvpAnthemUrl);
              anthemAudio.volume = 0.9;
              anthemAudio.play().catch(() => {});
            } catch {}
          }
          return {
            ...prev,
            status: 'finished',
            winnerId: payload.winnerId,
            winReason: payload.winReason || 'target_reached',
          };
        });
        syncRunners();
      })
      // PVP Surrender
      .on('broadcast', { event: 'pvp_surrender' }, ({ payload }) => {
        setActiveBattle((prev) => {
          if (!prev || prev.id !== payload?.battleId) return prev;
          if (payload.winnerId === googleUser.id && googleUser.mvpAnthemUrl) {
            try {
              const anthemAudio = new Audio(googleUser.mvpAnthemUrl);
              anthemAudio.volume = 0.9;
              anthemAudio.play().catch(() => {});
            } catch {}
          }
          return {
            ...prev,
            status: 'finished',
            winnerId: payload.winnerId,
            winReason: 'surrender',
          };
        });
        syncRunners();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: googleUser.id,
            name: googleUser.name,
            email: googleUser.email,
            avatar: googleUser.avatar,
            lat: liveRunnerPos ? liveRunnerPos[0] : startPos[0],
            lng: liveRunnerPos ? liveRunnerPos[1] : startPos[1],
            speedKmh: currentSpeedKmh,
            caloriesBurned: activeCaloriesBurned,
            isTracking: isTrackingActive,
            onlineAt: new Date().toISOString(),
            lastSeen: Date.now(),
          });
        }
      });

    // Re-track & sync presence when returning to tab/app (prevents disappearing on mobile)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && realtimeChannelRef.current) {
        const s = latestTrackingStateRef.current;
        realtimeChannelRef.current
          .track({
            id: googleUser.id,
            name: googleUser.name,
            email: googleUser.email,
            avatar: googleUser.avatar,
            lat: s.liveRunnerPos ? s.liveRunnerPos[0] : s.startPos[0],
            lng: s.liveRunnerPos ? s.liveRunnerPos[1] : s.startPos[1],
            speedKmh: s.currentSpeedKmh,
            caloriesBurned: s.activeCaloriesBurned,
            isTracking: s.isTrackingActive,
            onlineAt: new Date().toISOString(),
            lastSeen: Date.now(),
          })
          .catch(() => {});
        syncRunners();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    const handleBeforeUnload = () => {
      try {
        channel.send({
          type: 'broadcast',
          event: 'runner_leave',
          payload: { id: googleUser.id, email: googleUser.email },
        });
        channel.untrack();
      } catch (e) {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel).catch(() => {});
      if (realtimeChannelRef.current === channel) {
        realtimeChannelRef.current = null;
      }
    };
  }, [googleUser?.id, googleUser?.email]);

  // Push updated live coordinates to Supabase Realtime
  useEffect(() => {
    if (!googleUser || !realtimeChannelRef.current) return;
    realtimeChannelRef.current
      .track({
        id: googleUser.id,
        name: googleUser.name,
        email: googleUser.email,
        avatar: googleUser.avatar,
        lat: liveRunnerPos ? liveRunnerPos[0] : startPos[0],
        lng: liveRunnerPos ? liveRunnerPos[1] : startPos[1],
        speedKmh: currentSpeedKmh,
        caloriesBurned: activeCaloriesBurned,
        isTracking: isTrackingActive,
        onlineAt: new Date().toISOString(),
        lastSeen: Date.now(),
      })
      .catch(() => {});
  }, [liveRunnerPos, startPos, isTrackingActive, currentSpeedKmh, activeCaloriesBurned]);

  // Realtime heartbeat (every 12s) to prevent false ghost timeout
  useEffect(() => {
    if (!googleUser) return;
    const interval = setInterval(() => {
      if (realtimeChannelRef.current) {
        const s = latestTrackingStateRef.current;
        realtimeChannelRef.current
          .track({
            id: googleUser.id,
            name: googleUser.name,
            email: googleUser.email,
            avatar: googleUser.avatar,
            lat: s.liveRunnerPos ? s.liveRunnerPos[0] : s.startPos[0],
            lng: s.liveRunnerPos ? s.liveRunnerPos[1] : s.startPos[1],
            speedKmh: s.currentSpeedKmh,
            caloriesBurned: s.activeCaloriesBurned,
            isTracking: s.isTrackingActive,
            onlineAt: new Date().toISOString(),
            lastSeen: Date.now(),
          })
          .catch(() => {});
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [googleUser?.id]);

  // Periodic pruning of stale ghost markers (older than 2 minutes)
  useEffect(() => {
    const pruneInterval = setInterval(() => {
      const now = Date.now();
      setOnlineRunners((prev) => {
        let changed = false;
        const filtered = prev.filter((r) => {
          if (!r) return false;
          // Never keep current user in peer runners
          if (
            googleUser &&
            (r.id === googleUser.id ||
              (r.email && googleUser.email && r.email.toLowerCase() === googleUser.email.toLowerCase()))
          ) {
            changed = true;
            return false;
          }
          const lastSeenTime = r.lastSeen || (r.onlineAt ? new Date(r.onlineAt).getTime() : 0);
          if (lastSeenTime && now - lastSeenTime > 120000) {
            changed = true;
            return false; // Stale ghost runner prune
          }
          return true;
        });
        return changed ? filtered : prev;
      });
    }, 15000);

    return () => clearInterval(pruneInterval);
  }, [googleUser?.id, googleUser?.email]);

  // PVP Battle Live Progress Sync (Uses dedicated pvpTraversedKm)
  useEffect(() => {
    if (!activeBattle || activeBattle.status !== 'active' || !googleUser) return;

    const channel = realtimeChannelRef.current || supabase.channel('rush-live-runners');
    channel
      .send({
        type: 'broadcast',
        event: 'pvp_progress',
        payload: {
          battleId: activeBattle.id,
          userId: googleUser.id,
          currentKm: pvpTraversedKm,
          currentKcal: pvpCaloriesBurned,
        },
      })
      .catch(() => {});

    // Win check
    if (pvpTraversedKm >= activeBattle.targetKm) {
      channel
        .send({
          type: 'broadcast',
          event: 'pvp_finish',
          payload: {
            battleId: activeBattle.id,
            winnerId: googleUser.id,
            winReason: 'target_reached',
          },
        })
        .catch(() => {});

      setActiveBattle((prev) =>
        prev
          ? {
              ...prev,
              status: 'finished',
              winnerId: googleUser.id,
              winReason: 'target_reached',
            }
          : null
      );

      if (googleUser?.mvpAnthemUrl && googleUser.mvpAnthemUrl.trim() !== '') {
        try {
          const anthemAudio = new Audio(googleUser.mvpAnthemUrl);
          anthemAudio.volume = 0.9;
          anthemAudio.play().catch(() => {});
        } catch (e) {}
      }
    }
  }, [pvpTraversedKm, pvpCaloriesBurned, activeBattle?.status]);

  // Host periodic room re-announce so newly connected players discover waiting rooms
  useEffect(() => {
    if (!activeRoom || activeRoom.status !== 'waiting' || !googleUser) return;
    const isHost = activeRoom.host.id === googleUser.id;
    if (!isHost) return;

    const interval = setInterval(() => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current
          .send({
            type: 'broadcast',
            event: 'pvp_room_announce',
            payload: { room: activeRoom },
          })
          .catch(() => {});
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [activeRoom, googleUser?.id]);

  // PVP Action Handlers
  const handleCreateRoom = async (targetKm: number) => {
    if (!googleUser) return;
    if (!isStreetPassActive(googleUser)) {
      setIsPvpPassBlockedOpen(true);
      return;
    }
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    const newRoom: PvpRoom = {
      roomCode,
      host: {
        id: googleUser.id,
        name: googleUser.name,
        avatar: googleUser.avatar,
        email: googleUser.email,
        currentKm: 0,
        currentKcal: 0,
      },
      targetKm,
      status: 'waiting',
      createdAt: Date.now(),
    };

    setActiveRoom(newRoom);
    setIsPvpLobbyOpen(false);

    const channel = realtimeChannelRef.current || supabase.channel('rush-live-runners');
    await channel.send({
      type: 'broadcast',
      event: 'pvp_room_announce',
      payload: { room: newRoom },
    });
  };

  const handleJoinRoom = async (roomCode: string) => {
    if (!googleUser) return;
    if (!isStreetPassActive(googleUser)) {
      setIsPvpPassBlockedOpen(true);
      return;
    }
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return;

    // Prevent joining own room
    const existing = openRooms.find((r) => r.roomCode.toUpperCase() === cleanCode);
    if (
      existing &&
      (existing.host.id === googleUser.id ||
        (googleUser.email && existing.host.email?.toLowerCase() === googleUser.email.toLowerCase()))
    ) {
      alert('Вы являетесь создателем этой комнаты!');
      return;
    }

    const guestData: PvpRoomRunner = {
      id: googleUser.id,
      name: googleUser.name,
      avatar: googleUser.avatar,
      email: googleUser.email,
      currentKm: 0,
      currentKcal: 0,
    };

    if (existing) {
      setActiveRoom({
        ...existing,
        guest: guestData,
        status: 'ready',
      });
    } else {
      setActiveRoom({
        roomCode: cleanCode,
        host: { id: '', name: 'Ожидание хоста...', avatar: '', currentKm: 0, currentKcal: 0 },
        guest: guestData,
        targetKm: 1.0,
        status: 'waiting',
        createdAt: Date.now(),
      });
    }

    setIsPvpLobbyOpen(false);

    const channel = realtimeChannelRef.current || supabase.channel('rush-live-runners');
    await channel.send({
      type: 'broadcast',
      event: 'pvp_room_join',
      payload: {
        roomCode: cleanCode,
        guest: guestData,
      },
    });
  };

  const handleCancelRoom = async () => {
    if (!activeRoom || !googleUser) return;
    const isHost =
      activeRoom.host.id === googleUser.id ||
      (googleUser.email && activeRoom.host.email?.toLowerCase() === googleUser.email.toLowerCase());

    const channel = realtimeChannelRef.current || supabase.channel('rush-live-runners');
    if (isHost) {
      await channel.send({
        type: 'broadcast',
        event: 'pvp_room_cancel',
        payload: { roomCode: activeRoom.roomCode },
      });
    } else {
      await channel.send({
        type: 'broadcast',
        event: 'pvp_room_guest_leave',
        payload: { roomCode: activeRoom.roomCode },
      });
    }
    setActiveRoom(null);
  };

  const handleStartRoomRace = async () => {
    if (!activeRoom || !activeRoom.guest) return;
    const newBattle: PvpBattle = {
      id: `battle-${activeRoom.roomCode}-${Date.now()}`,
      roomCode: activeRoom.roomCode,
      challenger: activeRoom.host,
      opponent: activeRoom.guest,
      targetKm: activeRoom.targetKm,
      status: 'active',
      startedAt: new Date().toISOString(),
    };

    setActiveBattle(newBattle);
    setPvpTraversedKm(0);
    setActiveRoom(null);

    const channel = realtimeChannelRef.current || supabase.channel('rush-live-runners');
    await channel.send({
      type: 'broadcast',
      event: 'pvp_battle_start',
      payload: { battle: newBattle },
    });
  };

  const handleSendPvpInvite = async (targetRunner: LiveOnlineRunner, targetKm: number) => {
    if (!googleUser) return;
    if (!isStreetPassActive(googleUser)) {
      setIsPvpPassBlockedOpen(true);
      return;
    }
    const battleId = `pvp-${Date.now()}`;
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    const payload: PvpInvitePayload = {
      battleId,
      roomCode,
      fromUser: {
        id: googleUser.id,
        name: googleUser.name,
        avatar: googleUser.avatar,
        email: googleUser.email,
      },
      toUserId: targetRunner.id,
      toUserEmail: targetRunner.email,
      targetKm,
    };

    const channel = realtimeChannelRef.current || supabase.channel('rush-live-runners');
    await channel.send({
      type: 'broadcast',
      event: 'pvp_invite',
      payload,
    });

    const directRoom: PvpRoom = {
      roomCode,
      host: {
        id: googleUser.id,
        name: googleUser.name,
        avatar: googleUser.avatar,
        email: googleUser.email,
        currentKm: 0,
        currentKcal: 0,
      },
      targetKm,
      status: 'waiting',
      createdAt: Date.now(),
    };
    setActiveRoom(directRoom);
    setIsPvpLobbyOpen(false);
  };

  const handleAcceptPvpInvite = async (invite: PvpInvitePayload) => {
    if (!googleUser) return;
    if (!isStreetPassActive(googleUser)) {
      setIsPvpPassBlockedOpen(true);
      return;
    }
    const newBattle: PvpBattle = {
      id: invite.battleId,
      roomCode: invite.roomCode,
      challenger: {
        id: invite.fromUser.id,
        name: invite.fromUser.name,
        avatar: invite.fromUser.avatar,
        email: invite.fromUser.email,
        currentKm: 0,
        currentKcal: 0,
      },
      opponent: {
        id: googleUser.id,
        name: googleUser.name,
        avatar: googleUser.avatar,
        email: googleUser.email,
        currentKm: 0,
        currentKcal: 0,
      },
      targetKm: invite.targetKm,
      status: 'active',
      startedAt: new Date().toISOString(),
    };

    setActiveBattle(newBattle);
    setPvpTraversedKm(0);
    setActiveRoom(null);
    setIncomingInvite(null);

    const channel = realtimeChannelRef.current || supabase.channel('rush-live-runners');
    await channel.send({
      type: 'broadcast',
      event: 'pvp_accept',
      payload: { battle: newBattle },
    });
  };

  const handleDeclinePvpInvite = async (invite: PvpInvitePayload) => {
    if (!googleUser) return;
    setIncomingInvite(null);
    const channel = realtimeChannelRef.current || supabase.channel('rush-live-runners');
    await channel.send({
      type: 'broadcast',
      event: 'pvp_decline',
      payload: {
        challengerId: invite.fromUser.id,
        challengerEmail: invite.fromUser.email,
        declinedByName: googleUser.name,
      },
    });
  };

  const handleSurrenderBattle = async () => {
    if (!activeBattle || !googleUser) return;
    if (activeBattle.status === 'finished') {
      setActiveBattle(null);
      return;
    }

    const myId = googleUser.id;
    const myEmail = googleUser.email?.toLowerCase();
    const isChallenger =
      activeBattle.challenger.id === myId ||
      (myEmail && activeBattle.challenger.email?.toLowerCase() === myEmail);
    const winnerId = isChallenger ? activeBattle.opponent.id : activeBattle.challenger.id;

    const channel = realtimeChannelRef.current || supabase.channel('rush-live-runners');
    await channel.send({
      type: 'broadcast',
      event: 'pvp_surrender',
      payload: {
        battleId: activeBattle.id,
        winnerId,
      },
    });

    setActiveBattle({
      ...activeBattle,
      status: 'finished',
      winnerId,
      winReason: 'surrender',
    });
  };

  const handleCloseBattle = () => {
    setActiveBattle(null);
    setPvpTraversedKm(0);
    if (realtimeChannelRef.current && googleUser) {
      const s = latestTrackingStateRef.current;
      realtimeChannelRef.current
        .track({
          id: googleUser.id,
          name: googleUser.name,
          email: googleUser.email,
          avatar: googleUser.avatar,
          lat: s.liveRunnerPos ? s.liveRunnerPos[0] : s.startPos[0],
          lng: s.liveRunnerPos ? s.liveRunnerPos[1] : s.startPos[1],
          speedKmh: s.currentSpeedKmh,
          caloriesBurned: s.activeCaloriesBurned,
          isTracking: s.isTrackingActive,
          onlineAt: new Date().toISOString(),
          lastSeen: Date.now(),
        })
        .catch(() => {});
    }
  };

  const handleAddTestDistance = (km: number) => {
    setPvpTraversedKm((prev) => {
      const next = parseFloat((prev + km).toFixed(2));
      const kcalBurned = Math.round(next * (weightKg || 70) * 1.036);

      if (activeBattle && activeBattle.status === 'active' && googleUser) {
        const channel = realtimeChannelRef.current || supabase.channel('rush-live-runners');
        channel
          .send({
            type: 'broadcast',
            event: 'pvp_progress',
            payload: {
              battleId: activeBattle.id,
              userId: googleUser.id,
              currentKm: next,
              currentKcal: kcalBurned,
            },
          })
          .catch(() => {});

        if (next >= activeBattle.targetKm) {
          channel
            .send({
              type: 'broadcast',
              event: 'pvp_finish',
              payload: {
                battleId: activeBattle.id,
                winnerId: googleUser.id,
                winReason: 'target_reached',
              },
            })
            .catch(() => {});

          setActiveBattle((prevB) =>
            prevB
              ? {
                  ...prevB,
                  status: 'finished',
                  winnerId: googleUser.id,
                  winReason: 'target_reached',
                }
              : null
          );

          if (googleUser?.mvpAnthemUrl && googleUser.mvpAnthemUrl.trim() !== '') {
            try {
              const anthemAudio = new Audio(googleUser.mvpAnthemUrl);
              anthemAudio.volume = 0.9;
              anthemAudio.play().catch(() => {});
            } catch {}
          }
        }
      }

      return next;
    });

    setDistanceTraversedKm((prev) => parseFloat((prev + km).toFixed(2)));
  };

  // Fetch Weather on position change
  useEffect(() => {
    fetchLiveWeather(startPos[0], startPos[1])
      .then((data) => setWeather(data))
      .catch((e) => console.error('Weather error:', e));
  }, [startPos]);

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
    if (!route && !activeBattle) return;

    const initialPos = liveRunnerPos || startPos;
    setIsTrackingActive(true);
    setElapsedSeconds(0);
    setDistanceTraversedKm(0);
    simIndexRef.current = 0;
    setIsSimulating(false);
    if (activeBattle) {
      setPvpTraversedKm(0);
    }
    setTraversedCoords([initialPos]);
    setLiveRunnerPos(initialPos);
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
                const addKm = addedMeters / 1000;
                setDistanceTraversedKm((d) => Math.round((d + addKm) * 100) / 100);
                if (activeBattle && activeBattle.status === 'active') {
                  setPvpTraversedKm((d) => Math.round((d + addKm) * 100) / 100);
                }
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
    const finalDist = distanceTraversedKm;
    const finalCalories = activeCaloriesBurned;
    const finalSeconds = elapsedSeconds;
    const avgPace = finalDist > 0.01 ? (finalSeconds / 60) / finalDist : pace;

    // Save to workout history & show summary modal (only for solo run, not duel)
    if (!activeBattle && (finalDist >= 0.01 || finalSeconds >= 3)) {
      const workoutRecord: CompletedWorkout = {
        id: `run-${Date.now()}`,
        date: new Date().toISOString(),
        distanceKm: Math.round(finalDist * 100) / 100,
        caloriesBurned: Math.round(finalCalories),
        durationSeconds: finalSeconds,
        avgPaceMinPerKm: Math.round(avgPace * 10) / 10,
      };
      saveCompletedWorkout(workoutRecord);
      setCompletedWorkout(workoutRecord);
      setHistoryModalTab('summary');
      setIsWorkoutSummaryOpen(true);

      // Play MVP Victory Anthem for Street Pass athletes!
      if (googleUser?.hasStreetPass && googleUser?.mvpAnthemUrl) {
        try {
          const anthemAudio = new Audio(googleUser.mvpAnthemUrl);
          anthemAudio.volume = 0.85;
          anthemAudio.play().catch(() => {});
        } catch (e) {}
      }
    }

    // Return to clean initial state
    setIsTrackingActive(false);
    setRoute(null);
    setDistanceTraversedKm(0);
    setElapsedSeconds(0);
    setTraversedCoords([]);
    setLiveRunnerPos(null);
    setCurrentSpeedKmh(0);

    // Save run stats to Google User profile if active
    if (finalDist > 0.01) {
      setGoogleUser((prev) => {
        if (!prev) return null;
        const updated: GoogleUser = {
          ...prev,
          totalCaloriesBurned: (prev.totalCaloriesBurned || 0) + Math.round(finalCalories),
          totalKmRun: (prev.totalKmRun || 0) + Math.round(finalDist * 100) / 100,
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
    simIndexRef.current = 0;
    setIsSimulating(false);
  };

  // Movement Simulator for testing on PC (No teleportation, smooth progression, stops at finish)
  const simulateMovementAlongRoute = () => {
    // If currently running, pause it right where runner is
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
      setIsSimulating(false);
      setCurrentSpeedKmh(0);
      return;
    }

    setIsSimulating(true);
    setCurrentSpeedKmh(11.5);

    // Case 1: Route is loaded with coordinates
    if (route && route.coordinates.length >= 2) {
      const coords = route.coordinates;
      const totalPoints = coords.length;
      // Step size ensures smooth animation that completes in reasonable time (~20-30s)
      const step = Math.max(1, Math.floor(totalPoints / 75));
      const intervalMs = 380;

      simIntervalRef.current = setInterval(() => {
        const prevIdx = simIndexRef.current;
        const nextIdx = Math.min(prevIdx + step, totalPoints - 1);
        simIndexRef.current = nextIdx;

        const p1 = coords[prevIdx];
        const p2 = coords[nextIdx];
        const segmentMeters = haversineDistance(p1[0], p1[1], p2[0], p2[1]);
        const addKm = segmentMeters / 1000;

        setLiveRunnerPos(p2);
        setTraversedCoords((prev) => [...prev, p2]);

        const isFinish = nextIdx >= totalPoints - 1;

        setDistanceTraversedKm((d) => {
          if (isFinish) return route.distanceKm;
          return Math.round((d + addKm) * 100) / 100;
        });

        if (activeBattle && activeBattle.status === 'active') {
          setPvpTraversedKm((d) => {
            if (isFinish) return Math.max(route.distanceKm, activeBattle.targetKm);
            return Math.round((d + addKm) * 100) / 100;
          });
        }

        // Reached the finish line: STOP cleanly! Never teleport back to start!
        if (isFinish) {
          if (simIntervalRef.current) {
            clearInterval(simIntervalRef.current);
            simIntervalRef.current = null;
          }
          setIsSimulating(false);
          setCurrentSpeedKmh(0);
        }
      }, intervalMs);
      return;
    }

    // Case 2: No route loaded (e.g. PvP duel without pre-generated route)
    const origin = liveRunnerPos || startPos;
    const intervalMs = 400;
    const targetDistKm = activeBattle ? activeBattle.targetKm : 1.0;
    const stepKm = 0.025; // 25 meters per step

    simIntervalRef.current = setInterval(() => {
      simIndexRef.current += 1;
      const angle = simIndexRef.current * 0.15;
      const radiusDeg = 0.0015; // ~150m radius
      const newLat = origin[0] + radiusDeg * Math.sin(angle);
      const newLng = origin[1] + (radiusDeg * Math.cos(angle)) / Math.cos((origin[0] * Math.PI) / 180);
      const newPos: [number, number] = [newLat, newLng];

      setLiveRunnerPos(newPos);
      setTraversedCoords((prev) => [...prev, newPos]);

      let reached = false;

      setDistanceTraversedKm((d) => {
        const nextD = Math.round((d + stepKm) * 100) / 100;
        if (nextD >= targetDistKm) reached = true;
        return nextD;
      });

      if (activeBattle && activeBattle.status === 'active') {
        setPvpTraversedKm((d) => {
          const nextD = Math.round((d + stepKm) * 100) / 100;
          if (nextD >= activeBattle.targetKm) reached = true;
          return nextD;
        });
      }

      if (reached) {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        setIsSimulating(false);
        setCurrentSpeedKmh(0);
      }
    }, intervalMs);
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
          onlineRunners={onlineRunners}
          currentUser={googleUser}
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
      <header className="absolute top-2 sm:top-4 left-3 right-3 sm:left-4 sm:right-4 z-40 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Brand Chip */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-[#000000] border-2 border-[#222222] p-1.5 sm:px-4 sm:py-2 rounded-2xl shadow-2xl">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden border border-[#7D39EB] bg-[#000000] flex items-center justify-center shadow-lg shrink-0">
              <img src="/avatar.jpg" alt="Calorie Runner" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase flex items-center gap-1">
                CALORIE <span className="text-[#C6FF33]">RUNNER</span>
              </h1>
              <p className="text-[9px] text-gray-400 font-mono -mt-0.5">
                {preferParks ? '🌲 Парковый режим' : 'Кольцевые маршруты'}
              </p>
            </div>
          </div>

          {/* Supabase Live Online Badge (Pure Lime & Black) */}
          <div
            className="pointer-events-auto flex items-center gap-1 bg-[#000000] border-2 border-[#C6FF33] px-2 py-1.5 sm:px-3 sm:py-2 rounded-2xl shadow-xl text-[#C6FF33]"
            title={`${onlineRunners.length + (googleUser ? 1 : 0)} бегунов онлайн сейчас (Supabase Realtime)`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6FF33] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C6FF33]"></span>
            </span>
            <span className="font-mono font-black text-xs">{onlineRunners.length + (googleUser ? 1 : 0)}</span>
            <span className="text-[10px] text-white font-bold hidden md:inline">онлайн</span>
          </div>

          {/* PVP Duel Arena Button (Solid Violet & White) */}
          <button
            type="button"
            onClick={() => {
              if (!googleUser) {
                setIsAuthModalOpen(true);
                return;
              }
              if (!isStreetPassActive(googleUser)) {
                setIsPvpPassBlockedOpen(true);
                return;
              }
              setIsPvpLobbyOpen(true);
            }}
            className="pointer-events-auto flex items-center gap-1 bg-[#7D39EB] hover:bg-[#6c28d9] text-white p-1.5 sm:px-3 sm:py-2 rounded-2xl shadow-xl font-black text-xs transition active:scale-95 animate-pulse"
            title="Открыть арену PVP забегов и вызвать соперника"
          >
            <Swords className="w-3.5 h-3.5" />
            <span className="hidden md:inline">PVP Дуэль</span>
          </button>

          {/* History Button on Initial Screen (Header) */}
          <button
            type="button"
            onClick={openWorkoutHistory}
            className="pointer-events-auto flex items-center gap-1 bg-[#121212] hover:bg-[#1c1c1c] border border-[#242424] hover:border-[#C6FF33] text-gray-200 hover:text-[#C6FF33] p-1.5 sm:px-3 sm:py-2 rounded-2xl shadow-xl font-bold text-xs transition active:scale-95"
            title="История моих пробежек"
          >
            <History className="w-3.5 h-3.5 text-[#C6FF33]" />
            <span className="hidden md:inline">История</span>
          </button>
        </div>

        {/* Map Styles & GPS Target + Google User */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Desktop Only Map Styles Bar */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#000000] border-2 border-[#222222] p-1.5 rounded-2xl shadow-2xl">
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                mapStyle === 'dark' ? 'bg-[#C6FF33] text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Тёмная карта"
            >
              <span>🌙</span>
              <span>Тёмная</span>
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                mapStyle === 'satellite' ? 'bg-[#C6FF33] text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Спутник"
            >
              <span>🛰</span>
              <span>Спутник</span>
            </button>
            <button
              onClick={() => setMapStyle('streets')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                mapStyle === 'streets' ? 'bg-[#C6FF33] text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Улицы"
            >
              <span>🗺</span>
              <span>Улицы</span>
            </button>
            <button
              onClick={runStrictGpsVerification}
              className="p-1.5 rounded-xl text-gray-300 hover:text-[#C6FF33] hover:bg-[#151515] transition flex items-center justify-center"
              title="Определить точный GPS"
            >
              <Crosshair className={`w-4 h-4 text-[#C6FF33] ${isCheckingGps ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Street Pass VIP Button */}
          <button
            type="button"
            onClick={() => openStreetPass('plans')}
            className={`pointer-events-auto flex items-center gap-1 p-1 sm:px-2.5 sm:py-1 rounded-2xl shadow-xl font-black text-xs transition active:scale-95 ${
              isStreetPassActive(googleUser)
                ? 'bg-[#000000] border-2 border-[#C6FF33] text-[#C6FF33] shadow-[0_0_15px_rgba(198,255,51,0.25)]'
                : 'bg-[#7D39EB] hover:bg-[#6c28d9] text-white border border-[#7D39EB]'
            }`}
            title="Уличный допуск (Street Pass) — соревновательный пропуск атлета"
          >
            <Zap className={`w-3.5 h-3.5 ${isStreetPassActive(googleUser) ? 'fill-[#C6FF33]' : 'fill-white'}`} />
            <span className="hidden sm:inline font-mono">
              {isStreetPassActive(googleUser) ? 'VERIFIED' : 'STREET PASS'}
            </span>
          </button>

          {/* Google Sign-in / Profile Button */}
          <UserProfileButton
            user={googleUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onUserLogin={handleUserLogin}
            onLogout={handleLogout}
            onOpenHistory={openWorkoutHistory}
            onOpenStreetPass={(tab) => openStreetPass(tab || 'plans')}
          />
        </div>
      </header>

      {/* --- MOBILE FLOATING MAP CONTROLS (Styles & GPS, Left-aligned on mobile to avoid profile overlap) --- */}
      {!activeBattle && !activeRoom && (
        <div className="md:hidden absolute top-16 left-3 z-10 flex flex-col items-start gap-2 pointer-events-none">
          {/* Floating Map Layers switcher */}
          <div className="pointer-events-auto bg-[#000000]/95 backdrop-blur-md border border-[#242424] p-1 rounded-2xl shadow-2xl flex flex-col gap-1">
            <button
              onClick={() => setMapStyle('dark')}
              className={`w-8 h-8 rounded-xl text-xs transition flex items-center justify-center ${
                mapStyle === 'dark' ? 'bg-[#C6FF33] text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Тёмная карта"
            >
              🌙
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`w-8 h-8 rounded-xl text-xs transition flex items-center justify-center ${
                mapStyle === 'satellite' ? 'bg-[#C6FF33] text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Спутник"
            >
              🛰
            </button>
            <button
              onClick={() => setMapStyle('streets')}
              className={`w-8 h-8 rounded-xl text-xs transition flex items-center justify-center ${
                mapStyle === 'streets' ? 'bg-[#C6FF33] text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Улицы"
            >
              🗺
            </button>
          </div>

          {/* Floating GPS Target button */}
          <button
            onClick={runStrictGpsVerification}
            className="pointer-events-auto w-9 h-9 rounded-2xl bg-[#000000]/95 backdrop-blur-md border border-[#242424] flex items-center justify-center text-[#C6FF33] hover:border-[#C6FF33] shadow-2xl active:scale-95 transition"
            title="Мой точный GPS"
          >
            <Crosshair className={`w-4 h-4 text-[#C6FF33] ${isCheckingGps ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* --- ACTIVE RUNNING HUD (Live Mode, Solo Run) --- */}
      {isTrackingActive && !activeBattle ? (
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 z-30 bg-[#000000] border-2 border-[#C6FF33] rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(198,255,51,0.25)] space-y-3.5 safe-bottom animate-slide-up">
          <div className="flex items-center justify-between border-b border-[#222222] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6FF33] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C6FF33]"></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#C6FF33]">
                АКТИВНЫЙ БЕГ
              </span>
            </div>
            <span className="font-mono text-xs sm:text-sm font-bold text-white bg-[#151515] px-2.5 py-0.5 rounded-lg border border-[#333333]">
              ⏱ {formatTimer(elapsedSeconds)}
            </span>
          </div>

          {/* Calorie Progress */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11px] text-gray-400 font-semibold">Калории:</span>
              <span className="font-mono text-xs sm:text-sm font-black text-[#C6FF33]">
                {activeCaloriesBurned} / {calories} ккал ({caloriePercent}%)
              </span>
            </div>
            <div className="w-full bg-[#151515] rounded-full h-2.5 overflow-hidden border border-[#333333]">
              <div
                className="h-full bg-[#7D39EB] rounded-full transition-all duration-500"
                style={{ width: `${caloriePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Осталось сжечь:</span>
              <strong className="text-[#C6FF33] font-mono font-bold">-{remainingCalories} ккал</strong>
            </div>
          </div>

          {/* Speed & Distance Cards */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-[#111111] p-2.5 rounded-2xl border border-[#242424]">
              <span className="text-[9px] uppercase font-bold text-gray-400 block flex items-center justify-center gap-1">
                <Gauge className="w-3 h-3 text-[#7D39EB]" /> Скорость
              </span>
              <div className="text-lg sm:text-xl font-black text-[#C6FF33] font-mono mt-0.5">
                {currentSpeedKmh} <span className="text-[11px] font-sans text-gray-400">км/ч</span>
              </div>
            </div>

            <div className="bg-[#111111] p-2.5 rounded-2xl border border-[#242424]">
              <span className="text-[9px] uppercase font-bold text-gray-400 block flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#C6FF33]" /> Пройдено
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
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                isSimulating
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-[#000000] hover:bg-[#151515] border border-[#7D39EB] text-white'
              }`}
            >
              <span>{isSimulating ? '⏸ Пауза симулятора' : '🏃 Симулятор'}</span>
            </button>
            <button
              type="button"
              onClick={stopTracking}
              className="py-2.5 px-4 bg-[#000000] hover:bg-rose-950 border border-rose-500 text-rose-400 rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Стоп</span>
            </button>
          </div>
        </div>
      ) : !activeBattle && !activeRoom ? (
        /* --- MOBILE BOTTOM SHEET & DESKTOP SIDEBAR PANEL --- */
        <div
          onTouchStart={(e) => e.stopPropagation()}
          className={`fixed bottom-0 left-0 right-0 md:absolute md:bottom-auto md:left-4 md:top-20 md:right-auto md:w-96 z-20 bg-[#000000] border-t md:border-2 border-[#242424] rounded-t-3xl md:rounded-3xl shadow-2xl bottom-sheet ${
            isMobileExpanded
              ? 'max-h-[85dvh] overflow-y-auto overscroll-contain p-4 sm:p-5 pb-32 md:pb-5'
              : 'max-h-[190px] sm:max-h-none overflow-hidden md:overflow-y-auto md:max-h-[82vh] p-4 sm:p-5'
          }`}
        >
          {/* Mobile Drag Handle & Toggle Header */}
          <div
            onClick={handleSheetHeaderClick}
            onTouchStart={handleSheetHeaderTouchStart}
            onTouchMove={handleSheetHeaderTouchMove}
            onTouchEnd={handleSheetHeaderTouchEnd}
            className="md:hidden flex flex-col items-center pb-2 cursor-pointer select-none touch-none active:opacity-90"
          >
            <div className="w-12 h-1.5 bg-gray-600 rounded-full mb-2 active:bg-[#C6FF33] transition-colors"></div>
            <div className="w-full flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-[#7D39EB] text-sm">
                  {calories} ккал
                </span>
                <span className="text-gray-500">•</span>
                <span className="font-mono font-bold text-[#C6FF33] text-sm">
                  {targetKm} км
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 text-xs">~{estimatedMinutes} мин</span>
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

          {/* Primary Quick CTA for Mobile Peek Mode (Only shown when collapsed to prevent duplicate buttons) */}
          {!isMobileExpanded && (
            <div className="md:hidden pt-1 pb-2 space-y-2">
              {!route ? (
                <button
                  type="button"
                  onClick={() => handleGenerateRoute()}
                  disabled={isGenerating}
                  className="w-full py-3 bg-[#C6FF33] hover:bg-[#b0f020] text-[#000000] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 active:scale-98"
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
                  className="w-full py-3 bg-[#7D39EB] hover:bg-[#6c28d9] text-[#FFFFFF] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Начать пробежку ({route.distanceKm} км)</span>
                </button>
              )}

              {/* Quick History Button right on mobile peek */}
              <button
                type="button"
                onClick={openWorkoutHistory}
                className="w-full py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-[#242424] hover:border-[#7D39EB] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-98"
              >
                <History className="w-3.5 h-3.5 text-[#C6FF33]" />
                <span>История моих пробежек</span>
              </button>
            </div>
          )}

          {/* Full Expandable Controls (Always visible on Desktop, Expandable on Mobile) */}
          <div className={`${isMobileExpanded ? 'block' : 'hidden md:block'} space-y-3.5 pt-2 md:pt-0`}>
            {/* Live Weather Radar Widget */}
            <div className="bg-[#121212] border border-[#242424] rounded-2xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#FFFFFF] font-semibold flex items-center gap-1 text-[11px]">
                  <CloudRain className="w-3.5 h-3.5 text-[#C6FF33]" />
                  Погода
                </span>
                {weather && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      weather.suitability === 'EXCELLENT'
                        ? 'bg-[#C6FF33] text-[#000000]'
                        : weather.suitability === 'GOOD'
                        ? 'bg-[#7D39EB] text-[#FFFFFF]'
                        : 'bg-[#222222] text-[#FFFFFF]'
                    }`}
                  >
                    {weather.suitabilityText}
                  </span>
                )}
              </div>

              {weather && (
                <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center">
                  <div className="bg-[#000000] p-1.5 rounded-xl border border-[#242424]">
                    <span className="text-[9px] text-gray-400 block">Темп.</span>
                    <strong className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-0.5">
                      <Cloud className="w-3.5 h-3.5 text-[#C6FF33] shrink-0" />
                      <span>{weather.temperature > 0 ? `+${weather.temperature}` : weather.temperature}°C</span>
                    </strong>
                  </div>
                  <div className="bg-[#000000] p-1.5 rounded-xl border border-[#242424]">
                    <span className="text-[9px] text-gray-400 block">Ветер</span>
                    <strong className="text-xs font-bold text-[#FFFFFF]">
                      {weather.windSpeed} км/ч
                    </strong>
                  </div>
                  <div className="bg-[#000000] p-1.5 rounded-xl border border-[#242424]">
                    <span className="text-[9px] text-gray-400 block">Дождь</span>
                    <strong className="text-xs font-bold text-[#C6FF33]">
                      {weather.rainProbabilityNext2h}%
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Park / Nature Filter Toggle */}
            <div className="bg-[#121212] border border-[#242424] rounded-2xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#000000] border border-[#242424] flex items-center justify-center text-[#C6FF33]">
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
                  preferParks ? 'bg-[#C6FF33] justify-end' : 'bg-[#242424] justify-start'
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
                <span className="text-[#C6FF33] font-mono text-xs font-bold">{calories} ккал</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setCalories(p.kcal)}
                    className={`p-2 rounded-xl border text-left transition active:scale-95 ${
                      calories === p.kcal
                        ? 'bg-[#7D39EB] border-[#7D39EB] text-white font-bold'
                        : 'bg-[#121212] border-[#242424] text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm">{p.icon}</div>
                    <div className="text-[10px] font-semibold truncate leading-tight mt-0.5">
                      {p.label}
                    </div>
                    <div className={`text-[9px] font-mono ${calories === p.kcal ? 'text-[#C6FF33]' : 'text-gray-400'}`}>
                      ~{p.kcal}к
                    </div>
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
                className="w-full accent-[#7D39EB] cursor-pointer h-2"
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
                  className="w-full bg-[#121212] border border-[#242424] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#7D39EB]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-semibold mb-1">
                  Темп бега
                </label>
                <select
                  value={pace}
                  onChange={(e) => setPace(parseFloat(e.target.value))}
                  className="w-full bg-[#121212] border border-[#242424] rounded-xl px-2 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-[#7D39EB]"
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
            <div className="hidden md:flex p-3 bg-[#121212] border border-[#242424] rounded-2xl items-center justify-between">
              <div>
                <span className="text-[9px] text-[#C6FF33] uppercase font-black tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#C6FF33]" /> Дистанция
                </span>
                <div className="text-xl font-black text-white font-mono">
                  {targetKm} <span className="text-xs font-sans text-gray-400">км</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-[#7D39EB] uppercase font-black tracking-wider flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3 text-[#7D39EB]" /> Время
                </span>
                <div className="text-lg font-bold text-white font-mono">
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
                className="w-full py-3.5 bg-[#C6FF33] hover:bg-[#b0f020] text-[#000000] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
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
                    className="w-full py-3 bg-[#7D39EB] hover:bg-[#6c28d9] text-[#FFFFFF] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Начать пробежку (GPS Live)</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRotateDirection}
                      className="flex-1 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-[#242424] rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-[#C6FF33]" />
                      <span>Другая петля</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadGPX}
                      className="py-2 px-3 bg-[#121212] hover:bg-[#1a1a1a] border border-[#242424] rounded-xl text-xs font-bold text-[#C6FF33] transition flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>GPX</span>
                    </button>
                  </div>
                </>
              )}

              {/* History Button on Desktop */}
              <button
                type="button"
                onClick={openWorkoutHistory}
                className="w-full py-2.5 bg-[#121212] hover:bg-[#1a1a1a] border border-[#242424] hover:border-[#7D39EB] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <History className="w-3.5 h-3.5 text-[#C6FF33]" />
                <span>История всех пробежек</span>
              </button>
            </div>

            {/* Route Details Card */}
            {route && (
              <div className="pt-2 border-t border-[#242424] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1 text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5 text-[#C6FF33]" />
                    Фактический трек:
                  </span>
                  <span className="font-mono font-bold text-[#C6FF33] text-xs">
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
                      {showSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                    </button>

                    {showSteps && (
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-[10px] text-gray-300 pt-0.5">
                        {route.steps.map((st, i) => (
                          <div key={i} className="flex items-start justify-between gap-1.5 p-1 rounded-lg bg-[#000000] border border-[#242424]">
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

            {/* Bottom spacer for comfortable mobile scrolling */}
            <div className="h-16 md:hidden" />
          </div>
        </div>
      ) : null}

      {/* PVP Duel System (HUD, Room Lobby, Invites, Victory) */}
      {googleUser && (
        <PvpDuelSystem
          currentUser={googleUser}
          onlineRunners={onlineRunners}
          activeRoom={activeRoom}
          activeBattle={activeBattle}
          incomingInvite={incomingInvite}
          isLobbyOpen={isPvpLobbyOpen}
          openRooms={openRooms}
          isTrackingActive={isTrackingActive}
          myLiveKm={pvpTraversedKm}
          myLiveKcal={pvpCaloriesBurned}
          onCloseLobby={() => setIsPvpLobbyOpen(false)}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onCancelRoom={handleCancelRoom}
          onStartRoomRace={handleStartRoomRace}
          onSendInvite={handleSendPvpInvite}
          onAcceptInvite={handleAcceptPvpInvite}
          onDeclineInvite={handleDeclinePvpInvite}
          onSurrenderBattle={handleSurrenderBattle}
          onCloseBattle={handleCloseBattle}
          onToggleTracking={() => (isTrackingActive ? stopTracking() : startTracking())}
          onAddTestDistance={handleAddTestDistance}
        />
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

      {/* Full-Screen Lockout Screen for Banned Users */}
      {isUserBanned && (
        <div
          onClick={playBanSound}
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 text-center animate-fade-in safe-bottom"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full bg-[#160a0d] border-2 border-rose-500 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(244,63,94,0.45)] space-y-5"
          >
            <div
              onClick={playBanSound}
              className="w-20 h-20 mx-auto rounded-3xl bg-rose-950/80 border-2 border-rose-500 flex items-center justify-center text-4xl shadow-inner animate-pulse cursor-pointer hover:scale-105 transition"
              title="Нажмите, чтобы включить звук"
            >
              🚫
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-rose-950 text-rose-400 border border-rose-500/50 uppercase tracking-widest font-mono">
                Блокировка доступа
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider font-mono">
                АККАУНТ ЗАБЛОКИРОВАН
              </h2>
              <p className="text-xs text-rose-200/80 leading-relaxed pt-1">
                Пользователь <span className="font-mono font-bold text-white bg-rose-950 px-2 py-0.5 rounded border border-rose-500/40">{googleUser?.email || 'атлет'}</span> заблокирован решением шефа за нарушение правил платформы.
              </p>
            </div>
            <div className="p-3.5 bg-black/70 rounded-2xl border border-rose-950 text-[11px] text-gray-400 font-mono leading-relaxed">
              📢 Доступ к генерации маршрутов, GPS-трекингу калорий и всем функциям Rush Calory полностью закрыт.
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={playBanSound}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <span>🔊</span>
                <span>Включить звук бана</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setIsUserBanned(false);
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-rose-200 font-black text-xs transition active:scale-98"
              >
                Выйти из заблокированного аккаунта
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Summary & History Modal */}
      <WorkoutSummaryModal
        isOpen={isWorkoutSummaryOpen}
        onClose={() => setIsWorkoutSummaryOpen(false)}
        workout={completedWorkout}
        currentUser={googleUser}
        initialTab={historyModalTab}
      />

      {/* Competitive Subscription: Street Pass Modal */}
      <StreetPassModal
        isOpen={isStreetPassModalOpen}
        initialTab={streetPassTab}
        onClose={() => setIsStreetPassModalOpen(false)}
        currentUser={googleUser}
        onUserUpdate={(updated) => {
          setGoogleUser(updated);
        }}
      />

      {/* PVP Access Blocked Notice Modal (Voice Alert) */}
      <PvpPassBlockedModal
        isOpen={isPvpPassBlockedOpen}
        onClose={() => setIsPvpPassBlockedOpen(false)}
        onOpenStreetPass={() => setIsStreetPassModalOpen(true)}
        currentUser={googleUser}
        onUserUpdate={(updated) => {
          setGoogleUser(updated);
        }}
      />
    </div>
  );
}
