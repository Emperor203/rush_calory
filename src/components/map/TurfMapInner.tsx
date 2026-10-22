'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTurfStore } from '@/stores/useTurfStore';
import { Zone } from '@/lib/types';

// Fix Leaflet standard icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function TurfMapInner() {
  const { zones, userCoords, selectZone, setWorkoutModalOpen } = useTurfStore();
  const [mapStyle, setMapStyle] = React.useState<'dark' | 'satellite' | 'streets'>('dark');

  const userIcon = L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-blue-500 opacity-40 animate-ping"></div>
        <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const getZoneColor = (zone: Zone) => {
    if (zone.status === 'CONTESTED') return '#F59E0B'; // Amber
    if (zone.controllingClan?.colorHex) return zone.controllingClan.colorHex;
    return '#94A3B8'; // Slate/Neutral
  };

  return (
    <div className="w-full h-full relative">
      {/* Map Style Selector */}
      <div className="absolute top-4 left-4 z-20 flex items-center bg-turf-card/90 border border-turf-border rounded-xl p-1 shadow-2xl backdrop-blur text-xs">
        <button
          type="button"
          onClick={() => setMapStyle('dark')}
          className={`px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
            mapStyle === 'dark' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>🌙</span>
          <span className="hidden sm:inline">Tactical Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('satellite')}
          className={`px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
            mapStyle === 'satellite' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>🛰</span>
          <span className="hidden sm:inline">Satellite</span>
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('streets')}
          className={`px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
            mapStyle === 'streets' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>🗺</span>
          <span className="hidden sm:inline">Street Map</span>
        </button>
      </div>

      <MapContainer
        center={userCoords || [41.311081, 69.279737]}
        zoom={14}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapController center={userCoords || [41.311081, 69.279737]} />

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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        {/* User GPS Marker */}
        {userCoords && (
          <Marker position={userCoords} icon={userIcon}>
            <Popup className="turf-popup">
              <div className="text-black font-semibold text-xs">
                📍 You are here
              </div>
            </Popup>
          </Marker>
        )}

        {/* Turf Zones */}
        {zones.map((zone) => {
          const color = getZoneColor(zone);
          const percent = Math.min(100, Math.round((zone.capturePoints / zone.requiredPoints) * 100));

          const zoneMarkerIcon = L.divIcon({
            className: 'custom-zone-marker',
            html: `
              <div style="background-color: ${color};" class="w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-bold">
                ${zone.controllingClan?.tag || '⚔️'}
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          return (
            <React.Fragment key={zone.id}>
              {/* Territory radius circle */}
              <Circle
                center={[zone.latitude, zone.longitude]}
                radius={zone.radiusMeters}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: zone.status === 'NEUTRAL' ? 0.15 : 0.35,
                  weight: 2,
                  dashArray: zone.status === 'CONTESTED' ? '6, 6' : undefined,
                }}
                eventHandlers={{
                  click: () => selectZone(zone),
                }}
              />

              {/* Marker pin */}
              <Marker
                position={[zone.latitude, zone.longitude]}
                icon={zoneMarkerIcon}
                eventHandlers={{
                  click: () => selectZone(zone),
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-sm text-gray-900">{zone.name}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                        style={{ backgroundColor: color }}
                      >
                        {zone.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 mb-2">
                      Controlled by: <strong className="text-gray-900">{zone.controllingClan?.name || 'Neutral Zone'}</strong>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-gray-500 mb-3">
                      <span>Control Power:</span>
                      <strong>{zone.capturePoints} / {zone.requiredPoints} pts</strong>
                    </div>

                    <button
                      onClick={() => {
                        selectZone(zone);
                        setWorkoutModalOpen(true);
                      }}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded transition flex items-center justify-center gap-1.5 shadow"
                    >
                      ⚡ Train & Capture Spot
                    </button>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
