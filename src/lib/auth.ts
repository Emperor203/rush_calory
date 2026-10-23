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
  hasStreetPass?: boolean;
  streetPassPlan?: 'monthly' | 'season' | 'trial' | null;
  streetPassExpiresAt?: number | null;
  mvpAnthemUrl?: string | null;
  mvpAnthemName?: string | null;
  neonTrailColor?: string | null;
}

const STORAGE_KEY = 'runner_google_user';
const CLIENT_ID_KEY = 'google_client_id';

export function getSavedGoogleUser(): GoogleUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user: GoogleUser = JSON.parse(raw);
    return user;
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

export const DEFAULT_GOOGLE_CLIENT_ID =
  '551041011149-b1u7ujpt1ni7psmvda2jup81vsd4qi29.apps.googleusercontent.com';

export function getStoredGoogleClientId(): string {
  if (typeof window === 'undefined') return DEFAULT_GOOGLE_CLIENT_ID;
  return (
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    localStorage.getItem(CLIENT_ID_KEY) ||
    DEFAULT_GOOGLE_CLIENT_ID
  );
}

export function saveStoredGoogleClientId(clientId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
}

/**
 * Loads official Google Identity Services client script
 */
export function loadGoogleGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).google?.accounts) return resolve();

    const existingScript = document.getElementById('google-gsi-client');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

/**
 * Trigger Real Google OAuth 2.0 Popup Window
 */
export async function triggerRealGoogleOAuth(
  clientId: string,
  onSuccess: (user: GoogleUser) => void,
  onError: (err: string) => void,
  userWeight = 70,
): Promise<void> {
  try {
    await loadGoogleGsiScript();
    const google = (window as any).google;

    if (!google?.accounts?.oauth2) {
      return onError('Google Identity Services SDK не загрузился.');
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid profile email',
      callback: async (tokenResponse: any) => {
        if (tokenResponse.error) {
          return onError(`Ошибка Google OAuth: ${tokenResponse.error}`);
        }

        try {
          // Fetch genuine user profile directly from Google servers
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          });

          if (!res.ok) {
            throw new Error(`Google API error ${res.status}`);
          }

          const info = await res.json();

          const welcomeExpiry = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 days Welcome Street Pass
          const googleUser: GoogleUser = {
            id: info.sub || `google-${Date.now()}`,
            name: info.name || info.given_name || 'Google Athlete',
            email: info.email,
            avatar:
              info.picture ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(info.name || 'User')}`,
            weightKg: userWeight,
            totalCaloriesBurned: 0,
            totalKmRun: 0,
            completedRunsCount: 0,
            joinedAt: new Date().toISOString(),
            hasStreetPass: true,
            streetPassPlan: 'trial',
            streetPassExpiresAt: welcomeExpiry,
            neonTrailColor: '#C6FF33',
            mvpAnthemName: 'Cyberpunk Phonk (Neon Drift)',
            mvpAnthemUrl: '/sounds/anthem-drift.mp3',
          };

          saveGoogleUser(googleUser);
          onSuccess(googleUser);
        } catch (fetchErr: any) {
          onError(`Не удалось получить данные профиля: ${fetchErr.message}`);
        }
      },
    });

    // Opens the genuine accounts.google.com popup window!
    tokenClient.requestAccessToken();
  } catch (err: any) {
    onError(err.message || 'Ошибка открытия окна Google');
  }
}
