export interface GpsStatus {
  hasPermission: boolean;
  permissionState: 'granted' | 'prompt' | 'denied' | 'unsupported';
  accuracy: number | null; // in meters
  isAccurate: boolean; // accuracy <= 60m
  coords: [number, number] | null;
  speedKmh: number | null;
  errorMessage: string | null;
}

export const GPS_ACCURACY_THRESHOLD_METERS = 60;

/**
 * Checks current permission state without triggering prompt
 */
export async function getGpsPermissionState(): Promise<'granted' | 'prompt' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined' || !navigator.permissions) return 'unsupported';
  try {
    const res = await navigator.permissions.query({ name: 'geolocation' });
    return res.state;
  } catch {
    return 'prompt';
  }
}

/**
 * Validates browser geolocation with strict enableHighAccuracy
 */
export async function requestStrictGps(): Promise<GpsStatus> {
  const permState = await getGpsPermissionState();

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve({
        hasPermission: false,
        permissionState: 'unsupported',
        accuracy: null,
        isAccurate: false,
        coords: null,
        speedKmh: null,
        errorMessage: 'Geolocation API не поддерживается вашим устройством.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = Math.round(pos.coords.accuracy);
        const isAccurate = accuracy <= GPS_ACCURACY_THRESHOLD_METERS;
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const speedKmh = pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6 * 10) / 10 : 0;

        resolve({
          hasPermission: true,
          permissionState: 'granted',
          accuracy,
          isAccurate,
          coords,
          speedKmh,
          errorMessage: isAccurate
            ? null
            : `Точность GPS (±${accuracy}м) превышает лимит ±${GPS_ACCURACY_THRESHOLD_METERS}м. На ПК это нормально (геолокация по IP). На телефоне включите высокую точность GPS.`,
        });
      },
      (err) => {
        let msg = 'Доступ к геопозиции не предоставлен.';
        let state: GpsStatus['permissionState'] = permState;

        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Доступ к геолокации заблокирован в настройках браузера для localhost.';
          state = 'denied';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Служба геолокации Windows или GPS спутники недоступны. Проверьте «Параметры Windows -> Конфиденциальность -> Расположение».';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Таймаут поиска GPS спутников высокой точности.';
        }

        resolve({
          hasPermission: false,
          permissionState: state,
          accuracy: null,
          isAccurate: false,
          coords: null,
          speedKmh: null,
          errorMessage: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}
