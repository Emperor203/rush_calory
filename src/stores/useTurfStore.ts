import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Zone, Clan } from '../lib/types';
import { apiFetch } from '../lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export interface ActivityFeedItem {
  workoutId: string;
  username: string;
  clanTag?: string;
  clanColor?: string;
  zoneName: string;
  exerciseType: string;
  repsOrMeters: number;
  earnedPoints: number;
  createdAt: string;
}

export interface CaptureNotification {
  zoneId: string;
  zoneName: string;
  clanName: string;
  clanTag: string;
  clanColor: string;
}

interface TurfState {
  zones: Zone[];
  userCoords: [number, number] | null;
  selectedZone: Zone | null;
  isWorkoutModalOpen: boolean;
  activityFeed: ActivityFeedItem[];
  latestConquest: CaptureNotification | null;
  socket: Socket | null;
  isLoading: boolean;

  fetchZones: () => Promise<void>;
  setUserCoords: (coords: [number, number]) => void;
  selectZone: (zone: Zone | null) => void;
  setWorkoutModalOpen: (open: boolean) => void;
  initSocket: () => void;
  clearLatestConquest: () => void;
}

export const useTurfStore = create<TurfState>((set, get) => ({
  zones: [],
  userCoords: [41.311081, 69.279737], // Default center Tashkent
  selectedZone: null,
  isWorkoutModalOpen: false,
  activityFeed: [],
  latestConquest: null,
  socket: null,
  isLoading: false,

  fetchZones: async () => {
    set({ isLoading: true });
    try {
      const zones = await apiFetch<Zone[]>('/zones');
      set({ zones, isLoading: false });
    } catch (e) {
      console.error('Failed to load zones', e);
      set({ isLoading: false });
    }
  },

  setUserCoords: (coords) => set({ userCoords: coords }),

  selectZone: (zone) => set({ selectedZone: zone }),

  setWorkoutModalOpen: (open) => set({ isWorkoutModalOpen: open }),

  clearLatestConquest: () => set({ latestConquest: null }),

  initSocket: () => {
    if (get().socket) return;
    try {
      const socket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 2,
        timeout: 3000,
      });

      socket.on('connect', () => {
        socket.emit('map:subscribe', {});
      });

      socket.on('connect_error', () => {
        // Silently continue with HTTP polling fallback
      });

    socket.on('zone:updated', (payload) => {
      set((state) => ({
        zones: state.zones.map((z) =>
          z.id === payload.zoneId
            ? {
                ...z,
                capturePoints: payload.capturePoints,
                requiredPoints: payload.requiredPoints,
                status: payload.status,
                controllingClanId: payload.controllingClanId,
                controllingClan: payload.controllingClan,
              }
            : z,
        ),
        selectedZone:
          state.selectedZone?.id === payload.zoneId
            ? {
                ...state.selectedZone,
                capturePoints: payload.capturePoints,
                requiredPoints: payload.requiredPoints,
                status: payload.status,
                controllingClanId: payload.controllingClanId,
                controllingClan: payload.controllingClan,
              }
            : state.selectedZone,
      }));
    });

    socket.on('zone:captured', (payload: CaptureNotification) => {
      set({ latestConquest: payload });
      // auto-dismiss conquest banner after 6 seconds
      setTimeout(() => {
        set({ latestConquest: null });
      }, 6000);
    });

    socket.on('workout:activity', (activity: ActivityFeedItem) => {
      set((state) => ({
        activityFeed: [activity, ...state.activityFeed].slice(0, 20),
      }));
    });

    set({ socket });
    } catch (e) {
      console.warn('Socket connection error', e);
    }
  },
}));
