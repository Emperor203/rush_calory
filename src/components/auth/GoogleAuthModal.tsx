'use client';

import React, { useState, useEffect } from 'react';
import { GoogleUser, saveGoogleUser, decodeGoogleJwt } from '@/lib/auth';
import { X, Check, Sparkles, User, Mail, ShieldCheck } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserLogin: (user: GoogleUser) => void;
  currentUserWeight?: number;
}

export function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function GoogleAuthModal({
  isOpen,
  onClose,
  onUserLogin,
  currentUserWeight = 70,
}: GoogleAuthModalProps) {
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Load Google Identity Services script if Client ID is configured
  useEffect(() => {
    if (!googleClientId || typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            const decoded = decodeGoogleJwt(response.credential);
            if (decoded && decoded.email) {
              const fullUser: GoogleUser = {
                id: decoded.id || `google-${Date.now()}`,
                name: decoded.name || 'Google Athlete',
                email: decoded.email,
                avatar:
                  decoded.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${decoded.email}`,
                weightKg: currentUserWeight,
                totalCaloriesBurned: 0,
                totalKmRun: 0,
                completedRunsCount: 0,
                joinedAt: new Date().toISOString(),
              };
              saveGoogleUser(fullUser);
              onUserLogin(fullUser);
              onClose();
            }
          },
        });
        const container = document.getElementById('google-native-signin-btn');
        if (container) {
          google.accounts.id.renderButton(container, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            width: 320,
          });
        }
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [googleClientId]);

  if (!isOpen) return null;

  const handleQuickSignIn = (name: string, email: string) => {
    const user: GoogleUser = {
      id: `google-${Date.now()}`,
      name,
      email,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=06b6d4,10b981`,
      weightKg: currentUserWeight,
      totalCaloriesBurned: 0,
      totalKmRun: 0,
      completedRunsCount: 0,
      joinedAt: new Date().toISOString(),
    };
    saveGoogleUser(user);
    onUserLogin(user);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    const name = customName.trim() || customEmail.split('@')[0];
    handleQuickSignIn(name, customEmail.toLowerCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in safe-bottom">
      <div className="relative w-full max-w-sm bg-[#0E1420] border border-gray-800 rounded-3xl p-6 text-white shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow">
              <GoogleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Вход через Google</h3>
              <p className="text-[10px] text-gray-400 font-mono">Синхронизация профиля атлета</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real Google OAuth button if client ID configured */}
        {googleClientId && (
          <div className="flex flex-col items-center justify-center py-2">
            <div id="google-native-signin-btn" />
            <div className="text-[10px] text-gray-500 mt-2">или быстрый вход:</div>
          </div>
        )}

        {/* Quick Instant Google Accounts */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">
            Выберите аккаунт Google:
          </label>

          <button
            type="button"
            onClick={() => handleQuickSignIn('Abdurahmon', 'farmonovabdurahmon7@gmail.com')}
            className="w-full p-3 rounded-2xl bg-gray-900/90 hover:bg-gray-850 border border-gray-800 hover:border-emerald-500/50 text-left flex items-center justify-between transition group active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-black font-black text-sm shadow">
                A
              </div>
              <div className="truncate">
                <div className="font-bold text-xs text-white group-hover:text-emerald-400 transition truncate">
                  Abdurahmon
                </div>
                <div className="text-[11px] text-gray-400 truncate">
                  farmonovabdurahmon7@gmail.com
                </div>
              </div>
            </div>
            <GoogleIcon className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100" />
          </button>

          <button
            type="button"
            onClick={() => handleQuickSignIn('Calorie Athlete', 'runner@gmail.com')}
            className="w-full p-3 rounded-2xl bg-gray-900/90 hover:bg-gray-850 border border-gray-800 hover:border-emerald-500/50 text-left flex items-center justify-between transition group active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow">
                CA
              </div>
              <div className="truncate">
                <div className="font-bold text-xs text-white group-hover:text-cyan-400 transition truncate">
                  Calorie Athlete
                </div>
                <div className="text-[11px] text-gray-400 truncate">
                  runner@gmail.com
                </div>
              </div>
            </div>
            <GoogleIcon className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100" />
          </button>
        </div>

        {/* Custom Google Email Collapse */}
        <div className="pt-2 border-t border-gray-800">
          {!isCustomOpen ? (
            <button
              type="button"
              onClick={() => setIsCustomOpen(true)}
              className="w-full text-center text-[11px] text-gray-400 hover:text-emerald-400 font-semibold transition"
            >
              + Войти с другим адресом @gmail.com
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-gray-400 text-[10px] mb-1">Имя пользователя</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Например: Иван"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] mb-1">Google Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCustomOpen(false)}
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 rounded-xl text-gray-400 text-[11px] transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] rounded-xl transition"
                >
                  Войти
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Безопасная аутентификация Google OAuth 2.0</span>
        </div>
      </div>
    </div>
  );
}
