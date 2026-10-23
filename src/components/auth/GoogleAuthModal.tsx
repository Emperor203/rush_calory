'use client';

import React, { useState, useEffect } from 'react';
import {
  GoogleUser,
  getStoredGoogleClientId,
  saveStoredGoogleClientId,
  triggerRealGoogleOAuth,
  saveGoogleUser,
} from '@/lib/auth';
import {
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Key,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserLogin: (user: GoogleUser) => void;
  currentUserWeight?: number;
  isRequired?: boolean;
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
  isRequired = false,
}: GoogleAuthModalProps) {
  const [clientId, setClientId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  useEffect(() => {
    const existing = getStoredGoogleClientId();
    if (existing) {
      setClientId(existing);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleModalClose = () => {
    if (!isRequired) {
      onClose();
    }
  };

  const handleLaunchRealGoogle = (targetClientId: string) => {
    if (!targetClientId) {
      setShowConfig(true);
      setError('Для авторизации на серверах Google укажите ваш Google Client ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    saveStoredGoogleClientId(targetClientId);

    triggerRealGoogleOAuth(
      targetClientId,
      (user) => {
        setIsLoading(false);
        onUserLogin(user);
        onClose();
      },
      (err) => {
        setIsLoading(false);
        setError(err);
      },
      currentUserWeight,
    );
  };

  const handleSaveAndLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) {
      setError('Пожалуйста, вставьте полученный Google Client ID');
      return;
    }
    handleLaunchRealGoogle(clientId.trim());
  };

  const handleDemoSignIn = (email: string, name: string) => {
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

  return (
    <div
      onClick={handleModalClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#0E1420] border border-gray-800 rounded-3xl p-6 text-white shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md">
              <GoogleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Вход в Rush Calory</h3>
              <p className="text-[10px] text-gray-400 font-mono">
                {isRequired ? 'Обязательная авторизация' : 'Официальный Google OAuth 2.0'}
              </p>
            </div>
          </div>
          {isRequired ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/40">
              Вход обязателен
            </span>
          ) : (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Motivational requirement prompt */}
        {isRequired && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-emerald-950/60 border border-cyan-500/30 text-xs text-gray-300 leading-relaxed">
            👋 Для расчёта маршрута под калории, трекинга GPS и сохранения тренировок необходимо войти в аккаунт.
          </div>
        )}

        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">{error}</div>
          </div>
        )}

        {/* Big Official Google Sign-In Button */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleLaunchRealGoogle(clientId)}
            className="w-full py-3.5 px-4 bg-white hover:bg-gray-100 text-black font-black text-sm rounded-2xl shadow-xl transition flex items-center justify-center gap-3 active:scale-98 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <GoogleIcon className="w-5 h-5" />
                <span>Войти через Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            Откроется защищённое окно{' '}
            <span className="font-mono text-cyan-300">accounts.google.com</span> для выбора аккаунта.
          </p>
        </div>

        {/* Client ID Configuration Section */}
        <div className="pt-3 border-t border-gray-800">
          {!showConfig ? (
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-emerald-400 py-1 font-semibold transition"
            >
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                {clientId ? 'Изменить Google Client ID' : 'Как подключить настоящий Google Client ID?'}
              </span>
              <span className="text-[10px] text-emerald-400">
                {clientId ? 'Настроен ✓' : 'Инструкция'}
              </span>
            </button>
          ) : (
            <form onSubmit={handleSaveAndLaunch} className="space-y-3 bg-gray-900/80 p-3.5 rounded-2xl border border-gray-800 text-xs">
              <div className="space-y-1 text-[11px] text-gray-300">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Как получить Client ID от Google (бесплатно за 1 минуту):
                </div>
                <ol className="list-decimal pl-4 space-y-0.5 text-gray-400">
                  <li>
                    Откройте{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 underline inline-flex items-center gap-0.5"
                    >
                      Google Cloud Console <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>Нажмите <strong>Создать учетные данные</strong> → <strong>Идентификатор клиента OAuth</strong> (тип: Веб-приложение).</li>
                  <li>В «Разрешенные источники JavaScript» добавьте: <code className="text-white bg-black px-1 rounded">http://localhost:3000</code></li>
                  <li>Скопируйте <strong>Идентификатор клиента</strong> (Client ID) и вставьте ниже:</li>
                </ol>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold mb-1 uppercase">
                  Ваш Google Client ID:
                </label>
                <input
                  type="text"
                  required
                  placeholder="xxxx-xxxxxxxx.apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-black/80 border border-gray-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="py-2 px-3 rounded-xl bg-gray-800 text-gray-400 text-xs hover:text-white transition"
                >
                  Скрыть
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs transition"
                >
                  Сохранить и войти через Google
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Quick Demo Login Option if user wants to test before opening cloud console */}
        <div className="pt-2 border-t border-gray-800 text-center">
          <button
            type="button"
            onClick={() => handleDemoSignIn('farmonovabdurahmon7@gmail.com', 'Abdurahmon')}
            className="text-[11px] text-gray-500 hover:text-gray-300 transition"
          >
            ⚡ Быстрый тест в 1 клик без Client ID (Abdurahmon)
          </button>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Прямой запрос к https://accounts.google.com</span>
        </div>
      </div>
    </div>
  );
}
