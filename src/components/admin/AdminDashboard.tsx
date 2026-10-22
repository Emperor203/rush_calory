'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { DashboardStats, Zone, UserRole } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import {
  ShieldAlert,
  Users,
  Flame,
  MapPin,
  Trophy,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Activity,
  Layers,
} from 'lucide-react';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AdminDashboard() {
  const { token, user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [zonesList, setZonesList] = useState<Zone[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'zones' | 'users'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // New Zone Form State
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    description: '',
    latitude: 41.3111,
    longitude: 69.2797,
    radiusMeters: 50,
    requiredPoints: 500,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData, zonesData] = await Promise.all([
        apiFetch<DashboardStats>('/admin/dashboard', {}, token),
        apiFetch<any>('/admin/users?limit=30', {}, token),
        apiFetch<Zone[]>('/zones', {}, token),
      ]);
      setStats(statsData);
      setUsersList(usersData.items || []);
      setZonesList(zonesData);
    } catch (e) {
      console.error('Error fetching admin data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const handleToggleBan = async (targetUserId: string, currentBanned: boolean) => {
    try {
      await apiFetch(
        `/admin/users/${targetUserId}/ban`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isBanned: !currentBanned }),
        },
        token,
      );
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(
        '/zones',
        {
          method: 'POST',
          body: JSON.stringify(zoneForm),
        },
        token,
      );
      setIsAddZoneOpen(false);
      setZoneForm({
        name: '',
        description: '',
        latitude: 41.3111,
        longitude: 69.2797,
        radiusMeters: 50,
        requiredPoints: 500,
      });
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workout zone?')) return;
    try {
      await apiFetch(`/zones/${id}`, { method: 'DELETE' }, token);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black text-white">Administrator Access Required</h2>
        <p className="text-gray-400 text-sm max-w-md mt-2">
          You must be authenticated with an account holding the <strong>ADMIN</strong> role. Try using the quick "Login as Admin" button in the sign-in modal.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-turf-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <h1 className="text-2xl font-black text-white tracking-wide">
              ADMIN CONTROL CENTER
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real-time geospatial analytics, player moderation, and workout base management.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-2 bg-turf-card p-1 rounded-xl border border-turf-border">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Overview Analytics
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'zones' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Turf Bases ({zonesList.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Athletes ({usersList.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'overview' && stats ? (
        <>
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-turf-card/60 border border-turf-border p-4 rounded-2xl">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                <span>Total Athletes</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {stats.overview.totalUsers}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                Active in turf wars
              </div>
            </div>

            <div className="bg-turf-card/60 border border-turf-border p-4 rounded-2xl">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                <span>Active Clans</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {stats.overview.totalClans}
              </div>
              <div className="text-[11px] text-amber-400 mt-1 font-medium">
                Competing for territory
              </div>
            </div>

            <div className="bg-turf-card/60 border border-turf-border p-4 rounded-2xl">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                <span>Workout Zones</span>
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {stats.overview.totalZones}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {stats.overview.capturedZones} captured / {stats.overview.contestedZones} contested
              </div>
            </div>

            <div className="bg-turf-card/60 border border-turf-border p-4 rounded-2xl">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                <span>Workouts Completed</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {stats.overview.totalWorkouts}
              </div>
              <div className="text-[11px] text-rose-400 mt-1 font-medium">
                +{stats.overview.totalPointsEarned.toLocaleString()} total pts
              </div>
            </div>
          </div>

          {/* Recharts Data Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Trends Chart */}
            <div className="lg:col-span-2 bg-turf-card/80 border border-turf-border p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-white">Daily Workout & Points Volume</h3>
                  <p className="text-[11px] text-gray-400">Activity logged over the last 7 days</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailyTrends}>
                    <defs>
                      <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} />
                    <YAxis stroke="#9CA3AF" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                      itemStyle={{ color: '#93C5FD', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="points"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPoints)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Exercise Breakdown Pie */}
            <div className="bg-turf-card/80 border border-turf-border p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-white mb-1">Exercise Breakdown</h3>
                <p className="text-[11px] text-gray-400 mb-4">Distribution by discipline</p>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.exerciseDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {stats.exerciseDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-turf-border text-[11px]">
                {stats.exerciseDistribution.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-gray-300">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="truncate">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Clan Power Leaderboard Bar Chart */}
          <div className="bg-turf-card/80 border border-turf-border p-5 rounded-2xl">
            <h3 className="font-bold text-sm text-white mb-1">Top Clans Battlefield Score</h3>
            <p className="text-[11px] text-gray-400 mb-4">Total score accumulated through territory defense & workouts</p>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topClans}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} />
                  <YAxis stroke="#9CA3AF" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#FCD34D', fontSize: '12px' }}
                  />
                  <Bar dataKey="totalScore" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Conquest History */}
          <div className="bg-turf-card/80 border border-turf-border p-5 rounded-2xl">
            <h3 className="font-bold text-sm text-white mb-3">Live Territory Conquest Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-turf-border text-gray-400">
                    <th className="pb-2">Zone Name</th>
                    <th className="pb-2">Previous Clan</th>
                    <th className="pb-2">New Ruler</th>
                    <th className="pb-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-turf-border text-gray-300">
                  {stats.recentCaptures.map((log) => (
                    <tr key={log.id} className="hover:bg-turf-surface/50">
                      <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        {log.zone?.name || 'Workout Spot'}
                      </td>
                      <td className="py-2.5 text-gray-400">
                        {log.previousClan ? `[${log.previousClan.tag}] ${log.previousClan.name}` : 'Neutral Territory'}
                      </td>
                      <td className="py-2.5 font-semibold" style={{ color: log.newClan?.colorHex }}>
                        [{log.newClan?.tag}] {log.newClan?.name}
                      </td>
                      <td className="py-2.5 text-gray-400">
                        {new Date(log.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'zones' ? (
        /* Zones Management Tab */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Geospatial Workout Bases</h2>
            <button
              onClick={() => setIsAddZoneOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
            >
              <Plus className="w-4 h-4" />
              Add Workout Spot
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zonesList.map((z) => (
              <div
                key={z.id}
                className="bg-turf-card/70 border border-turf-border p-4 rounded-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-white">{z.name}</h4>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                      style={{ backgroundColor: z.controllingClan?.colorHex || '#6B7280' }}
                    >
                      {z.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{z.description || 'No description'}</p>

                  <div className="mt-3 space-y-1 text-xs text-gray-300">
                    <div>GPS: <span className="font-mono text-gray-400">{z.latitude.toFixed(4)}, {z.longitude.toFixed(4)}</span></div>
                    <div>Radius: <span className="font-semibold text-white">{z.radiusMeters}m</span></div>
                    <div>Points: <span className="font-semibold text-amber-400">{z.capturePoints} / {z.requiredPoints}</span></div>
                    <div>Ruler: <strong className="text-white">{z.controllingClan?.name || 'Neutral'}</strong></div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-turf-border flex justify-end gap-2">
                  <button
                    onClick={() => handleDeleteZone(z.id)}
                    className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                    title="Delete Zone"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Zone Modal */}
          {isAddZoneOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-turf-surface border border-turf-border rounded-2xl p-6 max-w-md w-full text-white shadow-2xl">
                <h3 className="font-bold text-base mb-4">Deploy New Workout Base</h3>
                <form onSubmit={handleCreateZone} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-300 mb-1">Base Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Navruz Calisthenics Hub"
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                      className="w-full bg-turf-card border border-turf-border rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Description</label>
                    <textarea
                      placeholder="Equipment and spot features..."
                      value={zoneForm.description}
                      onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                      className="w-full bg-turf-card border border-turf-border rounded-xl px-3 py-2 text-white h-20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-300 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={zoneForm.latitude}
                        onChange={(e) => setZoneForm({ ...zoneForm, latitude: parseFloat(e.target.value) })}
                        className="w-full bg-turf-card border border-turf-border rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={zoneForm.longitude}
                        onChange={(e) => setZoneForm({ ...zoneForm, longitude: parseFloat(e.target.value) })}
                        className="w-full bg-turf-card border border-turf-border rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-300 mb-1">Radius (meters)</label>
                      <input
                        type="number"
                        min="20"
                        max="500"
                        value={zoneForm.radiusMeters}
                        onChange={(e) => setZoneForm({ ...zoneForm, radiusMeters: parseInt(e.target.value, 10) })}
                        className="w-full bg-turf-card border border-turf-border rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Required Points</label>
                      <input
                        type="number"
                        min="100"
                        value={zoneForm.requiredPoints}
                        onChange={(e) => setZoneForm({ ...zoneForm, requiredPoints: parseInt(e.target.value, 10) })}
                        className="w-full bg-turf-card border border-turf-border rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsAddZoneOpen(false)}
                      className="flex-1 py-2 rounded-xl bg-turf-card hover:bg-turf-border text-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white transition"
                    >
                      Create Base
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Users Moderation Tab */
        <div className="bg-turf-card/80 border border-turf-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-turf-border flex justify-between items-center">
            <h3 className="font-bold text-sm text-white">Athletes Roster & Moderation</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-turf-dark/50 text-gray-400">
                <tr>
                  <th className="p-3">Athlete</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Clan</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-turf-border text-gray-300">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-turf-surface/40">
                    <td className="p-3">
                      <div className="font-bold text-white">{u.username}</div>
                      <div className="text-[10px] text-gray-500">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/50 text-blue-300 border border-blue-600/30">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.clan ? (
                        <span style={{ color: u.clan.colorHex }} className="font-semibold">
                          [{u.clan.tag}] {u.clan.name}
                        </span>
                      ) : (
                        <span className="text-gray-500">Free Agent</span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-400">
                      {u.totalPoints} pts
                    </td>
                    <td className="p-3">
                      {u.isBanned ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Banned
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleBan(u.id, u.isBanned)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                            u.isBanned
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-900/80'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-600/40 hover:bg-rose-900/80'
                          }`}
                        >
                          {u.isBanned ? 'Unban User' : 'Ban User'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
