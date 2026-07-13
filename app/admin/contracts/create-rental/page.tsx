'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRooms } from '@/lib/hooks/useEntities';
import { createRentalContract } from '@/src/features/finance/services/rental_contracts';
import { updateDepositContract } from '@/src/features/finance/services/deposit_contracts';
import { updateRoom } from '@/src/features/rooms/services/rooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, FileText, Landmark, User, Building, Settings, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { FormattedDateInput } from '@/components/ui/formatted-date-input';

const formatNumber = (num: number | string): string => {
  if (!num && num !== 0) return '';
  const clean = String(num).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('vi-VN');
};

const parseNumber = (str: string): number => {
  const clean = str.replace(/\./g, '');
  return clean ? Number(clean) : 0;
};

const toDisplay = (val: string) => {
  if (!val) return '';
  const parts = val.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return val;
};
import { supabase } from '@/lib/supabase/client';

function CreateRentalContractPage() {
  const { company, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const pathPrefix = pathname?.startsWith('/landlord') ? '/landlord' : '/admin';
  const depositId = searchParams.get('deposit_id');
  const { items: rooms, loading: roomsLoading } = useRooms(company?.id);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [rentPrice, setRentPrice] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [signLocation, setSignLocation] = useState<string>('');
  
  // Party A State
  const [partyAName, setPartyAName] = useState<string>('Võ Quang Huy');
  const [partyADob, setPartyADob] = useState<string>('2004-04-16');
  const [partyAPhone, setPartyAPhone] = useState<string>('0857844999');
  const [partyAIdCard, setPartyAIdCard] = useState<string>('008204007039');
  const [partyAIdDate, setPartyAIdDate] = useState<string>('2021-09-12');
  const [partyAIdPlace, setPartyAIdPlace] = useState<string>('Cục quản lý về trật tự xã hội');
  const [partyAAddress, setPartyAAddress] = useState<string>('Thôn Nhàn Thọ 2, xã Yên Nguyên, huyện Chiêm Hóa, tỉnh Tuyên Quang');

  // Party B State
  const [partyBName, setPartyBName] = useState<string>('');
  const [partyBDob, setPartyBDob] = useState<string>('');
  const [partyBPhone, setPartyBPhone] = useState<string>('');
  const [partyBIdCard, setPartyBIdCard] = useState<string>('');
  const [partyBIdDate, setPartyBIdDate] = useState<string>('');
  const [partyBIdPlace, setPartyBIdPlace] = useState<string>('');
  const [partyBAddress, setPartyBAddress] = useState<string>('');

  // Thỏa thuận thuê & dịch vụ
  const [electricityPrice, setElectricityPrice] = useState<number>(4000);
  const [waterPrice, setWaterPrice] = useState<string>('150000/người/tháng');
  const [servicePrice, setServicePrice] = useState<string>('200000/người/tháng');
  const [internetPrice, setInternetPrice] = useState<number>(180000);
  const [laundryPrice, setLaundryPrice] = useState<number>(100000);
  const [tenantCount, setTenantCount] = useState<number>(1);
  const [leaseDuration, setLeaseDuration] = useState<number>(9);
  const [terminationNotice, setTerminationNotice] = useState<number>(30);
  
  // Tenancy Specific State
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<number>(1);
  const [paymentDay, setPaymentDay] = useState<number>(5);
  const [handoverDate, setHandoverDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [agreementDate, setAgreementDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Tự động tính toán ngày kết thúc khi thay đổi start_date hoặc lease_duration
  useEffect(() => {
    if (!startDate || !leaseDuration) return;
    const start = new Date(startDate);
    start.setMonth(start.getMonth() + leaseDuration);
    setEndDate(start.toISOString().slice(0, 10));
  }, [startDate, leaseDuration]);

  // Tự động điền dữ liệu khi chọn phòng
  useEffect(() => {
    if (!selectedRoomId) return;
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (room) {
      setRentPrice(Number(room.price));
      if (!depositId) {
        setDepositAmount(Number(room.price) * 2); // Cọc thuê thường là 2 tháng
      }
      const address = room.buildings?.address || '';
      if (address && !signLocation) {
        setSignLocation(address);
      }
    }
  }, [selectedRoomId, rooms, depositId, signLocation]);

  // Load thông tin từ Hợp đồng cọc nếu có
  useEffect(() => {
    const depId = depositId;
    if (!depId) return;
    async function loadDeposit() {
      try {
        const { data, error } = (await supabase
          .from('deposit_contracts')
          .select('*, rooms(code, price, buildings(name, address, area))')
          .eq('id', depId!)
          .single()) as any;
        if (error) throw error;
        if (data) {
          setSelectedRoomId(data.room_id || '');
          setRentPrice(Number(data.rent_price));
          setDepositAmount(Number(data.deposit_amount));
          setSignLocation(data.sign_location || '');
          setPartyBAddress(data.party_b_address || '');
          setPartyBName(data.party_b_name || '');
          setPartyBPhone(data.party_b_phone || '');
          setPartyBIdCard(data.party_b_id_card || '');
          setPartyBIdDate(data.party_b_id_date || '');
          setPartyBIdPlace(data.party_b_id_place || '');
          setPartyBDob(data.party_b_dob || '');
          
          setPartyAName(data.party_a_name || 'Võ Quang Huy');
          setPartyAPhone(data.party_a_phone || '0857844999');
          setPartyAAddress(data.party_a_address || 'Thôn Nhàn Thọ 2, xã Yên Nguyên, huyện Chiêm Hóa, tỉnh Tuyên Quang');
          setPartyAIdCard(data.party_a_id_card || '008204007039');
          setPartyAIdDate(data.party_a_id_date || '2021-09-12');
          setPartyAIdPlace(data.party_a_id_place || 'Cục quản lý về trật tự xã hội');
          setPartyADob(data.party_a_dob || '2004-04-16');

          setElectricityPrice(Number(data.electricity_price) || 4000);
          setWaterPrice(data.water_price || '150000/người/tháng');
          setServicePrice(data.service_price || '200000/người/tháng');
          setTenantCount(Number(data.tenant_count) || 1);
          setLeaseDuration(Number(data.lease_duration_months) || 9);
          setTerminationNotice(Number(data.termination_notice_days) || 30);
          
          if (data.other_services && typeof data.other_services === 'object') {
            const os = data.other_services as any;
            if (os.internet) {
              const netVal = parseInt(os.internet.replace(/[^\d]/g, ''), 10);
              if (!isNaN(netVal)) setInternetPrice(netVal);
            }
            if (os.laundry) {
              const laundryVal = parseInt(os.laundry.replace(/[^\d]/g, ''), 10);
              if (!isNaN(laundryVal)) setLaundryPrice(laundryVal);
            }
          }
        }
      } catch (err: any) {
        toast.error('Lỗi khi tải thông tin hợp đồng cọc: ' + err.message);
      }
    }
    loadDeposit();
  }, [depositId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company?.id) return;
    if (!selectedRoomId) {
      toast.error('Vui lòng chọn phòng thuê');
      return;
    }

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const generatedCode = `HĐT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const otherServicesJson = {
      internet: `${internetPrice.toLocaleString('vi-VN')}đ/tháng`,
      laundry: `${laundryPrice.toLocaleString('vi-VN')}đ/phòng`
    };

    const payload = {
      company_id: company.id,
      room_id: selectedRoomId,
      deposit_contract_id: depositId || null,
      contract_code: generatedCode,
      status: 'active' as const,
      agreement_date: agreementDate,
      start_date: startDate,
      end_date: endDate,
      billing_cycle_months: billingCycle,
      payment_day_of_month: paymentDay,
      handover_date: handoverDate || null,

      // Bên A
      party_a_name: partyAName,
      party_a_dob: partyADob || null,
      party_a_address: partyAAddress || null,
      party_a_id_card: partyAIdCard || null,
      party_a_id_date: partyAIdDate || null,
      party_a_id_place: partyAIdPlace || null,
      party_a_phone: partyAPhone || null,

      // Bên B
      party_b_name: partyBName,
      party_b_phone: partyBPhone,
      party_b_dob: partyBDob || null,
      party_b_id_card: partyBIdCard || null,
      party_b_id_date: partyBIdDate || null,
      party_b_id_place: partyBIdPlace || null,
      party_b_address: partyBAddress || null,

      // Điều khoản
      rent_price: rentPrice,
      electricity_price: electricityPrice,
      water_price: waterPrice,
      service_price: servicePrice,
      other_services: otherServicesJson,
      tenant_count: tenantCount,
      payment_method: formData.get('payment_method') as string || 'Chuyển khoản hàng tháng',
      deposit_amount: depositAmount,

      note: formData.get('note') as string || null,
      created_by: profile?.id || null,
    };

    try {
      // 1. Tạo hợp đồng thuê chính thức
      await createRentalContract(payload);

      // 2. Nếu chuyển đổi từ hợp đồng cọc, cập nhật trạng thái cọc thành 'converted'
      if (depositId) {
        await updateDepositContract(depositId, { status: 'converted' });
      }

      // 3. Cập nhật trạng thái phòng sang 'rented'
      await updateRoom(selectedRoomId, { status: 'rented' });

      toast.success('Lập hợp đồng thuê chính thức thành công!');
      router.push(`${pathPrefix}/contracts`);
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="border-border hover:bg-bg-subtle text-ink rounded-lg">
          <Link href={`${pathPrefix}/contracts`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Lập Hợp Đồng Thuê Chính Thức</h1>
          <p className="text-ink-muted text-sm mt-0.5">Soạn thảo hợp đồng thuê căn hộ/phòng trọ dài hạn</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Khối 1: Chọn phòng */}
        <Card className="border-border shadow-none rounded-lg bg-white border-t-2 border-t-accent">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <Building className="h-5 w-5 text-accent" />
              1. Thông tin Phòng & Thời hạn thuê
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted">Chọn phòng thuê và xác định chu kỳ, ngày thanh toán</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="room_select" className="text-ink font-semibold text-xs uppercase tracking-wider">Chọn phòng *</Label>
              {roomsLoading ? (
                <div className="flex items-center gap-2 h-10 border border-border rounded-lg px-3 text-ink-muted bg-bg-subtle/50 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" /> Đang tải danh sách phòng...
                </div>
              ) : (
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId} disabled={!!depositId}>
                  <SelectTrigger id="room_select" className="rounded-lg border-border focus-visible:ring-accent text-ink text-sm">
                    <SelectValue placeholder="Chọn phòng..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-ink text-xs font-semibold">
                    {rooms
                      .filter((r) => r.status === 'available' || r.id === selectedRoomId)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          Phòng {r.code} - {r.buildings?.name || 'Khu vực khác'} ({Number(r.price).toLocaleString('vi-VN')}đ/tháng)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agreement_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày lập hợp đồng *</Label>
              <FormattedDateInput 
                id="agreement_date" 
                name="agreement_date" 
                value={agreementDate} 
                onChange={setAgreementDate} 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày bắt đầu thuê *</Label>
              <FormattedDateInput 
                id="start_date" 
                value={startDate} 
                onChange={setStartDate} 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lease_duration" className="text-ink font-semibold text-xs uppercase tracking-wider">Thời hạn thuê (tháng) *</Label>
              <Input type="number" id="lease_duration" value={leaseDuration} onChange={(e) => setLeaseDuration(Number(e.target.value))} required className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày kết thúc thuê *</Label>
              <Input type="text" id="end_date" value={toDisplay(endDate)} readOnly className="bg-bg-subtle/50 cursor-not-allowed border-border rounded-lg font-mono text-ink-muted text-sm h-10 px-3" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="handover_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày bàn giao phòng *</Label>
              <FormattedDateInput 
                id="handover_date" 
                value={handoverDate} 
                onChange={setHandoverDate} 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billing_cycle" className="text-ink font-semibold text-xs uppercase tracking-wider">Chu kỳ đóng tiền (tháng/lần) *</Label>
              <Input type="number" id="billing_cycle" value={billingCycle} onChange={(e) => setBillingCycle(Number(e.target.value))} required className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_day" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày đóng tiền hàng tháng *</Label>
              <Input type="number" id="payment_day" value={paymentDay} onChange={(e) => setPaymentDay(Number(e.target.value))} min={1} max={31} required className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sign_location" className="text-ink font-semibold text-xs uppercase tracking-wider">Nơi ký hợp đồng</Label>
              <Input 
                id="sign_location" 
                value={signLocation} 
                onChange={(e) => setSignLocation(e.target.value)} 
                placeholder="Địa chỉ ký kết hợp đồng" 
                className="rounded-lg border-border focus-visible:ring-accent text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Khối 2: Thông tin Bên A */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <User className="h-5 w-5 text-accent" />
              2. Đại diện Bên Cho Thuê (Bên A)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="party_a_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Họ và tên *</Label>
              <Input id="party_a_name" value={partyAName} onChange={(e) => setPartyAName(e.target.value)} required className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_a_dob" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày sinh</Label>
              <FormattedDateInput 
                id="party_a_dob" 
                value={partyADob} 
                onChange={setPartyADob} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_a_phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại *</Label>
              <Input id="party_a_phone" value={partyAPhone} onChange={(e) => setPartyAPhone(e.target.value)} required className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_a_id_card" className="text-ink font-semibold text-xs uppercase tracking-wider">Số CCCD / CMND</Label>
              <Input id="party_a_id_card" value={partyAIdCard} onChange={(e) => setPartyAIdCard(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_a_id_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày cấp</Label>
              <FormattedDateInput 
                id="party_a_id_date" 
                value={partyAIdDate} 
                onChange={setPartyAIdDate} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_a_id_place" className="text-ink font-semibold text-xs uppercase tracking-wider">Nơi cấp</Label>
              <Input id="party_a_id_place" value={partyAIdPlace} onChange={(e) => setPartyAIdPlace(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="party_a_address" className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ thường trú</Label>
              <Input id="party_a_address" value={partyAAddress} onChange={(e) => setPartyAAddress(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
          </CardContent>
        </Card>

        {/* Khối 3: Thông tin Bên B */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <User className="h-5 w-5 text-accent" />
              3. Thông tin Khách Thuê (Bên B)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="party_b_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Họ và tên khách thuê *</Label>
              <Input id="party_b_name" value={partyBName} onChange={(e) => setPartyBName(e.target.value)} placeholder="Họ tên khách thuê" required className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_dob" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày sinh</Label>
              <FormattedDateInput 
                id="party_b_dob" 
                value={partyBDob} 
                onChange={setPartyBDob} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại *</Label>
              <Input id="party_b_phone" value={partyBPhone} onChange={(e) => setPartyBPhone(e.target.value)} placeholder="Số điện thoại" required className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_id_card" className="text-ink font-semibold text-xs uppercase tracking-wider">Số CCCD / CMND</Label>
              <Input id="party_b_id_card" value={partyBIdCard} onChange={(e) => setPartyBIdCard(e.target.value)} placeholder="CCCD khách thuê" className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_id_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày cấp</Label>
              <FormattedDateInput 
                id="party_b_id_date" 
                value={partyBIdDate} 
                onChange={setPartyBIdDate} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_id_place" className="text-ink font-semibold text-xs uppercase tracking-wider">Nơi cấp</Label>
              <Input id="party_b_id_place" value={partyBIdPlace} onChange={(e) => setPartyBIdPlace(e.target.value)} placeholder="Nơi cấp" className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="party_b_address" className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ thường trú</Label>
              <Input id="party_b_address" value={partyBAddress} onChange={(e) => setPartyBAddress(e.target.value)} placeholder="Địa chỉ hộ khẩu" className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
          </CardContent>
        </Card>

        {/* Khối 4: Thỏa thuận thuê & Đơn giá dịch vụ */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <Settings className="h-5 w-5 text-accent" />
              4. Chi tiết Giá thuê, Tiền cọc & Đơn giá dịch vụ
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="rent_price" className="text-ink font-semibold text-xs uppercase tracking-wider">Giá thuê hàng tháng (đ/tháng) *</Label>
              <Input 
                type="text" 
                id="rent_price" 
                value={formatNumber(rentPrice)} 
                onChange={(e) => setRentPrice(parseNumber(e.target.value))} 
                required 
                className="rounded-lg border-border focus-visible:ring-accent font-mono font-bold text-accent"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit_amount" className="text-ink font-semibold text-xs uppercase tracking-wider">Tiền đặt cọc đã giữ (đ) *</Label>
              <Input 
                type="text" 
                id="deposit_amount" 
                value={formatNumber(depositAmount)} 
                onChange={(e) => setDepositAmount(parseNumber(e.target.value))} 
                required 
                className="rounded-lg border-border focus-visible:ring-accent font-mono font-bold text-accent"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="electricity_price" className="text-ink font-semibold text-xs uppercase tracking-wider">Tiền điện (đ/số)</Label>
              <Input 
                type="text" 
                id="electricity_price" 
                value={formatNumber(electricityPrice)} 
                onChange={(e) => setElectricityPrice(parseNumber(e.target.value))} 
                className="rounded-lg border-border focus-visible:ring-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="water_price" className="text-ink font-semibold text-xs uppercase tracking-wider">Tiền nước</Label>
              <Input 
                id="water_price" 
                value={waterPrice} 
                onChange={(e) => setWaterPrice(e.target.value)} 
                placeholder="Ví dụ: 150000/người/tháng" 
                className="rounded-lg border-border focus-visible:ring-accent"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service_price" className="text-ink font-semibold text-xs uppercase tracking-wider">Phí dịch vụ chung</Label>
              <Input 
                id="service_price" 
                value={servicePrice} 
                onChange={(e) => setServicePrice(e.target.value)} 
                className="rounded-lg border-border focus-visible:ring-accent"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="internet_price" className="text-ink font-semibold text-xs uppercase tracking-wider">Tiền mạng internet (đ/tháng)</Label>
              <Input 
                type="text" 
                id="internet_price" 
                value={formatNumber(internetPrice)} 
                onChange={(e) => setInternetPrice(parseNumber(e.target.value))} 
                className="rounded-lg border-border focus-visible:ring-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="laundry_price" className="text-ink font-semibold text-xs uppercase tracking-wider">Phí máy giặt/sấy (đ/tháng)</Label>
              <Input 
                type="text" 
                id="laundry_price" 
                value={formatNumber(laundryPrice)} 
                onChange={(e) => setLaundryPrice(parseNumber(e.target.value))} 
                className="rounded-lg border-border focus-visible:ring-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant_count" className="text-ink font-semibold text-xs uppercase tracking-wider">Số người ở thực tế</Label>
              <Input 
                type="number" 
                id="tenant_count" 
                value={tenantCount} 
                onChange={(e) => setTenantCount(Number(e.target.value))} 
                className="rounded-lg border-border focus-visible:ring-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="termination_notice" className="text-ink font-semibold text-xs uppercase tracking-wider">Báo trước khi hủy hợp đồng (ngày)</Label>
              <Input 
                type="number" 
                id="termination_notice" 
                value={terminationNotice} 
                onChange={(e) => setTerminationNotice(Number(e.target.value))} 
                className="rounded-lg border-border focus-visible:ring-accent font-mono"
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="payment_method" className="text-ink font-semibold text-xs uppercase tracking-wider">Phương thức thanh toán</Label>
              <Input id="payment_method" name="payment_method" defaultValue="Chuyển khoản hàng tháng" className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="note" className="text-ink font-semibold text-xs uppercase tracking-wider">Ghi chú & Điều khoản bổ sung</Label>
              <Textarea id="note" name="note" placeholder="Các điều khoản thỏa thuận thêm..." rows={3} className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
          </CardContent>
        </Card>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" asChild className="text-ink hover:bg-bg-subtle rounded-lg font-semibold">
            <Link href={`${pathPrefix}/contracts`}>Hủy bỏ</Link>
          </Button>
          <Button type="submit" className="bg-accent hover:bg-accent-500 text-white font-semibold rounded-lg shadow-none" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang tạo...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Ký hợp đồng thuê
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CreateRentalContractPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
      </div>
    }>
      <CreateRentalContractPage />
    </Suspense>
  );
}
