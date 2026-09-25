'use client';

import { useMemo } from 'react';
import { GraduationCap, ShoppingBag, TreePine, Hospital, MapPin, RotateCw, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NearbyPlacesResult, NearbyPlace } from '@/lib/services/nearby-places';

interface NearbyPlacesSectionProps {
  nearbyPlaces: NearbyPlacesResult | null | undefined;
  /** Compact mode hiển thị nhỏ gọn hơn */
  compact?: boolean;
  onScan?: () => void;
  isScanning?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

const categoryConfig = {
  education: {
    label: 'Trường Đại học / Cao đẳng',
    shortLabel: 'Trường học',
    icon: GraduationCap,
    bgColor: 'bg-blue-50/70 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800/40',
    textColor: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  shopping: {
    label: 'Trung tâm thương mại / Siêu thị',
    shortLabel: 'Mua sắm',
    icon: ShoppingBag,
    bgColor: 'bg-pink-50/70 dark:bg-pink-950/20',
    borderColor: 'border-pink-200 dark:border-pink-800/40',
    textColor: 'text-pink-700 dark:text-pink-300',
    iconColor: 'text-pink-500',
    badgeBg: 'bg-pink-100 dark:bg-pink-900/40',
  },
  public: {
    label: 'Công viên / Bệnh viện',
    shortLabel: 'Tiện ích',
    icon: TreePine,
    bgColor: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800/40',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    iconColor: 'text-emerald-500',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
};

function PlaceIcon({ place }: { place: NearbyPlace }) {
  if (place.name.toLowerCase().includes('bệnh viện') || place.name.toLowerCase().includes('hospital')) {
    return <Hospital className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />;
  }
  const cfg = categoryConfig[place.category];
  const Icon = cfg.icon;
  return <Icon className={`h-3.5 w-3.5 ${cfg.iconColor} flex-shrink-0`} />;
}

export function NearbyPlacesSection({
  nearbyPlaces,
  compact = false,
  onScan,
  isScanning = false,
  latitude,
  longitude,
}: NearbyPlacesSectionProps) {
  const categories = useMemo(() => {
    if (!nearbyPlaces) return [];
    return (['education', 'shopping', 'public'] as const)
      .map((key) => ({
        key,
        config: categoryConfig[key],
        places: nearbyPlaces[key] || [],
      }))
      .filter((c) => c.places.length > 0);
  }, [nearbyPlaces]);

  const hasData = nearbyPlaces && categories.length > 0;

  if (!hasData && !onScan && !isScanning) return null;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-accent`} />
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-bold font-heading text-ink`}>
            Vị trí & Tiện ích xung quanh
          </h3>
        </div>

        {onScan && hasData && (
          <Button
            variant="outline"
            size="sm"
            onClick={onScan}
            disabled={isScanning}
            className="h-7 text-xs font-bold gap-1 text-accent border-accent/30 hover:bg-accent/10 rounded-lg shrink-0"
            title="Tự động quét địa điểm từ bản đồ OpenStreetMap"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Đang quét...' : 'Quét lại POI'}</span>
          </Button>
        )}
      </div>

      {!hasData ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center space-y-2">
          <Radar className="h-6 w-6 text-accent mx-auto animate-pulse" />
          <p className="text-xs text-slate-500 font-medium">
            {isScanning ? (
              <span className="inline-flex items-center justify-center gap-2 text-accent font-semibold">
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                Đang tự động tìm kiếm tiện ích xung quanh...
              </span>
            ) : (
              'Đang cập nhật danh sách tiện ích xung quanh...'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(({ key, config, places }) => {
            const Icon = config.icon;
            return (
              <div
                key={key}
                className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-3.5 transition-all hover:shadow-xs`}
              >
                {/* Header nhóm */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${config.badgeBg}`}>
                      <Icon className={`h-4 w-4 ${config.iconColor}`} />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${config.textColor}`}>
                      {config.label}
                    </span>
                  </div>
                  <span className={`text-[11px] font-semibold ${config.textColor} ${config.badgeBg} px-2 py-0.5 rounded-full`}>
                    {places.length} địa điểm
                  </span>
                </div>

                {/* Danh sách địa điểm đầy đủ tên (3 dòng riêng biệt cho 3 nhóm) */}
                <div className="grid grid-cols-1 gap-2">
                  {places.map((place, idx) => (
                    <div
                      key={`${key}-${idx}`}
                      className="flex items-center justify-between gap-3 bg-card/95 rounded-lg px-3 py-2 border border-border-subtle shadow-2xs hover:border-accent/30 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <PlaceIcon place={place} />
                        <span className="text-xs font-semibold text-ink leading-snug break-words">
                          {place.name}
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${config.textColor} whitespace-nowrap font-mono shrink-0 bg-background/80 px-2 py-1 rounded-md border border-border-subtle`}>
                        {place.distanceText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

