import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const state = TurfServerState.getInstance();
  const index = state.zones.findIndex((z) => z.id === params.id);
  if (index !== -1) {
    state.zones.splice(index, 1);
    return NextResponse.json({ message: 'Zone deleted successfully' });
  }
  return NextResponse.json({ message: 'Zone not found' }, { status: 404 });
}
