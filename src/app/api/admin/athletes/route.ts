import { NextResponse } from 'next/server';

export interface RegisteredAthlete {
  id: string;
  name: string;
  email: string;
  avatar: string;
  weightKg: number;
  totalCaloriesBurned: number;
  totalKmRun: number;
  completedRunsCount: number;
  isBanned: boolean;
  registeredAt: string;
  lastActiveAt: string;
}

// In-memory persistent state during server runtime
class AthletesStore {
  private static instance: AthletesStore;
  public athletes: RegisteredAthlete[] = [
    {
      id: 'athlete-1',
      name: 'Abdurahmon',
      email: 'farmonovabdurahmon7@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Abdurahmon&backgroundColor=06b6d4,10b981',
      weightKg: 70,
      totalCaloriesBurned: 1840,
      totalKmRun: 24.5,
      completedRunsCount: 4,
      isBanned: false,
      registeredAt: '2026-10-22T19:30:00Z',
      lastActiveAt: new Date().toISOString(),
    },
    {
      id: 'athlete-2',
      name: 'Aziz Calisthenics',
      email: 'aziz@turfwars.com',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Aziz&backgroundColor=ef4444',
      weightKg: 75,
      totalCaloriesBurned: 950,
      totalKmRun: 12.8,
      completedRunsCount: 2,
      isBanned: false,
      registeredAt: '2026-10-22T20:15:00Z',
      lastActiveAt: '2026-10-22T22:45:00Z',
    },
    {
      id: 'athlete-3',
      name: 'Beka Runner',
      email: 'beka@turfwars.com',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Beka&backgroundColor=10b981',
      weightKg: 68,
      totalCaloriesBurned: 3120,
      totalKmRun: 42.1,
      completedRunsCount: 6,
      isBanned: false,
      registeredAt: '2026-10-22T18:00:00Z',
      lastActiveAt: '2026-10-22T23:10:00Z',
    },
  ];

  public static getInstance(): AthletesStore {
    if (!AthletesStore.instance) {
      AthletesStore.instance = new AthletesStore();
    }
    return AthletesStore.instance;
  }
}

// Global in-memory set of banned emails to survive during server runtime
const globalBannedEmails = new Set<string>();

export async function GET(req: Request) {
  const store = AthletesStore.getInstance();
  const url = new URL(req.url);
  const emailQuery = url.searchParams.get('email');

  // Sync banned state from global set
  store.athletes.forEach((a) => {
    if (globalBannedEmails.has(a.email.toLowerCase())) {
      a.isBanned = true;
    }
  });

  if (emailQuery) {
    const isBanned =
      globalBannedEmails.has(emailQuery.toLowerCase()) ||
      Boolean(store.athletes.find((a) => a.email.toLowerCase() === emailQuery.toLowerCase())?.isBanned);
    return NextResponse.json({ email: emailQuery, isBanned });
  }

  const totalCalories = store.athletes.reduce((sum, a) => sum + (a.totalCaloriesBurned || 0), 0);
  const totalKm = store.athletes.reduce((sum, a) => sum + (a.totalKmRun || 0), 0);
  const totalRuns = store.athletes.reduce((sum, a) => sum + (a.completedRunsCount || 0), 0);

  return NextResponse.json({
    athletes: store.athletes,
    stats: {
      totalAthletes: store.athletes.length,
      totalCaloriesBurned: Math.round(totalCalories),
      totalKmRun: Math.round(totalKm * 10) / 10,
      totalRunsCompleted: totalRuns,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const store = AthletesStore.getInstance();
    const email = (body.email || '').toLowerCase();

    const isBanned = globalBannedEmails.has(email);

    const existingIndex = store.athletes.findIndex(
      (a) => a.email.toLowerCase() === email,
    );

    if (existingIndex !== -1) {
      // Update existing athlete
      const current = store.athletes[existingIndex];
      const finalBanned = isBanned || current.isBanned;

      store.athletes[existingIndex] = {
        ...current,
        name: body.name || current.name,
        avatar: body.avatar || current.avatar,
        weightKg: body.weightKg || current.weightKg,
        totalCaloriesBurned: Math.max(current.totalCaloriesBurned, body.totalCaloriesBurned || 0),
        totalKmRun: Math.max(current.totalKmRun, body.totalKmRun || 0),
        completedRunsCount: Math.max(current.completedRunsCount, body.completedRunsCount || 0),
        isBanned: finalBanned,
        lastActiveAt: new Date().toISOString(),
      };
      return NextResponse.json({
        message: 'Athlete updated',
        athlete: store.athletes[existingIndex],
        isBanned: finalBanned,
      });
    }

    // Register new athlete
    const newAthlete: RegisteredAthlete = {
      id: body.id || `athlete-${Date.now()}`,
      name: body.name || 'Google Athlete',
      email: body.email,
      avatar:
        body.avatar ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(body.name || 'Athlete')}`,
      weightKg: body.weightKg || 70,
      totalCaloriesBurned: body.totalCaloriesBurned || 0,
      totalKmRun: body.totalKmRun || 0,
      completedRunsCount: body.completedRunsCount || 0,
      isBanned: isBanned,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    store.athletes.unshift(newAthlete);
    return NextResponse.json({
      message: 'Athlete registered',
      athlete: newAthlete,
      isBanned: isBanned,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, isBanned } = await req.json();
    const store = AthletesStore.getInstance();

    const athlete = store.athletes.find((a) => a.id === id);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    athlete.isBanned = isBanned;
    const email = athlete.email.toLowerCase();

    if (isBanned) {
      globalBannedEmails.add(email);
    } else {
      globalBannedEmails.delete(email);
    }

    return NextResponse.json({ message: `Status updated`, athlete, isBanned });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
