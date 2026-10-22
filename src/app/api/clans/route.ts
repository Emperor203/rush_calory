import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';
import { Clan } from '@/lib/types';

export async function GET() {
  const state = TurfServerState.getInstance();
  const sorted = [...state.clans].sort((a, b) => b.totalScore - a.totalScore);
  return NextResponse.json(sorted);
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const state = TurfServerState.getInstance();

  const userId = token?.replace('turf-jwt-', '');
  const user = state.users.find((u) => u.id === userId);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { name, tag, colorHex } = await req.json();

  const newClan: Clan = {
    id: `clan-${Date.now()}`,
    name,
    tag: tag.toUpperCase(),
    colorHex: colorHex || '#3B82F6',
    totalScore: user.totalPoints,
    zonesCount: 0,
    leaderId: user.id,
  };

  state.clans.push(newClan);
  user.clanId = newClan.id;
  user.clan = newClan;

  return NextResponse.json(newClan);
}
