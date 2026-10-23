'use client';

import React, { useEffect } from 'react';
import { Lock, Zap, X, ShieldAlert, Volume2 } from 'lucide-react';

interface PvpPassBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStreetPass: () => void;
}

export function speakPvpBlockedVoice() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Тебе нельзя! У тебя нет подписки Street Pass!');
      utterance.lang = 'ru-RU';
      utterance.pitch = 0.9;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }
}

export default function PvpPassBlockedModal({
  isOpen,
  onClose,
  onOpenStreetPass,
}: PvpPassBlockedModalProps) {
  useEffect(() => {
    if (isOpen) {
      speakPvpBlockedVoice();
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

        {/* Big Lock Icon with Voice trigger */}
        <div
          onClick={speakPvpBlockedVoice}
          className="w-20 h-20 mx-auto rounded-3xl bg-rose-950/60 border-2 border-rose-500 flex items-center justify-center text-4xl shadow-xl animate-pulse cursor-pointer hover:scale-105 transition"
          title="Нажмите, чтобы повторить голос"
        >
          🔒
        </div>

        {/* Titles */}
        <div className="space-y-1.5">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black bg-rose-950 text-rose-400 border border-rose-500/50 uppercase tracking-widest font-mono">
            ДОСТУП ЗАБЛОКИРОВАН
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-mono tracking-wide">
            ТЕБЕ НЕЛЬЗЯ!
          </h2>
          <p className="text-xs text-rose-200/90 leading-relaxed font-bold">
            У тебя нет соревновательной подписки <span className="text-[#C6FF33] font-mono">Street Pass</span>!
          </p>
        </div>

        {/* Explanation Card */}
        <div className="p-3 bg-[#121212] rounded-2xl border border-[#242424] text-[11px] text-gray-400 leading-relaxed space-y-1 text-left">
          <div className="flex items-center gap-1.5 text-white font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Ранговая защита PVP</span>
          </div>
          <p className="text-[10px]">
            Уличный допуск (Street Pass) защищает дуэли от читеров и открывает рейтинговые бои наперегонки с другими атлетами.
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
            <span>Купить Street Pass (от 29,000 UZS)</span>
          </button>

          <button
            type="button"
            onClick={speakPvpBlockedVoice}
            className="w-full py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-[#242424] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Повторить голосовое предупреждение</span>
          </button>
        </div>
      </div>
    </div>
  );
}
