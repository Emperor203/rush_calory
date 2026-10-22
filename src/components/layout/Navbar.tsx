'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { Swords, Map, Shield, Trophy, LayoutDashboard, User, LogOut, LogIn } from 'lucide-react';
import AuthModal from '../auth/AuthModal';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const navItems = [
    { label: 'Tactical Map', href: '/map', icon: Map },
    { label: 'Clans', href: '/clans', icon: Shield },
    { label: 'Athletes', href: '/leaderboard', icon: Trophy },
    { label: 'Admin', href: '/admin', icon: LayoutDashboard },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-turf-dark/95 backdrop-blur border-b border-turf-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/map" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-lg tracking-wider text-white flex items-center gap-1">
                TURF <span className="text-blue-500">WARS</span>
              </span>
              <span className="text-[10px] text-gray-400 block -mt-1 font-mono uppercase">
                Sport Turf Conquest
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-turf-card text-blue-400 border border-blue-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-turf-card/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: User or Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Clan Badge */}
                {user.clan && (
                  <div
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                    style={{
                      borderColor: `${user.clan.colorHex}60`,
                      backgroundColor: `${user.clan.colorHex}20`,
                      color: user.clan.colorHex,
                    }}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>[{user.clan.tag}] {user.clan.name}</span>
                  </div>
                )}

                {/* Score */}
                <div className="flex items-center gap-1 px-3 py-1 bg-turf-card rounded-lg border border-turf-border text-xs">
                  <span className="text-amber-400 font-bold">⚡ {user.totalPoints}</span>
                  <span className="text-gray-400 text-[10px]">pts</span>
                </div>

                {/* Username */}
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-200 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-turf-card transition"
                >
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="max-w-[100px] truncate">{user.username}</span>
                </Link>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-turf-card transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Play</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
