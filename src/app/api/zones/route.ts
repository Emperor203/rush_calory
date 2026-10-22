import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';
import { Zone } from '@/lib/types';

export async function GET() {
  const state = TurfServerState.getInstance();
  state.hydrateZones();
  return NextResponse.json(state.zones);
}

export async function POST(req: Request) {
  const body = await req.json();
  const state = TurfServerState.getInstance();

  const newZone: Zone = {
    id: `zone-${Date.now()}`,
    name: body.name,
    description: body.description || '',
    latitude: parseFloat(body.latitude),
    longitude: parseFloat(body.longitude),
    radiusMeters: parseInt(body.radiusMeters, 10) || 50,
    requiredPoints: parseInt(body.requiredPoints, 10) || 500,
    capturePoints: 0,
    status: 'NEUTRAL',
    controllingClanId: null,
    controllingClan: null,
  };

  state.zones.push(newZone);
  return NextResponse.json(newZone);
}
