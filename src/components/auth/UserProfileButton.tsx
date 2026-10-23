'use client';

import React, { useState } from 'react';
import {
  GoogleUser,
  saveGoogleUser,
  getStoredGoogleClientId,
  triggerRealGoogleOAuth,
} from '@/lib/auth';
import { GoogleIcon } from './GoogleAuthModal';
import { LogOut, Flame, TrendingUp, Award, UserCheck, ChevronDown } from 'lucide-react';

interface UserProfileButtonProps {
  user: GoogleUser | null;
  onOpenAuth: () => void;
  onUserLogin?: (u: GoogleUser) => void;
  onLogout: () => void;
}

export default function UserProfileButton({
  user,
  onOpenAuth,
  onUserLogin,
  onLogout,
}: UserProfileButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

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
        <span className="hidden sm:inline font-bold text-white text-xs max-w-[80px] truncate">
          {firstName}
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
          <div className="absolute right-0 top-11 z-50 w-72 bg-[#000000] border border-[#242424] rounded-3xl p-4 shadow-2xl text-white space-y-3.5 animate-fade-in safe-bottom">
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
                  <UserCheck className="w-3.5 h-3.5 text-[#C6FF33] shrink-0" />
                </div>
                <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
              </div>
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
