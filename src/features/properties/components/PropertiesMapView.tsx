'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BuildingGroup } from '@/app/customer/properties/page';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import Link from 'next/link';
import ImageGallery from '@/src/features/properties/components/ImageGallery';

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// A custom icon for User Location
const userIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Default to Hanoi
const DEFAULT_CENTER: [number, number] = [21.0285, 105.8542];

// Helper to calc distance in km (Haversine formula)
export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
}

export interface PropertiesMapViewProps {
  groups: BuildingGroup[];
  onBook: (g: BuildingGroup) => void;
  onContact: () => void;
}

export default function PropertiesMapView({ groups, onBook, onContact }: PropertiesMapViewProps) {
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(12);
  const [locError, setLocError] = useState('');
  const [radiusKm, setRadiusKm] = useState(5); // mặc định 5 km

  // Filter groups that have coordinates, then filter/sort by radius if userLoc exists
  const markers = useMemo(() => {
    let m = groups.filter(g => g.representativeRoom.latitude && g.representativeRoom.longitude);

    if (userLoc) {
      m = m
        .map(g => ({
          group: g,
          distance: getDistanceFromLatLonInKm(
            userLoc[0], userLoc[1],
            g.representativeRoom.latitude!, g.representativeRoom.longitude!
          ),
        }))
        .filter(x => x.distance <= radiusKm)       // chỉ giữ BĐS trong bán kính
        .sort((a, b) => a.distance - b.distance)   // gần nhất trước
        .map(x => x.group);
    }
    return m;
  }, [groups, userLoc, radiusKm]);

  // Adjust center if markers exist and no userLoc
  useEffect(() => {
    if (markers.length > 0 && !userLoc) {
      setMapCenter([markers[0].representativeRoom.latitude!, markers[0].representativeRoom.longitude!]);
    }
  }, [markers, userLoc]);

  const handleFindAround = () => {
    if (!navigator.geolocation) {
      setLocError('Trình duyệt không hỗ trợ Geolocation');
      return;
    }
    setLocError('Đang tìm vị trí...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLoc(coords);
        setMapCenter(coords);
        setMapZoom(14);
        setLocError('');
      },
      () => {
        setLocError('Không thể lấy vị trí của bạn. Hãy cấp quyền truy cập vị trí.');
      }
    );
  };

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border border-border-subtle z-0">
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-leaflet-popup .leaflet-popup-content { margin: 0; width: 100% !important; min-width: 250px; }
        .custom-leaflet-popup .leaflet-popup-content-wrapper { padding: 0; overflow: hidden; border-radius: 0.5rem; }
        .leaflet-popup-content-wrapper div a { color: #fff !important; }
      ` }} />
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={mapCenter} zoom={mapZoom} />

        {userLoc && (
          <>
            <Marker position={userLoc} icon={userIcon}>
              <Popup>Vị trí của bạn</Popup>
            </Marker>
            <Circle
              center={userLoc}
              radius={radiusKm * 1000}
              pathOptions={{ color: 'red', fillColor: '#f03', fillOpacity: 0.1 }}
            />
          </>
        )}

        {markers.map(g => (
          <Marker
            key={g.buildingId}
            position={[g.representativeRoom.latitude!, g.representativeRoom.longitude!]}
          >
            <Popup className="custom-leaflet-popup">
              <div className="flex flex-col">
                <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
                  <ImageGallery
                    items={g.allImages.length ? g.allImages : ['/placeholder.jpg']}
                    alt={g.buildingName}
                    aspectRatio="card"
                  />
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-ink text-sm line-clamp-1">{g.buildingName}</h4>
                  <p className="text-[11px] text-ink-muted flex items-start gap-1 mt-1 mb-2">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="line-clamp-2 leading-tight">{g.address}</span>
                  </p>
                  <p className="text-accent font-bold mb-3 text-sm">
                    Từ {g.minPrice.toLocaleString('vi-VN')} đ
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8 text-xs bg-accent hover:bg-accent-500" asChild>
                      <Link href={`/customer/properties/${g.buildingId}`} className="text-white hover:text-black">Chi tiết</Link>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => onBook(g)}>
                      Hẹn xem
                    </Button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Control overlay */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 items-end">
        <Button
          variant="secondary"
          className="shadow-md bg-white text-ink hover:bg-slate-50 flex items-center gap-2"
          onClick={handleFindAround}
        >
          <Navigation className="h-4 w-4 text-accent" />
          Tìm quanh đây
        </Button>

        {userLoc && (
          <div className="bg-white shadow-md rounded-lg p-3 w-56 border border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink">Bán kính tìm kiếm</span>
              <span className="text-xs font-bold text-accent">{radiusKm} km</span>
            </div>
            <Slider
              value={[radiusKm]}
              min={1}
              max={20}
              step={1}
              onValueChange={(val) => setRadiusKm(val[0])}
            />
            <p className="text-[11px] text-ink-muted mt-1.5">
              Tìm thấy {markers.length} bất động sản trong bán kính
            </p>
          </div>
        )}

        {locError && (
          <div className="bg-white/90 text-red-600 text-xs p-2 rounded-md shadow-sm border border-red-100 max-w-[200px] text-right">
            {locError}
          </div>
        )}
      </div>
    </div>
  );
}
