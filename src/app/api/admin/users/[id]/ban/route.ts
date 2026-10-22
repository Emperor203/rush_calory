import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { isBanned } = await req.json();
  const state = TurfServerState.getInstance();

  const user = state.users.find((u) => u.id === params.id);
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  user.isBanned = isBanned;
  return NextResponse.json({ message: `User status updated`, user });
}
