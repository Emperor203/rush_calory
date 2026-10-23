'use client';

import React, { useState } from 'react';
import {
  GoogleUser,
  saveGoogleUser,
  getStoredGoogleClientId,
  triggerRealGoogleOAuth,
} from '@/lib/auth';
import { GoogleIcon } from './GoogleAuthModal';
import { LogOut, Flame, TrendingUp, Award, UserCheck, ChevronDown, Zap, Shield } from 'lucide-react';
import { isStreetPassActive, getStreetPassDaysRemaining } from '@/lib/streetpass';
import { calculateUserRank } from '@/lib/ranks';

interface UserProfileButtonProps {
  user: GoogleUser | null;
  onOpenAuth: () => void;
  onUserLogin?: (u: GoogleUser) => void;
  onLogout: () => void;
  onOpenHistory?: () => void;
  onOpenStreetPass?: () => void;
}

export default function UserProfileButton({
  user,
  onOpenAuth,
  onUserLogin,
  onLogout,
  onOpenHistory,
  onOpenStreetPass,
}: UserProfileButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const hasPass = isStreetPassActive(user);
  const daysRemaining = getStreetPassDaysRemaining(user);
  const totalDays = user?.streetPassPlan === 'season' ? 90 : 30;
  const passPercent = Math.min(100, Math.round((daysRemaining / totalDays) * 100));
  const rankProgress = calculateUserRank(user?.totalKmRun || 0);

  const handleSignInClick = () => {
    const clientId = getStoredGoogleClientId();
    if (clientId && onUserLogin) {
      setIsSigningIn(true);
      triggerRealGoogleOAuth(
        clientId,
        (newUser) => {
          setIsSigningIn(false);
          onUserLogin(newUser);
        },
        (err) => {
          setIsSigningIn(false);
          console.warn('Direct OAuth trigger error, showing modal:', err);
          onOpenAuth();
        },
      );
    } else {
      onOpenAuth();
    }
  };

  if (!user) {
    return (
      <button
        type="button"
        disabled={isSigningIn}
        onClick={handleSignInClick}
        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-gray-100 text-black text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-60"
      >
        {isSigningIn ? (
          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
        ) : (
          <GoogleIcon className="w-4 h-4" />
        )}
        <span className="hidden xs:inline">{isSigningIn ? 'Вход...' : 'Войти'}</span>
      </button>
    );
  }

  const firstName = user.name.split(' ')[0] || user.name;

  return (
    <div className="relative pointer-events-auto">
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 sm:px-2.5 sm:py-1 rounded-2xl bg-[#000000] border border-[#242424] hover:border-[#7D39EB] transition shadow-2xl active:scale-95 text-xs"
      >
        <div className="w-7 h-7 rounded-full overflow-hidden bg-[#7D39EB] flex items-center justify-center border-2 border-[#C6FF33] shadow shrink-0">
          {user.avatar && user.avatar !== '/avatar.jpg' ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-xs text-white">{firstName[0]}</span>
          )}
        </div>
        <span className="hidden sm:inline font-bold text-white text-xs max-w-[90px] truncate flex items-center gap-1">
          <span>{firstName}</span>
          <span className="text-[10px]">{rankProgress.currentTier.icon}</span>
          {hasPass && <Zap className="w-3 h-3 fill-[#C6FF33] text-[#C6FF33] shrink-0" />}
        </span>
        <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-gray-400" />
      </button>

      {/* Profile Dropdown Card */}
      {isDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="absolute right-0 top-11 z-50 w-72 bg-[#000000] border border-[#242424] rounded-3xl p-4 shadow-2xl text-white space-y-3 animate-fade-in safe-bottom">
            {/* User Bio */}
            <div className="flex items-center gap-3 pb-3 border-b border-[#242424]">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-[#7D39EB] flex items-center justify-center border-2 border-[#C6FF33] shrink-0">
                {user.avatar && user.avatar !== '/avatar.jpg' ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-base text-white">{firstName[0]}</span>
                )}
              </div>
              <div className="truncate">
                <div className="font-black text-sm text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{user.name}</span>
                  {hasPass ? (
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-[#C6FF33] text-black font-mono flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 fill-black" /> VERIFIED
                    </span>
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-[#C6FF33] shrink-0" />
                  )}
                </div>
                <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
              </div>
            </div>

            {/* Street Pass Subscription Banner / Purchase CTA */}
            {hasPass ? (
              <div
                onClick={() => {
                  setIsDropdownOpen(false);
                  onOpenStreetPass?.();
                }}
                className="bg-[#121212] border-2 border-[#C6FF33] p-2.5 rounded-2xl cursor-pointer hover:bg-[#181818] transition space-y-1.5 shadow-[0_0_15px_rgba(198,255,51,0.15)]"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-black text-[#C6FF33] flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-[#C6FF33]" /> STREET PASS
                  </span>
                  <span className="font-mono font-bold text-white text-[10px]">
                    {daysRemaining} дн.
                  </span>
                </div>
                <div className="w-full bg-[#000000] rounded-full h-1.5 overflow-hidden border border-[#242424]">
                  <div
                    className="bg-[#C6FF33] h-full transition-all"
                    style={{ width: `${passPercent}%` }}
                  />
                </div>
                <div className="text-[9px] text-gray-400 flex items-center justify-between font-mono">
                  <span>Статус активен</span>
                  <span className="text-[#C6FF33] hover:underline">Продлить &rarr;</span>
                </div>
              </div>
            ) : (
              onOpenStreetPass && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenStreetPass();
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#7D39EB] to-[#631fe0] hover:brightness-110 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg active:scale-95 border border-[#7D39EB]"
                >
                  <Zap className="w-3.5 h-3.5 fill-[#C6FF33] text-[#C6FF33]" />
                  <span>Купить Street Pass</span>
                </button>
              )
            )}

            {/* Athlete Rank & Progress Line (Линия ранга) */}
            <div className="bg-[#121212] border border-[#242424] hover:border-[#7D39EB] p-2.5 rounded-2xl transition space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#000000] border-2 border-[#7D39EB] flex items-center justify-center text-base shadow shrink-0">
                    {rankProgress.currentTier.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase font-bold text-gray-400 font-mono">РАНГ:</span>
                      <span
                        className="font-mono font-black text-xs tracking-wider"
                        style={{ color: rankProgress.currentTier.textColor }}
                      >
                        {rankProgress.currentTier.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono block -mt-0.5">
                      {rankProgress.currentTier.subtitle}
                    </span>
                  </div>
                </div>

                {rankProgress.nextTier ? (
                  <div className="text-right">
                    <span className="text-[8px] text-gray-500 font-mono uppercase block">Далее:</span>
                    <span className="text-[10px] font-mono font-bold text-gray-300 flex items-center justify-end gap-1">
                      <span>{rankProgress.nextTier.name}</span>
                      <span>{rankProgress.nextTier.icon}</span>
                    </span>
                  </div>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-[#C6FF33] text-black font-mono">
                    MAX LIGA
                  </span>
                )}
              </div>

              {/* Progress Line */}
              <div className="space-y-1">
                <div className="w-full bg-[#000000] rounded-full h-2 overflow-hidden border border-[#242424] p-[1px]">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-[#C6FF33]"
                    style={{ width: `${Math.max(4, rankProgress.progressPercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-gray-400">
                  <span>
                    {(user.totalKmRun || 0).toFixed(1)} км / {rankProgress.nextTier ? `${rankProgress.nextTier.minKm} км` : 'MAX'}
                  </span>
                  <span className="text-[#C6FF33] font-bold">
                    {rankProgress.progressPercent}%
                  </span>
                </div>
              </div>

              {/* Сколько осталось до следующего ранга */}
              {rankProgress.nextTier && (
                <div className="text-[9px] text-gray-400 font-mono flex items-center justify-between pt-1 border-t border-[#1e1e1e]">
                  <span>До ранга {rankProgress.nextTier.name}:</span>
                  <span className="text-[#C6FF33] font-bold font-mono">
                    {rankProgress.remainingKm.toFixed(1)} км
                  </span>
                </div>
              )}
            </div>

            {/* Career Stats */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#121212] p-2.5 rounded-2xl border border-[#242424]">
                <span className="text-[9px] uppercase font-bold text-gray-400 block flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-[#7D39EB]" /> Сожжено
                </span>
                <div className="text-base font-black text-[#7D39EB] font-mono mt-0.5">
                  {(user.totalCaloriesBurned || 0).toLocaleString()} <span className="text-[10px] text-gray-400">ккал</span>
                </div>
              </div>

              <div className="bg-[#121212] p-2.5 rounded-2xl border border-[#242424]">
                <span className="text-[9px] uppercase font-bold text-gray-400 block flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3 text-[#C6FF33]" /> Пробег
                </span>
                <div className="text-base font-black text-[#C6FF33] font-mono mt-0.5">
                  {(user.totalKmRun || 0).toFixed(1)} <span className="text-[10px] text-gray-400">км</span>
                </div>
              </div>
            </div>

            {/* History of Workouts Button */}
            {onOpenHistory && (
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onOpenHistory();
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] border border-[#242424] hover:border-[#C6FF33] text-[#C6FF33] text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>📜</span>
                <span>История пробежек</span>
              </button>
            )}

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                onLogout();
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#121212] hover:bg-rose-950/60 border border-[#242424] hover:border-rose-500/40 text-gray-300 hover:text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти из Google</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
