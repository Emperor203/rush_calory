'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleUser } from '@/lib/auth';
import {
  STREET_PASS_PLANS,
  PAYMENT_METHODS,
  PRESET_ANTHEMS,
  TRAIL_STYLES,
  AnthemTrack,
  TrailStyle,
  isStreetPassActive,
  getStreetPassDaysRemaining,
  activateStreetPass,
  updateUserCustomizations,
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
  Play,
  Square,
  Upload,
  Palette,
  Sliders,
  Volume2,
} from 'lucide-react';

interface StreetPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: GoogleUser | null;
  onUserUpdate: (updatedUser: GoogleUser) => void;
  initialTab?: 'plans' | 'studio';
}

export default function StreetPassModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdate,
  initialTab = 'plans',
}: StreetPassModalProps) {
  const [activeTab, setActiveTab] = useState<'plans' | 'studio'>(initialTab);
  const [selectedPlanId, setSelectedPlanId] = useState<'monthly' | 'season'>('season');
  const [selectedPaymentId, setSelectedPaymentId] = useState<'payme' | 'click' | 'card' | 'usdt'>('payme');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Customizer State
  const [selectedTrailColor, setSelectedTrailColor] = useState<string>(
    currentUser?.neonTrailColor || '#C6FF33'
  );
  const [selectedAnthemName, setSelectedAnthemName] = useState<string>(
    currentUser?.mvpAnthemName || PRESET_ANTHEMS[0].name
  );
  const [selectedAnthemUrl, setSelectedAnthemUrl] = useState<string>(
    currentUser?.mvpAnthemUrl || PRESET_ANTHEMS[0].url
  );
  const [customAudioUrlInput, setCustomAudioUrlInput] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedTrailColor(currentUser?.neonTrailColor || '#C6FF33');
      setSelectedAnthemName(currentUser?.mvpAnthemName || PRESET_ANTHEMS[0].name);
      setSelectedAnthemUrl(currentUser?.mvpAnthemUrl || PRESET_ANTHEMS[0].url);
      setSuccessMessage(null);
    } else {
      stopAudio();
    }
  }, [isOpen, initialTab, currentUser]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
    setPlayingTrackId(null);
  };

  const handleTogglePlay = (trackUrl: string, trackId: string) => {
    if (playingTrackId === trackId && isPlayingAudio) {
      stopAudio();
      return;
    }

    stopAudio();
    try {
      const audio = new Audio(trackUrl);
      audioRef.current = audio;
      audio.volume = 0.85;
      audio.play().catch((err) => {
        console.warn('Audio play failed:', err);
      });
      setIsPlayingAudio(true);
      setPlayingTrackId(trackId);
      audio.onended = () => {
        setIsPlayingAudio(false);
        setPlayingTrackId(null);
      };
    } catch (e) {
      console.warn('Could not play audio track:', e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Пожалуйста, выберите аудиофайл (MP3, WAV, AAC, OGG)!');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      alert('Размер файла превышает 12 МБ. Выберите трек меньшего размера.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const trackName = file.name.replace(/\.[^/.]+$/, '');
      setSelectedAnthemName(`Свой трек: ${trackName}`);
      setSelectedAnthemUrl(dataUrl);
      setSuccessMessage(`🎵 Ваш трек «${trackName}» загружен! Нажмите «Сохранить» ниже.`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomizations = () => {
    if (!currentUser) return;
    const updated = updateUserCustomizations(currentUser, {
      neonTrailColor: selectedTrailColor,
      mvpAnthemName: selectedAnthemName,
      mvpAnthemUrl: selectedAnthemUrl,
    });
    onUserUpdate(updated);
    setSuccessMessage('⚡ Настройки Street Pass успешно сохранены! Неоновый след и гимн обновлены.');
  };

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
        `🎉 Street Pass успешно активирован на ${selectedPlan.durationDays} дней! Статус Verified Athlete присвоен.`
      );
    }, 1000);
  };

  const handleActivateTrial = () => {
    if (!currentUser) return;
    setIsProcessing(true);
    setTimeout(() => {
      const updated = activateStreetPass(currentUser, 'trial');
      onUserUpdate(updated);
      setIsProcessing(false);
      setSuccessMessage('⚡ Бесплатный приветственный Street Pass на 3 дня активирован! PVP открыт!');
    }, 600);
  };

  const progressPercent = isActive
    ? Math.min(100, Math.round((daysRemaining / (currentUser?.streetPassPlan === 'season' ? 90 : 30)) * 100))
    : 0;

  return (
    <div
      onClick={() => {
        stopAudio();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in safe-bottom"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#000000] border-2 border-[#7D39EB] rounded-3xl p-5 sm:p-6 text-white shadow-[0_0_60px_rgba(125,57,235,0.4)] space-y-4 max-h-[92dvh] overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#242424] shrink-0">
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
                  STREET PASS
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                Соревновательная подписка атлета // Ранговые дуэли & Кастомизация
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAudio();
              onClose();
            }}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#121212] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#121212] p-1 rounded-2xl border border-[#242424] shrink-0">
          <button
            type="button"
            onClick={() => {
              stopAudio();
              setActiveTab('plans');
            }}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 font-mono ${
              activeTab === 'plans'
                ? 'bg-[#7D39EB] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Тарифы & Допуск</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopAudio();
              setActiveTab('studio');
            }}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 font-mono ${
              activeTab === 'studio'
                ? 'bg-[#C6FF33] text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Студия: Гимн & След</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-[#121212] border-2 border-[#C6FF33] rounded-2xl text-center space-y-1 animate-scale-up">
            <div className="text-xs sm:text-sm font-black text-[#C6FF33] font-mono">{successMessage}</div>
          </div>
        )}

        {/* TAB 1: PLANS & SUBSCRIPTION */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            {/* Free Trial Banner for non-active or new users */}
            {!isActive && (
              <div className="p-3.5 bg-gradient-to-r from-purple-950/60 to-black border-2 border-[#C6FF33] rounded-2xl flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(198,255,51,0.15)]">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#C6FF33]" />
                    <span className="font-mono font-black text-xs text-white">
                      ПРИВЕТСТВЕННЫЙ ТЕСТ-ДРАЙВ
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-300 font-mono mt-0.5">
                    3 дня полного допуска Street Pass бесплатно для новых атлетов!
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleActivateTrial}
                  className="px-3 py-2 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-black text-[11px] uppercase font-mono rounded-xl shrink-0 transition active:scale-95 shadow"
                >
                  Включить 3 дня
                </button>
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
                  Тариф: {currentUser?.streetPassPlan === 'season' ? 'Сезон (90 дней)' : currentUser?.streetPassPlan === 'trial' ? 'Пробный (3 дня)' : '1 Месяц (30 дней)'} • Продлите для сохранения бонусов
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
                      Проигрывание вашего трека при пересечении финиша (настраивается во вкладке Студия).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#C6FF33] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold">Неоновый след и Verified статус</strong>
                    <span className="text-[10px] text-gray-400 block">
                      Выбор цвета светящейся линии бега на карте и бейдж Verified Athlete в профиле.
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
        )}

        {/* TAB 2: STREET PASS STUDIO (CUSTOMIZER: MVP ANTHEM & NEON TRAIL) */}
        {activeTab === 'studio' && (
          <div className="space-y-4">
            {/* MVP Victory Anthem Selector */}
            <div className="bg-[#121212] border border-[#242424] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#7D39EB] flex items-center justify-center text-white">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono font-black text-xs text-white uppercase">
                      1. ТВОЙ MVP-ГИМН ПОБЕДЫ
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Звучит при завершении забега и победе в PvP
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-[#7D39EB] text-white font-mono">
                  AUDIO
                </span>
              </div>

              {/* Current Selected Anthem Badge */}
              <div className="p-2.5 rounded-xl bg-black border border-[#242424] flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-[9px] text-gray-500 uppercase font-mono block">Активный гимн:</span>
                  <span className="text-xs font-bold text-[#C6FF33] font-mono truncate block">
                    {selectedAnthemName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePlay(selectedAnthemUrl, 'current-track')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#7D39EB] hover:bg-[#6823d6] text-white font-bold text-[10px] font-mono flex items-center gap-1 shrink-0 transition"
                >
                  {playingTrackId === 'current-track' && isPlayingAudio ? (
                    <>
                      <Square className="w-3 h-3 fill-white" /> Стоп
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-white" /> Послушать
                    </>
                  )}
                </button>
              </div>

              {/* Preset Tracks List */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 font-mono uppercase block font-bold">
                  Готовые фирменные треки:
                </span>
                <div className="space-y-1.5">
                  {PRESET_ANTHEMS.map((track) => {
                    const isSelected = selectedAnthemName === track.name;
                    const isTrackPlaying = playingTrackId === track.id && isPlayingAudio;
                    return (
                      <div
                        key={track.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#1a1a1a] border-[#C6FF33]'
                            : 'bg-[#000000] border-[#242424] hover:border-gray-700'
                        }`}
                        onClick={() => {
                          setSelectedAnthemName(track.name);
                          setSelectedAnthemUrl(track.url);
                        }}
                      >
                        <div className="truncate mr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white font-mono truncate">
                              {track.name}
                            </span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF33] shrink-0" />
                            )}
                          </div>
                          <span className="text-[9px] text-gray-400 font-mono block">
                            {track.genre} • {track.author}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePlay(track.url, track.id);
                            }}
                            className="p-1.5 rounded-lg bg-[#242424] hover:bg-[#7D39EB] text-white transition"
                            title="Послушать пресет"
                          >
                            {isTrackPlaying ? (
                              <Square className="w-3.5 h-3.5 fill-white" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-white" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upload Custom Audio File Button */}
              <div className="pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold transition flex items-center justify-center gap-2 active:scale-98"
                >
                  <Upload className="w-4 h-4 text-[#C6FF33]" />
                  <span>📁 Загрузить свой аудиофайл (MP3 / WAV с телефона)</span>
                </button>
              </div>

              {/* Direct Link Input */}
              <div className="space-y-1">
                <span className="text-[9px] text-gray-400 font-mono block">
                  Или укажите прямую ссылку на трек (.mp3):
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customAudioUrlInput}
                    onChange={(e) => setCustomAudioUrlInput(e.target.value)}
                    placeholder="https://example.com/my-anthem.mp3"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black border border-[#242424] text-xs font-mono text-white focus:outline-none focus:border-[#7D39EB]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customAudioUrlInput.trim()) return;
                      setSelectedAnthemName('Пользовательский трек (URL)');
                      setSelectedAnthemUrl(customAudioUrlInput.trim());
                      setCustomAudioUrlInput('');
                      setSuccessMessage('Ссылка на трек принята! Нажмите Сохранить.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#7D39EB] text-white text-xs font-mono font-bold hover:bg-[#6823d6]"
                  >
                    Применить
                  </button>
                </div>
              </div>
            </div>

            {/* Neon Walking / Running Trail Color Selector */}
            <div className="bg-[#121212] border border-[#242424] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#C6FF33] flex items-center justify-center text-black">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono font-black text-xs text-white uppercase">
                      2. СТИЛЬ НЕОНОВОГО СЛЕДА НА КАРТЕ
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Цвет линии твоей ходьбы и бега в реальном времени
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-[#C6FF33] text-black font-mono">
                  TRAIL
                </span>
              </div>

              {/* Trail Live Preview Visualizer */}
              <div className="p-3 bg-black rounded-xl border border-[#242424] space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-400">
                  <span>Предпросмотр линии на спутниковой карте:</span>
                  <span className="font-bold text-white">Ширина 6px // Neon Glow</span>
                </div>
                <div className="h-6 w-full bg-[#0a0a0a] rounded-lg flex items-center justify-center px-4 relative overflow-hidden">
                  {/* Outer glow */}
                  <div
                    className="h-3 w-full rounded-full blur-[3px] opacity-70"
                    style={{ backgroundColor: selectedTrailColor }}
                  />
                  {/* Inner crisp line */}
                  <div
                    className="absolute h-1.5 w-full rounded-full"
                    style={{ backgroundColor: selectedTrailColor }}
                  />
                </div>
              </div>

              {/* Color Tiers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TRAIL_STYLES.map((style) => {
                  const isSelected = selectedTrailColor === style.color;
                  return (
                    <div
                      key={style.id}
                      onClick={() => setSelectedTrailColor(style.color)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-[#181818] border-[#C6FF33] shadow-[0_0_15px_rgba(198,255,51,0.2)]'
                          : 'bg-[#000000] border-[#242424] hover:border-gray-700'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white/60 shadow shrink-0"
                        style={{ backgroundColor: style.color }}
                      />
                      <div className="truncate">
                        <span className="text-xs font-bold text-white font-mono block truncate">
                          {style.name}
                        </span>
                        <span className="text-[8px] text-gray-400 font-mono block">
                          {style.badge}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#C6FF33] ml-auto shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Customizations Button */}
            <div className="pt-1 shrink-0">
              <button
                type="button"
                onClick={handleSaveCustomizations}
                className="w-full py-3.5 px-4 bg-[#C6FF33] hover:bg-[#b0f020] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition active:scale-98 flex items-center justify-center gap-2 font-mono"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Сохранить настройки Street Pass</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
