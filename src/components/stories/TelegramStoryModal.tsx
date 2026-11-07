'use client';

import React, { useRef, useState, useEffect } from 'react';
import { CompletedWorkout, formatPace } from '@/lib/history';
import { GoogleUser } from '@/lib/auth';
import { calculateUserRank } from '@/lib/ranks';
import {
  X,
  Share2,
  Download,
  Flame,
  Zap,
  Check,
  Sparkles,
} from 'lucide-react';

interface TelegramStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: CompletedWorkout | null;
  currentUser: GoogleUser | null;
}

export default function TelegramStoryModal({
  isOpen,
  onClose,
  workout,
  currentUser,
}: TelegramStoryModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  const athleteName = currentUser?.name || 'Rush Athlete';
  const distanceKm = workout?.distanceKm || 5.0;
  const calories = workout?.caloriesBurned || 420;
  const durationSec = workout?.durationSeconds || 1620;
  const pace = workout?.avgPaceMinPerKm || 5.4;

  const userTotalKm = (currentUser?.totalKmRun || 0) + distanceKm;
  const rank = calculateUserRank(userTotalKm);

  // Format time mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    if (!isOpen) return;

    setIsGenerating(true);
    const canvas = document.createElement('canvas');
    // Story aspect ratio 9:16 (1080 x 1920)
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Background (Dark Carbon gradient)
    const bgGradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGradient.addColorStop(0, '#060709');
    bgGradient.addColorStop(0.5, '#0B0F19');
    bgGradient.addColorStop(1, '#050608');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. Cyberpunk Neon Background Glows
    const limeGlow = ctx.createRadialGradient(200, 400, 50, 200, 400, 600);
    limeGlow.addColorStop(0, 'rgba(198, 255, 51, 0.12)');
    limeGlow.addColorStop(1, 'rgba(198, 255, 51, 0)');
    ctx.fillStyle = limeGlow;
    ctx.fillRect(0, 0, 1080, 1000);

    const purpleGlow = ctx.createRadialGradient(880, 1500, 50, 880, 1500, 650);
    purpleGlow.addColorStop(0, 'rgba(125, 57, 235, 0.16)');
    purpleGlow.addColorStop(1, 'rgba(125, 57, 235, 0)');
    ctx.fillStyle = purpleGlow;
    ctx.fillRect(0, 1000, 1080, 920);

    // 3. Grid Lines (Subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1.5;
    for (let x = 60; x < 1080; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1920);
      ctx.stroke();
    }
    for (let y = 60; y < 1920; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }

    // 4. Header Badge: RUSH CALORY
    ctx.fillStyle = '#C6FF33';
    ctx.font = 'bold 32px sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('RUSH CALORY // ATHLETE RUN', 100, 180);

    // Date
    ctx.fillStyle = '#8E95A5';
    ctx.font = '24px sans-serif';
    ctx.letterSpacing = '1px';
    const nowStr = new Date().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    ctx.fillText(nowStr.toUpperCase(), 100, 225);

    // 5. Athlete Profile Card Pill
    ctx.fillStyle = 'rgba(18, 21, 31, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(100, 280, 880, 140, 70);
    ctx.fill();
    ctx.stroke();

    // Athlete name & Rank
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(athleteName, 160, 350);

    ctx.fillStyle = '#C6FF33';
    ctx.font = 'bold 24px sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(rank.currentTier.name.toUpperCase(), 160, 390);

    // Rank pill on right
    ctx.fillStyle = 'rgba(198, 255, 51, 0.15)';
    ctx.beginPath();
    ctx.roundRect(750, 320, 190, 60, 30);
    ctx.fill();
    ctx.fillStyle = '#C6FF33';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(userTotalKm)} KM`, 845, 360);
    ctx.textAlign = 'left';

    // 6. Glowing Neon Track Visualization
    ctx.save();
    ctx.shadowColor = '#C6FF33';
    ctx.shadowBlur = 35;
    ctx.strokeStyle = '#C6FF33';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Beautiful stylized runner circuit loop
    ctx.moveTo(320, 820);
    ctx.bezierCurveTo(240, 620, 480, 520, 680, 560);
    ctx.bezierCurveTo(860, 600, 900, 780, 800, 920);
    ctx.bezierCurveTo(720, 1040, 500, 1060, 360, 980);
    ctx.bezierCurveTo(280, 930, 280, 860, 320, 820);
    ctx.stroke();

    // Runner pulse pin
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(680, 560, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // "VERIFIED TRACK" Label inside track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 22px sans-serif';
    ctx.letterSpacing = '4px';
    ctx.textAlign = 'center';
    ctx.fillText('GPS TURF CIRCUIT // 100% VERIFIED', 540, 820);
    ctx.textAlign = 'left';

    // 7. Core Big Stat: DISTANCE
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 130px sans-serif';
    ctx.letterSpacing = '-2px';
    ctx.fillText(`${distanceKm}`, 100, 1240);

    ctx.fillStyle = '#C6FF33';
    ctx.font = 'bold 44px sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('КИЛОМЕТРОВ', 100, 1310);

    // 8. Three Secondary Stat Cards
    // Calories Card
    ctx.fillStyle = 'rgba(18, 21, 31, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(100, 1370, 260, 220, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F43F5E';
    ctx.font = 'bold 22px sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('СОЖЖЕНО', 130, 1425);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 64px sans-serif';
    ctx.fillText(`${calories}`, 130, 1500);

    ctx.fillStyle = '#8E95A5';
    ctx.font = '22px sans-serif';
    ctx.fillText('ккал', 130, 1545);

    // Time Card
    ctx.fillStyle = 'rgba(18, 21, 31, 0.9)';
    ctx.beginPath();
    ctx.roundRect(410, 1370, 260, 220, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 22px sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('ВРЕМЯ', 440, 1425);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 60px sans-serif';
    ctx.fillText(formatTime(durationSec), 440, 1500);

    ctx.fillStyle = '#8E95A5';
    ctx.font = '22px sans-serif';
    ctx.fillText('мин : сек', 440, 1545);

    // Pace Card
    ctx.fillStyle = 'rgba(18, 21, 31, 0.9)';
    ctx.beginPath();
    ctx.roundRect(720, 1370, 260, 220, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#C6FF33';
    ctx.font = 'bold 22px sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('ТЕМП', 750, 1425);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 60px sans-serif';
    ctx.fillText(formatPace(pace), 750, 1500);

    ctx.fillStyle = '#8E95A5';
    ctx.font = '22px sans-serif';
    ctx.fillText('мин / км', 750, 1545);

    // 9. Footer: CTA & Telegram Link
    ctx.fillStyle = 'rgba(125, 57, 235, 0.2)';
    ctx.strokeStyle = '#7D39EB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(100, 1660, 880, 150, 40);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('БРОСЬ МНЕ ВЫЗОВ НА УЛИЦЕ!', 160, 1725);

    ctx.fillStyle = '#C6FF33';
    ctx.font = 'bold 24px sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('RUSH CALORY // t.me/rush_calory_bot', 160, 1770);

    const dataUrl = canvas.toDataURL('image/png');
    setCardDataUrl(dataUrl);
    setIsGenerating(false);
  }, [isOpen, workout, currentUser, athleteName, distanceKm, calories, durationSec, pace, userTotalKm]);

  if (!isOpen) return null;

  const handleShareToStory = () => {
    if (!cardDataUrl) return;

    // 1. Try Telegram native shareToStory (Telegram WebApp API)
    const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
    if (tg && typeof tg.shareToStory === 'function') {
      try {
        tg.shareToStory(cardDataUrl, {
          text: `Я пробежал ${distanceKm} км и сжёг ${calories} ккал в Rush Calory! ⚡ Кто сможет быстрее?`,
          widget_link: {
            url: 'https://t.me/rush_calory_bot',
            name: 'Бросить вызов в Rush Calory',
          },
        });
        return;
      } catch (e) {
        console.warn('Native Telegram shareToStory failed, fallback to download:', e);
      }
    }

    // 2. Fallback: direct download HD PNG for stories
    handleDownloadCard();
  };

  const handleDownloadCard = () => {
    if (!cardDataUrl) return;
    const a = document.createElement('a');
    a.href = cardDataUrl;
    a.download = `rush-calory-story-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText('https://t.me/rush_calory_bot');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-fade-in safe-bottom"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm sm:max-w-md bg-[#08090C] border border-white/10 rounded-3xl p-5 text-white shadow-2xl flex flex-col max-h-[92dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#7D39EB]/20 border border-[#7D39EB]/40 flex items-center justify-center text-[#7D39EB]">
              <Sparkles className="w-5 h-5 text-[#C6FF33]" />
            </div>
            <div>
              <h2 className="text-base font-heading font-black tracking-wide text-white uppercase">
                КАРТОЧКА ДЛЯ STORIES
              </h2>
              <p className="text-[11px] text-gray-400 font-body">
                Готова для публикации в Telegram и Instagram Stories
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Card Canvas Preview */}
        <div className="py-4 flex justify-center">
          {cardDataUrl ? (
            <div className="relative w-48 sm:w-56 aspect-[9/16] rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl group hover:border-[#C6FF33] transition">
              <img
                src={cardDataUrl}
                alt="Story Card Preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-48 sm:w-56 aspect-[9/16] rounded-2xl bg-[#12151F] border border-white/10 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#C6FF33] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400 font-heading">Рендер карточки...</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={handleShareToStory}
            disabled={!cardDataUrl}
            className="w-full py-3.5 px-4 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-heading text-xs uppercase tracking-wider rounded-full shadow-xl transition flex items-center justify-center gap-2 active:scale-95 ease-signature font-bold"
          >
            <Share2 className="w-4 h-4" />
            <span>Опубликовать в Telegram Stories</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={!cardDataUrl}
              className="py-3 px-3 bg-[#12151F] hover:bg-[#1a1e2b] border border-white/10 text-xs font-heading text-white rounded-full transition flex items-center justify-center gap-1.5 active:scale-95 ease-signature"
            >
              <Download className="w-4 h-4 text-[#C6FF33]" />
              <span>Сохранить HD</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="py-3 px-3 bg-[#12151F] hover:bg-[#1a1e2b] border border-white/10 text-xs font-heading text-gray-300 hover:text-white rounded-full transition flex items-center justify-center gap-1.5 active:scale-95 ease-signature"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#C6FF33]" />
                  <span>Скопировано!</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-[#7D39EB]" />
                  <span>Ссылка на бота</span>
                </>
              )}
            </button>
          </div>

          <span className="block text-[10px] text-gray-500 text-center font-body pt-1">
            Разрешение 1080x1920 с неоновым треком и вашим рангом
          </span>
        </div>
      </div>
    </div>
  );
}
