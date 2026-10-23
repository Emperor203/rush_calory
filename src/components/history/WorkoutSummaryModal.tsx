'use client';

import React, { useState, useEffect } from 'react';
import {
  CompletedWorkout,
  getWorkoutHistory,
  formatPace,
  formatWorkoutDate,
} from '@/lib/history';
import { GoogleUser } from '@/lib/auth';
import {
  Trophy,
  Flame,
  TrendingUp,
  Clock,
  Gauge,
  X,
  History,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: CompletedWorkout | null;
  currentUser: GoogleUser | null;
}

export default function WorkoutSummaryModal({
  isOpen,
  onClose,
  workout,
  currentUser,
}: WorkoutSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary');
  const [historyList, setHistoryList] = useState<CompletedWorkout[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistoryList(getWorkoutHistory());
      setActiveTab('summary');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalCaloriesAll = historyList.reduce((acc, cur) => acc + (cur.caloriesBurned || 0), 0);
  const totalKmAll = historyList.reduce((acc, cur) => acc + (cur.distanceKm || 0), 0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#000000] border-2 border-[#242424] rounded-3xl p-5 sm:p-6 text-white shadow-2xl space-y-4 max-h-[90dvh] flex flex-col"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#242424] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#7D39EB] flex items-center justify-center text-white shrink-0 shadow-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono">
                {activeTab === 'summary' ? 'Забег завершён!' : 'История пробежек'}
              </h2>
              <p className="text-[10px] text-[#C6FF33] font-mono">
                {currentUser?.name || 'Атлет Rush Calory'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#121212] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#121212] p-1 rounded-2xl border border-[#242424] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'summary'
                ? 'bg-[#C6FF33] text-black shadow-lg font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Итоги забега</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#7D39EB] text-white shadow-lg font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>История ({historyList.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto pr-1 space-y-3.5 flex-1">
          {activeTab === 'summary' ? (
            /* Tab 1: Current Run Summary */
            <div className="space-y-3.5">
              {workout ? (
                <>
                  {/* Big Hero Card */}
                  <div className="bg-[#121212] border-2 border-[#C6FF33] p-4 rounded-3xl text-center space-y-1 shadow-[0_0_30px_rgba(198,255,51,0.15)]">
                    <span className="text-[10px] uppercase font-mono font-bold text-[#C6FF33] tracking-widest block">
                      Фактический результат
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono">
                      {workout.distanceKm}{' '}
                      <span className="text-base text-gray-400 font-sans">км</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      Отличная работа! Калории успешно сожжены.
                    </div>
                  </div>

                  {/* 2x2 Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Calories */}
                    <div className="bg-[#121212] border border-[#242424] p-3 rounded-2xl text-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-[#7D39EB]" /> Сожжено
                      </span>
                      <div className="text-xl font-black text-[#7D39EB] font-mono mt-1">
                        {workout.caloriesBurned}{' '}
                        <span className="text-xs font-sans text-gray-400">ккал</span>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="bg-[#121212] border border-[#242424] p-3 rounded-2xl text-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#C6FF33]" /> Время
                      </span>
                      <div className="text-xl font-black text-[#FFFFFF] font-mono mt-1">
                        {Math.floor(workout.durationSeconds / 60)}:
                        {(workout.durationSeconds % 60).toString().padStart(2, '0')}
                      </div>
                    </div>

                    {/* Average Pace */}
                    <div className="bg-[#121212] border border-[#242424] p-3 rounded-2xl text-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-[#C6FF33]" /> Средний темп
                      </span>
                      <div className="text-lg font-black text-[#C6FF33] font-mono mt-1">
                        {formatPace(workout.avgPaceMinPerKm)}{' '}
                        <span className="text-[10px] font-sans text-gray-400">/км</span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="bg-[#121212] border border-[#242424] p-3 rounded-2xl text-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" /> Дата
                      </span>
                      <div className="text-xs font-bold text-white mt-1.5 truncate">
                        {formatWorkoutDate(workout.date)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-gray-400 text-xs bg-[#121212] rounded-2xl border border-[#242424]">
                  Нет данных текущего забега.
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Full History List */
            <div className="space-y-2.5">
              {/* Career Totals */}
              <div className="grid grid-cols-2 gap-2 pb-1">
                <div className="bg-[#121212] border border-[#242424] p-2.5 rounded-2xl text-center">
                  <span className="text-[9px] text-gray-400 uppercase font-mono block">Всего сожжено</span>
                  <span className="text-base font-black text-[#7D39EB] font-mono">
                    {totalCaloriesAll.toLocaleString()} ккал
                  </span>
                </div>
                <div className="bg-[#121212] border border-[#242424] p-2.5 rounded-2xl text-center">
                  <span className="text-[9px] text-gray-400 uppercase font-mono block">Всего пробег</span>
                  <span className="text-base font-black text-[#C6FF33] font-mono">
                    {totalKmAll.toFixed(1)} км
                  </span>
                </div>
              </div>

              {historyList.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-xs bg-[#121212] rounded-2xl border border-[#242424] space-y-1">
                  <div className="text-2xl">🏃‍♂️</div>
                  <div>История пока пуста.</div>
                  <div className="text-[10px] text-gray-500">
                    Завершите свою первую пробежку, чтобы она сохранилась здесь!
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-[#121212] border border-[#242424] hover:border-[#7D39EB] transition p-3 rounded-2xl flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-white">
                            {item.distanceKm} км
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="font-mono font-bold text-xs text-[#7D39EB]">
                            {item.caloriesBurned} ккал
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {formatWorkoutDate(item.date)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-[#C6FF33]">
                          {Math.floor(item.durationSeconds / 60)}:
                          {(item.durationSeconds % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {formatPace(item.avgPaceMinPerKm)} /км
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom CTA Button */}
        <div className="pt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-[#C6FF33] hover:bg-[#b0f020] text-[#000000] font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition active:scale-98 flex items-center justify-center gap-2"
          >
            <span>Отлично, вернуться на карту</span>
          </button>
        </div>
      </div>
    </div>
  );
}
