'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Share2, Copy, Check, Download, Facebook, Image as ImageIcon,
  FileText, ExternalLink, X, Loader2,
} from 'lucide-react';
import { maskHouseNumberInBuildingName } from '@/lib/utils';
import { detectDryerFeature } from '@/lib/utils/dryer-parser';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShareToolkitProps {
  /** Tên phòng hoặc tòa nhà (chưa mask) */
  title: string;
  /** Địa chỉ (chưa mask) */
  address: string;
  /** Loại phòng: "Studio", "1N1K", "2N1K", "Gác xép"... */
  roomType?: string;
  /** Số tầng */
  floor?: number;
  /** Có thang máy không */
  hasElevator?: boolean;
  /** Nội thất có sẵn */
  furnitureList?: string[];
  /** Thú cưng */
  allowPet?: boolean;
  /** Người nước ngoài */
  allowForeigners?: boolean;
  /** Xe điện VinFast */
  allowVinfastElectric?: boolean;
  /** Toàn bộ ảnh */
  images: string[];
  /** URL trang hiện tại để share */
  pageUrl: string;
  /** Hotline / số điện thoại công ty */
  hotline?: string;
  /** Khu vực (dùng cho caption) */
  area?: string;
  /** open/close dialog */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFbCaption(props: Omit<ShareToolkitProps, 'open' | 'onOpenChange'>): string {
  const {
    title, address, roomType, floor, hasElevator,
    furnitureList, allowPet, allowForeigners, allowVinfastElectric,
    pageUrl, hotline, area,
  } = props;

  const maskedAddress = maskHouseNumberInBuildingName(address || '');
  const maskedTitle = maskHouseNumberInBuildingName(title || '');

  // Dòng tiêu đề nổi bật
  const roomTypeLabel = roomType ? roomType.toUpperCase() : '';
  const elevatorNote = hasElevator !== false ? 'THANG MÁY' : 'THANG BỘ';
  const areaLabel = area ? area.toUpperCase() : '';

  // Furniture highlights
  const effectiveFurniture = [...(furnitureList || [])];
  const dryerScan = detectDryerFeature([title, address].join(' | '));
  if (dryerScan.hasDryer && dryerScan.label && !effectiveFurniture.includes(dryerScan.label)) {
    effectiveFurniture.push(dryerScan.label);
  }

  const furnitureHighlights: string[] = [];
  if (effectiveFurniture.length > 0) {
    furnitureHighlights.push(...effectiveFurniture.slice(0, 3));
  }
  const furnitureLine = effectiveFurniture.length > 0
    ? `Full đồ cao cấp${effectiveFurniture.length > 0 ? ` (${effectiveFurniture.slice(0, 4).join(', ')})` : ''}`
    : 'Full nội thất';

  // Pet note
  const petNote = allowPet === true
    ? '✅ Cho nuôi thú cưng (hỏi thêm chi tiết)'
    : allowPet === false
    ? '🚫 Không nuôi thú cưng'
    : '';

  // Foreigners
  const foreignNote = allowForeigners
    ? '✅ Nhận người nước ngoài'
    : '🇻🇳 Ưu tiên khách Việt';

  // VinFast
  const vinfastNote = allowVinfastElectric !== false
    ? '⚡ Sạc xe điện tại tầng hầm'
    : '';

  const extraNotes = [petNote, foreignNote, vinfastNote].filter(Boolean).join('\n');

  const headlineKeywords = [roomTypeLabel, areaLabel, elevatorNote].filter(Boolean).join(' – ');

  const lines: string[] = [
    `🏠 REALHOME`,
    `🔥 ${headlineKeywords} – XEM NGAY ĐỪNG BỎ LỠ 🔥`,
    ``,
    `📍 Vị trí: ${maskedAddress}${area ? `, ${area}` : ''}.`,
    `🛋 Loại phòng: ${roomTypeLabel || 'Phòng trọ cao cấp'}${floor ? `, tầng ${floor}` : ''}${hasElevator !== false ? ' (có thang máy)' : ' (thang bộ)'}.`,
    `🏠 Nội thất: ${furnitureLine}.`,
    ``,
    extraNotes,
    ``,
    `🔔 Lh xem phòng: ${hotline || 'Liên hệ'} (Zalo/Alo 24/7)`,
    ``,
    `🔗 Xem chi tiết: ${pageUrl}`,
  ];

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function downloadSingleImage(url: string, index: number): Promise<void> {
  const filename = `realhome-anh-${String(index + 1).padStart(2, '0')}.jpg`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `realhome-anh-${String(index + 1).padStart(2, '0')}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    // Fallback: Dùng API Proxy của server để kích hoạt tải file trực tiếp về máy (Content-Disposition), không mở tab mới
    const proxyUrl = `/api/download-image?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function ShareToolkitDialog(props: ShareToolkitProps) {
  const { open, onOpenChange, images, pageUrl, hotline } = props;
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImgIdx, setCopiedImgIdx] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const caption = buildFbCaption(props);
  const [editableCaption, setEditableCaption] = useState('');
  const [captionInited, setCaptionInited] = useState(false);

  // Lazy init editable caption khi tab caption được mở
  const initCaption = useCallback(() => {
    if (!captionInited) {
      setEditableCaption(caption);
      setCaptionInited(true);
    }
  }, [captionInited, caption]);

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(editableCaption || caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(pageUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyImgLink = async (url: string, idx: number) => {
    await navigator.clipboard.writeText(url);
    setCopiedImgIdx(idx);
    setTimeout(() => setCopiedImgIdx(null), 2000);
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    setDownloadProgress(0);
    const validImages = images.filter(Boolean);
    for (let i = 0; i < validImages.length; i++) {
      await downloadSingleImage(validImages[i], i);
      setDownloadProgress(i + 1);
      // Trình duyệt cần thời gian xử lý giữa các lần tải
      await new Promise((r) => setTimeout(r, 600));
    }
    setDownloadingAll(false);
    setDownloadProgress(0);
  };

  // Single portalStyle state drives both keyboard-active and normal positions
  const defaultStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translateX(-50%) translateY(-50%)',
    width: 'calc(100vw - 16px)',
    maxWidth: '42rem',
    maxHeight: '85vh',
    height: 'auto',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'white',
    borderRadius: '1rem',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
  };
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>(defaultStyle);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  // Store vpH so textarea can get an explicit calculated height (bypasses broken flex chain)
  const [vpH, setVpH] = useState(0);

  useEffect(() => {
    if (!open) return;

    const updateViewport = () => {
      if (window.innerWidth >= 640) {
        setIsKeyboardActive(false);
        setVpH(0);
        setPortalStyle(defaultStyle);
        return;
      }

      if (window.visualViewport) {
        const h = window.visualViewport.height;
        const vpTop = window.visualViewport.offsetTop;
        const keyboardActive = h < window.innerHeight * 0.75;
        setIsKeyboardActive(keyboardActive);
        setVpH(keyboardActive ? h : 0);

        if (keyboardActive) {
          setPortalStyle({
            position: 'fixed',
            top: `${vpTop + 6}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100vw - 12px)',
            maxWidth: '100vw',
            height: `${h - 12}px`,
            maxHeight: `${h - 12}px`,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          });
        } else {
          setPortalStyle(defaultStyle);
        }
      } else {
        setPortalStyle(defaultStyle);
      }
    };

    updateViewport();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }
    window.addEventListener('resize', updateViewport);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
  const validImages = images.filter(Boolean);

  // Fixed heights for keyboard-active layout elements:
  const HEADER_H = 50;   // header bar px-4 pt-3 pb-2 + content
  const TABS_H   = 42;   // TabsList h-8 + mt-2 + mx spacing
  const BTN_H    = 44;   // h-10 button + pt-0.5
  const PAD_V    = 24;   // p-3 top + p-3 bottom
  const GAP_V    = 8;    // gap-2
  const FIXED_TOTAL = HEADER_H + TABS_H + BTN_H + PAD_V + GAP_V; // 168px

  // Textarea height fills everything between fixed siblings
  const kbTextareaH = vpH > 0 ? Math.max(vpH - 12 - FIXED_TOTAL, 60) : 160;

  // ── Keyboard-active flat layout (no Tabs/TabsContent involved) ──────────
  const keyboardLayout = (
    <div
      style={{ display: isKeyboardActive ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
    >
      {/* Header */}
      <div style={{ height: HEADER_H, flexShrink: 0 }} className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border-subtle">
        <div className="flex items-center gap-2 font-heading text-sm font-semibold">
          <Share2 className="h-4 w-4 text-accent" />
          Sale Toolkit — Chia sẻ Facebook
        </div>
        <button onClick={() => onOpenChange(false)} className="rounded-full p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs navigation (shrink-0) */}
      <div style={{ flexShrink: 0 }} className="mx-3 mt-2 grid grid-cols-3 h-8 bg-slate-100 rounded-lg p-0.5 gap-0.5">
        <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-700 bg-white rounded-md shadow-sm">
          <FileText className="h-3 w-3 shrink-0" /><span className="truncate">Nội dung</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
          <ImageIcon className="h-3 w-3 shrink-0" /><span className="truncate">Ảnh</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
          <Facebook className="h-3 w-3 shrink-0" /><span className="truncate">Chia sẻ</span>
        </div>
      </div>

      {/* Textarea + Button — flat, no Tabs wrapping */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          style={{ height: `${kbTextareaH}px`, flexShrink: 0 }}
          className="w-full rounded-xl border border-amber-400 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-800 font-mono font-medium leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition box-border overflow-y-auto"
          value={editableCaption || caption}
          onChange={(e) => setEditableCaption(e.target.value)}
          onClick={initCaption}
        />
        <div style={{ flexShrink: 0 }} className="flex gap-2">
          <Button
            className="flex-1 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold gap-1.5 text-xs h-10 rounded-xl shadow-xs"
            onClick={handleCopyCaption}
          >
            {copiedCaption ? <><Check className="h-4 w-4" /> Đã sao chép!</> : <><Copy className="h-4 w-4" /> Sao chép bài đăng</>}
          </Button>
          <Button
            variant="outline"
            style={{ flexShrink: 0 }}
            className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 px-3.5 h-10 rounded-xl text-xs"
            onClick={() => { setEditableCaption(caption); setCaptionInited(true); }}
            title="Đặt lại bài mẫu mặc định"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // ── Normal Tabs layout (shown when keyboard inactive) ──────────────────
  const normalLayout = (
    <div style={{ display: isKeyboardActive ? 'none' : 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2 font-heading text-sm sm:text-base font-semibold">
          <Share2 className="h-4 w-4 text-accent" />
          Sale Toolkit — Chia sẻ Facebook
        </div>
        <button onClick={() => onOpenChange(false)} className="rounded-full p-1.5 bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-all">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Full Tabs */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <Tabs defaultValue="caption" onValueChange={(v) => { if (v === 'caption') initCaption(); }} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="mx-3 sm:mx-6 mt-2 mb-0 shrink-0 grid grid-cols-3 h-8 sm:h-9">
            <TabsTrigger value="caption" className="text-[11px] sm:text-xs gap-1 px-1">
              <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /><span className="truncate">Nội dung</span>
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-[11px] sm:text-xs gap-1 px-1">
              <ImageIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /><span className="truncate">Ảnh ({validImages.length})</span>
            </TabsTrigger>
            <TabsTrigger value="share" className="text-[11px] sm:text-xs gap-1 px-1">
              <Facebook className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /><span className="truncate">Chia sẻ</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Caption */}
          <TabsContent value="caption" className="flex-1 min-h-0 flex flex-col gap-2 p-3 sm:p-6 overflow-hidden data-[state=inactive]:hidden">
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight shrink-0">
              Bài đăng mẫu — chỉnh sửa trực tiếp trước khi sao chép. Địa chỉ đã được mã hoá tự động.
            </p>
            <textarea
              className="w-full h-[230px] sm:h-[280px] max-h-[50vh] rounded-xl border border-amber-400 bg-slate-50/80 px-3 py-2.5 text-xs sm:text-sm text-slate-800 font-mono font-medium leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition box-border overflow-y-auto"
              value={editableCaption || caption}
              onChange={(e) => setEditableCaption(e.target.value)}
              onClick={initCaption}
            />
            <div className="flex gap-2 shrink-0 pt-0.5">
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold gap-1.5 text-xs sm:text-sm h-10 sm:h-11 rounded-xl shadow-xs" onClick={handleCopyCaption}>
                {copiedCaption ? <><Check className="h-4 w-4" /> Đã sao chép!</> : <><Copy className="h-4 w-4" /> Sao chép bài đăng</>}
              </Button>
              <Button variant="outline" className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 px-3.5 h-10 sm:h-11 rounded-xl text-xs" onClick={() => { setEditableCaption(caption); setCaptionInited(true); }} title="Đặt lại">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Tab Photos */}
          <TabsContent value="photos" className="flex-1 overflow-y-auto px-3 sm:px-6 pb-4 sm:pb-6 mt-3 flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-muted">{validImages.length} ảnh</p>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold border-border-subtle h-8" onClick={handleDownloadAll} disabled={downloadingAll || validImages.length === 0}>
                {downloadingAll ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang tải {downloadProgress}/{validImages.length}...</> : <><Download className="h-3.5 w-3.5" />Tải tất cả ảnh</>}
              </Button>
            </div>
            {validImages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-ink-muted border border-dashed border-border-subtle rounded-xl py-12">Không có ảnh nào</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {validImages.map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-border-subtle bg-bg-subtle aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => downloadSingleImage(url, idx)} className="bg-white/90 hover:bg-white text-slate-800 rounded-full p-1.5 transition" title="Tải ảnh"><Download className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleCopyImgLink(url, idx)} className="bg-white/90 hover:bg-white text-slate-800 rounded-full p-1.5 transition" title="Sao chép link">{copiedImgIdx === idx ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}</button>
                    </div>
                    <Badge className="absolute bottom-1.5 left-1.5 text-[9px] px-1.5 py-0 bg-black/60 text-white border-0 pointer-events-none">{idx + 1}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab Share */}
          <TabsContent value="share" className="flex-1 px-3 sm:px-6 pb-4 sm:pb-6 mt-3 flex flex-col gap-3 min-h-0">
            <p className="text-xs text-ink-muted">Chia sẻ trang phòng lên Facebook hoặc sao chép link để gửi khách.</p>
            <div className="p-2.5 bg-bg-subtle border border-border-subtle rounded-xl text-[11px] font-mono text-ink-muted break-all">{pageUrl}</div>
            <div className="flex flex-col gap-2.5">
              <Button className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold gap-2 text-xs sm:text-sm h-10" asChild>
                <a href={fbShareUrl} target="_blank" rel="noopener noreferrer"><Facebook className="h-4 w-4" />Chia sẻ lên Facebook<ExternalLink className="h-3.5 w-3.5 ml-auto opacity-70" /></a>
              </Button>
              <Button variant="outline" className="w-full gap-2 font-semibold border-border-subtle text-ink text-xs sm:text-sm h-10" onClick={handleCopyLink}>
                {copiedLink ? <><Check className="h-4 w-4 text-green-600" /> Đã sao chép link!</> : <><Copy className="h-4 w-4" /> Sao chép link trang</>}
              </Button>
            </div>
            <div className="mt-1 p-2.5 bg-accent/5 border border-accent/20 rounded-xl text-[11px] text-ink-muted leading-relaxed">
              💡 <strong className="text-ink">Tip:</strong> Dán link này vào bài đăng Facebook — FB sẽ tự lấy ảnh & tiêu đề từ trang.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  if (!open || typeof document === 'undefined') return null;

  return (
    <>
      {/* Backdrop */}
      {createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.7)' }}
          onClick={() => onOpenChange(false)}
        />,
        document.body
      )}
      {/* Modal card — always mounted, both layouts inside, toggled by display:none */}
      {createPortal(
        <div style={portalStyle}>
          {keyboardLayout}
          {normalLayout}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Inline Copy Button (dùng ngay cạnh nút tim) ─────────────────────────────

interface InlineCopyButtonProps {
  caption: string;
  label?: string;
  className?: string;
}

export function InlineFbCopyButton({ caption, label = 'Sao chép bài FB', className = '' }: InlineCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback nếu không có clipboard permission
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all
        ${copied
          ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
          : 'bg-card border-border-subtle text-ink-muted hover:border-accent hover:text-accent hover:bg-accent/5 dark:bg-card'
        } ${className}`}
    >
      {copied
        ? <><Check className="h-3 w-3" /><span>Đã sao chép!</span></>
        : <><Copy className="h-3 w-3" /><span>{label}</span></>
      }
    </button>
  );
}

// ─── FAB (Floating Action Button) ────────────────────────────────────────────

interface SaleShareFabProps {
  onClick: () => void;
}

export function SaleShareFab({ onClick }: SaleShareFabProps) {
  return (
    <button
      onClick={onClick}
      title="Sale Toolkit — Chia sẻ FB"
      className="hidden sm:flex fixed bottom-20 right-6 lg:bottom-8 lg:right-6 z-40
        w-11 h-11 rounded-full shadow-lg items-center justify-center
        bg-[#1877F2] hover:bg-[#166fe5] text-white
        transition-all hover:scale-110 active:scale-95
        ring-2 ring-white dark:ring-slate-900"
    >
      <Facebook className="h-5 w-5" />
    </button>
  );
}
