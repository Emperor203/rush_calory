'use client';

import React, { useState } from 'react';
import { PvpBattle, PvpInvitePayload } from '@/lib/pvp';
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
  Shield,
  Award,
} from 'lucide-react';

interface PvpDuelSystemProps {
  currentUser: GoogleUser;
  onlineRunners: LiveOnlineRunner[];
  activeBattle: PvpBattle | null;
  incomingInvite: PvpInvitePayload | null;
  isLobbyOpen: boolean;
  onCloseLobby: () => void;
  onSendInvite: (targetRunner: LiveOnlineRunner, targetKm: number) => void;
  onAcceptInvite: (invite: PvpInvitePayload) => void;
  onDeclineInvite: (invite: PvpInvitePayload) => void;
  onSurrenderBattle: () => void;
  myLiveKm: number;
  myLiveKcal: number;
}

export default function PvpDuelSystem({
  currentUser,
  onlineRunners,
  activeBattle,
  incomingInvite,
  isLobbyOpen,
  onCloseLobby,
  onSendInvite,
  onAcceptInvite,
  onDeclineInvite,
  onSurrenderBattle,
  myLiveKm,
  myLiveKcal,
}: PvpDuelSystemProps) {
  const [selectedTargetKm, setSelectedTargetKm] = useState<number>(1.0);
  const [selectedRunnerId, setSelectedRunnerId] = useState<string>('');

  // 1. PVP TOP BATTLE HUD (Active live fight)
  if (activeBattle && activeBattle.status === 'active') {
    const isChallenger = activeBattle.challenger.id === currentUser.id;
    const myStats = isChallenger ? activeBattle.challenger : activeBattle.opponent;
    const oppStats = isChallenger ? activeBattle.opponent : activeBattle.challenger;

    const myCurrentDist = Math.max(myStats.currentKm, myLiveKm);
    const oppCurrentDist = oppStats.currentKm;

    const myPercent = Math.min(100, Math.round((myCurrentDist / activeBattle.targetKm) * 100));
    const oppPercent = Math.min(100, Math.round((oppCurrentDist / activeBattle.targetKm) * 100));

    const amILeading = myCurrentDist >= oppCurrentDist;

    return (
      <div className="absolute top-16 sm:top-20 left-3 right-3 sm:left-auto sm:right-auto sm:w-[500px] sm:left-1/2 sm:-translate-x-1/2 z-30 animate-slide-down">
        <div className="bg-[#0B101B]/95 backdrop-blur-2xl border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(245,158,11,0.35)] space-y-3 text-white">
          {/* Header Title */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                <Swords className="w-4 h-4 animate-bounce" />
              </span>
              <div>
                <span className="text-xs font-black tracking-wider text-amber-400 uppercase font-mono">
                  PVP ЗАБЕГ: ЦЕЛЬ {activeBattle.targetKm} КМ
                </span>
                <span className="block text-[10px] text-gray-400">
                  {amILeading ? '🔥 Вы лидируете в гонке!' : '⚡ Соперник впереди, прибавьте темп!'}
                </span>
              </div>
            </div>
            <button
              onClick={onSurrenderBattle}
              className="px-2.5 py-1 rounded-xl bg-gray-900 hover:bg-rose-950 text-gray-400 hover:text-rose-400 border border-gray-800 text-[10px] font-bold transition"
              title="Сдаться / Завершить дуэль"
            >
              Сдаться
            </button>
          </div>

          {/* Versus Visual Bars */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 items-center">
            {/* Me */}
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-2.5 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-emerald-400 shrink-0">
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                </div>
                <div className="overflow-hidden">
                  <span className="font-bold text-xs truncate block text-emerald-300">Вы</span>
                  <span className="font-mono text-[10px] text-gray-400">
                    {myCurrentDist.toFixed(2)} / {activeBattle.targetKm} км
                  </span>
                </div>
              </div>
              <div className="w-full bg-black/60 rounded-full h-2.5 overflow-hidden border border-emerald-500/30">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${myPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                <span>{myPercent}%</span>
                <span>🔥 {Math.round(myLiveKcal)} ккал</span>
              </div>
            </div>

            {/* Opponent */}
            <div className="bg-purple-950/40 border border-purple-500/40 p-2.5 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-purple-400 shrink-0">
                  <img src={oppStats.avatar} alt={oppStats.name} className="w-full h-full object-cover" />
                </div>
                <div className="overflow-hidden">
                  <span className="font-bold text-xs truncate block text-purple-300">{oppStats.name}</span>
                  <span className="font-mono text-[10px] text-gray-400">
                    {oppCurrentDist.toFixed(2)} / {activeBattle.targetKm} км
                  </span>
                </div>
              </div>
              <div className="w-full bg-black/60 rounded-full h-2.5 overflow-hidden border border-purple-500/30">
                <div
                  className="bg-gradient-to-r from-purple-500 to-rose-400 h-full transition-all duration-300"
                  style={{ width: `${oppPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-purple-400">
                <span>{oppPercent}%</span>
                <span>🔥 {oppStats.currentKcal || 0} ккал</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1.5. PVP VICTORY MODAL (Battle Finished)
  if (activeBattle && activeBattle.status === 'finished') {
    const isWinner = activeBattle.winnerId === currentUser.id;
    const isChallenger = activeBattle.challenger.id === currentUser.id;
    const oppStats = isChallenger ? activeBattle.opponent : activeBattle.challenger;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom">
        <div className="relative w-full max-w-sm bg-[#0E1420] border-2 border-amber-500 rounded-3xl p-6 text-white shadow-[0_0_60px_rgba(245,158,11,0.4)] text-center space-y-5 animate-scale-up">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-5xl shadow-xl animate-bounce">
            {isWinner ? '🏆' : '🥈'}
          </div>

          <div className="space-y-1">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black bg-amber-950 text-amber-400 border border-amber-500/50 uppercase tracking-widest font-mono">
              ДУЭЛЬ ЗАВЕРШЕНА
            </span>
            <h2 className="text-2xl font-black text-white uppercase font-mono">
              {isWinner ? 'ВЫ ПОБЕДИЛИ!' : 'ВТОРОЕ МЕСТО!'}
            </h2>
            <p className="text-xs text-gray-300">
              {isWinner
                ? `Поздравляем! Вы первыми преодолели ${activeBattle.targetKm} км в дуэли против ${oppStats.name}!`
                : `${oppStats.name} оказался быстрее на этой дистанции. В следующий раз победа за вами!`}
            </p>
          </div>

          <button
            onClick={onSurrenderBattle}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 text-black font-black text-xs uppercase tracking-wider transition active:scale-98 shadow-xl"
          >
            Отлично, в меню
          </button>
        </div>
      </div>
    );
  }

  // 2. INCOMING PVP CHALLENGE MODAL (Somebody invited you)
  if (incomingInvite) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in safe-bottom">
        <div className="relative w-full max-w-sm bg-[#0E1420] border-2 border-amber-500 rounded-3xl p-6 text-white shadow-2xl space-y-5 text-center animate-bounce-short">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-3xl shadow-xl">
            ⚔️
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black bg-amber-950 text-amber-400 border border-amber-500/40 uppercase tracking-widest font-mono">
              ВЫЗОВ НА ДУЭЛЬ
            </span>
            <h3 className="text-lg font-black text-white">
              {incomingInvite.fromUser.name} зовёт на забег!
            </h3>
            <p className="text-xs text-gray-400">
              Дистанция дуэли: <span className="font-bold text-amber-400 font-mono text-sm">{incomingInvite.targetKm} км</span>. Кто первый пробежит — забирает победу!
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400 shadow">
              <img src={incomingInvite.fromUser.avatar} alt="Rival" className="w-full h-full object-cover" />
            </div>
            <span className="font-mono font-bold text-sm text-gray-300">VS</span>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-400 shadow">
              <img src={currentUser.avatar} alt="You" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onDeclineInvite(incomingInvite)}
              className="flex-1 py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 text-xs font-bold transition"
            >
              Отклонить
            </button>
            <button
              onClick={() => onAcceptInvite(incomingInvite)}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 text-black text-xs font-black uppercase tracking-wider shadow-lg transition active:scale-98"
            >
              Принять бой ⚔️
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. PVP LOBBY MODAL (Choose a rival and distance)
  if (isLobbyOpen) {
    const otherRunners = onlineRunners.filter((r) => r.id !== currentUser.id);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in safe-bottom">
        <div className="relative w-full max-w-md bg-[#0E1420] border border-gray-800 rounded-3xl p-6 text-white shadow-2xl space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">Арена PVP Дуэлей</h3>
                <p className="text-[10px] text-gray-400 font-mono">
                  Забег наперегонки в реальном времени
                </p>
              </div>
            </div>
            <button
              onClick={onCloseLobby}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Distance Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              1. Выберите дистанцию гонки:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0.5, 1.0, 2.0, 3.0].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => setSelectedTargetKm(km)}
                  className={`py-2 rounded-xl text-xs font-black font-mono transition border ${
                    selectedTargetKm === km
                      ? 'bg-amber-500 text-black border-amber-400 shadow-lg'
                      : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {km} км
                </button>
              ))}
            </div>
          </div>

          {/* Rival Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>2. Выберите соперника онлайн:</span>
              <span className="text-emerald-400 font-mono text-[10px]">
                {otherRunners.length} доступно
              </span>
            </label>

            {otherRunners.length === 0 ? (
              <div className="p-5 rounded-2xl bg-gray-950/60 border border-gray-800 text-center space-y-2">
                <div className="text-2xl">🏃‍♂️</div>
                <p className="text-xs text-gray-400 font-medium">
                  Сейчас других бегунов нет в сети.
                </p>
                <p className="text-[10px] text-gray-500">
                  Откройте сайт во второй вкладке или на телефоне, чтобы протестировать дуэль с самим собой или другом!
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {otherRunners.map((runner) => (
                  <div
                    key={runner.id}
                    onClick={() => setSelectedRunnerId(runner.id)}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                      selectedRunnerId === runner.id
                        ? 'bg-amber-950/40 border-amber-500 shadow-md'
                        : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-400/50">
                        <img src={runner.avatar} alt={runner.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-white block">{runner.name}</span>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          В сети
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendInvite(runner, selectedTargetKm);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-black text-xs font-black transition active:scale-95 shadow"
                    >
                      Бросить вызов ⚔️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 1.5. PVP VICTORY MODAL (Battle Finished)
  if (activeBattle && activeBattle.status === 'finished') {
    const isWinner = activeBattle.winnerId === currentUser.id;
    const isChallenger = activeBattle.challenger.id === currentUser.id;
    const oppStats = isChallenger ? activeBattle.opponent : activeBattle.challenger;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom">
        <div className="relative w-full max-w-sm bg-[#0E1420] border-2 border-amber-500 rounded-3xl p-6 text-white shadow-[0_0_60px_rgba(245,158,11,0.4)] text-center space-y-5 animate-scale-up">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-5xl shadow-xl animate-bounce">
            {isWinner ? '🏆' : '🥈'}
          </div>

          <div className="space-y-1">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black bg-amber-950 text-amber-400 border border-amber-500/50 uppercase tracking-widest font-mono">
              ДУЭЛЬ ЗАВЕРШЕНА
            </span>
            <h2 className="text-2xl font-black text-white uppercase font-mono">
              {isWinner ? 'ВЫ ПОБЕДИЛИ!' : 'ВТОРОЕ МЕСТО!'}
            </h2>
            <p className="text-xs text-gray-300">
              {isWinner
                ? `Поздравляем! Вы первыми преодолели ${activeBattle.targetKm} км в дуэли против ${oppStats.name}!`
                : `${oppStats.name} оказался быстрее на этой дистанции. В следующий раз победа за вами!`}
            </p>
          </div>

          <button
            onClick={onSurrenderBattle}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 text-black font-black text-xs uppercase tracking-wider transition active:scale-98 shadow-xl"
          >
            Отлично, в меню
          </button>
        </div>
      </div>
    );
  }

  return null;
}
