'use client';

import React, { useState, useEffect } from 'react';
import { PvpBattle, PvpRoom, PvpInvitePayload } from '@/lib/pvp';
import { LiveOnlineRunner } from '@/lib/supabase';
import { GoogleUser } from '@/lib/auth';
import {
  Swords,
  Trophy,
  X,
  Zap,
  Flame,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Copy,
  Check,
  Users,
  Footprints,
} from 'lucide-react';

interface PvpDuelSystemProps {
  currentUser: GoogleUser;
  onlineRunners: LiveOnlineRunner[];
  activeRoom: PvpRoom | null;
  activeBattle: PvpBattle | null;
  incomingInvite: PvpInvitePayload | null;
  isLobbyOpen: boolean;
  openRooms: PvpRoom[];
  isTrackingActive: boolean;
  myLiveKm: number;
  myLiveKcal: number;
  onCloseLobby: () => void;
  onCreateRoom: (targetKm: number) => void;
  onJoinRoom: (roomCode: string) => void;
  onCancelRoom: () => void;
  onStartRoomRace: () => void;
  onSendInvite: (targetRunner: LiveOnlineRunner, targetKm: number) => void;
  onAcceptInvite: (invite: PvpInvitePayload) => void;
  onDeclineInvite: (invite: PvpInvitePayload) => void;
  onSurrenderBattle: () => void;
  onCloseBattle: () => void;
  onToggleTracking: () => void;
  onAddTestDistance?: (km: number) => void;
}

export default function PvpDuelSystem({
  currentUser,
  onlineRunners,
  activeRoom,
  activeBattle,
  incomingInvite,
  isLobbyOpen,
  openRooms,
  isTrackingActive,
  myLiveKm,
  myLiveKcal,
  onCloseLobby,
  onCreateRoom,
  onJoinRoom,
  onCancelRoom,
  onStartRoomRace,
  onSendInvite,
  onAcceptInvite,
  onDeclineInvite,
  onSurrenderBattle,
  onCloseBattle,
  onToggleTracking,
  onAddTestDistance,
}: PvpDuelSystemProps) {
  const [selectedTargetKm, setSelectedTargetKm] = useState<number>(1.0);
  const [customKmInput, setCustomKmInput] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'direct'>('create');
  const [hasCopiedCode, setHasCopiedCode] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Handle countdown if room or battle triggers countdown
  useEffect(() => {
    if (activeRoom?.status === 'countdown' || activeBattle?.status === 'countdown') {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [activeRoom?.status, activeBattle?.status]);

  const copyRoomCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setHasCopiedCode(true);
      setTimeout(() => setHasCopiedCode(false), 2000);
    }
  };

  // 1. COUNTDOWN OVERLAY (3, 2, 1, СТАРТ!)
  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in safe-bottom select-none">
        <div className="text-center space-y-4">
          <div className="text-[120px] font-black text-[#C6FF33] font-mono leading-none animate-bounce drop-shadow-[0_0_50px_rgba(198,255,51,0.8)]">
            {countdown}
          </div>
          <div className="text-xl font-black text-white uppercase tracking-widest font-mono">
            {countdown === 1 ? 'ПРИГОТОВЬТЕСЬ БЕЖАТЬ!' : 'ДО СТАРТА ДУЭЛИ'}
          </div>
          <p className="text-sm text-gray-400">
            Кто первым набежит цель — забирает титул чемпиона!
          </p>
        </div>
      </div>
    );
  }

  // 2. ACTIVE BATTLE HUD (Racing live at bottom of map)
  if (activeBattle && (activeBattle.status === 'active' || activeBattle.status === 'countdown')) {
    const isChallenger =
      activeBattle.challenger.id === currentUser.id ||
      (currentUser.email && activeBattle.challenger.email?.toLowerCase() === currentUser.email.toLowerCase());

    const myStats = isChallenger ? activeBattle.challenger : activeBattle.opponent;
    const oppStats = isChallenger ? activeBattle.opponent : activeBattle.challenger;

    const myCurrentDist = Math.max(myStats.currentKm, myLiveKm);
    const oppCurrentDist = oppStats.currentKm;

    const target = activeBattle.targetKm || 1.0;
    const myPercent = Math.min(100, Math.round((myCurrentDist / target) * 100));
    const oppPercent = Math.min(100, Math.round((oppCurrentDist / target) * 100));

    const amILeading = myCurrentDist >= oppCurrentDist;
    const remainingMeters = Math.max(0, Math.round((target - myCurrentDist) * 1000));

    return (
      <div className="fixed bottom-3 left-3 right-3 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[480px] z-40 safe-bottom animate-slide-up">
        <div className="bg-[#000000]/95 backdrop-blur-2xl border-2 border-[#7D39EB] rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(125,57,235,0.4)] space-y-3.5 text-white">
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-[#242424] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#7D39EB] text-white shadow">
                <Swords className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wider text-[#C6FF33] uppercase font-mono">
                    ДУЭЛЬ: {target} КМ
                  </span>
                  {activeBattle.roomCode && (
                    <span className="text-[10px] bg-[#1a1a1a] px-2 py-0.5 rounded-full text-gray-400 font-mono">
                      #{activeBattle.roomCode}
                    </span>
                  )}
                </div>
                <span className="block text-[11px] text-gray-300">
                  {amILeading ? '⚡ Вы лидируете в гонке!' : '🏃 Соперник впереди, прибавьте темп!'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('Вы уверены, что хотите сдаться? Победа достанется сопернику.')) {
                  onSurrenderBattle();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-rose-950 text-gray-300 hover:text-rose-300 border border-[#2b2b2b] text-[11px] font-bold transition flex items-center gap-1"
              title="Сдаться в этой дуэли"
            >
              🏳️ <span>Сдаться</span>
            </button>
          </div>

          {/* Dual Progress Bars */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {/* My Stats Card */}
            <div className="bg-[#121212] border border-[#C6FF33] p-3 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-[#C6FF33] shrink-0">
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <span className="font-bold text-xs truncate block text-[#C6FF33]">Вы</span>
                  <span className="font-mono text-[10px] text-gray-300">
                    {myCurrentDist.toFixed(2)} / {target} км
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-[#000000] rounded-full h-2.5 overflow-hidden border border-[#242424]">
                <div
                  className="bg-[#C6FF33] h-full transition-all duration-300 shadow-[0_0_10px_#C6FF33]"
                  style={{ width: `${myPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#C6FF33]">
                <span className="font-black">{myPercent}%</span>
                <span>🔥 {Math.round(myLiveKcal)} ккал</span>
              </div>
            </div>

            {/* Opponent Stats Card */}
            <div className="bg-[#121212] border border-[#7D39EB] p-3 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-[#7D39EB] shrink-0">
                  <img src={oppStats.avatar} alt={oppStats.name} className="w-full h-full object-cover" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <span className="font-bold text-xs truncate block text-white">{oppStats.name}</span>
                  <span className="font-mono text-[10px] text-gray-300">
                    {oppCurrentDist.toFixed(2)} / {target} км
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-[#000000] rounded-full h-2.5 overflow-hidden border border-[#242424]">
                <div
                  className="bg-[#7D39EB] h-full transition-all duration-300 shadow-[0_0_10px_#7D39EB]"
                  style={{ width: `${oppPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-gray-300">
                <span className="font-black text-white">{oppPercent}%</span>
                <span>🔥 {oppStats.currentKcal || 0} ккал</span>
              </div>
            </div>
          </div>

          {/* Running Action Controls */}
          <div className="pt-1 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleTracking}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 shadow-xl ${
                  isTrackingActive
                    ? 'bg-[#121212] border border-[#C6FF33] text-[#C6FF33]'
                    : 'bg-[#C6FF33] hover:bg-[#b5f025] text-black'
                }`}
              >
                {isTrackingActive ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C6FF33] animate-ping" />
                    <span>GPS АКТИВЕН (БЕЖИМ!)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    <span>🏃 ВКЛЮЧИТЬ GPS ЗАБЕГ</span>
                  </>
                )}
              </button>

              {/* Demo test button (+100m) to easily verify the race */}
              {onAddTestDistance && (
                <button
                  type="button"
                  onClick={() => onAddTestDistance(0.1)}
                  className="py-3 px-3 rounded-2xl bg-[#1c1c1c] hover:bg-[#282828] border border-[#333] text-gray-300 hover:text-white text-[11px] font-mono font-bold flex items-center gap-1 transition"
                  title="Тест: накрутить +100м к пробежке"
                >
                  <Footprints className="w-3.5 h-3.5 text-[#C6FF33]" />
                  <span>+100м</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 px-1">
              <span>До финиша: <b className="text-white">{remainingMeters} м</b></span>
              <span>Цель: {target} км</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. PVP VICTORY / FINISHED MODAL
  if (activeBattle && activeBattle.status === 'finished') {
    const isWinner =
      activeBattle.winnerId === currentUser.id ||
      (currentUser.email && activeBattle.challenger.id === currentUser.id && activeBattle.winnerId === activeBattle.challenger.id);

    const isChallenger = activeBattle.challenger.id === currentUser.id;
    const oppStats = isChallenger ? activeBattle.opponent : activeBattle.challenger;
    const surrendered = activeBattle.winReason === 'surrender';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom">
        <div className="relative w-full max-w-sm bg-[#000000] border-2 border-[#7D39EB] rounded-3xl p-6 text-white shadow-[0_0_60px_rgba(125,57,235,0.5)] text-center space-y-5 animate-scale-up">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#121212] border-2 border-[#C6FF33] flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(198,255,51,0.3)]">
            {isWinner ? '🏆' : '🥈'}
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black bg-[#7D39EB] text-white uppercase tracking-widest font-mono">
              ДУЭЛЬ ЗАВЕРШЕНА
            </span>
            <h2 className="text-2xl font-black text-white uppercase font-mono">
              {isWinner ? 'ВЫ ПОБЕДИЛИ!' : 'ВТОРОЕ МЕСТО!'}
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              {isWinner
                ? surrendered
                  ? `Соперник ${oppStats.name} сдался! Победа безоговорочно присуждается вам!`
                  : `Поздравляем! Вы первыми преодолели ${activeBattle.targetKm} км в дуэли против ${oppStats.name}!`
                : surrendered
                  ? 'Вы сдались в этой дуэли. Победа присуждена сопернику.'
                  : `${oppStats.name} оказался быстрее на этой дистанции. Отличная тренировка, реванш впереди!`}
            </p>
          </div>

          <button
            type="button"
            onClick={onCloseBattle}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#C6FF33] hover:bg-[#b0f020] text-[#000000] font-black text-xs uppercase tracking-wider transition active:scale-98 shadow-xl"
          >
            Отлично, в меню
          </button>
        </div>
      </div>
    );
  }

  // 4. ACTIVE DUEL ROOM WAITING LOBBY (Room created / Waiting for Guest)
  if (activeRoom) {
    const isHost =
      activeRoom.host.id === currentUser.id ||
      (currentUser.email && activeRoom.host.email?.toLowerCase() === currentUser.email.toLowerCase());

    const otherRunners = onlineRunners.filter((r) => r.id !== currentUser.id);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom">
        <div className="relative w-full max-w-md bg-[#000000] border-2 border-[#7D39EB] rounded-3xl p-6 text-white shadow-2xl space-y-5 animate-scale-up">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#7D39EB] flex items-center justify-center text-white shadow">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">Комната дуэли</h3>
                <p className="text-[10px] text-gray-400 font-mono">
                  Дистанция гонки: <span className="text-[#C6FF33] font-bold">{activeRoom.targetKm} км</span>
                </p>
              </div>
            </div>
            <button
              onClick={onCancelRoom}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#121212] transition"
              title="Закрыть комнату"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Room Code Display */}
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-4 text-center space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">
              КОД КОМНАТЫ ДЛЯ ДРУГА
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-3xl font-black text-[#C6FF33] tracking-widest bg-[#000000] px-4 py-1.5 rounded-xl border border-[#333]">
                {activeRoom.roomCode}
              </span>
              <button
                type="button"
                onClick={() => copyRoomCode(activeRoom.roomCode)}
                className="p-2.5 rounded-xl bg-[#1f1f1f] hover:bg-[#2b2b2b] text-gray-300 hover:text-white border border-[#333] transition"
                title="Скопировать код комнаты"
              >
                {hasCopiedCode ? <Check className="w-4 h-4 text-[#C6FF33]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Друг может ввести этот код во вкладке «Войти по коду» на телефоне или ПК
            </p>
          </div>

          {/* Slots: Host vs Guest */}
          <div className="grid grid-cols-2 gap-3">
            {/* Host Slot */}
            <div className="bg-[#121212] border border-[#C6FF33] p-3.5 rounded-2xl text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full overflow-hidden border-2 border-[#C6FF33] shadow">
                <img src={activeRoom.host.avatar} alt={activeRoom.host.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-bold text-xs truncate block text-white">{activeRoom.host.name}</span>
                <span className="text-[10px] text-[#C6FF33] font-mono">👑 Хост (Создатель)</span>
              </div>
            </div>

            {/* Guest Slot */}
            <div className="bg-[#121212] border border-[#7D39EB] p-3.5 rounded-2xl text-center space-y-2">
              {activeRoom.guest ? (
                <>
                  <div className="w-12 h-12 mx-auto rounded-full overflow-hidden border-2 border-[#7D39EB] shadow">
                    <img src={activeRoom.guest.avatar} alt={activeRoom.guest.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="font-bold text-xs truncate block text-white">{activeRoom.guest.name}</span>
                    <span className="text-[10px] text-[#7D39EB] font-mono">⚔️ Соперник готов!</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#1c1c1c] border border-dashed border-gray-600 flex items-center justify-center text-gray-400 animate-pulse">
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-400">Ожидание...</span>
                    <span className="text-[10px] text-gray-500 font-mono">Подключение...</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Invite Online Runners */}
          {!activeRoom.guest && otherRunners.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Или пригласите атлета онлайн в 1 клик:
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {otherRunners.map((runner) => (
                  <div
                    key={runner.id}
                    className="p-2.5 rounded-xl bg-[#121212] border border-[#242424] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-[#7D39EB]">
                        <img src={runner.avatar} alt={runner.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-bold text-white">{runner.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSendInvite(runner, activeRoom.targetKm)}
                      className="px-2.5 py-1 rounded-lg bg-[#7D39EB] hover:bg-[#6c28d9] text-white text-[10px] font-bold transition active:scale-95"
                    >
                      Позвать
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          {activeRoom.guest ? (
            <button
              type="button"
              onClick={onStartRoomRace}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#C6FF33] hover:bg-[#b0f020] text-[#000000] font-black text-xs uppercase tracking-wider transition active:scale-98 shadow-xl flex items-center justify-center gap-2 animate-pulse"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>СТАРТ ДУЭЛИ (3... 2... 1...)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancelRoom}
              className="w-full py-3 px-4 rounded-2xl bg-[#141414] hover:bg-[#1f1f1f] text-gray-400 hover:text-white border border-[#262626] text-xs font-bold transition"
            >
              Отменить комнату
            </button>
          )}
        </div>
      </div>
    );
  }

  // 5. INCOMING PVP CHALLENGE MODAL (Direct Challenge)
  if (incomingInvite) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom">
        <div className="relative w-full max-w-sm bg-[#000000] border-2 border-[#7D39EB] rounded-3xl p-6 text-white shadow-2xl space-y-5 text-center animate-scale-up">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#121212] border border-[#7D39EB] flex items-center justify-center text-3xl shadow-xl">
            ⚔️
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black bg-[#7D39EB] text-white uppercase tracking-widest font-mono">
              ВЫЗОВ НА ДУЭЛЬ
            </span>
            <h3 className="text-lg font-black text-white">
              {incomingInvite.fromUser.name} зовёт на забег!
            </h3>
            <p className="text-xs text-gray-300">
              Дистанция дуэли: <span className="font-bold text-[#C6FF33] font-mono text-sm">{incomingInvite.targetKm} км</span>. Кто первый набежит дистанцию — забирает победу!
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#7D39EB] shadow">
              <img src={incomingInvite.fromUser.avatar} alt="Rival" className="w-full h-full object-cover" />
            </div>
            <span className="font-mono font-black text-sm text-[#C6FF33]">VS</span>
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#C6FF33] shadow">
              <img src={currentUser.avatar} alt="You" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onDeclineInvite(incomingInvite)}
              className="flex-1 py-3 rounded-2xl bg-[#121212] hover:bg-[#1a1a1a] border border-[#242424] text-gray-300 text-xs font-bold transition"
            >
              Отклонить
            </button>
            <button
              onClick={() => onAcceptInvite(incomingInvite)}
              className="flex-1 py-3 rounded-2xl bg-[#C6FF33] hover:bg-[#b0f020] text-[#000000] text-xs font-black uppercase tracking-wider shadow-lg transition active:scale-98"
            >
              Принять бой ⚔️
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 6. PVP LOBBY (Create Room, Join by Code, Online Athletes)
  if (isLobbyOpen) {
    const otherRunners = onlineRunners.filter((r) => {
      if (!r || r.id === currentUser.id) return false;
      if (r.email && currentUser.email && r.email.toLowerCase() === currentUser.email.toLowerCase()) return false;
      return true;
    });

    const joinableRooms = openRooms.filter((r) => {
      if (!r || r.host.id === currentUser.id) return false;
      if (r.host.email && currentUser.email && r.host.email.toLowerCase() === currentUser.email.toLowerCase()) return false;
      return true;
    });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom">
        <div className="relative w-full max-w-md bg-[#000000] border border-[#242424] rounded-3xl p-5 sm:p-6 text-white shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#7D39EB] flex items-center justify-center text-white shadow">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">Арена PVP Дуэлей</h3>
                <p className="text-[10px] text-gray-400 font-mono">
                  Создайте комнату, установите км и соревнуйтесь наперегонки
                </p>
              </div>
            </div>
            <button
              onClick={onCloseLobby}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#121212] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-[#121212] p-1 rounded-2xl border border-[#242424]">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                activeTab === 'create'
                  ? 'bg-[#7D39EB] text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>⚡</span>
              <span>Создать</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                activeTab === 'join'
                  ? 'bg-[#7D39EB] text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🔑</span>
              <span>По коду</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('direct')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                activeTab === 'direct'
                  ? 'bg-[#7D39EB] text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>👥</span>
              <span>В сети ({otherRunners.length})</span>
            </button>
          </div>

          {/* TAB 1: CREATE ROOM */}
          {activeTab === 'create' && (
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Цель гонки (дистанция в км):</span>
                  <span className="text-[#C6FF33] font-mono font-black text-sm">{selectedTargetKm} км</span>
                </label>

                {/* Preset Distance Pills */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[0.5, 1.0, 2.0, 3.0, 5.0].map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => {
                        setSelectedTargetKm(km);
                        setCustomKmInput('');
                      }}
                      className={`py-2.5 rounded-xl text-xs font-black font-mono transition border ${
                        selectedTargetKm === km && !customKmInput
                          ? 'bg-[#C6FF33] text-[#000000] border-[#C6FF33] shadow-lg'
                          : 'bg-[#121212] text-gray-300 border-[#242424] hover:border-gray-600'
                      }`}
                    >
                      {km} км
                    </button>
                  ))}
                </div>

                {/* Custom KM Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="42.2"
                    placeholder="Своя дистанция (напр. 1.5)"
                    value={customKmInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomKmInput(val);
                      const num = parseFloat(val);
                      if (num && num > 0) setSelectedTargetKm(num);
                    }}
                    className="flex-1 bg-[#121212] border border-[#242424] focus:border-[#C6FF33] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 font-mono outline-none"
                  />
                  <span className="text-xs text-gray-400 font-mono">км</span>
                </div>
              </div>

              <div className="p-3 bg-[#121212] rounded-2xl border border-[#242424] text-[11px] text-gray-400 leading-relaxed">
                ℹ️ После создания комнаты появится уникальный код. Вы сможете отправить его сопернику или сразу пригласить бегуна из списка онлайн.
              </div>

              <button
                type="button"
                onClick={() => {
                  const km = parseFloat(Math.max(0.1, Math.min(42.2, selectedTargetKm || 1.0)).toFixed(2));
                  onCreateRoom(km);
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#C6FF33] hover:bg-[#b0f020] text-[#000000] font-black text-xs uppercase tracking-wider transition active:scale-98 shadow-xl flex items-center justify-center gap-2"
              >
                <span>⚡ СОЗДАТЬ КОМНАТУ ({selectedTargetKm} КМ)</span>
              </button>
            </div>
          )}

          {/* TAB 2: JOIN BY CODE */}
          {activeTab === 'join' && (
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                  Введите 4-значный код комнаты соперника:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="Например: 4821"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-[#121212] border border-[#242424] focus:border-[#7D39EB] rounded-2xl px-4 py-3 text-sm text-center text-white placeholder-gray-500 font-mono font-black tracking-widest outline-none uppercase"
                  />
                  <button
                    type="button"
                    disabled={!joinCodeInput.trim()}
                    onClick={() => onJoinRoom(joinCodeInput.trim())}
                    className="px-5 py-3 rounded-2xl bg-[#7D39EB] hover:bg-[#6c28d9] disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider transition active:scale-95 shadow"
                  >
                    Войти
                  </button>
                </div>
              </div>

              {/* Open Rooms List */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Открытые комнаты онлайн:
                </label>
                {joinableRooms.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#121212] border border-[#242424] text-center text-xs text-gray-500 font-mono">
                    Нет ожидающих комнат. Создайте свою во вкладке «Создать»!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {joinableRooms.map((room) => (
                      <div
                        key={room.roomCode}
                        className="p-3 rounded-2xl bg-[#121212] border border-[#242424] hover:border-[#7D39EB] transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#7D39EB]">
                            <img src={room.host.avatar} alt={room.host.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-white block">{room.host.name}</span>
                            <span className="text-[10px] text-[#C6FF33] font-mono">
                              #{room.roomCode} • Цель: {room.targetKm} км
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onJoinRoom(room.roomCode)}
                          className="px-3 py-1.5 rounded-xl bg-[#7D39EB] hover:bg-[#6c28d9] text-white text-xs font-bold transition active:scale-95"
                        >
                          Войти ⚔️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ONLINE RUNNERS (Direct Challenge) */}
          {activeTab === 'direct' && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Атлеты в сети сейчас:
                </span>
                <span className="text-[#C6FF33] font-mono text-xs">{otherRunners.length} онлайн</span>
              </div>

              {otherRunners.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#121212] border border-[#242424] text-center space-y-2">
                  <div className="text-3xl">🏃‍♂️</div>
                  <p className="text-xs text-gray-300 font-medium">
                    Сейчас других бегунов нет в сети.
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Откройте сайт во второй вкладке или на смартфоне, чтобы соревноваться с другим аккаунтом!
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {otherRunners.map((runner) => (
                    <div
                      key={runner.id}
                      className="p-3 rounded-2xl bg-[#121212] border border-[#242424] hover:border-gray-700 transition flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#7D39EB]">
                          <img src={runner.avatar} alt={runner.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">{runner.name}</span>
                          <span className="text-[10px] text-[#C6FF33] flex items-center gap-1 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF33] animate-pulse"></span>
                            В сети
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSendInvite(runner, selectedTargetKm)}
                        className="px-3 py-1.5 rounded-xl bg-[#7D39EB] hover:bg-[#6c28d9] text-[#FFFFFF] text-xs font-black transition active:scale-95 shadow"
                      >
                        Вызов ({selectedTargetKm} км) ⚔️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
