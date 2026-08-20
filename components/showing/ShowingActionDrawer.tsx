'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  MapPin, Phone, ShieldCheck, Camera, CheckCircle2,
  Clock, Navigation, AlertTriangle, ExternalLink, Loader2, Zap, Copy, MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { SlideToConfirm } from './SlideToConfirm';
import { TimeMarkCameraModal } from './TimeMarkCameraModal';
import { ChainShowingModal } from './ChainShowingModal';
import { ShowingFeedbackModal } from './ShowingFeedbackModal';

interface ShowingActionDrawerProps {
  appointment: any;
  onRefresh?: () => void;
}

export function ShowingActionDrawer({ appointment, onRefresh }: ShowingActionDrawerProps) {
  const [localAppt, setLocalAppt] = useState(appointment);
  const [loadingGps, setLoadingGps] = useState(false);
  const [startingWay, setStartingWay] = useState(false);
  const [openCamera, setOpenCamera] = useState(false);
  const [openChainModal, setOpenChainModal] = useState(false);
  const [openFeedbackModal, setOpenFeedbackModal] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [gpsStatusText, setGpsStatusText] = useState('Chưa lấy vị trí');
  const [fetchedLandlordPhone, setFetchedLandlordPhone] = useState<string | null>(null);

  // Sync prop changes to localAppt if prop updates
  useEffect(() => {
    setLocalAppt(appointment);
  }, [appointment]);

  const currentAppt = localAppt || appointment;

  // Real Landlord Phone DB Lookup
  useEffect(() => {
    let isMounted = true;
    async function fetchRealPhone() {
      // 1. If currentAppt already has landlord_phone and it's not equal to company_phone fallback
      if (currentAppt.landlord_phone && currentAppt.landlord_phone !== currentAppt.company_phone) {
        if (isMounted) setFetchedLandlordPhone(currentAppt.landlord_phone);
        return;
      }

      // 2. Query landlords table by code (e.g. 'TH03')
      const landlordCode = currentAppt.landlord_code || (currentAppt as any).landlord_id;
      if (landlordCode) {
        const { data: ll } = await supabase
          .from('landlords')
          .select('phone')
          .eq('code', landlordCode)
          .maybeSingle();
        if (ll?.phone && isMounted) {
          setFetchedLandlordPhone(ll.phone);
          return;
        }
      }

      // 3. Query buildings table by building_id or code
      const buildingKey = currentAppt.building_id || currentAppt.room_id;
      if (buildingKey) {
        const { data: b } = await supabase
          .from('buildings')
          .select('landlord_id')
          .or(`id.eq.${buildingKey},code.eq.${buildingKey}`)
          .maybeSingle();
        if (b?.landlord_id) {
          const { data: ll } = await supabase
            .from('landlords')
            .select('phone')
            .eq('id', b.landlord_id)
            .maybeSingle();
          if (ll?.phone && isMounted) {
            setFetchedLandlordPhone(ll.phone);
            return;
          }
        }
      }
    }

    fetchRealPhone();
    return () => { isMounted = false; };
  }, [currentAppt.id, currentAppt.landlord_code, currentAppt.landlord_phone, currentAppt.building_id, currentAppt.room_id, currentAppt.company_phone]);

  const isCheckedIn =
    currentAppt.checkin_status === 'checked_in_gps' ||
    currentAppt.checkin_status === 'checked_in_photo' ||
    currentAppt.status === 'completed';

  // SĐT mở khóa trong 60 phút. Sau 60 phút ➔ TỰ ĐỘNG ÂM THẦM KHÓA LẠI (Không đếm ngược, không thông báo)
  const isUnlocked = (() => {
    const now = Date.now();

    if (currentAppt.phone_unlocked_until) {
      return new Date(currentAppt.phone_unlocked_until).getTime() > now;
    }

    if (currentAppt.on_the_way_at) {
      const onTheWayTime = new Date(currentAppt.on_the_way_at).getTime();
      return now - onTheWayTime < 60 * 60 * 1000;
    }

    if (currentAppt.checkin_at) {
      const checkinTime = new Date(currentAppt.checkin_at).getTime();
      return now - checkinTime < 60 * 60 * 1000;
    }

    return false;
  })();

  const landlordPhone =
    fetchedLandlordPhone ||
    ((currentAppt as any).landlord_phone && (currentAppt as any).landlord_phone !== currentAppt.company_phone ? (currentAppt as any).landlord_phone : null) ||
    (currentAppt as any).landlord?.phone ||
    'Chưa cập nhật SĐT Chủ nhà';

  // Stage 2: Handle Slide to On The Way + Capture GPS Position 1
  const handleOnTheWay = async () => {
    setStartingWay(true);

    const submitOnTheWay = async (lat: number | null, lng: number | null) => {
      try {
        const res = await fetch('/api/appointments/on-the-way', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: appointment.id,
            lat,
            lng,
            saleName: appointment.assigned_to_name || 'Sale',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Lỗi khi cập nhật trạng thái xuất phát');
        }
        toast.success('🚘 Đã lấy GPS Lần 1, Mở khóa SĐT Chủ nhà & Báo Chủ nhà!');
        setLocalAppt((prev: any) => ({
          ...(data.appointment || prev),
          status: 'on_the_way',
          on_the_way_at: new Date().toISOString(),
          phone_unlocked_until: data.phoneUnlockedUntil || new Date(Date.now() + 3600000).toISOString(),
          on_the_way_lat: lat,
          on_the_way_lng: lng,
        }));
        if (onRefresh) onRefresh();
      } catch (err: any) {
        toast.error(err.message || 'Không thể phát tín hiệu xuất phát.');
        throw err;
      } finally {
        setStartingWay(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          submitOnTheWay(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('GPS 1 Error:', err);
          submitOnTheWay(null, null);
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      submitOnTheWay(null, null);
    }
  };

  // Stage 3: Handle GPS Check-in (GPS Position 2)
  const handleGpsCheckin = () => {
    setLoadingGps(true);
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị. Chuyển sang Check-in bằng Ảnh TimeMark.');
      setLoadingGps(false);
      setOpenCamera(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        setGpsStatusText(`Đã lấy vị trí (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

        try {
          const res = await fetch('/api/appointments/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appointmentId: appointment.id,
              method: 'gps',
              lat,
              lng,
            }),
          });
          const data = await res.json();

          if (data.isOutOfRange) {
            toast.warning(data.message);
            setOpenCamera(true);
          } else if (data.success) {
            toast.success('🎉 Check-in GPS Lần 2 tại tòa nhà thành công!');
            setLocalAppt((prev: any) => ({
              ...(data.appointment || prev),
              checkin_status: data.checkinStatus || 'checked_in_gps',
              phone_unlocked_until: data.phoneUnlockedUntil || new Date(Date.now() + 3600000).toISOString(),
              status: 'completed',
            }));
            if (onRefresh) onRefresh();
          } else {
            toast.error(data.error || 'Check-in thất bại.');
          }
        } catch (err: any) {
          toast.error(err.message || 'Lỗi kết nối Check-in.');
        } finally {
          setLoadingGps(false);
        }
      },
      (err) => {
        console.warn('GPS 2 Error:', err);
        setGpsStatusText('Sóng GPS yếu / Từ chối định vị');
        toast.info('Sóng GPS yếu. Chuyển sang Check-in bằng 2 Ảnh TimeMark thực địa.');
        setLoadingGps(false);
        setOpenCamera(true);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Stage 3: Handle Photo Check-in Submit from Camera Modal
  const handlePhotoCheckinComplete = async (photos: { photoClient: string; photoBuilding: string }) => {
    try {
      const res = await fetch('/api/appointments/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          method: 'photo',
          lat: currentLat,
          lng: currentLng,
          photoClient: photos.photoClient,
          photoBuilding: photos.photoBuilding,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi lưu minh chứng Check-in.');
      }
      toast.success('🎉 Check-in bằng 2 Ảnh TimeMark thực địa thành công!');
      setLocalAppt((prev: any) => ({
        ...(data.appointment || prev),
        checkin_status: data.checkinStatus || 'checked_in_photo',
        phone_unlocked_until: data.phoneUnlockedUntil || new Date(Date.now() + 3600000).toISOString(),
        checkin_photo_with_client: photos.photoClient,
        checkin_photo_building: photos.photoBuilding,
        status: 'completed',
      }));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu Check-in.');
    }
  };

  // Helper for Zalo Copy Template
  const handleCopyZaloSample = () => {
    const saleName = currentAppt.assigned_to_name || 'Sale';
    const customerName = currentAppt.customer_name || 'Khách hàng';
    const roomTitle = currentAppt.room_title || 'căn hộ';
    const buildingAddress = currentAppt.building_address || currentAppt.area || '';
    const dateStr = currentAppt.date ? new Date(currentAppt.date).toLocaleDateString('vi-VN') : '';
    const timeStr = currentAppt.time || '';

    const text = `Xin chào Chủ nhà! Em là ${saleName} bên RealHome. Em đang dẫn Khách hàng ${customerName} qua xem ${roomTitle} (${buildingAddress}) lúc ${timeStr} ${dateStr}. Nhờ Chủ nhà hỗ trợ mở cửa / chuẩn bị chìa khóa giúp em nhé! Cảm ơn Chủ nhà!`;

    navigator.clipboard.writeText(text).then(() => {
      toast.success('📋 Đã copy mẫu tin nhắn Zalo gửi Chủ nhà!', {
        description: 'Bạn hãy dán (Paste) vào Zalo để gửi cho Chủ nhà nhé.',
        duration: 4000,
      });
    }).catch(() => {
      toast.error('Trình duyệt không hỗ trợ copy tự động');
    });
  };

  // Enforce Check-in Gate before Feedback or Chain Showing
  const enforceCheckinGate = (actionCallback: () => void) => {
    if (!isCheckedIn) {
      toast.error('⚠️ Bạn phải thực hiện Check-in tại tòa nhà (bằng GPS hoặc 2 Ảnh TimeMark) trước khi thực hiện bước này!', {
        duration: 5000,
      });
      return;
    }
    actionCallback();
  };

  return (
    <Card className="border border-slate-200 shadow-md bg-white rounded-xl overflow-hidden">
      <CardHeader className="bg-slate-900 text-white p-3.5 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-400">
          <ShieldCheck className="h-4 w-4" />
          QUY TRÌNH DẪN KHÁCH & CHECK-IN
        </CardTitle>
        <Badge
          className={
            isCheckedIn
              ? 'bg-green-600 text-white border-0'
              : appointment.status === 'on_the_way' || appointment.on_the_way_at
              ? 'bg-blue-600 text-white border-0'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
          }
        >
          {isCheckedIn
            ? 'Đã Check-in'
            : appointment.status === 'on_the_way' || appointment.on_the_way_at
            ? 'Đang di chuyển'
            : 'Chờ xuất phát'}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* BUILDING MANAGER QUICK INFO */}
        {((currentAppt as any).landlord_phone || (currentAppt as any).landlord_name) && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-600 truncate">
                {(currentAppt as any).landlord_name
                  ? <><strong className="text-slate-800">{(currentAppt as any).landlord_name}</strong></>
                  : <span className="text-slate-500">Chủ nhà</span>
                }
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-slate-500 font-medium">SĐT Chủ:</span>
              <span className="font-mono font-bold text-slate-700 text-[11px] tracking-wide">
                {isUnlocked
                  ? (currentAppt as any).landlord_phone || '—'
                  : ((currentAppt as any).landlord_phone
                      ? `${String((currentAppt as any).landlord_phone).slice(0, 4)} *** ${String((currentAppt as any).landlord_phone).slice(-3)}`
                      : '—')
                }
              </span>
            </div>
          </div>
        )}

        {/* STAGE 1: 90m Reminder Status */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2.5 text-amber-900">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <div>
            <div className="font-bold">Giai đoạn 1: Tự động Nhắc lịch (trước 90 phút)</div>
            <div className="text-[11px] opacity-90">
              {currentAppt.reminded_90m
                ? '✅ Đã bắn thông báo nhắc Sale & Chủ nhà di chuyển.'
                : `Hệ thống tự động bắn nhắc lịch lúc ${currentAppt.time || '15-90 phút trước'}.`}
            </div>
          </div>
        </div>

        {/* STAGE 2: Slide to Confirm Heading Over + Capture GPS 1 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-700 font-semibold">
            <span>Bước 1: Vuốt xuất phát & Mở số Chủ nhà</span>
            {currentAppt.on_the_way_at && (
              <span className="text-[10px] text-blue-600 font-mono">
                Xuất phát: {new Date(currentAppt.on_the_way_at).toLocaleTimeString('vi-VN')}
              </span>
            )}
          </div>

          <SlideToConfirm
            onConfirm={handleOnTheWay}
            label="Vuốt để Xuất phát & Mở SĐT Chủ nhà"
            confirmedLabel="Đã xuất phát"
            disabled={isCheckedIn || currentAppt.status === 'on_the_way' || !!currentAppt.on_the_way_at || startingWay}
          />
        </div>

        {/* PHONE UNLOCK / CALL & ZALO CONTROL (STAGE 2 UNLOCKED FOR 60M SILENT AUTO-LOCK) */}
        <div className="pt-1">
          {isUnlocked ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 space-y-2.5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                  Bước 2: SĐT CHỦ NHÀ / QUẢN LÝ TÒA
                </div>
              </div>

              <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-lg p-2 gap-2 flex-wrap sm:flex-nowrap">
                <div className="font-mono text-sm font-bold text-emerald-950 tracking-wider">
                  {landlordPhone}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs gap-1"
                    asChild
                  >
                    <a href={`tel:${landlordPhone}`}>
                      <Phone className="h-3.5 w-3.5" /> Gọi điện
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyZaloSample}
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold h-8 text-xs gap-1"
                    title="Copy mẫu tin nhắn Zalo"
                  >
                    <Copy className="h-3.5 w-3.5 text-emerald-600" /> Copy Mẫu Zalo
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-600 text-[11px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">Bước 2: SĐT Chủ nhà: <strong className="font-mono text-slate-800">0988 *** 321</strong></span>
              </div>
              <Badge variant="outline" className="text-slate-500 border-slate-300 text-[10px] shrink-0">
                Vuốt Xuất phát để mở
              </Badge>
            </div>
          )}
        </div>

        {/* STAGE 3: Check-in at Building (GPS Position 2 + Live TimeMark Camera) */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between font-semibold text-slate-700">
            <span>Bước 3: Check-in tại tòa nhà</span>
            {isCheckedIn && (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {currentAppt.checkin_status === 'checked_in_gps' ? 'Check-in GPS 2' : 'Check-in Ảnh TimeMark'}
              </Badge>
            )}
          </div>

          {/* Quick 1-Tap GPS Check-in option if not yet checked in */}
          {!isCheckedIn && (
            <Button
              onClick={handleGpsCheckin}
              disabled={loadingGps}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs gap-1.5"
            >
              {loadingGps ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Navigation className="h-3.5 w-3.5 shrink-0" />}
              <span>Check-in GPS Lần 2</span>
            </Button>
          )}

          {/* 2 Ô HIỂN THỊ ẢNH THỰC ĐỊA NGAY TỪ ĐẦU */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Box 1: Sale + Khách hàng */}
              <div
                onClick={() => setOpenCamera(true)}
                className={`aspect-video rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center p-2 text-center relative overflow-hidden group ${
                  currentAppt.checkin_photo_with_client
                    ? 'border-green-500 bg-black'
                    : 'border-dashed border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 hover:border-amber-400'
                }`}
              >
                {currentAppt.checkin_photo_with_client ? (
                  <>
                    <img src={currentAppt.checkin_photo_with_client} alt="Ảnh 1: Với Khách" className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Ảnh 1: Khách
                    </div>
                  </>
                ) : (
                  <div className="space-y-1 text-amber-900">
                    <Camera className="h-5 w-5 mx-auto text-amber-600 animate-pulse" />
                    <span className="font-bold text-[11px] block leading-tight">1. Ảnh với Khách</span>
                  </div>
                )}
              </div>

              {/* Box 2: Mặt tiền tòa nhà */}
              <div
                onClick={() => setOpenCamera(true)}
                className={`aspect-video rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center p-2 text-center relative overflow-hidden group ${
                  currentAppt.checkin_photo_building
                    ? 'border-green-500 bg-black'
                    : 'border-dashed border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 hover:border-amber-400'
                }`}
              >
                {currentAppt.checkin_photo_building ? (
                  <>
                    <img src={currentAppt.checkin_photo_building} alt="Ảnh 2: Tòa nhà" className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Ảnh 2: Tòa nhà
                    </div>
                  </>
                ) : (
                  <div className="space-y-1 text-amber-900">
                    <Camera className="h-5 w-5 mx-auto text-amber-600 animate-pulse" />
                    <span className="font-bold text-[11px] block leading-tight">2. Ảnh Tòa nhà</span>
                  </div>
                )}
              </div>
            </div>

            {/* NÚT CHỤP ẢNH / CHỤP LẠI NẰM Ở GIỮA BÊN DƯỚI 2 ẢNH */}
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                onClick={() => setOpenCamera(true)}
                className="border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold h-8 text-xs gap-1.5 px-5 rounded-full shadow-2xs"
              >
                <Camera className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>
                  {currentAppt.checkin_photo_with_client || currentAppt.checkin_photo_building
                    ? '📷 Chụp lại 2 ảnh TimeMark'
                    : '📷 Chụp 2 ảnh TimeMark thực địa'}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* STAGE 5: POST-SHOWING FEEDBACK & CRM SYNC (WITH CHECK-IN GATE ENFORCEMENT) */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between font-semibold text-slate-700">
            <span>Giai đoạn 5: Báo cáo kết quả xem phòng</span>
            {currentAppt.result_status && (
              <Badge
                className={
                  currentAppt.result_status === 'deposit_pending'
                    ? 'bg-emerald-600 text-white border-0 text-[10px]'
                    : currentAppt.result_status === 'interested'
                    ? 'bg-amber-500 text-white border-0 text-[10px]'
                    : currentAppt.result_status === 'rejected'
                    ? 'bg-rose-600 text-white border-0 text-[10px]'
                    : 'bg-slate-600 text-white border-0 text-[10px]'
                }
              >
                {currentAppt.result_status === 'deposit_pending'
                  ? '🎉 Chốt cọc'
                  : currentAppt.result_status === 'interested'
                  ? '🌟 Khách thích'
                  : currentAppt.result_status === 'rejected'
                  ? '❌ Khách không ưng'
                  : '🚫 Bùng kèo'}
              </Badge>
            )}
          </div>

          <Button
            onClick={() => enforceCheckinGate(() => setOpenFeedbackModal(true))}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-9 text-xs rounded-xl shadow-sm gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            {currentAppt.result_status ? '✏️ Cập nhật lại Báo cáo kết quả' : '📊 Báo cáo kết quả sau xem phòng'}
          </Button>
        </div>

        {/* FAST CHAIN SHOWING ACTION BUTTON FOR MOBILE (WITH CHECK-IN GATE ENFORCEMENT) */}
        <div className="pt-2 border-t border-slate-100">
          <Button
            onClick={() => enforceCheckinGate(() => setOpenChainModal(true))}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold min-h-[40px] h-auto py-2 text-xs rounded-xl shadow-md gap-1.5 active:scale-[0.98] transition-transform leading-tight whitespace-normal text-center"
          >
            <Zap className="h-4 w-4 fill-white shrink-0 animate-pulse" />
            <span>🚀 Dẫn tiếp căn khác cho khách này (Nối tiếp 1-Tap)</span>
          </Button>
        </div>
      </CardContent>

      {/* TimeMark Camera Modal Component */}
      <TimeMarkCameraModal
        open={openCamera}
        onOpenChange={setOpenCamera}
        roomTitle={appointment.room_title || 'Căn hộ'}
        buildingAddress={appointment.building_address || appointment.area || ''}
        saleName={appointment.assigned_to_name || 'Sale'}
        customerName={appointment.customer_name || 'Khách hàng'}
        gpsLat={currentLat}
        gpsLng={currentLng}
        gpsStatus={gpsStatusText}
        onComplete={handlePhotoCheckinComplete}
      />

      {/* Fast Chain Showing Modal Component */}
      <ChainShowingModal
        open={openChainModal}
        onOpenChange={setOpenChainModal}
        parentAppointmentId={appointment.id}
        customerName={appointment.customer_name || 'Khách hàng'}
        companyId={appointment.company_id}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* Post-showing Feedback Outcome Modal */}
      <ShowingFeedbackModal
        open={openFeedbackModal}
        onOpenChange={setOpenFeedbackModal}
        appointment={appointment}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
        onOpenChainShowing={() => enforceCheckinGate(() => setOpenChainModal(true))}
      />
    </Card>
  );
}
