'use client';

import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  Flame,
  Zap,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { FoodScanResult } from '@/app/api/ai/scan-food/route';

interface FoodScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCaloriesAndRoute: (calories: number) => void;
  initialImage?: { base64: string; mimeType: string } | null;
}

export default function FoodScannerModal({
  isOpen,
  onClose,
  onApplyCaloriesAndRoute,
  initialImage = null,
}: FoodScannerModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<FoodScanResult | null>(null);
  const [burnMode, setBurnMode] = useState<'easy' | 'balanced' | 'full'>('balanced');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const multiplier = burnMode === 'easy' ? 0.45 : burnMode === 'balanced' ? 0.70 : 1.0;
  const targetCalories = scanResult ? Math.round(scanResult.calories * multiplier) : 350;
  const targetDistanceKm = Math.min(5.8, Math.max(1.5, Math.round((targetCalories / 110) * 10) / 10));
  const targetMinutes = Math.round(targetDistanceKm * 5.5);

  React.useEffect(() => {
    if (isOpen && initialImage) {
      setImagePreview(initialImage.base64);
      setScanResult(null);
      setErrorMsg(null);
      analyzeFood(initialImage.base64, initialImage.mimeType);
    }
  }, [isOpen, initialImage]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Пожалуйста, выберите файл изображения');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setScanResult(null);
      setErrorMsg(null);
      analyzeFood(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeFood = async (base64: string, mimeType: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/scan-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось распознать блюдо');
      }

      setScanResult(data.result);
    } catch (err: any) {
      console.error('Food scan error:', err);
      setErrorMsg(err.message || 'Ошибка связи с ИИ-сервером');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!scanResult) return;
    onApplyCaloriesAndRoute(targetCalories);
    onClose();
  };

  const resetScanner = () => {
    setImagePreview(null);
    setScanResult(null);
    setErrorMsg(null);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-fade-in safe-bottom"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm sm:max-w-md bg-[#08090C] border border-white/10 rounded-3xl p-5 sm:p-6 text-white shadow-2xl flex flex-col max-h-[92dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#C6FF33]/10 border border-[#C6FF33]/30 flex items-center justify-center text-[#C6FF33]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-heading font-black tracking-wide text-white uppercase">
                ИИ-СКАЗИВАТЕЛЬ КАЛОРИЙ
              </h2>
              <p className="text-[11px] text-gray-400 font-body">
                Сфотографируйте еду — сожгите её на маршруте
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

        {/* Content Area */}
        <div className="py-4 space-y-4">
          {!imagePreview ? (
            /* Upload & Camera Prompt */
            <div className="flex flex-col gap-3">
              {/* Primary Direct Camera Action via Overlay Input */}
              <div className="relative overflow-hidden w-full py-5 px-4 rounded-2xl bg-[#C6FF33] hover:bg-[#b0f020] text-black font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(198,255,51,0.3)] transition flex items-center justify-center gap-3 active:scale-95 ease-signature group">
                <div className="w-11 h-11 rounded-full bg-black/15 flex items-center justify-center text-black group-hover:scale-110 transition pointer-events-none">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-left pointer-events-none">
                  <span className="block text-sm font-heading font-black text-black">
                    Сфотографировать блюдо
                  </span>
                  <span className="text-[11px] font-body text-black/75">
                    Нажмите для снимка на камеру
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-30"
                />
              </div>

              {/* Secondary Gallery Action via Overlay Input */}
              <div className="relative overflow-hidden w-full py-3.5 px-4 rounded-2xl border border-white/10 bg-[#12151F] hover:bg-[#1a1e2b] text-white transition flex items-center justify-center gap-2 active:scale-95 ease-signature">
                <Upload className="w-4 h-4 text-gray-400 pointer-events-none" />
                <span className="text-xs font-heading font-bold text-gray-300 pointer-events-none">
                  Выбрать фото из галереи
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-30"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-[#12151F] border border-white/5 rounded-xl p-2.5">
                  <span className="text-[11px] text-gray-400 block font-body">Точность</span>
                  <span className="text-xs font-heading text-[#C6FF33] font-bold">±15 ккал</span>
                </div>
                <div className="bg-[#12151F] border border-white/5 rounded-xl p-2.5">
                  <span className="text-[11px] text-gray-400 block font-body">Анализ</span>
                  <span className="text-xs font-heading text-white font-bold">1.2 сек</span>
                </div>
                <div className="bg-[#12151F] border border-white/5 rounded-xl p-2.5">
                  <span className="text-[11px] text-gray-400 block font-body">Результат</span>
                  <span className="text-xs font-heading text-purple-400 font-bold">Готовый трек</span>
                </div>
              </div>
            </div>
          ) : (
            /* Image Preview & Scanning / Result */
            <div className="space-y-4">
              <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Food Scan"
                  className="w-full h-full object-cover"
                />

                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 border-3 border-[#C6FF33] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-heading tracking-wider uppercase text-[#C6FF33] animate-pulse">
                      ИИ сканирует порцию и БЖУ...
                    </span>
                    {/* Laser scan line effect */}
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C6FF33] to-transparent animate-pulse shadow-[0_0_12px_#C6FF33]" />
                  </div>
                )}

                {!isAnalyzing && (
                  <button
                    type="button"
                    onClick={resetScanner}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition"
                    title="Загрузить другое фото"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs text-center font-body">
                  {errorMsg}
                </div>
              )}

              {scanResult && (
                <div className="space-y-3 animate-fade-in">
                  {/* Dish Title & Calories Banner */}
                  <div className="bg-[#12151F] border border-white/10 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-heading uppercase tracking-wider text-[#C6FF33] font-bold">
                          Блюдо распознано
                        </span>
                        <h3 className="text-base font-heading font-black text-white">
                          {scanResult.dishName}
                        </h3>
                        {scanResult.weightGrams && (
                          <span className="text-[11px] text-gray-400 font-body">
                            Порция: ~{scanResult.weightGrams} г
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-[#C6FF33]">
                          <Flame className="w-5 h-5 fill-[#C6FF33]" />
                          <span className="text-2xl font-heading font-black">
                            {scanResult.calories}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-body">
                          ккал
                        </span>
                      </div>
                    </div>

                    {/* Macros Bars */}
                    {scanResult.macros && (
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-center">
                        <div className="bg-black/40 rounded-lg p-1.5">
                          <span className="text-[9px] text-gray-400 block font-body">Белки</span>
                          <span className="text-xs font-heading font-bold text-emerald-400">
                            {scanResult.macros.protein} г
                          </span>
                        </div>
                        <div className="bg-black/40 rounded-lg p-1.5">
                          <span className="text-[9px] text-gray-400 block font-body">Жиры</span>
                          <span className="text-xs font-heading font-bold text-amber-400">
                            {scanResult.macros.fat} г
                          </span>
                        </div>
                        <div className="bg-black/40 rounded-lg p-1.5">
                          <span className="text-[9px] text-gray-400 block font-body">Углеводы</span>
                          <span className="text-xs font-heading font-bold text-sky-400">
                            {scanResult.macros.carbs} г
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Burn Intensity Mode Selector */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-heading uppercase tracking-wide">
                      <span>Режим сжигания калорий:</span>
                      <span className="text-[#C6FF33] font-bold font-mono">~{targetCalories} ккал</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBurnMode('easy')}
                        className={`p-2 rounded-xl text-center transition active:scale-95 ease-signature ${
                          burnMode === 'easy'
                            ? 'bg-[#12151F] border-2 border-[#C6FF33] text-white shadow-md'
                            : 'bg-[#12151F]/60 border border-white/5 text-gray-400'
                        }`}
                      >
                        <div className="text-[10px] font-heading font-bold text-emerald-400 uppercase">Лёгкий</div>
                        <div className="text-xs font-mono font-black text-white mt-0.5">
                          {Math.min(5.5, Math.max(1.5, Math.round((scanResult.calories * 0.45 / 110) * 10) / 10))} км
                        </div>
                        <div className="text-[9px] text-gray-400 font-body">45% порции</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBurnMode('balanced')}
                        className={`p-2 rounded-xl text-center transition active:scale-95 ease-signature ${
                          burnMode === 'balanced'
                            ? 'bg-[#7D39EB] text-white shadow-lg border-2 border-purple-400'
                            : 'bg-[#12151F]/60 border border-white/5 text-gray-400'
                        }`}
                      >
                        <div className="text-[10px] font-heading font-black text-[#C6FF33] uppercase">Баланс</div>
                        <div className="text-xs font-mono font-black text-white mt-0.5">
                          {Math.min(5.5, Math.max(1.5, Math.round((scanResult.calories * 0.70 / 110) * 10) / 10))} км
                        </div>
                        <div className="text-[9px] text-purple-200 font-body">70% порции</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBurnMode('full')}
                        className={`p-2 rounded-xl text-center transition active:scale-95 ease-signature ${
                          burnMode === 'full'
                            ? 'bg-[#12151F] border-2 border-rose-500 text-white shadow-md'
                            : 'bg-[#12151F]/60 border border-white/5 text-gray-400'
                        }`}
                      >
                        <div className="text-[10px] font-heading font-bold text-rose-400 uppercase">100%</div>
                        <div className="text-xs font-mono font-black text-white mt-0.5">
                          {Math.min(5.8, Math.max(1.5, Math.round((scanResult.calories / 110) * 10) / 10))} км
                        </div>
                        <div className="text-[9px] text-gray-400 font-body">Вся еда</div>
                      </button>
                    </div>
                  </div>

                  {/* Burn Route Mission Banner */}
                  <div className="bg-gradient-to-r from-[#7D39EB]/20 to-purple-900/10 border border-[#7D39EB]/40 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#7D39EB] flex items-center justify-center text-white shrink-0 shadow-lg">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-purple-300 font-heading block">
                          Оптимальный маршрут от дома
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-heading font-black text-white">
                            {targetDistanceKm} км
                          </span>
                          <span className="text-xs text-gray-300 font-body">
                            (~{targetMinutes} мин в темпе 5:30)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 text-center italic font-body">
                    «{scanResult.motivation}»
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/10 shrink-0 space-y-2">
          {scanResult ? (
            <button
              type="button"
              onClick={handleApply}
              className="w-full py-3.5 px-4 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-heading text-xs uppercase tracking-wider rounded-full shadow-xl transition flex items-center justify-center gap-2 active:scale-95 ease-signature font-bold"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Построить маршрут на {targetDistanceKm}&nbsp;км</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-[#12151F] hover:bg-[#1a1e2b] border border-white/10 text-xs font-heading text-gray-300 hover:text-white rounded-full transition active:scale-95 ease-signature"
            >
              Отмена
            </button>
          )}

          <span className="block text-[10px] text-gray-500 text-center font-body">
            ИИ рассчитывает маршрут вокруг вашей текущей геопозиции
          </span>
        </div>
      </div>
    </div>
  );
}
