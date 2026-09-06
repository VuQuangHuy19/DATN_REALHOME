'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, Download, RefreshCw, ZoomIn, Sparkles, 
  CheckCircle2, Image as ImageIcon, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

type PlatformType = 'avatar_tiktok' | 'avatar_zalo_fb' | 'cover_banner';

interface SocialMediaBrandGeneratorProps {
  defaultName?: string;
  defaultPhone?: string;
  compact?: boolean;
}

export function SocialMediaBrandGenerator({
  defaultName = 'Quang Huy RealHome',
  defaultPhone = '0857.844.999',
  compact = false,
}: SocialMediaBrandGeneratorProps) {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  
  // Design Platform Mode
  const [platform, setPlatform] = useState<PlatformType>('avatar_tiktok');

  // Customization fields
  const [channelName, setChannelName] = useState<string>(defaultName);
  const [subTitle, setSubTitle] = useState<string>('BẤT ĐỘNG SẢN & PHÒNG TRỌ');
  const [phone, setPhone] = useState<string>(defaultPhone);
  const [address, setAddress] = useState<string>('Hà Nội');
  const [slogan, setSlogan] = useState<string>('Chuyên Cho Thuê & Mua Bán BĐS Uy Tín');
  
  // Theme selection: RealHome 2 Brand Colors (#1D4E89 Navy Blue & #F59E0B Warm Gold)
  const [frameStyle, setFrameStyle] = useState<'realhome_brand' | 'gold_minimal' | 'navy_minimal'>('realhome_brand');
  const [badgeType, setBadgeType] = useState<'tiktok' | 'zalo' | 'facebook'>('tiktok');
  const [showVerifiedBadge, setShowVerifiedBadge] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (defaultName) setChannelName(defaultName);
    if (defaultPhone) setPhone(defaultPhone);
  }, [defaultName, defaultPhone]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserImage(event.target?.result as string);
        setScale(1);
        setOffsetX(0);
        setOffsetY(0);
        toast.success('Đã tải ảnh lên thành công!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Dimensions based on platform
  const getCanvasDimensions = () => {
    if (platform === 'cover_banner') {
      return { width: 1200, height: 630 };
    }
    return { width: 1000, height: 1000 };
  };

  // Render Canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: W, height: H } = getCanvasDimensions();
    canvas.width = W;
    canvas.height = H;

    ctx.clearRect(0, 0, W, H);

    if (platform === 'cover_banner') {
      drawCoverBanner(ctx, W, H);
    } else {
      drawAvatarDesign(ctx, W);
    }
  };

  // 1. Render Avatar Designs (1000x1000)
  const drawAvatarDesign = (ctx: CanvasRenderingContext2D, size: number) => {
    const center = size / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, size / 2 - 25, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    if (userImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = userImage;
      img.onload = () => {
        const aspect = img.width / img.height;
        let drawW = size * scale;
        let drawH = drawW / aspect;
        if (aspect < 1) {
          drawH = size * scale;
          drawW = drawH * aspect;
        }

        const drawX = (size - drawW) / 2 + offsetX * 3;
        const drawY = (size - drawH) / 2 + offsetY * 3;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
        drawAvatarOverlay(ctx, size);
      };
      return;
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('BẤM VÀO ĐÂY ĐỂ TẢI ẢNH CỦA BẠN', size / 2, size / 2);
      ctx.restore();
      drawAvatarOverlay(ctx, size);
    }
  };

  const drawAvatarOverlay = (ctx: CanvasRenderingContext2D, size: number) => {
    const center = size / 2;
    const radius = size / 2 - 35;

    const NAVY_BLUE = '#1D4E89';
    const WARM_GOLD = '#F59E0B';

    ctx.save();

    if (frameStyle === 'realhome_brand') {
      ctx.lineWidth = 32;
      ctx.strokeStyle = NAVY_BLUE;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 6;
      ctx.strokeStyle = WARM_GOLD;
      ctx.beginPath();
      ctx.arc(center, center, radius - 20, 0, Math.PI * 2);
      ctx.stroke();

      drawMinimalRoofIcon(ctx, center, 82, WARM_GOLD);
      drawSimpleBanner(ctx, size, channelName, subTitle, phone, WARM_GOLD, NAVY_BLUE);

    } else if (frameStyle === 'gold_minimal') {
      ctx.lineWidth = 28;
      ctx.strokeStyle = WARM_GOLD;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 4;
      ctx.strokeStyle = NAVY_BLUE;
      ctx.beginPath();
      ctx.arc(center, center, radius + 18, 0, Math.PI * 2);
      ctx.stroke();

      drawMinimalRoofIcon(ctx, center, 82, NAVY_BLUE);
      drawSimpleBanner(ctx, size, channelName, subTitle, phone, NAVY_BLUE, '#ffffff');

    } else if (frameStyle === 'navy_minimal') {
      ctx.lineWidth = 28;
      ctx.strokeStyle = NAVY_BLUE;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();

      drawMinimalRoofIcon(ctx, center, 82, WARM_GOLD);
      drawSimpleBanner(ctx, size, channelName, subTitle, phone, WARM_GOLD, NAVY_BLUE);
    }

    if (showVerifiedBadge) {
      drawVerifiedBadgeIcon(ctx, center + radius * 0.68, center + radius * 0.68);
    }

    ctx.restore();
  };

  // 2. Render Cover Banner (1200x630)
  const drawCoverBanner = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const NAVY_BLUE = '#1D4E89';
    const WARM_GOLD = '#F59E0B';
    const DARK_NAVY = '#0F2C59';

    ctx.save();

    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, DARK_NAVY);
    bgGrad.addColorStop(0.5, NAVY_BLUE);
    bgGrad.addColorStop(1, '#1e3a8a');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.moveTo(0, H + 100);
    ctx.lineTo(W / 2, -100);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, H + 40);
    ctx.lineTo(W / 2 + 80, -100);
    ctx.stroke();

    const photoRadius = 220;
    const photoCenterX = W - 280;
    const photoCenterY = H / 2;

    ctx.save();
    ctx.lineWidth = 14;
    ctx.strokeStyle = WARM_GOLD;
    ctx.beginPath();
    ctx.arc(photoCenterX, photoCenterY, photoRadius + 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(photoCenterX, photoCenterY, photoRadius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(photoCenterX - photoRadius, photoCenterY - photoRadius, photoRadius * 2, photoRadius * 2);

    if (userImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = userImage;
      img.onload = () => {
        const aspect = img.width / img.height;
        let drawW = photoRadius * 2 * scale;
        let drawH = drawW / aspect;
        if (aspect < 1) {
          drawH = photoRadius * 2 * scale;
          drawW = drawH * aspect;
        }

        const drawX = photoCenterX - drawW / 2 + offsetX * 2;
        const drawY = photoCenterY - drawH / 2 + offsetY * 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
        drawCoverTextAndDetails(ctx, W, H, NAVY_BLUE, WARM_GOLD);
      };
      return;
    } else {
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('TẢI ẢNH BẠN', photoCenterX, photoCenterY);
      ctx.restore();
      drawCoverTextAndDetails(ctx, W, H, NAVY_BLUE, WARM_GOLD);
    }
  };

  const drawCoverTextAndDetails = (
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    NAVY_BLUE: string,
    WARM_GOLD: string
  ) => {
    ctx.save();
    const leftX = 80;

    drawMinimalRoofIcon(ctx, leftX + 30, 80, WARM_GOLD);

    ctx.fillStyle = WARM_GOLD;
    ctx.beginPath();
    ctx.roundRect(leftX + 80, 65, 360, 42, 10);
    ctx.fill();

    ctx.fillStyle = NAVY_BLUE;
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HỆ THỐNG BẤT ĐỘNG SẢN & PHÒNG TRỌ', leftX + 96, 93);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 56px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(channelName.toUpperCase(), leftX, 185);

    ctx.fillStyle = WARM_GOLD;
    ctx.fillRect(leftX, 205, 320, 6);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(`✓ ${slogan}`, leftX, 265);

    ctx.font = '24px system-ui, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('✓ Căn hộ Studio, 1PN - 2PN Cao Cấp Giá Tốt', leftX, 310);
    ctx.fillText('✓ Hỗ trợ xem phòng & làm hợp đồng nhanh chóng 24/7', leftX, 350);

    const contactY = H - 140;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(leftX, contactY, 520, 85, 16);
    ctx.fill();
    ctx.strokeStyle = WARM_GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = WARM_GOLD;
    ctx.font = '900 30px system-ui, monospace';
    ctx.fillText(`☎ Hotline / Zalo: ${phone}`, leftX + 24, contactY + 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`📍 Khu vực: ${address}`, leftX + 24, contactY + 72);

    if (showVerifiedBadge) {
      drawVerifiedBadgeIcon(ctx, W - 80, 80);
    }

    ctx.restore();
  };

  const drawMinimalRoofIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(x, y - 30);
    ctx.lineTo(x - 35, y + 2);
    ctx.lineTo(x - 24, y + 2);
    ctx.lineTo(x - 24, y + 22);
    ctx.lineTo(x + 24, y + 22);
    ctx.lineTo(x + 24, y + 2);
    ctx.lineTo(x + 35, y + 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 8, y + 6, 16, 16);

    ctx.restore();
  };

  const drawSimpleBanner = (
    ctx: CanvasRenderingContext2D,
    size: number,
    title: string,
    subtitle: string,
    phoneNum: string,
    bgColor: string,
    textColor: string
  ) => {
    ctx.save();

    const bannerW = 640;
    const bannerH = 120;
    const bannerX = (size - bannerW) / 2;
    const bannerY = size - 190;
    const rx = 24;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.moveTo(bannerX + rx, bannerY);
    ctx.lineTo(bannerX + bannerW - rx, bannerY);
    ctx.quadraticCurveTo(bannerX + bannerW, bannerY, bannerX + bannerW, bannerY + rx);
    ctx.lineTo(bannerX + bannerW, bannerY + bannerH - rx);
    ctx.quadraticCurveTo(bannerX + bannerW, bannerY + bannerH, bannerX + bannerW - rx, bannerY + bannerH);
    ctx.lineTo(bannerX + rx, bannerY + bannerH);
    ctx.quadraticCurveTo(bannerX, bannerY + bannerH, bannerX, bannerY + bannerH - rx);
    ctx.lineTo(bannerX, bannerY + rx);
    ctx.quadraticCurveTo(bannerX, bannerY, bannerX + rx, bannerY);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '900 42px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), size / 2, bannerY + 52);

    ctx.fillStyle = textColor === '#ffffff' ? '#e2e8f0' : '#1D4E89';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${subtitle} • ☎ ${phoneNum}`, size / 2, bannerY + 92);

    ctx.restore();
  };

  const drawVerifiedBadgeIcon = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    const r = 30;

    const badgeColor = badgeType === 'zalo' ? '#0068ff' : badgeType === 'facebook' ? '#1877f2' : '#20d5ec';

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 11, y);
    ctx.lineTo(x - 3, y + 8);
    ctx.lineTo(x + 11, y - 7);
    ctx.stroke();

    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
  }, [userImage, scale, offsetX, offsetY, channelName, subTitle, phone, slogan, address, frameStyle, badgeType, showVerifiedBadge, platform]);

  // Download image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const modeLabel = platform === 'cover_banner' ? 'Bia_Social' : 'Avatar';
    link.download = `${modeLabel}_RealHome_${channelName.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
    toast.success('Đã tải hình ảnh xuất khẩu thành công!');
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-lg rounded-3xl bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="bg-[#1D4E89] text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg sm:text-xl font-bold tracking-tight font-heading flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-[#F59E0B]" />
              Thiết Kế Khung Avatar &amp; Ảnh Bìa Social Media ({channelName})
            </CardTitle>
            <p className="text-xs text-blue-100">
              Tạo ảnh đại diện TikTok, Zalo, Facebook &amp; Ảnh bìa chuẩn màu nhận diện RealHome (#1D4E89 &amp; #F59E0B)
            </p>
          </div>
          <Button
            onClick={handleDownload}
            className="bg-[#F59E0B] hover:bg-amber-600 text-slate-900 font-extrabold h-10 px-5 rounded-xl shadow-md flex items-center gap-2 shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>Tải Ảnh PNG Xuất Khẩu</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Selector Platform Tabs */}
        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 flex-wrap">
          {[
            { id: 'avatar_tiktok', label: '👤 Avatar TikTok', desc: '1000 x 1000 px' },
            { id: 'avatar_zalo_fb', label: '📱 Avatar Zalo & Facebook', desc: '1000 x 1000 px' },
            { id: 'cover_banner', label: '🖼️ Ảnh Bìa Cover Zalo & FB', desc: '1200 x 630 px' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPlatform(tab.id as PlatformType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                platform === tab.id
                  ? 'bg-[#1D4E89] text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${platform === tab.id ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                {tab.desc}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Preview & Canvas */}
          <div className="lg:col-span-6 space-y-4">
            <div className="border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 py-2.5 px-4 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-[#1D4E89]" />
                  Xem Trước {platform === 'cover_banner' ? 'Ảnh Bìa Banner' : 'Khung Avatar'}
                </span>
                <span className="text-[10px] font-mono text-[#F59E0B] bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded font-bold border border-amber-200">
                  {platform === 'cover_banner' ? '1200 x 630 px' : '1000 x 1000 px'}
                </span>
              </div>
              
              <div className="p-4 flex flex-col items-center justify-center bg-slate-100/70 dark:bg-slate-950">
                <div className={`relative overflow-hidden shadow-xl border-4 border-white dark:border-slate-800 bg-slate-900 flex items-center justify-center ${
                  platform === 'cover_banner' 
                    ? 'w-full aspect-[1200/630] rounded-xl' 
                    : 'w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full'
                }`}>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    title="Bấm vào để chọn ảnh cá nhân của bạn"
                  />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex items-center gap-2.5 mt-4">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#1D4E89] hover:bg-blue-900 text-white font-bold h-9 px-4 rounded-xl text-xs gap-1.5 shadow-sm"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{userImage ? 'Thay ảnh cá nhân' : 'Tải ảnh của bạn'}</span>
                  </Button>
                  {userImage && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScale(1);
                        setOffsetX(0);
                        setOffsetY(0);
                      }}
                      className="h-9 text-xs font-semibold rounded-xl border-slate-300"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Căn giữa
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customization controls */}
          <div className="lg:col-span-6 space-y-4">
            {/* Mẫu Khung theo màu Thương Hiệu */}
            {platform !== 'cover_banner' && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-4 space-y-2.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#F59E0B]" /> 1. Kiểu Viền Khung RealHome
                </p>
                <div className="space-y-2">
                  {[
                    { id: 'realhome_brand', label: 'RealHome Standard (Xanh Navy + Vàng Gold)', desc: 'Viền Vòng Navy #1D4E89 + Nhãn Vàng Gold #F59E0B', color: 'border-[#1D4E89] bg-blue-50/40 dark:bg-blue-950/30' },
                    { id: 'gold_minimal', label: 'Golden RealHome (Viền Vàng Kim Đơn Giản)', desc: 'Viền Vàng Kim + Nhãn Xanh Đậm', color: 'border-[#F59E0B] bg-amber-50/40 dark:bg-amber-950/30' },
                    { id: 'navy_minimal', label: 'Navy Classic (Viền Xanh Tối Giản)', desc: 'Viền Xanh RealHome + Mái nhà', color: 'border-slate-400 bg-slate-50 dark:bg-slate-800' },
                  ].map((style) => (
                    <div
                      key={style.id}
                      onClick={() => setFrameStyle(style.id as any)}
                      className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                        frameStyle === style.id ? `${style.color} ring-2 ring-[#1D4E89] shadow-xs` : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{style.label}</span>
                        {frameStyle === style.id && <CheckCircle2 className="h-4 w-4 text-[#1D4E89]" />}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{style.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Căn chỉnh ảnh */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ZoomIn className="h-4 w-4 text-[#1D4E89]" /> 2. Chỉnh Phóng Tải &amp; Vị Trí Ảnh
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Phóng to / Thu nhỏ ({Math.round(scale * 100)}%)</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.2"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#1D4E89]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Trái / Phải</span>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#1D4E89]"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lên / Xuống</span>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#1D4E89]"
                  />
                </div>
              </div>
            </div>

            {/* Thay đổi Chữ */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> 3. Nội Dung Thương Hiệu RealHome
              </p>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Họ Tên / Tên Thương Hiệu</Label>
                <Input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Ví dụ: Quang Huy RealHome"
                  className="h-9 text-xs font-bold rounded-lg border-slate-300"
                />
              </div>

              {platform === 'cover_banner' && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Slogan Thương Hiệu</Label>
                  <Input
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Chuyên Cho Thuê & Mua Bán BĐS Uy Tín"
                    className="h-9 text-xs font-semibold rounded-lg border-slate-300"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Lĩnh vực hoạt động</Label>
                  <Input
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    placeholder="BẤT ĐỘNG SẢN"
                    className="h-9 text-xs font-semibold rounded-lg border-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Số Điện Thoại / Zalo</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0857.844.999"
                    className="h-9 text-xs font-mono font-bold rounded-lg border-slate-300"
                  />
                </div>
              </div>

              {/* Badge Selection */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showVerifiedBadgeProp"
                    checked={showVerifiedBadge}
                    onChange={(e) => setShowVerifiedBadge(e.target.checked)}
                    className="w-4 h-4 text-[#1D4E89] rounded cursor-pointer"
                  />
                  <Label htmlFor="showVerifiedBadgeProp" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Bật Huy Hiệu Tích Xanh (Verified Badge)
                  </Label>
                </div>

                {showVerifiedBadge && (
                  <div className="flex items-center gap-3 pl-6">
                    <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="radio" name="badgeTypeProp" checked={badgeType === 'tiktok'} onChange={() => setBadgeType('tiktok')} /> TikTok
                    </label>
                    <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="radio" name="badgeTypeProp" checked={badgeType === 'zalo'} onChange={() => setBadgeType('zalo')} /> Zalo
                    </label>
                    <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="radio" name="badgeTypeProp" checked={badgeType === 'facebook'} onChange={() => setBadgeType('facebook')} /> Facebook
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Download Action */}
            <Button
              onClick={handleDownload}
              className="w-full bg-[#F59E0B] hover:bg-amber-600 text-slate-900 font-extrabold h-11 rounded-xl text-sm shadow-md flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span>
                Tải Ảnh {platform === 'cover_banner' ? 'Bìa Cover (1200x630)' : 'Avatar (1000x1000)'} PNG
              </span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
