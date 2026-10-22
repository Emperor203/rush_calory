import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';

export async function GET(req: Request) {
  const state = TurfServerState.getInstance();

  const totalUsers = state.users.length;
  const totalClans = state.clans.length;
  const totalZones = state.zones.length;
  const capturedZones = state.zones.filter((z) => z.status === 'CAPTURED').length;
  const neutralZones = state.zones.filter((z) => z.status === 'NEUTRAL').length;
  const contestedZones = state.zones.filter((z) => z.status === 'CONTESTED').length;
  const totalWorkouts = state.workouts.length;
  const totalPointsEarned = state.users.reduce((sum, u) => sum + u.totalPoints, 0);

  const dailyTrends = [
    { date: '10-16', workouts: 14, points: 520 },
    { date: '10-17', workouts: 22, points: 940 },
    { date: '10-18', workouts: 19, points: 810 },
    { date: '10-19', workouts: 35, points: 1420 },
    { date: '10-20', workouts: 28, points: 1100 },
    { date: '10-21', workouts: 42, points: 1850 },
    { date: '10-22', workouts: 31, points: 1390 },
  ];

  const exerciseDistribution = [
    { name: 'PULL_UPS', value: 85 },
    { name: 'DIPS', value: 62 },
    { name: 'PUSH_UPS', value: 120 },
    { name: 'BURPEES', value: 45 },
    { name: 'RUNNING', value: 38 },
  ];

  const topClans = [...state.clans].sort((a, b) => b.totalScore - a.totalScore);

  return NextResponse.json({
    overview: {
      totalUsers,
      totalClans,
      totalZones,
      capturedZones,
      neutralZones,
      contestedZones,
      totalWorkouts,
      totalPointsEarned,
    },
    dailyTrends,
    exerciseDistribution,
    topClans,
    recentCaptures: state.captureLogs,
  });
}
