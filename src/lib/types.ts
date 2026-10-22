export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';

export interface Clan {
  id: string;
  name: string;
  tag: string;
  colorHex: string;
  leaderId?: string;
  totalScore: number;
  zonesCount: number;
  members?: User[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  clanId?: string | null;
  clan?: Clan | null;
  totalPoints: number;
  isBanned?: boolean;
  createdAt: string;
}

export type ZoneStatus = 'NEUTRAL' | 'CAPTURED' | 'CONTESTED';

export interface Zone {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  controllingClanId?: string | null;
  controllingClan?: Clan | null;
  capturePoints: number;
  requiredPoints: number;
  status: ZoneStatus;
  lastCapturedAt?: string | null;
  distanceMeters?: number;
}

export type ExerciseType = 'PULL_UPS' | 'PUSH_UPS' | 'DIPS' | 'RUNNING' | 'BURPEES' | 'SQUATS';

export interface Workout {
  id: string;
  userId: string;
  user?: User;
  zoneId: string;
  zone?: Zone;
  clanId?: string | null;
  clan?: Clan | null;
  exerciseType: ExerciseType;
  repsOrMeters: number;
  userLatitude: number;
  userLongitude: number;
  verifiedByGps: boolean;
  earnedPoints: number;
  proofMediaUrl?: string | null;
  createdAt: string;
}

export interface ZoneCaptureLog {
  id: string;
  zoneId: string;
  zone?: Zone;
  previousClanId?: string | null;
  previousClan?: Clan | null;
  newClanId: string;
  newClan?: Clan;
  capturedAt: string;
}

export interface DashboardStats {
  overview: {
    totalUsers: number;
    totalClans: number;
    totalZones: number;
    capturedZones: number;
    neutralZones: number;
    contestedZones: number;
    totalWorkouts: number;
    totalPointsEarned: number;
  };
  dailyTrends: {
    date: string;
    workouts: number;
    points: number;
  }[];
  exerciseDistribution: {
    name: string;
    value: number;
  }[];
  topClans: Clan[];
  recentCaptures: ZoneCaptureLog[];
}
