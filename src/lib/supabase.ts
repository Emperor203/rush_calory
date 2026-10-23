import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hbzoiltldxlbjwskfebw.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_6XeS-WnwTvFFEMzTQzM_JQ_gfCK2yte';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface LiveOnlineRunner {
  id: string;
  name: string;
  email: string;
  avatar: string;
  lat: number;
  lng: number;
  speedKmh?: number;
  caloriesBurned?: number;
  isTracking?: boolean;
  onlineAt: string;
  lastSeen?: number;
}
