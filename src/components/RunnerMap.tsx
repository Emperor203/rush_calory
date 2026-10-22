'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { RouteResult } from '@/lib/routing';

interface RunnerMapProps {
  startPos: [number, number];
  onStartPosChange: (pos: [number, number]) => void;
  route: RouteResult | null;
  mapStyle: 'dark' | 'satellite' | 'streets';
  liveRunnerPos?: [number, number] | null;
  traversedCoords?: [number, number][];
  isTrackingActive?: boolean;
}

const DynamicRunnerMap = dynamic(() => import('./RunnerMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0A0E17] text-gray-400 gap-3">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-mono font-semibold tracking-wider text-emerald-400">
        ЗАГРУЗКА СПУТНИКОВЫХ КАРТ & GPS...
      </p>
    </div>
  ),
});

export default function RunnerMap(props: RunnerMapProps) {
  return <DynamicRunnerMap {...props} />;
}
