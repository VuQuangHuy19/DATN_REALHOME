'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type GalleryItem = {
  url: string;
  thumbnailUrl?: string | null;
  type?: 'image' | 'video';
};

export interface ImageGalleryProps {
  /** Accepts GalleryItem[] or plain string[] (auto-normalised to GalleryItem) */
  items: (GalleryItem | string)[];
  alt: string;
  /** card = h-52 (listing card), detail = h-[400px] md:h-[500px] (detail page), square = aspect-square */
  aspectRatio?: 'card' | 'detail' | 'square';
  /** Show thumbnail strip below the main image (for detail pages) — default false */
  showThumbnailStrip?: boolean;
  /** Pass `priority` to the first <Image> (for above-the-fold images) */
  priority?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.webm')
  );
}

/** Normalise mixed input to a consistent GalleryItem[] */
function normaliseItems(raw: (GalleryItem | string)[]): GalleryItem[] {
  return raw
    .filter((item): item is GalleryItem | string => !!item)
    .map((item) => {
      if (typeof item === 'string') {
        return {
          url: item,
          thumbnailUrl: null,
          type: isVideoUrl(item) ? 'video' : 'image',
        } as GalleryItem;
      }
      // If type isn't set, infer from URL
      if (!item.type) {
        return { ...item, type: isVideoUrl(item.url) ? 'video' : 'image' };
      }
      return item;
    });
}

// ─── Aspect-ratio CSS mapping ─────────────────────────────────────────────────
const ASPECT_CLASSES: Record<string, string> = {
  card: 'h-52',
  detail: 'h-[400px] md:h-[500px]',
  square: 'aspect-square',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImageGallery({
  items: rawItems,
  alt,
  aspectRatio = 'card',
  showThumbnailStrip = false,
  priority = false,
}: ImageGalleryProps) {
  const items = normaliseItems(rawItems);
  const [idx, setIdx] = useState(0);

  // Touch swipe refs
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIdx((i) => (i - 1 + items.length) % items.length);
    },
    [items.length],
  );

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIdx((i) => (i + 1) % items.length);
    },
    [items.length],
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setIdx((i) => (i + 1) % items.length);
      else setIdx((i) => (i - 1 + items.length) % items.length);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  }, [items.length]);

  // Fallback
  if (items.length === 0) {
    return (
      <div
        className={`relative bg-slate-100 overflow-hidden ${ASPECT_CLASSES[aspectRatio] ?? ASPECT_CLASSES.card}`}
      >
        <Image
          src="/placeholder.jpg"
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </div>
    );
  }

  const current = items[idx];
  const isVideo = current?.type === 'video';

  // For detail mode, use object-contain + dark bg like the original detail page
  const isDetail = aspectRatio === 'detail';
  const containerBg = isDetail ? 'bg-black/95' : 'bg-slate-100';
  const objectFit = isDetail ? 'object-contain' : 'object-cover';

  return (
    <div>
      {/* Main slider */}
      <div
        className={`relative overflow-hidden select-none group ${containerBg} ${ASPECT_CLASSES[aspectRatio] ?? ASPECT_CLASSES.card} ${isDetail ? 'rounded-lg border border-border-subtle flex items-center justify-center' : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Current media */}
        {isVideo ? (
          <video
            src={current.url}
            controls
            className="w-full h-full object-contain"
          />
        ) : (
          <Image
            src={current.url || '/placeholder.jpg'}
            alt={`${alt} - ${idx + 1}`}
            fill
            sizes={
              isDetail
                ? '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px'
                : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
            }
            className={`${objectFit} transition-opacity duration-300`}
            priority={priority && idx === 0}
          />
        )}

        {/* Navigation arrows */}
        {items.length > 1 && (
          <>
            {isDetail ? (
              <>
                {/* Detail style — round buttons, hidden until hover */}
                <button
                  onClick={prev}
                  aria-label="Ảnh trước"
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-ink border border-border-subtle flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10 shadow-none"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={next}
                  aria-label="Ảnh tiếp"
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-ink border border-border-subtle flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10 shadow-none"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : (
              <>
                {/* Card style — edge strips */}
                <button
                  onClick={prev}
                  aria-label="Ảnh trước"
                  className="absolute left-0 inset-y-0 w-10 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors z-10"
                >
                  <ChevronLeft className="h-5 w-5 text-white drop-shadow" />
                </button>
                <button
                  onClick={next}
                  aria-label="Ảnh tiếp"
                  className="absolute right-0 inset-y-0 w-10 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors z-10"
                >
                  <ChevronRight className="h-5 w-5 text-white drop-shadow" />
                </button>
              </>
            )}

            {/* Dot indicators */}
            <div
              className={`absolute ${isDetail ? 'bottom-4' : 'bottom-2'} left-1/2 -translate-x-1/2 flex gap-${isDetail ? '1.5' : '1'} z-10`}
            >
              {items.map((_, i) =>
                isDetail ? (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === idx
                        ? 'bg-white w-4'
                        : 'bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Chuyển đến ảnh ${i + 1}`}
                  />
                ) : (
                  <span
                    key={i}
                    className={`block h-1.5 rounded-full transition-all ${
                      i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ),
              )}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip (optional, for detail pages) */}
      {showThumbnailStrip && items.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {items.map((item, i) => {
            const thumbUrl =
              typeof item === 'string'
                ? item
                : item.thumbnailUrl || item.url;
            const thumbIsVideo = typeof item !== 'string' && item.type === 'video';

            return (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                  i === idx
                    ? 'border-accent ring-1 ring-accent'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {thumbIsVideo ? (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center text-xs text-ink-muted">
                    ▶
                  </div>
                ) : (
                  <Image
                    src={thumbUrl || '/placeholder.jpg'}
                    alt={`${alt} thumb ${i + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
