'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const DynamicTurfMap = dynamic(() => import('./TurfMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-turf-dark text-gray-400 gap-3">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-medium">Initializing GPS Satellite & Tactical Map...</p>
    </div>
  ),
});

export default function TurfMap() {
  return <DynamicTurfMap />;
}
