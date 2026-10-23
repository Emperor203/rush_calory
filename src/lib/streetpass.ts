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
  planId: 'monthly' | 'season',
): GoogleUser {
  const plan = STREET_PASS_PLANS.find((p) => p.id === planId) || STREET_PASS_PLANS[0];
  const now = Date.now();
  const currentExpiry = user.streetPassExpiresAt && user.streetPassExpiresAt > now
    ? user.streetPassExpiresAt
    : now;

  const addedMs = plan.durationDays * 24 * 60 * 60 * 1000;
  const newExpiry = currentExpiry + addedMs;

  const updated: GoogleUser = {
    ...user,
    hasStreetPass: true,
    streetPassPlan: planId,
    streetPassExpiresAt: newExpiry,
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
