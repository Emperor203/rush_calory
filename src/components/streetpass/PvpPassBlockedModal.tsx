'use client';

import React, { useEffect } from 'react';
import { Lock, Zap, X, ShieldAlert } from 'lucide-react';
import { GoogleUser } from '@/lib/auth';

interface PvpPassBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStreetPass: () => void;
  currentUser?: GoogleUser | null;
  onUserUpdate?: (updatedUser: GoogleUser) => void;
}

export default function PvpPassBlockedModal({
  isOpen,
  onClose,
  onOpenStreetPass,
}: PvpPassBlockedModalProps) {
  // Silence any speech synthesis if running
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-[#000000] border-2 border-rose-500 rounded-3xl p-5 sm:p-6 text-white shadow-[0_0_60px_rgba(244,63,94,0.4)] text-center space-y-4 animate-scale-up"
      >
        {/* Top Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#121212] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Big Lock Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-950/60 border-2 border-rose-500 flex items-center justify-center text-4xl shadow-xl animate-pulse">
          🔒
        </div>

        {/* Titles */}
        <div className="space-y-1.5">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black bg-purple-950 text-[#C6FF33] border border-[#C6FF33]/50 uppercase tracking-widest font-mono">
            PVP ДУЭЛИ • STREET PASS
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white uppercase font-mono tracking-wide">
            КОМНАТА С ДРУЗЬЯМИ
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed font-bold">
            Чтобы создавать комнаты и бегать наперегонки с друзьями, нужен{' '}
            <span className="text-[#C6FF33] font-mono">Премиум (Месяц / Год)</span> или Звёзды Telegram!
          </p>
        </div>

        {/* Explanation Card */}
        <div className="p-3 bg-[#121212] rounded-2xl border border-[#242424] text-[11px] text-gray-400 leading-relaxed space-y-1.5 text-left">
          <div className="flex items-center gap-1.5 text-white font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-[#C6FF33] shrink-0" />
            <span>Что даёт Street Pass:</span>
          </div>
          <p className="text-[10px]">
            ⚡ Создание комнат дуэлей на любую дистанцию (0.5 – 42 км).
          </p>
          <p className="text-[10px]">
            🌟 Неоновый светящийся след бегуна и MVP-гимны на финише.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenStreetPass();
            }}
            className="w-full py-3.5 px-4 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition active:scale-98 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-black text-black" />
            <span>Купить Премиум / Оплатить звёздами ⭐</span>
          </button>
        </div>
      </div>
    </div>
  );
}
