'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icon issue with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Default to Hanoi if province coords are unknown
const DEFAULT_CENTER: [number, number] = [21.0285, 105.8542];

function LocationMarker({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const position: [number, number] | null = latitude && longitude ? [latitude, longitude] : null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=vn`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        onChange(lat, lon);
        toast.success('Đã tìm thấy vị trí!');
      } else {
        toast.error('Không tìm thấy địa chỉ này trên bản đồ.');
      }
    } catch (err) {
      toast.error('Lỗi khi tìm kiếm địa chỉ.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nhập địa chỉ để tìm kiếm nhanh (VD: 123 Nguyễn Trãi, Hà Nội)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          className="flex h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleSearch}
          disabled={isSearching}
          className="h-9 px-3 shrink-0 rounded-lg"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          step="any"
          placeholder="Vĩ độ (Latitude)"
          value={latitude ?? ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null, longitude)}
          className="flex h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <input
          type="number"
          step="any"
          placeholder="Kinh độ (Longitude)"
          value={longitude ?? ''}
          onChange={(e) => onChange(latitude, e.target.value ? parseFloat(e.target.value) : null)}
          className="flex h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>
      <div className="h-[300px] w-full rounded-md border border-border overflow-hidden relative z-0">
        <MapContainer
          center={position || DEFAULT_CENTER}
          zoom={position ? 15 : 11}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && <MapUpdater center={position} />}
          <LocationMarker position={position} setPosition={(pos) => onChange(pos[0], pos[1])} />
        </MapContainer>
      </div>
      <p className="text-xs text-ink-muted">Click vào bản đồ để chọn toạ độ. Mặc định hiển thị tại Hà Nội (bảng vn_locations chưa có toạ độ).</p>
    </div>
  );
}
