'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiFetch } from '@/lib/api';
import { User, Shield, Flame, MapPin, CheckCircle, Clock } from 'lucide-react';

export default function ProfilePage() {
  const { user, token } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      Promise.all([
        apiFetch<any>('/users/profile', {}, token),
        apiFetch<any[]>('/workouts/my?limit=20', {}, token),
      ])
        .then(([pData, wData]) => {
          setProfile(pData);
          setWorkouts(wData);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [token]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <User className="w-12 h-12 text-gray-500 mb-3" />
        <h2 className="text-xl font-bold text-white">Sign In Required</h2>
        <p className="text-xs text-gray-400 mt-1">Please sign in to view your athlete profile and workout logs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Card */}
      <div className="bg-turf-card/80 border border-turf-border rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">{user.username}</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/50 text-blue-300 border border-blue-600/30">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
            </div>
          </div>

          {/* Clan Badge */}
          {user.clan ? (
            <div
              className="p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold"
              style={{
                borderColor: `${user.clan.colorHex}60`,
                backgroundColor: `${user.clan.colorHex}15`,
                color: user.clan.colorHex,
              }}
            >
              <Shield className="w-4 h-4" />
              <span>[{user.clan.tag}] {user.clan.name}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-500 italic">No clan affiliation</span>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-turf-border">
          <div className="bg-turf-surface/60 p-3.5 rounded-xl border border-turf-border">
            <span className="text-gray-400 text-xs block">Total Battle Score</span>
            <strong className="text-2xl font-black text-amber-400 flex items-center gap-1.5 mt-1">
              <Flame className="w-5 h-5 text-amber-500" />
              {user.totalPoints.toLocaleString()} pts
            </strong>
          </div>
          <div className="bg-turf-surface/60 p-3.5 rounded-xl border border-turf-border">
            <span className="text-gray-400 text-xs block">Workouts Logged</span>
            <strong className="text-2xl font-black text-blue-400 flex items-center gap-1.5 mt-1">
              <Clock className="w-5 h-5 text-blue-500" />
              {workouts.length} sets
            </strong>
          </div>
        </div>
      </div>

      {/* Workout History */}
      <div className="bg-turf-card/80 border border-turf-border rounded-2xl p-6 shadow-2xl">
        <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          Recent Workout Sessions
        </h3>

        {workouts.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">
            No workouts logged yet. Head over to the Tactical Map to capture your first spot!
          </p>
        ) : (
          <div className="space-y-2.5">
            {workouts.map((w) => (
              <div
                key={w.id}
                className="p-3 rounded-xl bg-turf-surface/60 border border-turf-border flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {w.zone?.name || 'Workout Base'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {w.exerciseType.replace('_', ' ')}: <strong className="text-gray-200">{w.repsOrMeters} reps</strong> •{' '}
                    {new Date(w.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {w.verifiedByGps && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> GPS Verified
                    </span>
                  )}
                  <span className="font-mono font-bold text-amber-400">
                    +{w.earnedPoints} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
