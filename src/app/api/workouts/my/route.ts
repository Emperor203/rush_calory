import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const state = TurfServerState.getInstance();

  const userId = token?.replace('turf-jwt-', '');
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const myWorkouts = state.workouts.filter((w) => w.userId === userId);
  return NextResponse.json(myWorkouts);
}
