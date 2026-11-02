import { GoogleUser, saveGoogleUser } from './auth';

export interface StreetPassPlan {
  id: 'single' | 'monthly' | 'yearly';
  name: string;
  durationDays: number;
  starsAmount: number;
  priceStars: string;
  priceUzs: string;
  priceUsd: string;
  badge: string;
  isPopular?: boolean;
}

export const STREET_PASS_PLANS: StreetPassPlan[] = [
  {
    id: 'single',
    name: '1 ДУЭЛЬ (РАЗОВО)',
    durationDays: 1,
    starsAmount: 15,
    priceStars: '15 ⭐️',
    priceUzs: '3,000 UZS',
    priceUsd: '$0.25',
    badge: 'БЫСТРЫЙ СТАРТ',
  },
  {
    id: 'monthly',
    name: 'ПРЕМИУМ МЕСЯЦ (30 ДНЕЙ)',
    durationDays: 30,
    starsAmount: 150,
    priceStars: '150 ⭐️',
    priceUzs: '29,000 UZS',
    priceUsd: '$2.49',
    badge: 'СТАНДАРТ',
  },
  {
    id: 'yearly',
    name: 'ПРЕМИУМ ГОД (365 ДНЕЙ)',
    durationDays: 365,
    starsAmount: 990,
    priceStars: '990 ⭐️',
    priceUzs: '189,000 UZS',
    priceUsd: '$14.99',
    badge: 'МАКСИМАЛЬНАЯ ВЫГОДА // -50%',
    isPopular: true,
  },
];

export type PaymentMethodId = 'stars' | 'payme' | 'click' | 'card' | 'usdt';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  icon: string;
  description: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'stars',
    name: 'Telegram Stars ⭐',
    icon: '⭐',
    description: 'В 1 клик через Telegram (Apple Pay, Карты)',
  },
  {
    id: 'payme',
    name: 'Payme',
    icon: '🟢',
    description: 'Uzcard / Humo / Visa',
  },
  {
    id: 'click',
    name: 'Click Up',
    icon: '🔵',
    description: 'Мгновенная оплата',
  },
  {
    id: 'card',
    name: 'Банковская карта',
    icon: '💳',
    description: 'Uzcard, Humo, Visa, Mastercard',
  },
  {
    id: 'usdt',
    name: 'USDT Crypto',
    icon: '₮',
    description: 'TRC-20 / TON',
  },
];

export interface AnthemTrack {
  id: string;
  name: string;
  url: string;
  genre: string;
  author: string;
}

export const PRESET_ANTHEMS: AnthemTrack[] = [
  {
    id: 'cyberpunk-drift',
    name: 'Cyberpunk Phonk (Neon Drift)',
    url: '/sounds/anthem-drift.mp3',
    genre: 'Drift Phonk / 130 BPM',
    author: 'Street Pass Exclusive',
  },
  {
    id: 'victory-surge',
    name: 'Bass Monster (Victory Surge)',
    url: '/sounds/anthem-victory.mp3',
    genre: 'Electronic Hardstyle',
    author: 'Arena Champion',
  },
];

export interface TrailStyle {
  id: string;
  name: string;
  color: string;
  glow: string;
  badge: string;
}

export const TRAIL_STYLES: TrailStyle[] = [
  {
    id: 'lime',
    name: 'Неоновый Лайм',
    color: '#C6FF33',
    glow: 'rgba(198,255,51,0.6)',
    badge: 'DEFAULT // ATHLETE',
  },
  {
    id: 'violet',
    name: 'Кибер-Фиолет',
    color: '#7D39EB',
    glow: 'rgba(125,57,235,0.6)',
    badge: 'PVP ELITE',
  },
  {
    id: 'fire',
    name: 'Неоновый Огонь',
    color: '#FF0055',
    glow: 'rgba(255,0,85,0.6)',
    badge: 'BURNING PACE',
  },
  {
    id: 'cyan',
    name: 'Электро-Бирюза',
    color: '#00F5FF',
    glow: 'rgba(0,245,255,0.6)',
    badge: 'CARBON MATRIX',
  },
  {
    id: 'carbon',
    name: 'Карбон Монохром',
    color: '#FFFFFF',
    glow: 'rgba(255,255,255,0.6)',
    badge: 'STEALTH RUNNER',
  },
];

export function isStreetPassActive(user: GoogleUser | null): boolean {
  if (!user || !user.hasStreetPass || !user.streetPassExpiresAt) return false;
  return user.streetPassExpiresAt > Date.now();
}

export function getStreetPassDaysRemaining(user: GoogleUser | null): number {
  if (!isStreetPassActive(user) || !user?.streetPassExpiresAt) return 0;
  const diffMs = user.streetPassExpiresAt - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function activateStreetPass(
  user: GoogleUser,
  planId: 'single' | 'monthly' | 'yearly' | 'season' | 'trial',
): GoogleUser {
  let durationDays = 30;
  if (planId === 'single') durationDays = 1;
  else if (planId === 'monthly') durationDays = 30;
  else if (planId === 'yearly') durationDays = 365;
  else if (planId === 'season') durationDays = 90;
  else if (planId === 'trial') durationDays = 3;

  const now = Date.now();
  const currentExpiry =
    user.streetPassExpiresAt && user.streetPassExpiresAt > now
      ? user.streetPassExpiresAt
      : now;

  const addedMs = durationDays * 24 * 60 * 60 * 1000;
  const newExpiry = currentExpiry + addedMs;

  const updated: GoogleUser = {
    ...user,
    hasStreetPass: true,
    streetPassPlan: planId,
    streetPassExpiresAt: newExpiry,
    neonTrailColor: user.neonTrailColor || '#C6FF33',
    mvpAnthemName: user.mvpAnthemName || PRESET_ANTHEMS[0].name,
    mvpAnthemUrl: user.mvpAnthemUrl || PRESET_ANTHEMS[0].url,
  };

  saveGoogleUser(updated);

  // Sync to backend athletes database
  if (typeof fetch !== 'undefined') {
    fetch('/api/admin/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  }

  return updated;
}

export function updateUserCustomizations(
  user: GoogleUser,
  customizations: {
    mvpAnthemUrl?: string | null;
    mvpAnthemName?: string | null;
    neonTrailColor?: string | null;
  },
): GoogleUser {
  const updated: GoogleUser = {
    ...user,
    ...customizations,
  };

  saveGoogleUser(updated);

  if (typeof fetch !== 'undefined') {
    fetch('/api/admin/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  }

  return updated;
}
