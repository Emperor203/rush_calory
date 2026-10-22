'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { X, Lock, Mail, User, Swords } from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { login, register, isLoading } = useAuthStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegister) {
        await register(username, email, password);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    }
  };

  const handleQuickDemoLogin = async (role: 'admin' | 'user') => {
    setError(null);
    try {
      if (role === 'admin') {
        await login('admin@turfwars.com', 'admin123456');
      } else {
        await login('aziz@turfwars.com', 'password123');
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-turf-surface border border-turf-border rounded-2xl p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-turf-border mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Swords className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-base">
              {isRegister ? 'Join Sport Turf Wars' : 'Athlete Authentication'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-turf-card transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Callsign (Username)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. IronSpartan"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-turf-card border border-turf-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              {isRegister ? 'Email Address' : 'Email or Username'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type={isRegister ? 'email' : 'text'}
                required
                placeholder="athlete@turfwars.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-turf-card border border-turf-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-turf-card border border-turf-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRegister ? (
              'Create Athlete Profile'
            ) : (
              'Enter Battlezone'
            )}
          </button>
        </form>

        {/* Quick Demo Logins for Pair Programming review */}
        <div className="mt-4 pt-4 border-t border-turf-border">
          <p className="text-[11px] text-gray-400 mb-2 text-center">⚡ Quick Test Accounts:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin')}
              className="py-1.5 px-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 text-amber-300 text-[11px] rounded-lg font-semibold transition"
            >
              👑 Login as Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('user')}
              className="py-1.5 px-2 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-600/40 text-blue-300 text-[11px] rounded-lg font-semibold transition"
            >
              🥊 Login as Aziz (Beasts)
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-gray-400 hover:text-blue-400 transition"
          >
            {isRegister
              ? 'Already registered? Sign in here'
              : 'New athlete? Create account & choose clan'}
          </button>
        </div>
      </div>
    </div>
  );
}
