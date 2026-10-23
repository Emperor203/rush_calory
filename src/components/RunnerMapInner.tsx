'use client';

import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { RouteResult } from '@/lib/routing';
import { LiveOnlineRunner } from '@/lib/supabase';
import { GoogleUser } from '@/lib/auth';

// Fix standard Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RunnerMapProps {
  startPos: [number, number];
  onStartPosChange: (pos: [number, number]) => void;
  route: RouteResult | null;
  mapStyle: 'dark' | 'satellite' | 'streets';
  liveRunnerPos?: [number, number] | null;
  traversedCoords?: [number, number][];
  isTrackingActive?: boolean;
  onlineRunners?: LiveOnlineRunner[];
  currentUser?: GoogleUser | null;
}

function MapViewController({
  startPos,
  route,
  liveRunnerPos,
  isTrackingActive,
}: {
  startPos: [number, number];
  route: RouteResult | null;
  liveRunnerPos?: [number, number] | null;
  isTrackingActive?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (isTrackingActive && liveRunnerPos) {
      map.panTo(liveRunnerPos, { animate: true });
    } else if (route && route.coordinates.length > 0) {
      const bounds = L.latLngBounds(route.coordinates);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (startPos) {
      map.setView(startPos, map.getZoom() || 14);
    }
  }, [route, startPos, liveRunnerPos, isTrackingActive, map]);

  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (pos: [number, number]) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function RunnerMapInner({
  startPos,
  onStartPosChange,
  route,
  mapStyle,
  liveRunnerPos,
  traversedCoords = [],
  isTrackingActive = false,
  onlineRunners = [],
  currentUser = null,
}: RunnerMapProps) {
  const isPassActive = Boolean(
    currentUser?.hasStreetPass &&
    currentUser.streetPassExpiresAt &&
    currentUser.streetPassExpiresAt > Date.now()
  );

  // Custom Runner Start/Finish Pin Icon with Current User Avatar (Pure Lime & Black)
  const startIcon = useMemo(
    () =>
      L.divIcon({
        className: 'custom-start-marker',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="absolute -top-7 px-2.5 py-0.5 rounded-full ${isPassActive ? 'bg-[#C6FF33] text-[#000000] border-2 border-[#7D39EB]' : 'bg-[#000000] border-2 border-[#C6FF33] text-[#C6FF33]'} text-[10px] font-black tracking-wide whitespace-nowrap shadow-xl flex items-center gap-1 z-20 font-mono">
              <span>${isPassActive ? '⚡' : '🏁'}</span>
              <span>${currentUser?.name ? `ВЫ (${currentUser.name})` : 'Старт'}${isPassActive ? ' // PASS' : ''}</span>
            </div>
            <div class="relative">
              <div class="absolute -inset-1.5 rounded-full ${isPassActive ? 'bg-[#7D39EB]' : 'bg-[#C6FF33]'} opacity-70 animate-ping"></div>
              <div class="w-10 h-10 rounded-full overflow-hidden border-2 ${isPassActive ? 'border-[#C6FF33] ring-4 ring-[#7D39EB]' : 'border-[#C6FF33] ring-2 ring-[#C6FF33]/50'} bg-[#000000] shadow-2xl flex items-center justify-center">
                ${
                  currentUser?.avatar
                    ? `<img src="${currentUser.avatar}" class="w-full h-full object-cover" />`
                    : `<span class="text-xs font-black text-[#C6FF33]">🏁</span>`
                }
              </div>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    [currentUser, isPassActive],
  );

  // Active Live Runner Location Beacon Icon with Current User Avatar (Pure Lime with Black text)
  const liveRunnerIcon = useMemo(
    () =>
      L.divIcon({
        className: 'custom-live-runner-marker',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="absolute -top-7 px-2.5 py-0.5 rounded-full ${isPassActive ? 'bg-[#7D39EB] text-white border-2 border-[#C6FF33]' : 'bg-[#C6FF33] text-[#000000]'} text-[10px] font-black tracking-wider uppercase shadow-xl whitespace-nowrap z-20 font-mono">
              ${isPassActive ? '⚡ ' : ''}ВЫ (${currentUser?.name || 'Бег'})
            </div>
            <div class="relative">
              <div class="absolute -inset-2 rounded-full ${isPassActive ? 'bg-[#C6FF33]' : 'bg-[#C6FF33]'} opacity-80 animate-ping"></div>
              <div class="w-11 h-11 rounded-full overflow-hidden border-2 ${isPassActive ? 'border-[#C6FF33] ring-4 ring-[#C6FF33]' : 'border-[#FFFFFF] ring-2 ring-[#C6FF33]'} bg-[#000000] shadow-2xl flex items-center justify-center">
                ${
                  currentUser?.avatar
                    ? `<img src="${currentUser.avatar}" class="w-full h-full object-cover" />`
                    : `<span class="text-xs font-black text-[#C6FF33]">🏃‍♂️</span>`
                }
              </div>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      }),
    [currentUser, isPassActive],
  );

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={startPos}
        zoom={14}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapViewController
          startPos={startPos}
          route={route}
          liveRunnerPos={liveRunnerPos}
          isTrackingActive={isTrackingActive}
        />
        {!isTrackingActive && <MapClickHandler onMapClick={onStartPosChange} />}

        {/* Dynamic Tile Layer (100% Free, No API Key Required) */}
        {mapStyle === 'satellite' ? (
          <TileLayer
            key="satellite"
            attribution='&copy; Esri World Imagery'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            key={mapStyle}
            className={mapStyle === 'dark' ? 'dark-tiles' : ''}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        {/* Start / Finish Point (Draggable when not actively tracking) */}
        <Marker
          position={startPos}
          icon={startIcon}
          draggable={!isTrackingActive}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              onStartPosChange([position.lat, position.lng]);
            },
          }}
        >
          <Popup>
            <div className="text-gray-900 font-bold text-xs p-1">
              🏁 Старт / Финиш маршрута
              {!isTrackingActive && (
                <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                  Перетащите маркер или кликните по карте, чтобы перенести старт
                </div>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Active Live Runner Beacon */}
        {isTrackingActive && liveRunnerPos && (
          <Marker position={liveRunnerPos} icon={liveRunnerIcon}>
            <Popup>
              <div className="text-gray-900 font-bold text-xs p-1">
                🏃 Текущее положение атлета
              </div>
            </Popup>
          </Marker>
        )}

        {/* Traversed Breadcrumb Path (Solid Lime with Black Cap) */}
        {traversedCoords.length > 1 && (
          <Polyline
            positions={traversedCoords}
            pathOptions={{
              color: '#C6FF33',
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
            }}
          />
        )}

        {/* Planned Route Polyline (Violet & Lime) */}
        {route && (
          <>
            {/* Outer Violet Contrast Border */}
            <Polyline
              positions={route.coordinates}
              pathOptions={{
                color: '#7D39EB',
                weight: 8,
                opacity: 0.7,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Inner Lime Core */}
            <Polyline
              positions={route.coordinates}
              pathOptions={{
                color: '#C6FF33',
                weight: 4,
                opacity: 1.0,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            {/* Kilometer Split Markers (Solid Violet with White Text) */}
            {route.kilometersMarkers.map((marker) => {
              const kmIcon = L.divIcon({
                className: 'custom-km-marker',
                html: `
                  <div class="px-2 py-0.5 rounded-full bg-[#7D39EB] border-2 border-[#FFFFFF] text-[#FFFFFF] font-black text-[10px] font-mono shadow-xl flex items-center justify-center">
                    ${marker.km}k
                  </div>
                `,
                iconSize: [28, 20],
                iconAnchor: [14, 10],
              });

              return (
                <Marker key={marker.km} position={marker.coord} icon={kmIcon}>
                  <Popup>
                    <div className="text-xs font-bold text-gray-900">
                      Отметка: {marker.km} км
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </>
        )}

        {/* Real-time Online Runners (Solid Violet & White) */}
        {onlineRunners.map((runner) => {
          if (!runner.lat || !runner.lng) return null;
          const peerIcon = L.divIcon({
            className: 'custom-online-runner-marker',
            html: `
              <div class="relative flex flex-col items-center cursor-pointer">
                <div class="absolute -top-7 px-2.5 py-0.5 rounded-full bg-[#000000] border-2 border-[#7D39EB] text-[#FFFFFF] text-[10px] font-bold font-mono whitespace-nowrap shadow-2xl flex items-center gap-1 z-20">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#C6FF33] animate-pulse"></span>
                  <span>${runner.name || 'Атлет'}</span>
                  ${runner.speedKmh ? `<span class="text-[#C6FF33] font-bold">• ${runner.speedKmh}км/ч</span>` : ''}
                </div>
                <div class="relative">
                  <div class="absolute -inset-1.5 rounded-full bg-[#7D39EB] opacity-60 animate-ping"></div>
                  <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-[#7D39EB] bg-[#000000] shadow-2xl flex items-center justify-center ring-2 ring-[#7D39EB]/40">
                    ${
                      runner.avatar
                        ? `<img src="${runner.avatar}" class="w-full h-full object-cover" />`
                        : `<span class="text-xs font-black text-[#FFFFFF]">${(runner.name || 'A')[0]}</span>`
                    }
                  </div>
                </div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });

          return (
            <Marker key={runner.id} position={[runner.lat, runner.lng]} icon={peerIcon}>
              <Popup>
                <div className="p-2 text-xs text-gray-900 space-y-1 min-w-[140px]">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full bg-[#C6FF33] animate-pulse"></span>
                    <span>{runner.name}</span>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    🟢 В сети прямо сейчас
                  </div>
                  {runner.speedKmh ? (
                    <div className="text-[11px] font-mono text-[#7D39EB] font-bold">
                      🏃 Скорость: {runner.speedKmh} км/ч
                    </div>
                  ) : null}
                  {runner.caloriesBurned ? (
                    <div className="text-[11px] font-mono text-amber-600 font-bold">
                      🔥 Сожжено: {runner.caloriesBurned} ккал
                    </div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
