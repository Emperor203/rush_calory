import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';
import { User } from '@/lib/types';

export async function POST(req: Request) {
  const { username, email, password } = await req.json();
  const state = TurfServerState.getInstance();

  const existing = state.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() || u.username === username,
  );

  if (existing) {
    return NextResponse.json({ message: 'User already exists' }, { status: 409 });
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    username,
    email: email.toLowerCase(),
    role: 'USER',
    clanId: null,
    totalPoints: 0,
    isBanned: false,
    createdAt: new Date().toISOString(),
  };

  state.users.push(newUser);

  return NextResponse.json({
    user: newUser,
    token: `turf-jwt-${newUser.id}`,
  });
}
