import { NextResponse } from 'next/server';
import { TurfServerState } from '@/lib/server-state';
import { Workout, ExerciseType } from '@/lib/types';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const state = TurfServerState.getInstance();

  const userId = token?.replace('turf-jwt-', '');
  const user = state.users.find((u) => u.id === userId);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { zoneId, exerciseType, repsOrMeters, userLatitude, userLongitude } = await req.json();

  const zone = state.zones.find((z) => z.id === zoneId);
  if (!zone) {
    return NextResponse.json({ message: 'Zone not found' }, { status: 404 });
  }

  // 1. GPS Verification
  const distance = Math.round(
    state.haversineDistance(userLatitude, userLongitude, zone.latitude, zone.longitude),
  );

  if (distance > zone.radiusMeters) {
    return NextResponse.json(
      {
        message: `GPS verification failed. You are ${distance}m away (allowed radius: ${zone.radiusMeters}m). Use "Mock GPS At Spot" button to check in.`,
      },
      { status: 400 },
    );
  }

  // 2. Calculate Points
  let points = 0;
  switch (exerciseType as ExerciseType) {
    case 'PULL_UPS':
      points = repsOrMeters * 3;
      break;
    case 'DIPS':
      points = repsOrMeters * 2;
      break;
    case 'PUSH_UPS':
      points = repsOrMeters * 1;
      break;
    case 'BURPEES':
      points = repsOrMeters * 4;
      break;
    case 'SQUATS':
      points = repsOrMeters * 1;
      break;
    case 'RUNNING':
      points = Math.floor(repsOrMeters / 10);
      break;
    default:
      points = repsOrMeters;
  }

  // 3. Update User Score
  user.totalPoints += points;

  // 4. Update Clan Score
  const clan = state.clans.find((c) => c.id === user.clanId);
  if (clan) {
    clan.totalScore += points;
  }

  // 5. Turf Conquest Dynamics
  let captured = false;
  if (user.clanId) {
    if (!zone.controllingClanId || zone.status === 'NEUTRAL') {
      zone.capturePoints += points;
      if (zone.capturePoints >= zone.requiredPoints) {
        const prevClanId = zone.controllingClanId;
        zone.controllingClanId = user.clanId;
        zone.controllingClan = clan || null;
        zone.status = 'CAPTURED';
        zone.capturePoints = zone.requiredPoints;
        captured = true;

        if (clan) clan.zonesCount += 1;

        state.captureLogs.unshift({
          id: `log-${Date.now()}`,
          zoneId: zone.id,
          zone,
          previousClanId: prevClanId,
          newClanId: user.clanId,
          newClan: clan,
          capturedAt: new Date().toISOString(),
        });
      } else {
        zone.status = 'CONTESTED';
      }
    } else if (zone.controllingClanId === user.clanId) {
      zone.capturePoints = Math.min(zone.requiredPoints * 1.5, zone.capturePoints + points);
      zone.status = 'CAPTURED';
    } else {
      // Enemy territory
      zone.status = 'CONTESTED';
      zone.capturePoints -= points;

      if (zone.capturePoints <= 0) {
        // Neutralized!
        const prevClan = state.clans.find((c) => c.id === zone.controllingClanId);
        if (prevClan) prevClan.zonesCount = Math.max(0, prevClan.zonesCount - 1);

        zone.controllingClanId = null;
        zone.controllingClan = null;
        zone.status = 'NEUTRAL';
        zone.capturePoints = Math.abs(zone.capturePoints);

        if (zone.capturePoints >= zone.requiredPoints) {
          zone.controllingClanId = user.clanId;
          zone.controllingClan = clan || null;
          zone.status = 'CAPTURED';
          zone.capturePoints = zone.requiredPoints;
          captured = true;

          if (clan) clan.zonesCount += 1;

          state.captureLogs.unshift({
            id: `log-${Date.now()}`,
            zoneId: zone.id,
            zone,
            previousClanId: prevClan?.id || null,
            previousClan: prevClan || null,
            newClanId: user.clanId,
            newClan: clan,
            capturedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  // 6. Record Workout
  const workout: Workout = {
    id: `workout-${Date.now()}`,
    userId: user.id,
    user,
    zoneId: zone.id,
    zone,
    clanId: user.clanId || null,
    clan: clan || null,
    exerciseType,
    repsOrMeters,
    userLatitude,
    userLongitude,
    verifiedByGps: true,
    earnedPoints: points,
    createdAt: new Date().toISOString(),
  };

  state.workouts.unshift(workout);

  return NextResponse.json({
    workout,
    earnedPoints: points,
    message: captured
      ? `🔥 CONQUEST! Your clan [${clan?.tag}] has claimed ${zone.name}!`
      : `💪 Outstanding set! Earned +${points} points for ${zone.name}!`,
  });
}
