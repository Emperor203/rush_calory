import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const state = TurfServerState.getInstance();

  const userId = token?.replace('turf-jwt-', '');
  const user = state.users.find((u) => u.id === userId);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  user.clan = state.clans.find((c) => c.id === user.clanId) || null;
  return NextResponse.json(user);
}
