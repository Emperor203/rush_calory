import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';

export async function GET() {
  const state = TurfServerState.getInstance();
  const items = state.users.map((u) => ({
    ...u,
    clan: state.clans.find((c) => c.id === u.clanId) || null,
  }));
  return NextResponse.json({
    items,
    total: items.length,
    page: 1,
    totalPages: 1,
  });
}
