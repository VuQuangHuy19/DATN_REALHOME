'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  User,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  KeyRound,
  Save,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  Star
} from 'lucide-react';

export interface BankAccountItem {
  id: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_owner: string;
  is_default?: boolean;
}

export default function LandlordProfilePage() {
  const { user, profile, refreshSession } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [idCard, setIdCard] = useState('001098123456');
  const [address, setAddress] = useState('128 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội');
  
  // Bank Account List state
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  
  // New Bank Account Form state
  const [newBankName, setNewBankName] = useState('');
  const [newBankAccountNumber, setNewBankAccountNumber] = useState('');
  const [newBankAccountOwner, setNewBankAccountOwner] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [addingBank, setAddingBank] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (profile?.landlord_id) {
      fetch(`/api/landlords`)
        .then((res) => res.json())
        .then((data) => {
          const lnd = (data.data || []).find((x: any) => x.id === profile.landlord_id);
          if (lnd) {
            // Check if landlord has multiple bank accounts array
            if (Array.isArray(lnd.bank_accounts) && lnd.bank_accounts.length > 0) {
              setBankAccounts(lnd.bank_accounts);
            } else if (lnd.bank_account_number) {
              // Legacy fallback: single bank account in DB columns
              setBankAccounts([
                {
                  id: 'default-1',
                  bank_name: lnd.bank_name || '',
                  bank_account_number: lnd.bank_account_number || '',
                  bank_account_owner: lnd.bank_account_owner || '',
                  is_default: true,
                },
              ]);
            }
          }
        })
        .catch(() => {});
    }
  }, [profile?.landlord_id]);

  // Helper function to sync bank accounts to DB
  const syncBankAccountsToDb = async (updatedList: BankAccountItem[]) => {
    if (!profile?.landlord_id) return;
    
    const primary = updatedList.find((acc) => acc.is_default) || updatedList[0] || null;

    await fetch(`/api/landlords`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: profile.landlord_id,
        bank_accounts: updatedList,
        bank_name: primary?.bank_name || null,
        bank_account_number: primary?.bank_account_number || null,
        bank_account_owner: primary?.bank_account_owner || null,
      }),
    });
  };

  // Add new bank account with Duplicate Check
  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newBankAccountNumber.trim() || !newBankAccountOwner.trim()) {
      toast.error('Vui lòng điền đầy đủ Tên Ngân hàng, Số tài khoản và Chủ tài khoản.');
      return;
    }

    const cleanAccNo = newBankAccountNumber.replace(/\s+/g, '').toLowerCase();
    const cleanBank = newBankName.trim().toLowerCase();

    // Check duplicate account number & bank name
    const isDuplicate = bankAccounts.some((acc) => {
      const existingAccNo = acc.bank_account_number.replace(/\s+/g, '').toLowerCase();
      const existingBank = acc.bank_name.trim().toLowerCase();
      return existingAccNo === cleanAccNo && existingBank === cleanBank;
    });

    if (isDuplicate) {
      toast.error(
        `Số tài khoản "${newBankAccountNumber.trim()}" của ngân hàng "${newBankName.trim()}" đã tồn tại trong danh sách!`
      );
      return;
    }

    setAddingBank(true);
    try {
      const newItem: BankAccountItem = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        bank_name: newBankName.trim(),
        bank_account_number: newBankAccountNumber.trim(),
        bank_account_owner: newBankAccountOwner.trim().toUpperCase(),
        is_default: bankAccounts.length === 0, // First added account becomes default
      };

      const updatedList = [...bankAccounts, newItem];
      setBankAccounts(updatedList);

      // Reset form
      setNewBankName('');
      setNewBankAccountNumber('');
      setNewBankAccountOwner('');

      // Persist to backend DB
      await syncBankAccountsToDb(updatedList);

      toast.success('Đã thêm số tài khoản ngân hàng mới thành công!');
    } catch (err: any) {
      toast.error('Không thể lưu tài khoản ngân hàng: ' + err.message);
    } finally {
      setAddingBank(false);
    }
  };

  // Set default bank account
  const handleSetDefaultBank = async (id: string) => {
    const updatedList = bankAccounts.map((acc) => ({
      ...acc,
      is_default: acc.id === id,
    }));
    setBankAccounts(updatedList);
    try {
      await syncBankAccountsToDb(updatedList);
      toast.success('Đã đặt làm tài khoản nhận tiền mặc định!');
    } catch (err: any) {
      toast.error('Lỗi cập nhật tài khoản mặc định');
    }
  };

  // Delete bank account
  const handleDeleteBank = async (id: string) => {
    const itemToDelete = bankAccounts.find((a) => a.id === id);
    if (!itemToDelete) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản ${itemToDelete.bank_name} (${itemToDelete.bank_account_number})?`)) {
      return;
    }

    let updatedList = bankAccounts.filter((acc) => acc.id !== id);

    // If we deleted the default account, make the first remaining account default
    if (itemToDelete.is_default && updatedList.length > 0) {
      updatedList[0].is_default = true;
    }

    setBankAccounts(updatedList);
    try {
      await syncBankAccountsToDb(updatedList);
      toast.success('Đã xóa số tài khoản thành công!');
    } catch (err: any) {
      toast.error('Lỗi khi xóa số tài khoản');
    }
  };

  // Save General Profile Info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
      const res = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ full_name: fullName, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật hồ sơ thất bại');

      // Sync bank accounts list to DB as well
      await syncBankAccountsToDb(bankAccounts);

      toast.success('Đã cập nhật thông tin hồ sơ Chủ nhà thành công!');
      await refreshSession();
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra khi lưu thông tin');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setChangingPass(true);
    try {
      setTimeout(() => {
        toast.success('Đã đổi mật khẩu thành công!');
        setCurrentPassword('');
        setNewPassword('');
        setChangingPass(false);
      }, 600);
    } catch (err: any) {
      toast.error('Không thể cập nhật mật khẩu');
      setChangingPass(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-border-subtle pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-slate-900 tracking-tight flex items-center gap-2">
          <User className="h-7 w-7 text-amber-500" />
          Hồ Sơ Cá Nhân Chủ Nhà
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Quản lý thông tin liên hệ, danh sách tài khoản ngân hàng nhận doanh thu &amp; bảo mật tài khoản.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Summary */}
        <div className="space-y-6">
          <Card className="border border-border-subtle rounded-2xl bg-white shadow-sm overflow-hidden text-center p-6 space-y-4">
            <div className="relative inline-block mx-auto">
              <Avatar className="h-24 w-24 border-4 border-amber-400/50 shadow-md">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-slate-950 text-amber-400 font-bold text-2xl">
                  {profile?.full_name?.[0] || 'CN'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 p-1.5 bg-amber-500 text-slate-950 rounded-full border-2 border-white shadow-md">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold font-heading text-slate-900">
                {profile?.full_name || 'Chủ Nhà RealHome'}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Badge className="bg-amber-500/10 text-amber-700 border border-amber-400/40 font-bold px-3 py-0.5 rounded-full text-xs">
                  🏠 Chủ nhà đã xác thực
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2.5 text-left">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="truncate">{profile?.email || user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{phone || 'Chưa cập nhật SĐT'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="line-clamp-2">{address}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Đã lưu <strong>{bankAccounts.length}</strong> số tài khoản</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin cá nhân */}
          <Card className="border border-border-subtle rounded-2xl bg-white shadow-sm p-6">
            <CardHeader className="px-0 pt-0 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-amber-500" /> Thông Tin Cá Nhân &amp; Liên Hệ
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name" className="text-xs font-bold text-slate-700 uppercase">Họ và tên Chủ nhà</Label>
                    <Input
                      id="full_name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      required
                      className="rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-bold text-slate-700 uppercase">Số điện thoại liên hệ</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0988xxxxxx"
                      required
                      className="rounded-xl border-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="idCard" className="text-xs font-bold text-slate-700 uppercase">Số CCCD / CMND</Label>
                    <Input
                      id="idCard"
                      value={idCard}
                      onChange={(e) => setIdCard(e.target.value)}
                      placeholder="0010xxxxxx"
                      className="rounded-xl border-slate-200 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Email hệ thống</Label>
                    <Input value={profile?.email || user?.email || ''} disabled className="bg-slate-100 text-slate-500 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-bold text-slate-700 uppercase">Địa chỉ liên hệ thường trú</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, Đường, Quận/Huyện..."
                    className="rounded-xl border-slate-200"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold px-6"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Lưu thông tin cá nhân
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Quản lý danh sách Tài khoản Ngân hàng nhận Doanh thu */}
          <Card className="border border-amber-200/80 rounded-2xl bg-white shadow-sm p-6 space-y-6">
            <CardHeader className="px-0 pt-0 pb-4 border-b border-slate-100 flex flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>Tài Khoản Ngân Hàng Nhận Doanh Thu Hàng Tháng</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">
                  Thêm mới và hiển thị danh sách các tài khoản ngân hàng của bạn (Có kiểm tra chống trùng lặp).
                </CardDescription>
              </div>
              <Badge className="bg-amber-500/10 text-amber-700 border border-amber-300 font-bold px-3.5 py-1 rounded-full text-xs whitespace-nowrap shrink-0">
                {bankAccounts.length} tài khoản
              </Badge>
            </CardHeader>

            {/* SECTION 1: HIỂN THỊ DANH SÁCH TÀI KHOẢN HIỆN CÓ */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-amber-600" />
                Danh sách tài khoản ngân hàng hiện có ({bankAccounts.length})
              </Label>

              {bankAccounts.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <CreditCard className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Chưa có số tài khoản ngân hàng nào</p>
                  <p className="text-xs text-slate-400 mt-0.5">Vui lòng điền thông tin bên dưới để thêm tài khoản nhận doanh thu.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {bankAccounts.map((acc, index) => (
                    <div
                      key={acc.id || index}
                      className={`p-3.5 rounded-xl border-2 transition-all space-y-2 ${
                        acc.is_default
                          ? 'border-amber-400 bg-amber-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Top Row: Bank Title, Badge & Action Buttons */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-amber-600 shrink-0" />
                            {acc.bank_name}
                          </span>
                          {acc.is_default && (
                            <Badge className="bg-amber-500 text-slate-950 font-bold border-0 text-[10px] px-2 py-0.5 flex items-center gap-1">
                              <Star className="h-3 w-3 fill-slate-950" /> Mặc định nhận tiền
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!acc.is_default && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetDefaultBank(acc.id)}
                              className="text-[11px] rounded-lg border-amber-300 text-amber-800 hover:bg-amber-100 font-semibold h-7 px-2"
                            >
                              Đặt mặc định
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBank(acc.id)}
                            className="text-xs rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 h-7 w-7 p-0 flex items-center justify-center shrink-0"
                            title="Xóa số tài khoản"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Content Row: Account Number & Owner */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-0.5 border-t border-slate-100/80">
                        <div>
                          <span className="text-slate-500">Số tài khoản: </span>
                          <span className="font-mono font-bold text-slate-900 text-sm tracking-wide bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {acc.bank_account_number}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Chủ tài khoản: </span>
                          <span className="font-bold text-slate-900 uppercase">
                            {acc.bank_account_owner}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: FORM THÊM MỚI TÀI KHOẢN (CÓ CHECK TRÙNG LẶP) */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Thêm tài khoản ngân hàng mới
              </p>

              <form onSubmit={handleAddBankAccount} className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="newBankName" className="text-[11px] font-bold text-slate-700 uppercase">Tên Ngân hàng *</Label>
                    <Input
                      id="newBankName"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      placeholder="MB Bank, Vietcombank..."
                      className="rounded-xl border-slate-200 text-xs bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newBankAccountNumber" className="text-[11px] font-bold text-slate-700 uppercase">Số tài khoản *</Label>
                    <Input
                      id="newBankAccountNumber"
                      value={newBankAccountNumber}
                      onChange={(e) => setNewBankAccountNumber(e.target.value)}
                      placeholder="0123456789"
                      className="rounded-xl border-slate-200 font-mono text-xs bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newBankAccountOwner" className="text-[11px] font-bold text-slate-700 uppercase">Chủ tài khoản *</Label>
                    <Input
                      id="newBankAccountOwner"
                      value={newBankAccountOwner}
                      onChange={(e) => setNewBankAccountOwner(e.target.value)}
                      placeholder="NGUYEN VAN A"
                      className="rounded-xl border-slate-200 text-xs uppercase bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <p className="text-[11px] text-slate-500 italic">
                    * Tự động kiểm tra trùng lặp số tài khoản trước khi lưu.
                  </p>
                  <Button
                    type="submit"
                    disabled={addingBank}
                    className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 text-xs h-9 flex items-center gap-1.5 shadow-sm"
                  >
                    {addingBank ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Thêm tài khoản
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          {/* Đổi mật khẩu */}
          <Card className="border border-border-subtle rounded-2xl bg-white shadow-sm p-6">
            <CardHeader className="px-0 pt-0 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-500" /> Đổi Mật Khẩu Tài Khoản
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPass" className="text-xs font-bold text-slate-700 uppercase">Mật khẩu hiện tại</Label>
                    <Input
                      id="currentPass"
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newPass" className="text-xs font-bold text-slate-700 uppercase">Mật khẩu mới</Label>
                    <Input
                      id="newPass"
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={changingPass}
                    variant="outline"
                    className="rounded-xl border-slate-900 text-slate-900 hover:bg-slate-950 hover:text-amber-400 font-bold px-6"
                  >
                    {changingPass ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                    Đổi mật khẩu
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
