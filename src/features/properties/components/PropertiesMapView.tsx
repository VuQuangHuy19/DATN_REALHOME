'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BuildingGroup } from '@/app/customer/properties/page';
import { MapPin, Navigation, Search, Crosshair, Loader2, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
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

function MapEventsHandler({ 
  isSelecting, 
  onLocationSelected 
}: { 
  isSelecting: boolean, 
  onLocationSelected: (latlng: [number, number]) => void 
}) {
  useMapEvents({
    click(e) {
      if (isSelecting) {
        onLocationSelected([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
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

  // New states for advanced search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);

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
    setIsSelectingLocation(false);
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

  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setLocError('');
    setIsSelectingLocation(false);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=vn`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setUserLoc([lat, lon]);
        setMapCenter([lat, lon]);
        setMapZoom(14);
      } else {
        setLocError('Không tìm thấy địa điểm này');
      }
    } catch (err) {
      setLocError('Lỗi tìm kiếm địa điểm');
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapClick = (latlng: [number, number]) => {
    setUserLoc(latlng);
    setMapCenter(latlng);
    setIsSelectingLocation(false);
  };

  return (
    <div className={`relative w-full h-[600px] rounded-lg overflow-hidden border border-border-subtle z-0 ${isSelectingLocation ? 'cursor-crosshair' : ''}`}>
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
        <MapEventsHandler isSelecting={isSelectingLocation} onLocationSelected={handleMapClick} />

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
      <div className="absolute top-4 left-14 sm:left-16 right-4 z-[400] pointer-events-none flex flex-col md:flex-row justify-between items-start gap-3">
        {/* Search Bar - Top Left */}
        <div className="pointer-events-auto bg-card shadow-md rounded-lg flex p-1 w-full max-w-[260px] sm:max-w-sm border border-border-subtle">
          <form className="flex w-full" onSubmit={handleSearchAddress}>
            <Input 
              placeholder="Tìm địa điểm, ví dụ: Cầu Giấy..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-10 rounded-r-none"
            />
            <Button 
              type="submit" 
              disabled={isSearching} 
              variant="default" 
              className="h-10 rounded-l-none"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
        </div>

        {/* Action Buttons - Top Right */}
        <div className="pointer-events-auto flex flex-col gap-2 items-end self-end md:self-auto">
          <div className="flex flex-col gap-2">
            <Button
              variant={isSelectingLocation ? "default" : "secondary"}
              className="shadow-md bg-card text-ink hover:bg-slate-50 dark:hover:bg-slate-900/30 flex items-center justify-center gap-2 border border-border-subtle w-10 sm:w-auto px-0 sm:px-4"
              onClick={() => {
                setIsSelectingLocation(!isSelectingLocation);
                setLocError(isSelectingLocation ? '' : 'Vui lòng nhấp vào một điểm trên bản đồ');
              }}
              title="Chọn vị trí trên bản đồ"
            >
              {isSelectingLocation ? <Crosshair className="h-4 w-4" /> : <MousePointerClick className="h-4 w-4 text-accent" />}
              <span className="hidden sm:inline">{isSelectingLocation ? 'Hủy chọn' : 'Chọn vị trí'}</span>
            </Button>

            <Button
              variant="secondary"
              className="shadow-md bg-card text-ink hover:bg-slate-50 dark:hover:bg-slate-900/30 flex items-center justify-center gap-2 border border-border-subtle w-10 sm:w-auto px-0 sm:px-4"
              onClick={handleFindAround}
              title="Định vị của tôi"
            >
              <Navigation className="h-4 w-4 text-accent" />
              <span className="hidden sm:inline">Tìm quanh đây</span>
            </Button>
          </div>

          {locError && (
            <div className="bg-white/90 text-red-600 text-[11px] sm:text-xs p-1.5 sm:p-2 rounded-md shadow-sm border border-red-100 max-w-[200px] text-right mt-1">
              {locError}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Slider Pill */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] pointer-events-auto w-[90%] max-w-[340px]">
        <div className="bg-card shadow-lg rounded-full px-5 py-3 border border-border-subtle flex flex-col gap-2 items-center">
          <div className="flex w-full justify-between items-end">
            <span className="text-[11px] sm:text-xs font-semibold text-ink">
              Bán kính: <span className="text-accent font-bold text-sm">{radiusKm} km</span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-ink-muted font-medium">
              {userLoc ? `${markers.length} phòng` : 'Chưa chọn vị trí'}
            </span>
          </div>
          <Slider
            value={[radiusKm]}
            min={1}
            max={20}
            step={1}
            onValueChange={(val) => setRadiusKm(val[0])}
            className="w-full cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
