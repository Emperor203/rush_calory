import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';

export async function GET() {
  const state = TurfServerState.getInstance();
  const sorted = [...state.users]
    .map((u) => ({
      ...u,
      clan: state.clans.find((c) => c.id === u.clanId) || null,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json(sorted);
}
