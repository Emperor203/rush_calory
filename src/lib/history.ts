export interface CompletedWorkout {
  id: string;
  date: string; // ISO string
  distanceKm: number;
  caloriesBurned: number;
  durationSeconds: number;
  avgPaceMinPerKm: number;
}

const HISTORY_STORAGE_KEY = 'rush_calory_workout_history';

export function getWorkoutHistory(): CompletedWorkout[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCompletedWorkout(workout: CompletedWorkout): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getWorkoutHistory();
    const updated = [workout, ...existing].slice(0, 100);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save workout to history:', err);
  }
}

export function formatPace(minPerKm: number): string {
  if (!minPerKm || !isFinite(minPerKm) || minPerKm <= 0 || minPerKm > 30) return '5:30';
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatWorkoutDate(iso: string): string {
  try {
    const d = new Date(iso);
    const months = [
      'янв',
      'фев',
      'мар',
      'апр',
      'май',
      'июн',
      'июл',
      'авг',
      'сен',
      'окт',
      'ноя',
      'дек',
    ];
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${d.getDate()} ${months[d.getMonth()]}, ${hours}:${mins}`;
  } catch {
    return 'Сегодня';
  }
}
