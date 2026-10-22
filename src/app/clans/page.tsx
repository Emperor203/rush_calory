'use client';

import React, { useEffect, useState } from 'react';
import { Clan } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { Shield, Trophy, Users, Plus, Check, MapPin, Flame } from 'lucide-react';

export default function ClansPage() {
  const { user, token, loadProfile } = useAuthStore();
  const [clans, setClans] = useState<Clan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClan, setNewClan] = useState({ name: '', tag: '', colorHex: '#3B82F6' });
  const [error, setError] = useState<string | null>(null);

  const fetchClans = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<Clan[]>('/clans');
      setClans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClans();
  }, []);

  const handleJoinClan = async (clanId: string) => {
    if (!token) {
      alert('Please sign in first');
      return;
    }
    try {
      await apiFetch(`/clans/${clanId}/join`, { method: 'POST' }, token);
      await loadProfile();
      await fetchClans();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLeaveClan = async () => {
    if (!token) return;
    try {
      await apiFetch('/clans/leave', { method: 'POST' }, token);
      await loadProfile();
      await fetchClans();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await apiFetch(
        '/clans',
        {
          method: 'POST',
          body: JSON.stringify(newClan),
        },
        token,
      );
      setIsCreateOpen(false);
      setNewClan({ name: '', tag: '', colorHex: '#3B82F6' });
      await loadProfile();
      await fetchClans();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-turf-border">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            CLAN LEAGUE & ALLIANCES
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Band together with local street athletes, coordinate attacks, and conquer urban territories.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            {user.clanId ? (
              <button
                onClick={handleLeaveClan}
                className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl transition"
              >
                Leave Clan
              </button>
            ) : (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                Found a Clan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Clan Leaderboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {clans.map((clan, index) => {
          const isUserClan = user?.clanId === clan.id;
          return (
            <div
              key={clan.id}
              className="relative bg-turf-card/80 border border-turf-border rounded-2xl p-5 flex flex-col justify-between overflow-hidden shadow-xl"
            >
              {/* Top Color Accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: clan.colorHex }}
              />

              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow"
                      style={{ backgroundColor: clan.colorHex }}
                    >
                      {clan.tag}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {clan.name}
                      </h3>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        Rank #{index + 1}
                      </span>
                    </div>
                  </div>
                  {isUserClan && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-500/40">
                      Your Clan
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mt-5 p-3 rounded-xl bg-turf-surface/60 border border-turf-border text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Territories Held</span>
                    <strong className="text-emerald-400 text-sm flex items-center gap-1 font-mono">
                      <MapPin className="w-3.5 h-3.5" />
                      {clan.zonesCount} zones
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Battle Points</span>
                    <strong className="text-amber-400 text-sm flex items-center gap-1 font-mono">
                      <Flame className="w-3.5 h-3.5" />
                      {clan.totalScore.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-5 pt-3 border-t border-turf-border">
                {isUserClan ? (
                  <div className="text-xs text-center font-semibold text-emerald-400 flex items-center justify-center gap-1 py-1.5">
                    <Check className="w-4 h-4" /> Active Member
                  </div>
                ) : (
                  <button
                    onClick={() => handleJoinClan(clan.id)}
                    className="w-full py-2 bg-turf-surface hover:bg-turf-border border border-turf-border rounded-xl text-xs font-bold text-gray-200 transition"
                  >
                    Join {clan.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Found Clan Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-turf-surface border border-turf-border rounded-2xl p-6 max-w-md w-full text-white shadow-2xl">
            <h3 className="font-bold text-base mb-1">Found a New Clan</h3>
            <p className="text-xs text-gray-400 mb-4">
              Lead your crew to territory dominance in the city.
            </p>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-950/70 border border-rose-600/40 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateClan} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 mb-1">Clan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Navruz Gladiators"
                  value={newClan.name}
                  onChange={(e) => setNewClan({ ...newClan, name: e.target.value })}
                  className="w-full bg-turf-card border border-turf-border rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Clan Tag (3-4 Letters)</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="GLAD"
                  value={newClan.tag}
                  onChange={(e) => setNewClan({ ...newClan, tag: e.target.value.toUpperCase() })}
                  className="w-full bg-turf-card border border-turf-border rounded-xl px-3 py-2 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Clan Banner Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newClan.colorHex}
                    onChange={(e) => setNewClan({ ...newClan, colorHex: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-gray-400">{newClan.colorHex}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2 bg-turf-card hover:bg-turf-border rounded-xl text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded-xl shadow transition"
                >
                  Confirm & Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
