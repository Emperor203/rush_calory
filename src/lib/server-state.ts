import { Clan, Zone, User, Workout, ZoneCaptureLog, DashboardStats, ExerciseType } from './types';

export class TurfServerState {
  private static instance: TurfServerState;

  public clans: Clan[] = [
    {
      id: 'clan-1',
      name: 'Iron Beasts',
      tag: 'BEAST',
      colorHex: '#EF4444',
      totalScore: 2450,
      zonesCount: 2,
    },
    {
      id: 'clan-2',
      name: 'Street Phantoms',
      tag: 'GHOST',
      colorHex: '#8B5CF6',
      totalScore: 1980,
      zonesCount: 1,
    },
    {
      id: 'clan-3',
      name: 'Tashkent Titans',
      tag: 'TTN',
      colorHex: '#10B981',
      totalScore: 3120,
      zonesCount: 2,
    },
    {
      id: 'clan-4',
      name: 'Cyber Wolves',
      tag: 'WOLF',
      colorHex: '#3B82F6',
      totalScore: 1450,
      zonesCount: 1,
    },
  ];

  public users: User[] = [
    {
      id: 'user-admin',
      username: 'admin',
      email: 'admin@turfwars.com',
      role: 'ADMIN',
      clanId: null,
      totalPoints: 500,
      isBanned: false,
      createdAt: '2026-01-10T10:00:00Z',
    },
    {
      id: 'user-1',
      username: 'aziz_beast',
      email: 'aziz@turfwars.com',
      role: 'USER',
      clanId: 'clan-1',
      totalPoints: 1250,
      isBanned: false,
      createdAt: '2026-02-15T12:00:00Z',
    },
    {
      id: 'user-2',
      username: 'beka_titan',
      email: 'beka@turfwars.com',
      role: 'USER',
      clanId: 'clan-3',
      totalPoints: 1800,
      isBanned: false,
      createdAt: '2026-03-01T09:30:00Z',
    },
    {
      id: 'user-3',
      username: 'sardor_phantom',
      email: 'sardor@turfwars.com',
      role: 'USER',
      clanId: 'clan-2',
      totalPoints: 940,
      isBanned: false,
      createdAt: '2026-03-12T15:20:00Z',
    },
    {
      id: 'user-4',
      username: 'alex_wolf',
      email: 'alex@turfwars.com',
      role: 'USER',
      clanId: 'clan-4',
      totalPoints: 720,
      isBanned: false,
      createdAt: '2026-04-05T18:00:00Z',
    },
  ];

  public zones: Zone[] = [
    {
      id: 'zone-1',
      name: 'Воркаут Парк Навруз',
      description: 'Главная площадка города: брусья, рукоходы, турники для стритлифтинга',
      latitude: 41.3283,
      longitude: 69.2612,
      radiusMeters: 60,
      requiredPoints: 600,
      capturePoints: 600,
      status: 'CAPTURED',
      controllingClanId: 'clan-3',
      controllingClan: null,
    },
    {
      id: 'zone-2',
      name: 'Экопарк Калистеника Кластер',
      description: 'Зона турников рядом с беговым кольцом в Экопарке',
      latitude: 41.3115,
      longitude: 69.2941,
      radiusMeters: 50,
      requiredPoints: 500,
      capturePoints: 500,
      status: 'CAPTURED',
      controllingClanId: 'clan-1',
      controllingClan: null,
    },
    {
      id: 'zone-3',
      name: 'Парк Анхор Локомотив (Street Barzz)',
      description: 'Набережная Анхора, мощный турник-комплекс и зона для отжиманий',
      latitude: 41.3256,
      longitude: 69.2554,
      radiusMeters: 55,
      requiredPoints: 500,
      capturePoints: 340,
      status: 'CONTESTED',
      controllingClanId: 'clan-4',
      controllingClan: null,
    },
    {
      id: 'zone-4',
      name: 'Ботанический Сад Беговая База',
      description: 'Зона старта спринтов и воркаут остров в лесопарке',
      latitude: 41.3468,
      longitude: 69.3142,
      radiusMeters: 80,
      requiredPoints: 700,
      capturePoints: 700,
      status: 'CAPTURED',
      controllingClanId: 'clan-3',
      controllingClan: null,
    },
    {
      id: 'zone-5',
      name: 'Сквер Амира Темура (Street Gym)',
      description: 'Центральная воркаут-база, постоянные баттлы между кланами',
      latitude: 41.3121,
      longitude: 69.2797,
      radiusMeters: 45,
      requiredPoints: 500,
      capturePoints: 500,
      status: 'CAPTURED',
      controllingClanId: 'clan-2',
      controllingClan: null,
    },
    {
      id: 'zone-6',
      name: 'Чиланзар 7 Квартал Спот',
      description: 'Районный спот около стадиона, высокая активность молодежи',
      latitude: 41.2721,
      longitude: 69.2045,
      radiusMeters: 50,
      requiredPoints: 400,
      capturePoints: 400,
      status: 'CAPTURED',
      controllingClanId: 'clan-1',
      controllingClan: null,
    },
    {
      id: 'zone-7',
      name: 'Юнусабад МегаПланета Турники',
      description: 'Открытая нейтральная база, готовая к первому захвату',
      latitude: 41.3654,
      longitude: 69.2891,
      radiusMeters: 50,
      requiredPoints: 450,
      capturePoints: 120,
      status: 'NEUTRAL',
      controllingClanId: null,
      controllingClan: null,
    },
  ];

  public workouts: Workout[] = [];
  public captureLogs: ZoneCaptureLog[] = [];

  private constructor() {
    this.hydrateZones();
    this.seedWorkouts();
  }

  public static getInstance(): TurfServerState {
    if (!TurfServerState.instance) {
      TurfServerState.instance = new TurfServerState();
    }
    return TurfServerState.instance;
  }

  public hydrateZones() {
    this.zones.forEach((z) => {
      z.controllingClan = this.clans.find((c) => c.id === z.controllingClanId) || null;
    });
  }

  private seedWorkouts() {
    this.workouts = [
      {
        id: 'w-1',
        userId: 'user-2',
        user: this.users[2],
        zoneId: 'zone-1',
        zone: this.zones[0],
        clanId: 'clan-3',
        clan: this.clans[2],
        exerciseType: 'PULL_UPS',
        repsOrMeters: 25,
        userLatitude: 41.3283,
        userLongitude: 69.2612,
        verifiedByGps: true,
        earnedPoints: 75,
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: 'w-2',
        userId: 'user-1',
        user: this.users[1],
        zoneId: 'zone-2',
        clanId: 'clan-1',
        clan: this.clans[0],
        exerciseType: 'DIPS',
        repsOrMeters: 40,
        userLatitude: 41.3115,
        userLongitude: 69.2941,
        verifiedByGps: true,
        earnedPoints: 80,
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
      {
        id: 'w-3',
        userId: 'user-3',
        user: this.users[3],
        zoneId: 'zone-5',
        clanId: 'clan-2',
        clan: this.clans[1],
        exerciseType: 'PUSH_UPS',
        repsOrMeters: 60,
        userLatitude: 41.3121,
        userLongitude: 69.2797,
        verifiedByGps: true,
        earnedPoints: 60,
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
    ];

    this.captureLogs = [
      {
        id: 'log-1',
        zoneId: 'zone-1',
        zone: this.zones[0],
        previousClanId: 'clan-1',
        previousClan: this.clans[0],
        newClanId: 'clan-3',
        newClan: this.clans[2],
        capturedAt: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
      },
      {
        id: 'log-2',
        zoneId: 'zone-5',
        zone: this.zones[4],
        previousClanId: 'clan-3',
        previousClan: this.clans[2],
        newClanId: 'clan-2',
        newClan: this.clans[1],
        capturedAt: new Date(Date.now() - 1000 * 3600 * 8).toISOString(),
      },
    ];
  }

  public haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
