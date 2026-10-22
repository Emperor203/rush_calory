'use client';

import React, { useEffect, useState } from 'react';
import TurfMap from '@/components/map/TurfMap';
import WorkoutModal from '@/components/workout/WorkoutModal';
import { useTurfStore } from '@/stores/useTurfStore';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  Crosshair,
  Flame,
  Shield,
  Zap,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export default function MapPage() {
  const {
    fetchZones,
    initSocket,
    zones,
    selectedZone,
    selectZone,
    setWorkoutModalOpen,
    setUserCoords,
    userCoords,
    latestConquest,
    clearLatestConquest,
    activityFeed,
  } = useTurfStore();

  const { loadProfile } = useAuthStore();
  const [isFeedOpen, setIsFeedOpen] = useState(true);

  useEffect(() => {
    fetchZones();
    initSocket();
    loadProfile();

    // Check browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn('Geolocation denied or unavailable:', err.message);
        },
      );
    }
  }, []);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserCoords([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      {/* Map Canvas */}
      <div className="absolute inset-0 z-0">
        <TurfMap />
      </div>

      {/* Conquest Banner (Realtime Push from WebSocket) */}
      {latestConquest && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-md w-full px-4 animate-bounce">
          <div
            className="p-3.5 rounded-2xl shadow-2xl border flex items-center justify-between text-white"
            style={{
              backgroundColor: '#0F172Aee',
              borderColor: latestConquest.clanColor,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
                style={{ backgroundColor: latestConquest.clanColor }}
              >
                {latestConquest.clanTag}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Territory Captured!
                </div>
                <div className="text-sm font-bold">
                  {latestConquest.zoneName}
                </div>
              </div>
            </div>
            <button
              onClick={clearLatestConquest}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating GPS Target Button */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          className="p-3 bg-turf-card/90 hover:bg-turf-card border border-turf-border rounded-xl text-white shadow-xl backdrop-blur transition"
          title="Locate my physical position"
        >
          <Crosshair className="w-5 h-5 text-blue-400" />
        </button>
      </div>

      {/* Floating Live Activity Feed Widget */}
      <div className="hidden sm:block absolute bottom-6 left-6 z-20 max-w-sm w-full">
        <div className="bg-turf-dark/90 border border-turf-border rounded-2xl p-3.5 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between pb-2 border-b border-turf-border mb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Live Turf Activity
              </span>
            </div>
            <button
              onClick={() => setIsFeedOpen(!isFeedOpen)}
              className="text-[11px] text-gray-400 hover:text-white"
            >
              {isFeedOpen ? 'Hide' : 'Show'}
            </button>
          </div>

          {isFeedOpen && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {activityFeed.length === 0 ? (
                <div className="text-gray-500 text-center py-3">
                  Awaiting athlete check-ins in the city...
                </div>
              ) : (
                activityFeed.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-turf-card/60 border border-turf-border/60 flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-white flex items-center gap-1.5 truncate">
                        {item.clanTag && (
                          <span
                            className="px-1 py-0.5 rounded text-[9px] font-bold"
                            style={{ backgroundColor: `${item.clanColor}30`, color: item.clanColor }}
                          >
                            {item.clanTag}
                          </span>
                        )}
                        <span className="truncate">{item.username}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {item.exerciseType.replace('_', ' ')} • {item.zoneName}
                      </div>
                    </div>
                    <div className="text-amber-400 font-bold shrink-0">
                      +{item.earnedPoints} pts
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Spot Bottom Bar */}
      {selectedZone && (
        <div className="absolute bottom-6 right-6 z-20 max-w-sm w-full animate-slide-up">
          <div className="bg-turf-dark/95 border border-turf-border rounded-2xl p-4 shadow-2xl backdrop-blur text-white">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                  Target Workout Base
                </span>
                <h3 className="font-black text-base mt-0.5">{selectedZone.name}</h3>
              </div>
              <button
                onClick={() => selectZone(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {selectedZone.description || 'Calisthenics workout base'}
            </p>

            {/* Clan Controller */}
            <div className="mt-3 p-2.5 rounded-xl bg-turf-card border border-turf-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Shield
                  className="w-4 h-4"
                  style={{ color: selectedZone.controllingClan?.colorHex || '#9CA3AF' }}
                />
                <span className="font-semibold">
                  {selectedZone.controllingClan
                    ? `[${selectedZone.controllingClan.tag}] ${selectedZone.controllingClan.name}`
                    : 'Neutral Ground'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-amber-400">
                {selectedZone.capturePoints} / {selectedZone.requiredPoints} pts
              </div>
            </div>

            <button
              onClick={() => setWorkoutModalOpen(true)}
              className="w-full mt-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              <span>Train Here & Claim Turf</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal for Recording Workout at Current Selected Spot */}
      <WorkoutModal />
    </div>
  );
}
