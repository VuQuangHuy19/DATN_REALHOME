'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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

export default function CreateDepositContractPage() {
  const { company } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pathPrefix = pathname?.startsWith('/landlord') ? '/landlord' : '/admin';
  const { items: rooms, loading: roomsLoading } = useRooms(company?.id);
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const queryRoomId = searchParams?.get('room_id') || '';

  // Form State
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [rentPrice, setRentPrice] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [signLocation, setSignLocation] = useState<string>('');
  const [partyBAddress, setPartyBAddress] = useState<string>('Xuân Sơn, Thị xã Sơn Tây, Hà Nội');

  // Thỏa thuận thuê & dịch vụ
  const [electricityPrice, setElectricityPrice] = useState<number>(4000);
  const [waterPrice, setWaterPrice] = useState<string>('150000/người/tháng');
  const [servicePrice, setServicePrice] = useState<string>('200000/người/tháng');
  const [internetPrice, setInternetPrice] = useState<number>(180000);
  const [laundryPrice, setLaundryPrice] = useState<number>(100000);
  const [tenantCount, setTenantCount] = useState<number>(4);
  const [leaseDuration, setLeaseDuration] = useState<number>(9);
  const [terminationNotice, setTerminationNotice] = useState<number>(30);
  const [supportRepairDate, setSupportRepairDate] = useState<string>('');
  
  // Chi tiết cọc
  const [deadlineSign, setDeadlineSign] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'cash' | 'transfer' | 'both'>('transfer');

  // Date states
  const [agreementDate, setAgreementDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [partyADob, setPartyADob] = useState<string>('2004-04-16');
  const [partyAIdDate, setPartyAIdDate] = useState<string>('2021-09-12');
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

  // Tự động điền dữ liệu khi chọn phòng
  useEffect(() => {
    if (!selectedRoomId) return;
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (room) {
      setRentPrice(Number(room.price));
      setDepositAmount(Number(room.price)); // Mặc định tiền cọc = 1 tháng tiền thuê
      
      const buildingName = room.buildings?.name || '';
      const address = room.buildings?.address || '';
      
      // Đặt vị trí ký mặc định
      if (address) {
        setSignLocation(address);
      }

      // Tự động sinh nội dung chuyển khoản
      const cleanBuilding = buildingName.replace(/Tòa nhà|Chung cư/gi, '').trim();
      const code = room.code;
      setTransferContent(`${code} ${cleanBuilding} coc phong`);
    }
  }, [selectedRoomId, rooms]);
  
  // Tự động chọn phòng từ query parameter
  useEffect(() => {
    if (queryRoomId && rooms.length > 0) {
      const exists = rooms.some((r) => r.id === queryRoomId);
      if (exists) {
        setSelectedRoomId(queryRoomId);
      }
    }
  }, [queryRoomId, rooms]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company?.id) return;
    if (!selectedRoomId) {
      toast.error('Vui lòng chọn phòng đặt cọc');
      return;
    }

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const generatedCode = `HĐDC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const otherServicesJson = {
      internet: `${internetPrice.toLocaleString('vi-VN')}đ/tháng`,
      laundry: `${laundryPrice.toLocaleString('vi-VN')}đ/phòng`
    };

    const payload = {
      company_id: company.id,
      room_id: selectedRoomId,
      contract_code: generatedCode,
      status: 'active' as const,
      agreement_date: formData.get('agreement_date') as string,
      sign_location: signLocation,

      // Bên A (Bên cho thuê)
      party_a_name: formData.get('party_a_name') as string,
      party_a_dob: formData.get('party_a_dob') as string || null,
      party_a_address: formData.get('party_a_address') as string || null,
      party_a_id_card: formData.get('party_a_id_card') as string || null,
      party_a_id_date: formData.get('party_a_id_date') as string || null,
      party_a_id_place: formData.get('party_a_id_place') as string || null,
      party_a_phone: formData.get('party_a_phone') as string || null,

      // Bên B (Bên thuê)
      party_b_name: formData.get('party_b_name') as string,
      party_b_phone: formData.get('party_b_phone') as string,
      party_b_dob: formData.get('party_b_dob') as string || null,
      party_b_id_card: formData.get('party_b_id_card') as string || null,
      party_b_id_date: formData.get('party_b_id_date') as string || null,
      party_b_id_place: formData.get('party_b_id_place') as string || null,
      party_b_address: partyBAddress,

      // Điều khoản
      rent_price: rentPrice,
      electricity_price: electricityPrice,
      water_price: waterPrice,
      service_price: servicePrice,
      other_services: otherServicesJson,
      tenant_count: tenantCount,
      payment_method: formData.get('payment_method') as string || 'Đặt cọc 1 tháng và thanh toán theo tiến độ thỏa thuận',
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

      note: formData.get('note') as string || null,
      lead_view_image_url: leadViewImageUrl,
      transfer_proof_url: transferProofUrl,
    };

    try {
      const response = await authFetch('/api/contracts/deposit/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Có lỗi xảy ra khi tạo hợp đồng cọc');
      }

      toast.success('Tạo hợp đồng đặt cọc thành công!');
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
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Tạo Hợp Đồng Đặt Cọc</h1>
          <p className="text-ink-muted text-sm mt-0.5">Soạn hợp đồng đặt cọc thuê phòng/căn hộ mới</p>
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
            <CardDescription className="text-xs text-ink-muted">Chọn căn hộ/phòng trọ khách muốn đặt cọc giữ chỗ</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="room_select" className="text-ink font-semibold text-xs uppercase tracking-wider">Chọn phòng *</Label>
              {roomsLoading ? (
                <div className="flex items-center gap-2 h-10 border border-border rounded-lg px-3 text-ink-muted bg-bg-subtle/50 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" /> Đang tải danh sách phòng...
                </div>
              ) : (
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger id="room_select" className="rounded-lg border-border focus-visible:ring-accent text-ink text-sm">
                    <SelectValue placeholder="Chọn phòng..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-ink text-xs font-semibold">
                    {rooms
                      .filter((r) => r.status === 'available')
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
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="sign_location" className="text-ink font-semibold text-xs uppercase tracking-wider">Nơi ký hợp đồng đặt cọc</Label>
              <Input 
                id="sign_location" 
                value={signLocation} 
                onChange={(e) => setSignLocation(e.target.value)} 
                placeholder="Địa chỉ ký kết, ví dụ: Số 04 ngõ 43 Giáp Nhất, Thanh Xuân, Hà Nội" 
                className="rounded-lg border-border focus-visible:ring-accent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Khối 2: Thông tin Bên A (Bên cho thuê) */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <User className="h-5 w-5 text-accent" />
              2. Đại diện Bên Cho Thuê (Bên A)
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted font-medium">Mặc định lấy thông tin BQL tòa nhà từ mẫu hợp đồng chuẩn</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="party_a_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Họ và tên *</Label>
              <Input id="party_a_name" name="party_a_name" defaultValue="Võ Quang Huy" required className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_a_dob" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày sinh</Label>
              <FormattedDateInput 
                id="party_a_dob" 
                name="party_a_dob" 
                value={partyADob} 
                onChange={setPartyADob} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_a_phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại *</Label>
              <Input id="party_a_phone" name="party_a_phone" defaultValue="0857844999" required className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_a_id_card" className="text-ink font-semibold text-xs uppercase tracking-wider">Số CMND / CCCD</Label>
              <Input id="party_a_id_card" name="party_a_id_card" defaultValue="008204007039" className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_a_id_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày cấp</Label>
              <FormattedDateInput 
                id="party_a_id_date" 
                name="party_a_id_date" 
                value={partyAIdDate} 
                onChange={setPartyAIdDate} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_a_id_place" className="text-ink font-semibold text-xs uppercase tracking-wider">Nơi cấp</Label>
              <Input id="party_a_id_place" name="party_a_id_place" defaultValue="Cục quản lý về trật tự xã hội" className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="party_a_address" className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ thường trú</Label>
              <Input id="party_a_address" name="party_a_address" defaultValue="Thôn Nhàn Thọ 2, xã Yên Nguyên, huyện Chiêm Hóa, tỉnh Tuyên Quang" className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
          </CardContent>
        </Card>

        {/* Khối 3: Thông tin Bên B (Bên thuê phòng) */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <User className="h-5 w-5 text-accent" />
              3. Thông tin Khách Thuê Đặt Cọc (Bên B)
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted font-medium">Nhập thông tin nhân thân của khách hàng đặt cọc</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="party_b_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Họ và tên khách thuê *</Label>
              <Input id="party_b_name" name="party_b_name" placeholder="Ví dụ: Nguyễn Văn A" required className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_dob" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày/Năm sinh</Label>
              <FormattedDateInput 
                id="party_b_dob" 
                name="party_b_dob" 
                value={partyBDob} 
                onChange={setPartyBDob} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại khách thuê *</Label>
              <Input id="party_b_phone" name="party_b_phone" placeholder="Ví dụ: 0987654321" required className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_id_card" className="text-ink font-semibold text-xs uppercase tracking-wider">Số CMND / CCCD</Label>
              <Input id="party_b_id_card" name="party_b_id_card" placeholder="Nhập số CCCD/CMND" className="rounded-lg border-border focus-visible:ring-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_id_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày cấp</Label>
              <FormattedDateInput 
                id="party_b_id_date" 
                name="party_b_id_date" 
                value={partyBIdDate} 
                onChange={setPartyBIdDate} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party_b_id_place" className="text-ink font-semibold text-xs uppercase tracking-wider">Nơi cấp</Label>
              <Input id="party_b_id_place" name="party_b_id_place" placeholder="Nơi cấp thẻ" className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="party_b_address" className="text-ink font-semibold text-xs uppercase tracking-wider">Hộ khẩu thường trú</Label>
              <Input 
                id="party_b_address" 
                value={partyBAddress} 
                onChange={(e) => setPartyBAddress(e.target.value)} 
                placeholder="Địa chỉ hộ khẩu" 
                className="rounded-lg border-border focus-visible:ring-accent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Khối 4: Thỏa thuận thuê & Đơn giá dịch vụ */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <Settings className="h-5 w-5 text-accent" />
              4. Thỏa thuận thuê & Đơn giá dịch vụ (Sau này ký HĐ chính thức)
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted font-medium">Các đơn giá và điều khoản thuê dự kiến</CardDescription>
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
              <Input 
                id="water_price" 
                value={waterPrice} 
                onChange={(e) => setWaterPrice(e.target.value)} 
                placeholder="Ví dụ: 150000/người/tháng hoặc 35000/khối" 
                className="rounded-lg border-border focus-visible:ring-accent"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service_price" className="text-ink font-semibold text-xs uppercase tracking-wider">Phí dịch vụ chung (Thang máy, rác, vệ sinh)</Label>
              <Input 
                id="service_price" 
                value={servicePrice} 
                onChange={(e) => setServicePrice(e.target.value)} 
                placeholder="Ví dụ: 200000/người/tháng" 
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
              <Input id="payment_method" name="payment_method" defaultValue="Đặt cọc 01 tháng và thanh toán theo tiến độ thỏa thuận" className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
          </CardContent>
        </Card>

        {/* Khối 5: Thỏa thuận đặt cọc & Chuyển khoản */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-ink">
              <Landmark className="h-5 w-5 text-accent" />
              5. Thỏa thuận đặt cọc & Thanh toán
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted font-medium">Giá trị cọc, thời hạn ký và thông tin thanh toán</CardDescription>
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
                  <Input 
                    id="bank_name" 
                    value={bankName} 
                    onChange={(e) => setBankName(e.target.value)} 
                    placeholder="Ví dụ: MB Bank, Techcombank" 
                    className="rounded-lg border-border focus-visible:ring-accent"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank_account_number" className="text-ink font-semibold text-xs uppercase tracking-wider">Số tài khoản</Label>
                  <Input 
                    id="bank_account_number" 
                    value={bankAccountNumber} 
                    onChange={(e) => setBankAccountNumber(e.target.value)} 
                    placeholder="Số tài khoản nhận" 
                    className="rounded-lg border-border focus-visible:ring-accent font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank_account_owner" className="text-ink font-semibold text-xs uppercase tracking-wider">Chủ tài khoản</Label>
                  <Input 
                    id="bank_account_owner" 
                    value={bankAccountOwner} 
                    onChange={(e) => setBankAccountOwner(e.target.value)} 
                    placeholder="Tên chủ tài khoản" 
                    className="rounded-lg border-border focus-visible:ring-accent uppercase font-bold"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label htmlFor="transfer_content" className="text-ink font-semibold text-xs uppercase tracking-wider">Nội dung chuyển khoản mẫu</Label>
                  <Input 
                    id="transfer_content" 
                    value={transferContent} 
                    onChange={(e) => setTransferContent(e.target.value)} 
                    placeholder="Ví dụ: P603 Giap Nhat coc phong" 
                    className="rounded-lg border-border focus-visible:ring-accent font-mono"
                  />
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
              <Textarea id="note" name="note" placeholder="Các thỏa thuận bổ sung khác nếu có..." rows={3} className="rounded-lg border-border focus-visible:ring-accent" />
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
                Tạo hợp đồng
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
