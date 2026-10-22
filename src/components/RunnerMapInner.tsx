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
}: RunnerMapProps) {
  // Custom Runner Start/Finish Pin Icon
  const startIcon = useMemo(
    () =>
      L.divIcon({
        className: 'custom-start-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-10 h-10 rounded-full bg-emerald-500 opacity-30 animate-ping"></div>
            <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
              🏁
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    [],
  );

  // Active Live Runner Location Beacon Icon
  const liveRunnerIcon = useMemo(
    () =>
      L.divIcon({
        className: 'custom-live-runner-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-12 h-12 rounded-full bg-cyan-400 opacity-40 animate-ping"></div>
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 border-2 border-white shadow-2xl flex items-center justify-center text-white font-bold text-sm">
              🏃‍♂️
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    [],
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

        {/* Traversed Breadcrumb Path (Orange/Amber) */}
        {traversedCoords.length > 1 && (
          <Polyline
            positions={traversedCoords}
            pathOptions={{
              color: '#F59E0B',
              weight: 5,
              opacity: 0.9,
              lineCap: 'round',
            }}
          />
        )}

        {/* Planned Route Polyline (Glow Effect) */}
        {route && (
          <>
            {/* Outer Glow */}
            <Polyline
              positions={route.coordinates}
              pathOptions={{
                color: route.isParkRoute ? '#10B981' : '#06B6D4',
                weight: 8,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Inner Neon Core */}
            <Polyline
              positions={route.coordinates}
              pathOptions={{
                color: route.isParkRoute ? '#34D399' : '#38BDF8',
                weight: 4,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: route.isParkRoute ? '8, 8' : undefined,
              }}
            />

            {/* Kilometer Split Markers */}
            {route.kilometersMarkers.map((marker) => {
              const kmIcon = L.divIcon({
                className: 'custom-km-marker',
                html: `
                  <div class="px-1.5 py-0.5 rounded-full ${
                    route.isParkRoute ? 'bg-emerald-600' : 'bg-cyan-600'
                  } border border-white text-white font-black text-[10px] shadow-lg flex items-center justify-center">
                    ${marker.km}k
                  </div>
                `,
                iconSize: [26, 18],
                iconAnchor: [13, 9],
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
      </MapContainer>
    </div>
  );
}
