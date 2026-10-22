export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] array for Leaflet
  distanceKm: number;
  durationMinutes: number;
  caloriesBurned: number;
  kilometersMarkers: { km: number; coord: [number, number] }[];
  steps: { instruction: string; distanceMeters: number }[];
  isParkRoute?: boolean;
}

/**
 * Formula: Distance (km) = Calories / (Weight_kg * 1.036)
 */
export function calculateTargetDistanceKm(calories: number, weightKg: number): number {
  if (weightKg <= 0) weightKg = 70;
  const km = calories / (weightKg * 1.036);
  return Math.round(km * 10) / 10;
}

/**
 * Calculates Destination Point given start point, distance (meters), and bearing (degrees)
 */
function getDestinationPoint(
  lat: number,
  lon: number,
  distanceMeters: number,
  bearingDeg: number,
): [number, number] {
  const R = 6371000; // Earth radius in meters
  const δ = distanceMeters / R;
  const θ = (bearingDeg * Math.PI) / 180;

  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;

  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * Math.sin(δ) * Math.cos(φ1);
  const x = Math.cos(δ) - Math.sin(φ1) * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return [(φ2 * 180) / Math.PI, (λ2 * 180) / Math.PI];
}

/**
 * Calculates geodesic distance between two points in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates a closed loop running route via OSRM Foot API
 */
export async function generateLoopRoute(
  startLat: number,
  startLon: number,
  targetKm: number,
  weightKg: number,
  paceMinPerKm: number = 5.5,
  bearingOffset: number = 45,
  preferParks: boolean = false,
): Promise<RouteResult> {
  const targetPerimeterMeters = targetKm * 1000;

  // If preferParks is enabled, build a multi-node scenic loop with pedestrian parkway curvature
  let waypoints: string;
  if (preferParks) {
    const legDistance = targetPerimeterMeters / (4.2 * 1.3);
    const angle1 = bearingOffset;
    const angle2 = (bearingOffset + 85) % 360;
    const angle3 = (bearingOffset + 180) % 360;

    const wp1 = getDestinationPoint(startLat, startLon, legDistance, angle1);
    const wp2 = getDestinationPoint(startLat, startLon, legDistance * 1.15, angle2);
    const wp3 = getDestinationPoint(startLat, startLon, legDistance * 0.9, angle3);

    waypoints = [
      `${startLon},${startLat}`,
      `${wp1[1]},${wp1[0]}`,
      `${wp2[1]},${wp2[0]}`,
      `${wp3[1]},${wp3[0]}`,
      `${startLon},${startLat}`,
    ].join(';');
  } else {
    const legDistance = targetPerimeterMeters / (3.2 * 1.25);
    const angle1 = bearingOffset;
    const angle2 = (bearingOffset + 110) % 360;

    const wp1 = getDestinationPoint(startLat, startLon, legDistance, angle1);
    const wp2 = getDestinationPoint(startLat, startLon, legDistance, angle2);

    waypoints = [
      `${startLon},${startLat}`,
      `${wp1[1]},${wp1[0]}`,
      `${wp2[1]},${wp2[0]}`,
      `${startLon},${startLat}`,
    ].join(';');
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${waypoints}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(osrmUrl);
    if (!res.ok) {
      throw new Error(`OSRM responded with status ${res.status}`);
    }

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found from routing engine');
    }

    const primaryRoute = data.routes[0];
    const actualDistanceMeters = primaryRoute.distance;
    const actualDistanceKm = Math.round((actualDistanceMeters / 1000) * 10) / 10;

    // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
    const leafletCoords: [number, number][] = primaryRoute.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]],
    );

    // Extract turn-by-turn guidance steps
    const steps: { instruction: string; distanceMeters: number }[] = [];
    if (primaryRoute.legs) {
      primaryRoute.legs.forEach((leg: any) => {
        if (leg.steps) {
          leg.steps.forEach((s: any) => {
            if (s.maneuver && s.name) {
              steps.push({
                instruction: `${s.maneuver.type} onto ${s.name || 'Footpath'}`,
                distanceMeters: Math.round(s.distance),
              });
            }
          });
        }
      });
    }

    // Extract kilometer split markers along the route
    const kilometersMarkers: { km: number; coord: [number, number] }[] = [];
    let accumulatedMeters = 0;
    let nextKmTarget = 1000;

    for (let i = 0; i < leafletCoords.length - 1; i++) {
      const p1 = leafletCoords[i];
      const p2 = leafletCoords[i + 1];
      const segmentDist = haversineDistance(p1[0], p1[1], p2[0], p2[1]);
      accumulatedMeters += segmentDist;

      if (accumulatedMeters >= nextKmTarget) {
        kilometersMarkers.push({
          km: nextKmTarget / 1000,
          coord: p2,
        });
        nextKmTarget += 1000;
      }
    }

    const durationMinutes = Math.round(actualDistanceKm * paceMinPerKm);
    const caloriesBurned = Math.round(actualDistanceKm * weightKg * 1.036);

    return {
      coordinates: leafletCoords,
      distanceKm: actualDistanceKm,
      durationMinutes,
      caloriesBurned,
      kilometersMarkers,
      steps: steps.slice(0, 10),
      isParkRoute: preferParks,
    };
  } catch (err) {
    console.warn('OSRM service fallback to geometric path:', err);
    // Fallback: smooth geometric loop if OSRM is unreachable
    return createGeometricFallbackLoop(
      startLat,
      startLon,
      targetKm,
      weightKg,
      paceMinPerKm,
      bearingOffset,
    );
  }
}

/**
 * Fallback generator when public OSRM is offline or rate-limited
 */
function createGeometricFallbackLoop(
  startLat: number,
  startLon: number,
  targetKm: number,
  weightKg: number,
  paceMinPerKm: number,
  bearingOffset: number,
): RouteResult {
  const points: [number, number][] = [];
  const totalRadius = (targetKm * 1000) / (2 * Math.PI);
  const stepsCount = 36;

  for (let i = 0; i <= stepsCount; i++) {
    const angle = (bearingOffset + (i / stepsCount) * 360) % 360;
    const r = totalRadius * (1 + 0.25 * Math.sin((i / stepsCount) * Math.PI * 2));
    points.push(getDestinationPoint(startLat, startLon, r, angle));
  }

  const durationMinutes = Math.round(targetKm * paceMinPerKm);
  const caloriesBurned = Math.round(targetKm * weightKg * 1.036);

  return {
    coordinates: points,
    distanceKm: targetKm,
    durationMinutes,
    caloriesBurned,
    kilometersMarkers: [],
    steps: [{ instruction: 'Follow generated scenic loop track', distanceMeters: targetKm * 1000 }],
  };
}

/**
 * Builds standard GPX XML content for sport watches & Strava
 */
export function exportToGPX(route: RouteResult, routeName = 'Calorie Runner Route'): string {
  const gpxPoints = route.coordinates
    .map(
      ([lat, lon]) => `      <trkpt lat="${lat}" lon="${lon}">
        <ele>0</ele>
      </trkpt>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CalorieToRouteRunner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${routeName}</name>
    <desc>Distance: ${route.distanceKm}km, Calories: ${route.caloriesBurned}kcal</desc>
  </metadata>
  <trk>
    <name>${routeName}</name>
    <trkseg>
${gpxPoints}
    </trkseg>
  </trk>
</gpx>`;
}
