'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Sparkles, Rocket, CheckCircle2, ArrowRight, X, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function KYCPromptBanner() {
  const { profile, role } = useAuth();
  const [kycStatus, setKycStatus] = useState<string>('unverified');
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkKyc() {
      if (!profile?.id) {
        setLoading(false);
        return;
      }
      try {
        // 1. Check profiles table
        const { data: profData } = await supabase
          .from('profiles')
          .select('is_kyc_verified, kyc_status, landlord_id')
          .eq('id', profile.id)
          .maybeSingle();

        if (profData?.is_kyc_verified || profData?.kyc_status === 'verified' || profData?.kyc_status === 'approved') {
          setKycStatus('verified');
          setLoading(false);
          return;
        }

        const landlordId = profData?.landlord_id || (profile as any)?.landlord_id;

        // 2. Check landlords table if landlord account
        if (landlordId) {
          const { data: landlordData } = await supabase
            .from('landlords')
            .select('is_kyc_verified, kyc_status')
            .eq('id', landlordId)
            .maybeSingle();

          if (landlordData?.is_kyc_verified || landlordData?.kyc_status === 'verified' || landlordData?.kyc_status === 'approved') {
            setKycStatus('verified');
            setLoading(false);
            return;
          }
        }

        // 3. Check kyc_verifications table for approved/verified records
        let kycQuery = supabase
          .from('kyc_verifications')
          .select('status');

        if (landlordId) {
          kycQuery = kycQuery.or(`user_id.eq.${profile.id},landlord_id.eq.${landlordId}`);
        } else {
          kycQuery = kycQuery.eq('user_id', profile.id);
        }

        const { data: kycRecs } = await kycQuery;

        if (kycRecs && kycRecs.some((r: any) => r.status === 'verified' || r.status === 'approved')) {
          setKycStatus('verified');
          setLoading(false);
          return;
        }

        // Default status
        setKycStatus((profile as any)?.is_kyc_verified ? 'verified' : ((profile as any)?.kyc_status || 'unverified'));
      } catch (err) {
        console.error('Error checking KYC status:', err);
      } finally {
        setLoading(false);
      }
    }
    checkKyc();
  }, [profile]);

  if (loading || kycStatus === 'verified' || kycStatus === 'approved' || dismissed) {
    return null;
  }

  const isLandlord = role === 'landlord';

  return (
    <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/80 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-500/30 my-4 overflow-hidden group">
      {/* Decorative Background Glowing Orbs */}
      <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
      <div className="absolute -left-16 -top-16 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Dismiss Button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors z-20"
        title="Tạm ẩn thông báo"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div className="space-y-3.5 max-w-3xl">
          {/* Category Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 backdrop-blur-md text-xs font-black uppercase tracking-wider text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
            KHUYẾN MÃI ĐẶC QUYỀN KYC
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black font-heading leading-tight tracking-tight text-white drop-shadow-sm">
            {isLandlord
              ? '🎁 Xác thực KYC Chính Chủ — Nhận ngay Gói Đẩy Tin 10 Ngày Miễn Phí!'
              : '🛡️ Xác thực KYC — Ưu tiên nhận khách!'}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            {isLandlord
              ? 'Tài khoản của bạn hiện chưa xác thực KYC. Hoàn tất xác minh sinh trắc học CCCD ngay hôm nay để nhận huy hiệu Nguồn hàng sạch 100% và tặng gói đẩy tin VIP top đầu trang tìm kiếm.'
              : 'Tài khoản của bạn chưa được xác thực. Xác thực ngay để khẳng định bạn là môi giới RealHome chính thức và được ưu tiên phân bổ khách hàng tiềm năng.'}
          </p>

          {/* Quick Perks List - Independent Icon Badges */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-300 font-bold text-xs shadow-md">
              <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Tăng 300% tỷ lệ chốt phòng</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-amber-300 font-bold text-xs shadow-md">
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <Rocket className="w-3.5 h-3.5" />
              </div>
              <span>Miễn phí gói đẩy tin VIP 10 ngày</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-cyan-300 font-bold text-xs shadow-md">
              <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
                <BadgeCheck className="w-3.5 h-3.5" />
              </div>
              <span>Tích xanh uy tín không lo scam</span>
            </div>
          </div>
        </div>

        {/* CTA Action Button */}
        <div className="shrink-0 lg:self-center">
          <Link
            href="/admin/kyc"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5 text-slate-950 shrink-0" />
            <span>Xác thực KYC ngay (Chỉ 2 phút)</span>
            <ArrowRight className="w-4 h-4 text-slate-950 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
