import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const state = TurfServerState.getInstance();

  const userId = token?.replace('turf-jwt-', '');
  const user = state.users.find((u) => u.id === userId);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const prevClanId = user.clanId;
  user.clanId = null;
  user.clan = null;

  if (prevClanId) {
    const clan = state.clans.find((c) => c.id === prevClanId);
    if (clan) {
      const members = state.users.filter((u) => u.clanId === clan.id);
      clan.totalScore = members.reduce((sum, m) => sum + m.totalPoints, 0);
    }
  }

  return NextResponse.json({ message: 'Left clan successfully' });
}
