import { GoogleUser, saveGoogleUser } from './auth';

export interface StreetPassPlan {
  id: 'monthly' | 'season';
  name: string;
  durationDays: number;
  priceUzs: string;
  priceUsd: string;
  badge: string;
  isPopular?: boolean;
}

export const STREET_PASS_PLANS: StreetPassPlan[] = [
  {
    id: 'monthly',
    name: '1 МЕСЯЦ',
    durationDays: 30,
    priceUzs: '29,000 UZS',
    priceUsd: '$2.49',
    badge: 'СТАНДАРТ',
  },
  {
    id: 'season',
    name: 'СЕЗОН (3 МЕСЯЦА)',
    durationDays: 90,
    priceUzs: '69,000 UZS',
    priceUsd: '$5.99',
    badge: 'ВЫБОР АТЛЕТА // ВЫГОДА 18,000 UZS',
    isPopular: true,
  },
];

export interface PaymentMethod {
  id: 'payme' | 'click' | 'card' | 'usdt';
  name: string;
  icon: string;
  description: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
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
  planId: 'monthly' | 'season' | 'trial',
): GoogleUser {
  let durationDays = 30;
  if (planId === 'season') durationDays = 90;
  if (planId === 'trial') durationDays = 3;

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
