'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Sparkles, Rocket, CheckCircle2, ArrowRight, X } from 'lucide-react';
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
    <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-orange-300/40 my-4 overflow-hidden group">
      {/* Decorative Background Elements */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
      
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
        title="Tạm ẩn thông báo"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold uppercase tracking-wider text-amber-100">
            <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-spin" />
            Khuyến mãi đặc quyền KYC
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold leading-snug tracking-tight">
            {isLandlord
              ? '🎁 Xác thực KYC Chính Chủ — Nhận ngay Gói Đẩy Tin 10 Ngày Miễn Phí!'
              : '🛡️ Xác thực KYC Môi Giới — Ưu tiên nhận CRM Lead & Badge Tích Xanh!'}
          </h3>

          <p className="text-xs sm:text-sm text-orange-50 font-medium leading-relaxed">
            {isLandlord
              ? 'Tài khoản của bạn hiện chưa xác thực KYC. Hoàn tất xác minh sinh trắc học CCCD ngay hôm nay để nhận huy hiệu Nguồn hàng sạch 100% và tặng gói đẩy tin VIP top đầu trang tìm kiếm.'
              : 'Tài khoản môi giới của bạn chưa được cấp tích xanh. Xác thực ngay để khẳng định Môi giới RealHome chính thức và được ưu tiên phân bổ khách hàng tiềm năng.'}
          </p>

          {/* Quick Perks List */}
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold text-amber-100">
            <span className="flex items-center gap-1.5 bg-black/15 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Tăng 300% tỷ lệ chốt phòng
            </span>
            <span className="flex items-center gap-1.5 bg-black/15 px-2.5 py-1 rounded-lg">
              <Rocket className="w-3.5 h-3.5 text-yellow-300" /> Miễn phí gói đẩy tin VIP 10 ngày
            </span>
            <span className="flex items-center gap-1.5 bg-black/15 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" /> Tích xanh uy tín không lo scam
            </span>
          </div>
        </div>

        {/* CTA Action Button */}
        <div className="shrink-0">
          <Link
            href="/admin/kyc"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-orange-600 hover:bg-orange-50 font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <ShieldCheck className="w-5 h-5 text-orange-600" />
            <span>Xác thực KYC ngay (Chỉ 2 phút)</span>
            <ArrowRight className="w-4 h-4 text-orange-600" />
          </Link>
        </div>
      </div>
    </div>
  );
}
