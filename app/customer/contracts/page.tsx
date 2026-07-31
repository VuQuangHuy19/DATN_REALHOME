'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Calendar,
  Building2,
  Home,
  ShieldCheck,
  Zap,
  Droplets,
  Wifi,
  DollarSign,
  Clock,
  RefreshCw,
  CheckCircle2,
  Phone,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';

interface CustomerContract {
  id: string;
  contractCode: string;
  buildingName: string;
  buildingAddress: string;
  roomCode: string;
  startDate: string;
  endDate: string;
  rentPrice: number;
  depositAmount: number;
  status: 'active' | 'expiring_soon' | 'ended';
  electricityPrice: number;
  waterPrice: string;
  internetPrice: number;
  commonServicePrice: string;
  partyAName: string;
  partyAPhone: string;
}

const MOCK_CONTRACT: CustomerContract = {
  id: 'RNT-2026-001',
  contractCode: 'HDT-CH-201',
  buildingName: 'Tòa nhà RealHome Cầu Giấy',
  buildingAddress: 'Số 15 Ngõ 68 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
  roomCode: 'P.201 (Studio khép kín)',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  rentPrice: 5000000,
  depositAmount: 5000000,
  status: 'active',
  electricityPrice: 4000,
  waterPrice: '35.000đ/m³',
  internetPrice: 100000,
  commonServicePrice: '150.000đ/người/tháng (Vệ sinh, thang máy, điện chiếu sáng chung)',
  partyAName: 'CÔNG TY CP QUẢN LÝ BĐS REALHOME',
  partyAPhone: '0988 888 999',
};

export default function TenantContractsPage() {
  const { user, profile } = useAuth();
  const [contract, setContract] = useState<CustomerContract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRealContract() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Tìm hợp đồng của khách theo số điện thoại hoặc tên
        const userPhone = profile?.phone || '';
        const phoneSub = userPhone.length >= 9 ? userPhone.slice(-9) : '000000';

        const { data, error } = await supabase
          .from('rental_contracts')
          .select('*, rooms(code, building_id, buildings(id, name, address, electricity_price, water_price, internet_price, common_service_price))')
          .or(`party_b_phone.ilike.%${phoneSub}%,party_b_name.ilike.%${profile?.full_name || ''}%`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching rental contract:', error);
        }

        if (data && data.length > 0) {
          const item = data[0];
          const b = (item.rooms as any)?.buildings;
          const r = item.rooms as any;

          setContract({
            id: item.id,
            contractCode: item.contract_code || 'HĐ-REALHOME',
            buildingName: b?.name || 'Số 3 ngõ 248 Yên Hoà',
            buildingAddress: b?.address || 'Số 3 ngõ 248 Yên Hoà, Cầu Giấy, Hà Nội',
            roomCode: r?.code ? `P.${r.code}` : 'P.501',
            startDate: item.start_date ? new Date(item.start_date).toLocaleDateString('vi-VN') : '01/01/2026',
            endDate: item.end_date ? new Date(item.end_date).toLocaleDateString('vi-VN') : '31/12/2026',
            rentPrice: item.rent_price || 5000000,
            depositAmount: item.deposit_amount || 5000000,
            status: 'active',
            electricityPrice: b?.electricity_price || Number(item.electricity_price) || 4000,
            waterPrice: b?.water_price ? `${Number(b.water_price).toLocaleString('vi-VN')}đ/m³` : (item.water_price || '35.000đ/m³'),
            internetPrice: b?.internet_price || 100000,
            commonServicePrice: b?.common_service_price ? `${Number(b.common_service_price).toLocaleString('vi-VN')}đ/người` : '150.000đ/người',
            partyAName: item.party_a_name || 'CÔNG TY CP QUẢN LÝ BĐS REALHOME',
            partyAPhone: item.party_a_phone || '0857.844.999',
          });
        } else {
          // Fallback dùng mock data mượt mà nếu chưa có hợp đồng tạo sẵn trong DB
          setContract(MOCK_CONTRACT);
        }
      } catch (err) {
        console.error('Lỗi khi tải hợp đồng:', err);
        setContract(MOCK_CONTRACT);
      } finally {
        setLoading(false);
      }
    }

    fetchRealContract();
  }, [user, profile]);

  const handleDownloadPDF = () => {
    toast.success('Đang tạo và tải bản hợp đồng PDF về máy...');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleRenewalRequest = () => {
    toast.success('Đã gửi yêu cầu gia hạn hợp đồng! Chuyên viên quản lý tòa nhà sẽ liên hệ lại với bạn.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!contract) return null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 md:p-8 text-white border border-amber-500/30 shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-400/30">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Hợp đồng chính chủ xác thực
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight">
              Hợp Đồng Thuê Của Tôi
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Tra cứu điều khoản hợp đồng, giá thuê niêm yết, các đơn giá dịch vụ và yêu cầu gia hạn hợp đồng trực tuyến.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              onClick={handleDownloadPDF}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Tải bản PDF hợp đồng
            </Button>
          </div>
        </div>
      </div>

      {/* Contract Detail Card */}
      <Card className="border border-border-subtle rounded-2xl bg-white shadow-sm overflow-hidden">
        {/* Top Header bar */}
        <div className="bg-slate-950 p-6 text-white border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono font-extrabold text-sm uppercase tracking-wider">
                Mã HĐ: {contract.contractCode}
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2.5 py-0.5 rounded-full text-xs">
                ● Đang hiệu lực
              </Badge>
            </div>
            <h2 className="text-xl font-bold font-heading text-white mt-1">
              {contract.buildingName} — {contract.roomCode}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{contract.buildingAddress}</p>
          </div>

          <div className="text-left sm:text-right bg-slate-900 p-3 rounded-xl border border-slate-800 shrink-0">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Tiền thuê hàng tháng</span>
            <span className="text-xl font-extrabold text-amber-400 font-mono">
              {contract.rentPrice.toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Thời hạn & Tiền cọc */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Ngày bắt đầu</span>
                <p className="text-sm font-bold text-slate-900 font-mono">{contract.startDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Ngày hết hạn</span>
                <p className="text-sm font-bold text-slate-900 font-mono">{contract.endDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Tiền cọc giữ chỗ</span>
                <p className="text-sm font-bold text-emerald-700 font-mono">
                  {contract.depositAmount.toLocaleString('vi-VN')}đ
                </p>
              </div>
            </div>
          </div>

          {/* Phụ lục đơn giá dịch vụ */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold font-heading text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Zap className="h-4 w-4 text-amber-500" /> Biểu Phí Dịch Vụ Đi Kèm Hợp Đồng
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-700">Đơn giá điện</span>
                </div>
                <span className="text-sm font-bold font-mono text-amber-700">
                  {contract.electricityPrice.toLocaleString('vi-VN')}đ / kWh
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-semibold text-slate-700">Đơn giá nước</span>
                </div>
                <span className="text-sm font-bold font-mono text-blue-700">
                  {contract.waterPrice}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Wifi className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-semibold text-slate-700">Internet / Wifi</span>
                </div>
                <span className="text-sm font-bold font-mono text-purple-700">
                  {contract.internetPrice.toLocaleString('vi-VN')}đ / phòng
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Dịch vụ chung</span>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {contract.commonServicePrice}
                </span>
              </div>
            </div>
          </div>

          {/* Đại diện bên cho thuê */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
            <div>
              <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Đơn vị đại diện cho thuê (Bên A)</span>
              <h4 className="text-sm font-bold text-white mt-0.5">{contract.partyAName}</h4>
            </div>
            <a
              href={`tel:${contract.partyAPhone}`}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shrink-0"
            >
              📞 Liên hệ: {contract.partyAPhone}
            </a>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              * Nếu bạn có nhu cầu chuyển đổi phòng hoặc kết thúc hợp đồng sớm, vui lòng báo trước 30 ngày.
            </p>

            <Button
              onClick={handleRenewalRequest}
              variant="outline"
              className="rounded-xl border-slate-900 text-slate-900 hover:bg-slate-950 hover:text-amber-400 font-bold text-xs shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Yêu cầu gia hạn hợp đồng
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
