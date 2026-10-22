'use client';

import React, { useState } from 'react';
import { useTurfStore } from '@/stores/useTurfStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { ExerciseType } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import { X, Flame, Shield, MapPin, Zap, CheckCircle2 } from 'lucide-react';

const EXERCISES: { type: ExerciseType; label: string; unit: string; multiplier: number; icon: string }[] = [
  { type: 'PULL_UPS', label: 'Подтягивания (Pull-ups)', unit: 'повторений', multiplier: 3, icon: '🏋️‍♂️' },
  { type: 'DIPS', label: 'Брусья (Dips)', unit: 'повторений', multiplier: 2, icon: '💪' },
  { type: 'PUSH_UPS', label: 'Отжимания (Push-ups)', unit: 'повторений', multiplier: 1, icon: '🔥' },
  { type: 'BURPEES', label: 'Бёрпи (Burpees)', unit: 'повторений', multiplier: 4, icon: '⚡' },
  { type: 'SQUATS', label: 'Приседания (Squats)', unit: 'повторений', multiplier: 1, icon: '🦵' },
  { type: 'RUNNING', label: 'Бег (Running)', unit: 'метров', multiplier: 0.1, icon: '🏃‍♂️' },
];

export default function WorkoutModal() {
  const { selectedZone, isWorkoutModalOpen, setWorkoutModalOpen, userCoords, setUserCoords, fetchZones } = useTurfStore();
  const { user, token, loadProfile } = useAuthStore();

  const [exercise, setExercise] = useState<ExerciseType>('PULL_UPS');
  const [reps, setReps] = useState<number>(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isWorkoutModalOpen || !selectedZone) return null;

  const currentExerciseConfig = EXERCISES.find((e) => e.type === exercise) || EXERCISES[0];
  const estimatedPoints = Math.floor(reps * currentExerciseConfig.multiplier);

  const handleSimulateGPSAtZone = () => {
    // Set user coordinates directly at the zone center for local testing
    setUserCoords([selectedZone.latitude, selectedZone.longitude]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please sign in to record workouts and capture spots!');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResultMessage(null);

    const lat = userCoords ? userCoords[0] : selectedZone.latitude;
    const lng = userCoords ? userCoords[1] : selectedZone.longitude;

    try {
      const res = await apiFetch<any>(
        '/workouts',
        {
          method: 'POST',
          body: JSON.stringify({
            zoneId: selectedZone.id,
            exerciseType: exercise,
            repsOrMeters: reps,
            userLatitude: lat,
            userLongitude: lng,
          }),
        },
        token,
      );

      setResultMessage(res.message);
      await fetchZones();
      await loadProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to submit workout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-turf-surface border border-turf-border rounded-2xl shadow-2xl p-6 text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-turf-border mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black">{selectedZone.name}</span>
              <span
                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: selectedZone.controllingClan?.colorHex || '#6B7280' }}
              >
                {selectedZone.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {selectedZone.controllingClan
                ? `Controlled by [${selectedZone.controllingClan.tag}] ${selectedZone.controllingClan.name}`
                : 'Neutral Spot — claim it for your clan!'}
            </p>
          </div>
          <button
            onClick={() => setWorkoutModalOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-turf-card transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {resultMessage && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">{resultMessage}</p>
              <button
                type="button"
                onClick={() => setWorkoutModalOpen(false)}
                className="mt-2 text-xs font-semibold text-emerald-400 hover:underline"
              >
                Return to Tactical Map →
              </button>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {!resultMessage && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* GPS Location Bar */}
            <div className="flex items-center justify-between bg-turf-card/80 p-3 rounded-xl border border-turf-border text-xs">
              <div className="flex items-center gap-2 text-gray-300">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Spot GPS: <strong className="text-white">{selectedZone.latitude.toFixed(4)}, {selectedZone.longitude.toFixed(4)}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleSimulateGPSAtZone}
                className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded border border-blue-500/40 transition"
                title="Mock GPS coordinates to be inside this zone radius for testing"
              >
                📍 Mock GPS At Spot
              </button>
            </div>

            {/* Exercise Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wide">
                Select Exercise
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EXERCISES.map((ex) => (
                  <button
                    key={ex.type}
                    type="button"
                    onClick={() => setExercise(ex.type)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                      exercise === ex.type
                        ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                        : 'bg-turf-card border-turf-border text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xl">{ex.icon}</span>
                    <div className="truncate">
                      <div className="text-xs truncate">{ex.label}</div>
                      <div className="text-[10px] text-gray-400">+{ex.multiplier} pts / {ex.unit}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reps / Meter Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                  Volume ({currentExerciseConfig.unit})
                </label>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {reps} {currentExerciseConfig.unit}
                </span>
              </div>

              <input
                type="range"
                min={exercise === 'RUNNING' ? 100 : 5}
                max={exercise === 'RUNNING' ? 10000 : 150}
                step={exercise === 'RUNNING' ? 100 : 1}
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer"
              />

              <div className="flex items-center gap-2 mt-2">
                {[10, 20, 30, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReps(exercise === 'RUNNING' ? preset * 100 : preset)}
                    className="flex-1 py-1 text-xs rounded bg-turf-card hover:bg-turf-border border border-turf-border text-gray-300"
                  >
                    {exercise === 'RUNNING' ? `${preset * 100}m` : `+${preset}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Points Summary */}
            <div className="p-3 bg-gradient-to-r from-blue-950/60 to-purple-950/60 rounded-xl border border-blue-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-gray-300">Conquest Points:</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-300">+{estimatedPoints}</span>
                <span className="text-xs text-gray-400">PTS</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Submit Reps & Attack Spot</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
