'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { DBBuilding } from '@/lib/supabase/types';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER: [number, number] = [21.0285, 105.8542]; // Hanoi center

function MapBoundsUpdater({ markers }: { markers: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [markers, map]);
  return null;
}

interface BuildingsMultiMapProps {
  buildings: DBBuilding[];
  onSelectBuilding?: (buildingId: string) => void;
}

export default function BuildingsMultiMap({ buildings, onSelectBuilding }: BuildingsMultiMapProps) {
  // Only buildings with valid latitude & longitude
  const validBuildings = buildings.filter((b) => b.latitude && b.longitude);
  const markers: [number, number][] = validBuildings.map((b) => [b.latitude!, b.longitude!]);

  return (
    <div className="h-[420px] w-full rounded-2xl border border-slate-200 overflow-hidden relative z-0 shadow-xs">
      <MapContainer
        center={markers.length > 0 ? markers[0] : DEFAULT_CENTER}
        zoom={markers.length > 0 ? 13 : 11}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.length > 0 && <MapBoundsUpdater markers={markers} />}

        {validBuildings.map((b) => (
          <Marker key={b.id} position={[b.latitude!, b.longitude!]}>
            <Popup className="rounded-xl shadow-md">
              <div className="p-1 space-y-1.5 text-xs">
                <strong className="text-sm font-bold text-slate-900 block">{b.name}</strong>
                <p className="text-slate-500">{b.address || b.area || 'Chưa cập nhật địa chỉ'}</p>
                <div className="text-emerald-700 font-bold pt-1">
                  Mã: {b.code} • {b.total_rooms || 0} phòng
                </div>
                {onSelectBuilding && (
                  <button
                    onClick={() => onSelectBuilding(b.id)}
                    className="mt-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg w-full cursor-pointer transition-colors shadow-2xs"
                  >
                    Xem chi tiết tòa nhà
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {validBuildings.length === 0 && (
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 text-center z-10">
          <div className="bg-white p-5 rounded-2xl shadow-xl max-w-sm text-xs space-y-2 border border-slate-100">
            <p className="font-extrabold text-slate-900 text-sm">Chưa có tòa nhà nào cập nhật tọa độ GPS</p>
            <p className="text-slate-500 leading-relaxed">
              Bạn vui lòng ấn nút <strong>Chỉnh sửa</strong> tại thẻ tòa nhà bên dưới và chọn vị trí trên bản đồ để định vị tòa nhà trên sơ đồ BĐS.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
