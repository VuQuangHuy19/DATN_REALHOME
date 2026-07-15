'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRooms } from '@/lib/hooks/useEntities';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { authFetch } from '@/lib/supabase/auth-fetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Landmark, User, Building, Settings, CheckCircle2 } from 'lucide-react';
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

export function EditContractPage() {
  const { company } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const id = params?.id as string;
  const pathPrefix = pathname?.startsWith('/landlord') ? '/landlord' : '/admin';

  const { items: rooms, loading: roomsLoading } = useRooms(company?.id);
  const [loadingContract, setLoadingContract] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [contractCode, setContractCode] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [rentPrice, setRentPrice] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [signLocation, setSignLocation] = useState<string>('');
  const [partyBAddress, setPartyBAddress] = useState<string>('');

  // Bên A
  const [partyAName, setPartyAName] = useState<string>('');
  const [partyAPhone, setPartyAPhone] = useState<string>('');
  const [partyAIdCard, setPartyAIdCard] = useState<string>('');
  const [partyAIdPlace, setPartyAIdPlace] = useState<string>('');
  
  // Bên B
  const [partyBName, setPartyBName] = useState<string>('');
  const [partyBPhone, setPartyBPhone] = useState<string>('');
  const [partyBIdCard, setPartyBIdCard] = useState<string>('');
  const [partyBIdPlace, setPartyBIdPlace] = useState<string>('');

  // Thỏa thuận thuê & dịch vụ
  const [electricityPrice, setElectricityPrice] = useState<number>(4000);
  const [waterPrice, setWaterPrice] = useState<string>('150000/người/tháng');
  const [servicePrice, setServicePrice] = useState<string>('200000/người/tháng');
  const [internetPrice, setInternetPrice] = useState<number>(180000);
  const [laundryPrice, setLaundryPrice] = useState<number>(100000);
  const [tenantCount, setTenantCount] = useState<number>(1);
  const [leaseDuration, setLeaseDuration] = useState<number>(9);
  const [terminationNotice, setTerminationNotice] = useState<number>(30);
  const [supportRepairDate, setSupportRepairDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Chi tiết cọc
  const [deadlineSign, setDeadlineSign] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'cash' | 'transfer' | 'both'>('transfer');

  // Date states
  const [agreementDate, setAgreementDate] = useState<string>('');
  const [partyADob, setPartyADob] = useState<string>('');
  const [partyAIdDate, setPartyAIdDate] = useState<string>('');
  const [partyBDob, setPartyBDob] = useState<string>('');
  const [partyBIdDate, setPartyBIdDate] = useState<string>('');

  // Thông tin ngân hàng nhận cọc
  const [bankName, setBankName] = useState<string>('');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [bankAccountOwner, setBankAccountOwner] = useState<string>('');
  const [transferContent, setTransferContent] = useState<string>('');

  // Ảnh minh chứng cọc
  const [leadViewImageUrl, setLeadViewImageUrl] = useState<string | null>(null);
  const [transferProofUrl, setTransferProofUrl] = useState<string | null>(null);

  // Load contract details
  useEffect(() => {
    async function loadContract() {
      if (!id) return;
      try {
        const { supabase } = await import('@/lib/supabase/client');
        const { data, error } = await supabase
          .from('deposit_contracts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error || !data) {
          throw new Error(error?.message || 'Không tìm thấy hợp đồng');
        }

        setContractCode(data.contract_code);
        setSelectedRoomId(data.room_id || '');
        setRentPrice(Number(data.rent_price));
        setDepositAmount(Number(data.deposit_amount));
        setSignLocation(data.sign_location || '');
        
        setPartyAName(data.party_a_name);
        setPartyAPhone(data.party_a_phone || '');
        setPartyADob(data.party_a_dob || '');
        setPartyAIdCard(data.party_a_id_card || '');
        setPartyAIdDate(data.party_a_id_date || '');
        setPartyAIdPlace(data.party_a_id_place || '');
        setPartyAAddress(data.party_a_address || '');

        setPartyBName(data.party_b_name);
        setPartyBPhone(data.party_b_phone || '');
        setPartyBDob(data.party_b_dob || '');
        setPartyBIdCard(data.party_b_id_card || '');
        setPartyBIdDate(data.party_b_id_date || '');
        setPartyBIdPlace(data.party_b_id_place || '');
        setPartyBAddress(data.party_b_address || '');

        setElectricityPrice(Number(data.electricity_price));
        setWaterPrice(data.water_price || '');
        setServicePrice(data.service_price || '');
        setInternetPrice(parseNumber(data.other_services?.internet || '0'));
        setLaundryPrice(parseNumber(data.other_services?.laundry || '0'));
        setTenantCount(Number(data.tenant_count || 1));
        setLeaseDuration(Number(data.lease_duration_months || 9));
        setTerminationNotice(Number(data.termination_notice_days || 30));
        setSupportRepairDate(data.room_repair_support_date || '');
        setPaymentMethod(data.payment_method || '');
        setNote(data.note || '');

        setDeadlineSign(data.deadline_sign_contract || '');
        setPaymentType(data.deposit_payment_type || 'transfer');
        setAgreementDate(data.agreement_date || '');

        setBankName(data.bank_name || '');
        setBankAccountNumber(data.bank_account_number || '');
        setBankAccountOwner(data.bank_account_owner || '');
        setTransferContent(data.transfer_content_template || '');

        setLeadViewImageUrl(data.lead_view_image_url);
        setTransferProofUrl(data.transfer_proof_url);
      } catch (err: any) {
        toast.error(`Lỗi tải hợp đồng: ${err.message}`);
      } finally {
        setLoadingContract(false);
      }
    }
    loadContract();
  }, [id]);

  const [partyAAddress, setPartyAAddress] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company?.id) return;
    if (!selectedRoomId) {
      toast.error('Vui lòng chọn phòng đặt cọc');
      return;
    }

    setSubmitting(true);
    const otherServicesJson = {
      internet: `${internetPrice.toLocaleString('vi-VN')}đ/tháng`,
      laundry: `${laundryPrice.toLocaleString('vi-VN')}đ/phòng`
    };

    const payload = {
      id,
      room_id: selectedRoomId,
      agreement_date: agreementDate,
      sign_location: signLocation,

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
      party_b_address: partyBAddress,

      // Điều khoản
      rent_price: rentPrice,
      electricity_price: electricityPrice,
      water_price: waterPrice,
      service_price: servicePrice,
      other_services: otherServicesJson,
      tenant_count: tenantCount,
      payment_method: paymentMethod,
      lease_duration_months: leaseDuration,
      termination_notice_days: terminationNotice,
      room_repair_support_date: supportRepairDate || null,

      // Cọc
      deposit_amount: depositAmount,
      deadline_sign_contract: deadlineSign,
      deposit_payment_type: paymentType,

      // Tài khoản
      bank_name: bankName || null,
      bank_account_number: bankAccountNumber || null,
      bank_account_owner: bankAccountOwner || null,
      transfer_content_template: transferContent || null,

      note: note || null,
      lead_view_image_url: leadViewImageUrl,
      transfer_proof_url: transferProofUrl,
    };

    try {
      const response = await authFetch('/api/contracts/deposit/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Có lỗi xảy ra khi chỉnh sửa hợp đồng cọc');
      }

      toast.success('Cập nhật hợp đồng đặt cọc thành công!');
      router.push(`${pathPrefix}/contracts`);
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingContract) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="border-border hover:bg-bg-subtle text-ink rounded-lg">
          <Link href={`${pathPrefix}/contracts`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Chỉnh Sửa Hợp Đồng Đặt Cọc</h1>
          <p className="text-ink-muted text-sm mt-0.5 font-mono">Mã hợp đồng: {contractCode}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Khối 1: Chọn phòng */}
        <Card className="border-border shadow-none rounded-lg bg-white border-t-2 border-t-accent">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <Building className="h-5 w-5 text-accent" />
              1. Chọn phòng & Toà nhà đặt cọc
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="room_select" className="text-ink font-semibold text-xs uppercase tracking-wider">Chọn phòng *</Label>
              {roomsLoading ? (
                <div className="flex items-center gap-2 h-10 border border-border rounded-lg px-3 text-ink-muted bg-bg-subtle/50 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" /> Đang tải danh sách...
                </div>
              ) : (
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger id="room_select" className="rounded-lg border-border focus-visible:ring-accent text-ink text-sm">
                    <SelectValue placeholder="Chọn phòng..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-ink text-xs font-semibold">
                    {rooms.map((r) => (
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
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="sign_location" className="text-ink font-semibold text-xs uppercase tracking-wider">Nơi ký hợp đồng đặt cọc</Label>
              <Input 
                id="sign_location" 
                value={signLocation} 
                onChange={(e) => setSignLocation(e.target.value)} 
                placeholder="Địa chỉ ký kết" 
                className="rounded-lg border-border focus-visible:ring-accent"
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
              3. Thông tin Khách Thuê Đặt Cọc (Bên B)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="party_b_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Họ và tên khách thuê *</Label>
              <Input id="party_b_name" value={partyBName} onChange={(e) => setPartyBName(e.target.value)} required className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_dob" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày/Năm sinh</Label>
              <FormattedDateInput 
                id="party_b_dob" 
                value={partyBDob} 
                onChange={setPartyBDob} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại khách thuê *</Label>
              <Input id="party_b_phone" value={partyBPhone} onChange={(e) => setPartyBPhone(e.target.value)} required className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_id_card" className="text-ink font-semibold text-xs uppercase tracking-wider">Số CMND / CCCD</Label>
              <Input id="party_b_id_card" value={partyBIdCard} onChange={(e) => setPartyBIdCard(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent font-mono" />
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
              <Input id="party_b_id_place" value={partyBIdPlace} onChange={(e) => setPartyBIdPlace(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="party_b_address" className="text-ink font-semibold text-xs uppercase tracking-wider">Hộ khẩu thường trú</Label>
              <Input id="party_b_address" value={partyBAddress} onChange={(e) => setPartyBAddress(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
          </CardContent>
        </Card>

        {/* Khối 4: Thỏa thuận thuê */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <Settings className="h-5 w-5 text-accent" />
              4. Thỏa thuận thuê & Đơn giá dịch vụ
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="rent_price" className="text-ink font-semibold text-xs uppercase tracking-wider">Giá thuê dự kiến (đ/tháng) *</Label>
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
              <Input id="water_price" value={waterPrice} onChange={(e) => setWaterPrice(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service_price" className="text-ink font-semibold text-xs uppercase tracking-wider">Phí dịch vụ chung</Label>
              <Input id="service_price" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent" />
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
              <Label htmlFor="tenant_count" className="text-ink font-semibold text-xs uppercase tracking-wider">Số người ở đăng ký</Label>
              <Input 
                type="number" 
                id="tenant_count" 
                value={tenantCount} 
                onChange={(e) => setTenantCount(Number(e.target.value))} 
                className="rounded-lg border-border focus-visible:ring-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lease_duration" className="text-ink font-semibold text-xs uppercase tracking-wider">Thời hạn hợp đồng dự kiến (tháng)</Label>
              <Input 
                type="number" 
                id="lease_duration" 
                value={leaseDuration} 
                onChange={(e) => setLeaseDuration(Number(e.target.value))} 
                className="rounded-lg border-border focus-visible:ring-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="termination_notice" className="text-ink font-semibold text-xs uppercase tracking-wider">Báo trước khi đòi nhà (ngày)</Label>
              <Input 
                type="number" 
                id="termination_notice" 
                value={terminationNotice} 
                onChange={(e) => setTerminationNotice(Number(e.target.value))} 
                className="rounded-lg border-border focus-visible:ring-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support_repair_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Hạn hỗ trợ sửa phòng trước khi ký HĐ</Label>
              <FormattedDateInput 
                id="support_repair_date" 
                value={supportRepairDate} 
                onChange={setSupportRepairDate} 
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="payment_method" className="text-ink font-semibold text-xs uppercase tracking-wider">Phương thức thanh toán thỏa thuận</Label>
              <Input id="payment_method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
          </CardContent>
        </Card>

        {/* Khối 5: Thỏa thuận cọc */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <Landmark className="h-5 w-5 text-accent" />
              5. Thỏa thuận đặt cọc & Thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="deposit_amount" className="text-ink font-semibold text-xs uppercase tracking-wider">Số tiền nhận đặt cọc (đ) *</Label>
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
              <Label htmlFor="deadline_sign" className="text-ink font-semibold text-xs uppercase tracking-wider">Hạn ký hợp đồng chính thức *</Label>
              <FormattedDateInput 
                id="deadline_sign" 
                value={deadlineSign} 
                onChange={setDeadlineSign} 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_type" className="text-ink font-semibold text-xs uppercase tracking-wider">Hình thức cọc *</Label>
              <Select value={paymentType} onValueChange={(value: any) => setPaymentType(value)}>
                <SelectTrigger id="payment_type" className="rounded-lg border-border focus-visible:ring-accent text-ink text-sm">
                  <SelectValue placeholder="Chọn hình thức..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-ink text-xs font-semibold">
                  <SelectItem value="transfer">Chuyển khoản</SelectItem>
                  <SelectItem value="cash">Tiền mặt</SelectItem>
                  <SelectItem value="both">Cả hai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentType !== 'cash' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="bank_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Tên Ngân hàng nhận cọc</Label>
                  <Input id="bank_name" value={bankName} onChange={(e) => setBankName(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank_account_number" className="text-ink font-semibold text-xs uppercase tracking-wider">Số tài khoản</Label>
                  <Input id="bank_account_number" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank_account_owner" className="text-ink font-semibold text-xs uppercase tracking-wider">Chủ tài khoản</Label>
                  <Input id="bank_account_owner" value={bankAccountOwner} onChange={(e) => setBankAccountOwner(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent uppercase font-bold" />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label htmlFor="transfer_content" className="text-ink font-semibold text-xs uppercase tracking-wider">Nội dung chuyển khoản mẫu</Label>
                  <Input id="transfer_content" value={transferContent} onChange={(e) => setTransferContent(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent font-mono" />
                </div>
              </>
            )}

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4 mt-2">
              <div className="space-y-2">
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider block mb-1">Ảnh Sale dẫn khách xem phòng</Label>
                <ImageUpload 
                  value={leadViewImageUrl} 
                  onChange={setLeadViewImageUrl} 
                  bucket="room_images" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider block mb-1">Ảnh hóa đơn chuyển khoản đặt cọc</Label>
                <ImageUpload 
                  value={transferProofUrl} 
                  onChange={setTransferProofUrl} 
                  bucket="room_images" 
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="note" className="text-ink font-semibold text-xs uppercase tracking-wider">Ghi chú thêm</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Các thỏa thuận bổ sung..." rows={3} className="rounded-lg border-border focus-visible:ring-accent" />
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
                Đang lưu...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Lưu thay đổi
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
