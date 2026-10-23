export interface RankTier {
  id: string;
  name: string;        // "ДЕРЕВО", "БРОНЗА", "СЕРЕБРО", "ЗОЛОТО", "ПЛАТИНА", "КАРБОН"
  subtitle: string;    // "Rookie", "Strider", "Runner", "Elite", "Beast", "Monster"
  minKm: number;
  maxKm: number;       // Infinity for Carbon
  icon: string;        // "🪵", "🥉", "🥈", "🥇", "💎", "⚡"
  badgeColor: string;
  textColor: string;
}

export const RANK_TIERS: RankTier[] = [
  {
    id: 'wood',
    name: 'ДЕРЕВО',
    subtitle: 'Rookie Атлет',
    minKm: 0,
    maxKm: 5,
    icon: '🪵',
    badgeColor: '#A8A29E',
    textColor: '#D6D3D1',
  },
  {
    id: 'bronze',
    name: 'БРОНЗА',
    subtitle: 'Уличный Спринтер',
    minKm: 5,
    maxKm: 25,
    icon: '🥉',
    badgeColor: '#CD7F32',
    textColor: '#F59E0B',
  },
  {
    id: 'silver',
    name: 'СЕРЕБРО',
    subtitle: 'Городской Атлет',
    minKm: 25,
    maxKm: 60,
    icon: '🥈',
    badgeColor: '#E2E8F0',
    textColor: '#FFFFFF',
  },
  {
    id: 'gold',
    name: 'ЗОЛОТО',
    subtitle: 'Мастер Темпа',
    minKm: 60,
    maxKm: 150,
    icon: '🥇',
    badgeColor: '#FACC15',
    textColor: '#FDE047',
  },
  {
    id: 'platinum',
    name: 'ПЛАТИНА',
    subtitle: 'Кибер-Марафонец',
    minKm: 150,
    maxKm: 300,
    icon: '💎',
    badgeColor: '#7D39EB',
    textColor: '#A78BFA',
  },
  {
    id: 'carbon',
    name: 'КАРБОН',
    subtitle: 'Carbon Monster ⚡',
    minKm: 300,
    maxKm: Infinity,
    icon: '⚡',
    badgeColor: '#C6FF33',
    textColor: '#C6FF33',
  },
];

export interface UserRankProgress {
  currentTier: RankTier;
  nextTier: RankTier | null;
  currentKm: number;
  kmInTier: number;
  tierTargetKm: number;
  remainingKm: number;
  progressPercent: number;
}

export function calculateUserRank(totalKm: number = 0): UserRankProgress {
  const km = Math.max(0, totalKm);

  let currentTierIndex = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    const tier = RANK_TIERS[i];
    if (km >= tier.minKm && (tier.maxKm === Infinity || km < tier.maxKm)) {
      currentTierIndex = i;
      break;
    }
  }

  const currentTier = RANK_TIERS[currentTierIndex];
  const nextTier =
    currentTierIndex < RANK_TIERS.length - 1 ? RANK_TIERS[currentTierIndex + 1] : null;

  if (!nextTier) {
    // Max tier reached (Carbon Monster)
    return {
      currentTier,
      nextTier: null,
      currentKm: km,
      kmInTier: km - currentTier.minKm,
      tierTargetKm: currentTier.minKm,
      remainingKm: 0,
      progressPercent: 100,
    };
  }

  const tierSpan = nextTier.minKm - currentTier.minKm;
  const kmInTier = km - currentTier.minKm;
  const remainingKm = Math.max(0, nextTier.minKm - km);
  const progressPercent = Math.min(100, Math.max(0, Math.round((kmInTier / tierSpan) * 100)));

  return {
    currentTier,
    nextTier,
    currentKm: km,
    kmInTier,
    tierTargetKm: tierSpan,
    remainingKm,
    progressPercent,
  };
}
