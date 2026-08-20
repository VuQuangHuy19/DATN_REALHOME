'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, MapPin, Clock, User, ShieldCheck, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TimeMarkCameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomTitle: string;
  buildingAddress: string;
  saleName: string;
  customerName: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsStatus?: string;
  onComplete: (photos: { photoClient: string; photoBuilding: string }) => void;
}

export function TimeMarkCameraModal({
  open,
  onOpenChange,
  roomTitle,
  buildingAddress,
  saleName,
  customerName,
  gpsLat,
  gpsLng,
  gpsStatus = 'Sóng yếu/Khác vị trí',
  onComplete,
}: TimeMarkCameraModalProps) {
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Sale+Client, Step 2: Building Address
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const width = img.width || 1280;
        const height = img.height || 720;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);

        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const timestamp = `${dateStr} ${timeStr}`;
        const latText = gpsLat ? gpsLat.toFixed(4) : 'N/A';
        const lngText = gpsLng ? gpsLng.toFixed(4) : 'N/A';
        const coordsStr = gpsLat && gpsLng ? `${latText}° N, ${lngText}° E (${gpsStatus})` : `GPS: ${gpsStatus}`;

        const boxHeight = 160;
        const boxY = height - boxHeight - 20;
        const boxX = 20;
        const boxWidth = width - 40;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)';
        ctx.lineWidth = 3;

        const radius = 12;
        ctx.beginPath();
        ctx.moveTo(boxX + radius, boxY);
        ctx.lineTo(boxX + boxWidth - radius, boxY);
        ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
        ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
        ctx.lineTo(boxX + radius, boxY + boxHeight);
        ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
        ctx.lineTo(boxX, boxY + radius);
        ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#EAB308';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('🛡️ REALHOME VERIFIED TIMEMARK', boxX + 16, boxY + 32);

        const stepLabel = step === 1 ? '[ ẢNH 1: SALE + KHÁCH HÀNG ]' : '[ ẢNH 2: MẶT TIỀN TÒA NHÀ ]';
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(stepLabel, boxX + boxWidth - 260, boxY + 32);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '15px sans-serif';
        ctx.fillText(`⏰ ${timestamp}  |  🏠 ${buildingAddress || roomTitle}`, boxX + 16, boxY + 68);
        ctx.fillText(`👤 Sale: ${saleName}  |  Khách: ${customerName} (${roomTitle})`, boxX + 16, boxY + 98);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '14px monospace';
        ctx.fillText(`🌐 ${coordsStr}`, boxX + 16, boxY + 130);
        ctx.restore();

        const watermarkedUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (step === 1) {
          setPhoto1(watermarkedUrl);
          setStep(2);
        } else {
          setPhoto2(watermarkedUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Start Camera when modal opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setStep(1);
      setPhoto1(null);
      setPhoto2(null);
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Preferred rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('[TimeMarkCamera] Camera permission/access error:', err);
      setCameraError('Không thể mở camera. Vui lòng cấp quyền truy cập camera trong trình duyệt.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Helper to draw Watermark onto Canvas
  const drawWatermarkAndCapture = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Draw live video frame
    ctx.drawImage(video, 0, 0, width, height);

    // 2. Prepare TimeMark Overlay parameters
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timestamp = `${dateStr} ${timeStr}`;

    const latText = gpsLat ? gpsLat.toFixed(4) : 'N/A';
    const lngText = gpsLng ? gpsLng.toFixed(4) : 'N/A';
    const coordsStr = gpsLat && gpsLng ? `${latText}° N, ${lngText}° E (${gpsStatus})` : `GPS: ${gpsStatus}`;

    // 3. Draw Gradient Overlay Container at Bottom
    const boxHeight = 160;
    const boxY = height - boxHeight - 20;
    const boxX = 20;
    const boxWidth = width - 40;

    ctx.save();
    // Semi-transparent dark background card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // slate-900 with 85% opacity
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)'; // amber border
    ctx.lineWidth = 3;

    // Round rect box
    const radius = 12;
    ctx.beginPath();
    ctx.moveTo(boxX + radius, boxY);
    ctx.lineTo(boxX + boxWidth - radius, boxY);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
    ctx.lineTo(boxX + radius, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
    ctx.lineTo(boxX, boxY + radius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Draw Header Badge inside Box
    ctx.fillStyle = '#EAB308'; // Amber-500
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('🛡️ REALHOME VERIFIED TIMEMARK', boxX + 16, boxY + 32);

    // Step Sub-Badge
    const stepLabel = step === 1 ? '[ ẢNH 1: SALE + KHÁCH HÀNG ]' : '[ ẢNH 2: MẶT TIỀN TÒA NHÀ ]';
    ctx.fillStyle = '#38BDF8'; // Sky-400
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(stepLabel, boxX + boxWidth - 260, boxY + 32);

    // 5. Draw Info Lines
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '15px sans-serif';

    // Line 1: Time & Address
    ctx.fillText(`⏰ ${timestamp}  |  🏠 ${buildingAddress || roomTitle}`, boxX + 16, boxY + 68);

    // Line 2: Sale & Customer
    ctx.fillText(`👤 Sale: ${saleName}  |  Khách: ${customerName} (${roomTitle})`, boxX + 16, boxY + 98);

    // Line 3: GPS Info
    ctx.fillStyle = '#94A3B8'; // Slate-400
    ctx.font = '14px monospace';
    ctx.fillText(`🌐 ${coordsStr}`, boxX + 16, boxY + 130);

    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleCapture = () => {
    setIsProcessing(true);
    const capturedDataUrl = drawWatermarkAndCapture();
    setIsProcessing(false);

    if (!capturedDataUrl) {
      alert('Lỗi chụp ảnh. Vui lòng thử lại.');
      return;
    }

    if (step === 1) {
      setPhoto1(capturedDataUrl);
      setStep(2);
    } else {
      setPhoto2(capturedDataUrl);
    }
  };

  const handleRetake = (stepToRetake: 1 | 2) => {
    if (stepToRetake === 1) {
      setPhoto1(null);
      setStep(1);
    } else {
      setPhoto2(null);
      setStep(2);
    }
  };

  const handleConfirmSubmit = () => {
    if (photo1 && photo2) {
      onComplete({ photoClient: photo1, photoBuilding: photo2 });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-950 text-white border-slate-800">
        <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900/80">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-400">
            <ShieldCheck className="h-5 w-5" />
            Camera TimeMark Thực Địa RealHome
          </DialogTitle>
          <div className="flex items-center justify-between pt-1 text-xs text-slate-300">
            <span>
              {step === 1 ? 'Bước 1/2: Chụp Sale cùng Khách xem phòng' : 'Bước 2/2: Chụp Địa chỉ/Mặt tiền tòa nhà'}
            </span>
            <Badge variant="outline" className="border-amber-400/50 text-amber-400 text-[10px]">
              Tự động đóng dấu Watermark
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 relative bg-black flex flex-col items-center justify-center min-h-[360px] overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-rose-400 max-w-md space-y-3">
              <AlertCircle className="h-10 w-10 mx-auto" />
              <p className="text-sm font-medium">{cameraError}</p>
              <Button size="sm" variant="outline" onClick={startCamera} className="border-slate-700 text-white">
                <RefreshCw className="h-4 w-4 mr-1.5" /> Thử lại
              </Button>
            </div>
          ) : (
            <>
              {/* Hidden Canvas used for Watermark processing */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Step 1 Preview or Camera Feed */}
              {step === 1 && photo1 ? (
                <div className="relative w-full h-full aspect-video">
                  <img src={photo1} alt="Ảnh 1 TimeMark" className="w-full h-full object-contain" />
                  <Badge className="absolute top-3 left-3 bg-green-600 text-white gap-1 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Đã hoàn thành Ảnh 1
                  </Badge>
                </div>
              ) : step === 2 && photo2 ? (
                <div className="relative w-full h-full aspect-video">
                  <img src={photo2} alt="Ảnh 2 TimeMark" className="w-full h-full object-contain" />
                  <Badge className="absolute top-3 left-3 bg-green-600 text-white gap-1 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Đã hoàn thành Ảnh 2
                  </Badge>
                </div>
              ) : (
                <div className="relative w-full h-full aspect-video bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Live Watermark Overlay Box (Visual Preview for Sale while aiming camera) */}
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-amber-400/80 rounded-xl p-3 backdrop-blur-md shadow-2xl space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-amber-400">
                      <span>🛡️ REALHOME VERIFIED TIMEMARK</span>
                      <span className="text-sky-400 text-[10px] font-mono">
                        {step === 1 ? 'ẢNH 1: SALE + KHÁCH' : 'ẢNH 2: MẶT TIỀN TÒA'}
                      </span>
                    </div>
                    <div className="text-slate-100 font-medium">
                      ⏰ {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN')} | 🏠 {buildingAddress || roomTitle}
                    </div>
                    <div className="text-slate-300">
                      👤 Sale: {saleName} | Khách: {customerName} ({roomTitle})
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 pt-0.5">
                      🌐 GPS: {gpsLat && gpsLng ? `${gpsLat.toFixed(4)}° N, ${gpsLng.toFixed(4)}° E` : gpsStatus}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
          {step === 1 && !photo1 && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white text-xs h-9">
                Hủy
              </Button>
              <Button
                onClick={handleCapture}
                disabled={isProcessing || !!cameraError}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9 text-xs px-5 gap-1.5 ml-auto"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Chụp Ảnh 1 (Sale + Khách)
              </Button>
            </>
          )}

          {step === 2 && !photo2 && (
            <>
              <Button variant="outline" onClick={() => handleRetake(1)} className="border-slate-700 text-slate-300 text-xs h-9">
                Chụp lại Ảnh 1
              </Button>
              <Button
                onClick={handleCapture}
                disabled={isProcessing || !!cameraError}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9 text-xs px-5 gap-1.5 ml-auto"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Chụp Ảnh 2 (Mặt tiền tòa)
              </Button>
            </>
          )}

          {photo1 && photo2 && (
            <div className="flex w-full items-center justify-between gap-2">
              <Button variant="outline" onClick={() => handleRetake(2)} className="border-slate-700 text-slate-300 text-xs h-9">
                Chụp lại Ảnh 2
              </Button>
              <Button
                onClick={handleConfirmSubmit}
                className="bg-green-600 hover:bg-green-500 text-white font-bold h-9 text-xs gap-1.5 px-5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Xác nhận & Gửi minh chứng Check-in
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
