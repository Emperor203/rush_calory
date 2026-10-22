'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Trophy, Medal, Flame, Shield, Award } from 'lucide-react';

export default function LeaderboardPage() {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<any[]>('/users/leaderboard?limit=50')
      .then((data) => setAthletes(data))
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center pb-6 border-b border-turf-border">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-lg">
          <Trophy className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-wide">
          TOP ATHLETES LEADERBOARD
        </h1>
        <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
          Rankings of the most active calisthenics athletes based on total reps, sets, and verified territory claims.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-turf-card/80 border border-turf-border rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-turf-dark/70 text-gray-400 border-b border-turf-border">
              <tr>
                <th className="p-4 w-16 text-center">Rank</th>
                <th className="p-4">Athlete</th>
                <th className="p-4">Clan Affiliation</th>
                <th className="p-4 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-turf-border text-gray-300">
              {athletes.map((athlete, idx) => {
                const isTop3 = idx < 3;
                return (
                  <tr
                    key={athlete.id}
                    className={`hover:bg-turf-surface/50 transition ${
                      idx === 0
                        ? 'bg-amber-500/5'
                        : idx === 1
                        ? 'bg-slate-300/5'
                        : idx === 2
                        ? 'bg-amber-700/5'
                        : ''
                    }`}
                  >
                    <td className="p-4 text-center font-bold">
                      {idx === 0 ? (
                        <span className="text-amber-400 text-base">🥇</span>
                      ) : idx === 1 ? (
                        <span className="text-gray-300 text-base">🥈</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600 text-base">🥉</span>
                      ) : (
                        <span className="text-gray-500 font-mono">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">
                        {athlete.username}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Joined {new Date(athlete.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      {athlete.clan ? (
                        <div
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            color: athlete.clan.colorHex,
                            backgroundColor: `${athlete.clan.colorHex}20`,
                          }}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          [{athlete.clan.tag}] {athlete.clan.name}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-[11px]">Free Agent</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sm text-amber-400">
                      {athlete.totalPoints.toLocaleString()} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
