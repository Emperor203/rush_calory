export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  weightKg?: number;
  totalCaloriesBurned?: number;
  totalKmRun?: number;
  completedRunsCount?: number;
  joinedAt: string;
}

const STORAGE_KEY = 'runner_google_user';

export function getSavedGoogleUser(): GoogleUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGoogleUser(user: GoogleUser | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Decode JWT token returned by Google Identity Services
 */
export function decodeGoogleJwt(credential: string): Partial<GoogleUser> | null {
  try {
    const parts = credential.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return {
      id: payload.sub,
      name: payload.name || payload.given_name || 'Athlete',
      email: payload.email,
      avatar: payload.picture,
    };
  } catch (e) {
    console.error('Failed to decode Google JWT', e);
    return null;
  }
}
