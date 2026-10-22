import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';

export async function POST(req: Request) {
  const { loginOrEmail, password } = await req.json();
  const state = TurfServerState.getInstance();

  const user = state.users.find(
    (u) =>
      u.email.toLowerCase() === loginOrEmail.toLowerCase() ||
      u.username.toLowerCase() === loginOrEmail.toLowerCase(),
  );

  if (!user) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }

  if (user.isBanned) {
    return NextResponse.json(
      { message: 'Your athlete account has been suspended by an administrator' },
      { status: 403 },
    );
  }

  user.clan = state.clans.find((c) => c.id === user.clanId) || null;

  return NextResponse.json({
    user,
    token: `turf-jwt-${user.id}`,
  });
}
