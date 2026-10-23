'use client';

import React, { useState } from 'react';
import { GoogleUser } from '@/lib/auth';
import {
  STREET_PASS_PLANS,
  PAYMENT_METHODS,
  isStreetPassActive,
  getStreetPassDaysRemaining,
  activateStreetPass,
} from '@/lib/streetpass';
import {
  Zap,
  Check,
  X,
  ShieldCheck,
  Swords,
  Trophy,
  Music,
  Sparkles,
  Gift,
  CreditCard,
  Clock,
  Flame,
} from 'lucide-react';

interface StreetPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: GoogleUser | null;
  onUserUpdate: (updatedUser: GoogleUser) => void;
}

export default function StreetPassModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdate,
}: StreetPassModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<'monthly' | 'season'>('season');
  const [selectedPaymentId, setSelectedPaymentId] = useState<'payme' | 'click' | 'card' | 'usdt'>('payme');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isActive = isStreetPassActive(currentUser);
  const daysRemaining = getStreetPassDaysRemaining(currentUser);
  const selectedPlan = STREET_PASS_PLANS.find((p) => p.id === selectedPlanId) || STREET_PASS_PLANS[1];

  const handlePayment = () => {
    if (!currentUser) return;
    setIsProcessing(true);

    setTimeout(() => {
      const updated = activateStreetPass(currentUser, selectedPlanId);
      onUserUpdate(updated);
      setIsProcessing(false);
      setSuccessMessage(
        `🎉 Street Pass успешно активирован на ${selectedPlan.durationDays} дней! Статус Verified Athlete присвоен.`,
      );
    }, 1200);
  };

  const progressPercent = isActive
    ? Math.min(100, Math.round((daysRemaining / (currentUser?.streetPassPlan === 'season' ? 90 : 30)) * 100))
    : 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#000000] border-2 border-[#7D39EB] rounded-3xl p-5 sm:p-6 text-white shadow-[0_0_60px_rgba(125,57,235,0.4)] space-y-4 max-h-[92dvh] overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#242424] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#7D39EB] flex items-center justify-center text-white shadow-xl ring-2 ring-[#C6FF33]">
              <Zap className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono">
                  УЛИЧНЫЙ ДОПУСК
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#C6FF33] text-black font-mono">
                  PASS
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                Соревновательная подписка атлета // Ранговые дуэли
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

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-[#121212] border-2 border-[#C6FF33] rounded-2xl text-center space-y-1 animate-scale-up">
            <div className="text-sm font-black text-[#C6FF33] font-mono">{successMessage}</div>
            <p className="text-[10px] text-gray-300">
              Ваш неоновый след и бейдж Verified Athlete уже активны на карте!
            </p>
          </div>
        )}

        {/* Active Street Pass Status Bar */}
        {isActive && (
          <div className="p-3.5 bg-[#121212] border-2 border-[#C6FF33] rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-black text-[#C6FF33] uppercase flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-[#C6FF33]" /> СТАТУС: VERIFIED ATHLETE
              </span>
              <span className="font-mono font-bold text-white text-[11px]">
                Осталось: {daysRemaining} дн.
              </span>
            </div>
            <div className="w-full bg-[#000000] rounded-full h-2 overflow-hidden border border-[#242424]">
              <div
                className="bg-[#C6FF33] h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-400 text-center font-mono">
              Тариф: {currentUser?.streetPassPlan === 'season' ? 'Сезон (90 дней)' : '1 Месяц (30 дней)'} • Продлите для сохранения бонусов
            </div>
          </div>
        )}

        {/* Pricing Tiers (Cards) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block font-mono">
            1. Выберите тарифный план:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {STREET_PASS_PLANS.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-3.5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#121212] border-[#C6FF33] shadow-[0_0_25px_rgba(198,255,51,0.2)]'
                      : 'bg-[#121212] border-[#242424] hover:border-gray-700'
                  }`}
                >
                  {plan.badge && (
                    <div
                      className={`text-[8px] sm:text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded-full inline-block mb-1.5 self-start ${
                        plan.isPopular
                          ? 'bg-[#C6FF33] text-black font-black'
                          : 'bg-[#7D39EB] text-white'
                      }`}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-black text-white font-mono">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-black text-white font-mono">{plan.priceUzs}</span>
                      <span className="text-[10px] text-gray-400 font-mono">/ {plan.priceUsd}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between border-t border-[#242424] pt-2">
                    <span>Срок действия</span>
                    <span className="font-bold text-[#C6FF33] font-mono">{plan.durationDays} дней</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Benefits List */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block font-mono">
            2. Что входит в Street Pass:
          </label>
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-3 space-y-2 text-xs">
            <div className="flex items-start gap-2.5">
              <Swords className="w-4 h-4 text-[#7D39EB] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Рейтинговые PvP-дуэли</strong>
                <span className="text-[10px] text-gray-400 block">
                  Подбор соперников поблизости с ранговой защитой от читеров и симуляторов.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Trophy className="w-4 h-4 text-[#C6FF33] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Лиги от «Дерева» до «Карбона»</strong>
                <span className="text-[10px] text-gray-400 block">
                  Продвижение по дивизионам (Bronze ➔ Silver ➔ Gold ➔ Carbon Monster).
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Music className="w-4 h-4 text-[#7D39EB] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">MVP-гимн при победе</strong>
                <span className="text-[10px] text-gray-400 block">
                  Проигрывание вашего победного трека в наушниках соперника при пересечении финиша.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#C6FF33] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Неоновый след и Verified статус</strong>
                <span className="text-[10px] text-gray-400 block">
                  Светящийся след за вашей меткой на карте и бейдж Verified Athlete в профиле.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Gift className="w-4 h-4 text-[#7D39EB] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Еженедельный пул дропов</strong>
                <span className="text-[10px] text-gray-400 block">
                  Эксклюзивные награды и доступ к закрытым турнирам платформы.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block font-mono">
            3. Способ оплаты:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedPaymentId === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPaymentId(method.id)}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'bg-[#7D39EB] border-[#7D39EB] text-white font-bold shadow'
                      : 'bg-[#121212] border-[#242424] text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{method.icon}</span>
                  <span className="text-[10px] font-bold block truncate w-full">{method.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CTA Pay Button */}
        <div className="pt-2 shrink-0">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePayment}
            className="w-full py-3.5 px-4 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4 fill-black text-black" />
                <span>
                  {isActive ? 'Продлить Street Pass' : 'Активировать Street Pass'} за {selectedPlan.priceUzs}
                </span>
              </>
            )}
          </button>
          <p className="text-[9px] text-gray-500 text-center mt-2 font-mono">
            Мгновенная активация • Защищённая транзакция через {PAYMENT_METHODS.find((m) => m.id === selectedPaymentId)?.name}
          </p>
        </div>
      </div>
    </div>
  );
}
