'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  UserCheck,
  Lock,
  Unlock,
  KeyRound,
  Search,
  User,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Users,
  UserX,
  Filter,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getRoleLabel } from '@/lib/constants/roles';
import { toast } from 'sonner';

interface AccountUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  kyc_status?: string | null;
  created_at: string;
  updated_at: string;
}

export function AccountsPage() {
  const { company, profile: currentProfile } = useAuth();
  const [accounts, setAccounts] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [viewAccount, setViewAccount] = useState<AccountUser | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);

  const [editAccount, setEditAccount] = useState<AccountUser | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/accounts?company_id=${company.id}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data || []);
      } else {
        toast.error('Lỗi khi tải danh sách tài khoản');
      }
    } catch (err) {
      console.error('Lỗi fetchAccounts:', err);
      toast.error('Có lỗi xảy ra khi lấy danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const name = (acc.full_name || '').toLowerCase();
      const email = (acc.email || '').toLowerCase();
      const phone = (acc.phone || '').toLowerCase();
      const term = searchQuery.toLowerCase();

      const matchSearch = name.includes(term) || email.includes(term) || phone.includes(term);
      const matchRole = !roleFilter || acc.role === roleFilter;
      const matchStatus =
        !statusFilter ||
        (statusFilter === 'active' && acc.is_active) ||
        (statusFilter === 'locked' && !acc.is_active);

      return matchSearch && matchRole && matchStatus;
    });
  }, [accounts, searchQuery, roleFilter, statusFilter]);

  // Handler: Thêm tài khoản mới
  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const full_name = ((formData.get('full_name') as string) || '').trim();
    const email = ((formData.get('email') as string) || '').trim();
    const phone = ((formData.get('phone') as string) || '').trim();
    const role = (formData.get('role') as string) || 'employee';
    const password = ((formData.get('password') as string) || '').trim();

    if (!full_name || !email) {
      toast.error('Vui lòng điền Họ tên và Email tài khoản');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name,
          email,
          phone,
          role,
          password: password || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi khởi tạo tài khoản');

      toast.success('Thêm tài khoản người dùng mới thành công!');
      setIsAddOpen(false);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || 'Khởi tạo tài khoản thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Handler: Cập nhật thông tin tài khoản
  const handleUpdateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editAccount) return;
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const full_name = ((formData.get('full_name') as string) || '').trim();
    const phone = ((formData.get('phone') as string) || '').trim();
    const role = (formData.get('role') as string) || editAccount.role;

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editAccount.id,
          full_name,
          phone,
          role,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi cập nhật tài khoản');

      toast.success('Cập nhật tài khoản người dùng thành công!');
      setIsEditOpen(false);
      setEditAccount(null);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Handler: Xóa tài khoản
  const handleDeleteAccount = async (user: AccountUser) => {
    if (currentProfile?.id && user.id === currentProfile.id) {
      toast.error('Không thể tự xóa tài khoản Quản trị viên đang đăng nhập!');
      return;
    }

    const confirmMsg = `Bạn có CHẮC CHẮN muốn XÓA vĩnh viễn tài khoản "${user.full_name || user.email}"? Thao tác này không thể hoàn tác!`;
    if (!confirm(confirmMsg)) return;

    setActionLoadingId(user.id);
    try {
      const res = await fetch(`/api/admin/accounts?userId=${user.id}`, {
        method: 'DELETE',
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi xóa tài khoản');

      toast.success(`Đã xóa vĩnh viễn tài khoản ${user.email || user.full_name}`);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || 'Xóa tài khoản thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Khóa / Mở khóa tài khoản
  const handleToggleStatus = async (user: AccountUser) => {
    const nextStatus = !user.is_active;

    if (!nextStatus && currentProfile?.id && user.id === currentProfile.id) {
      toast.error('Không thể tự khóa tài khoản Quản trị viên đang đăng nhập');
      return;
    }
    const confirmMsg = nextStatus
      ? `Bạn có chắc chắn muốn MỞ KHÓA tài khoản ${user.email || user.full_name}?`
      : `Bạn có chắc chắn muốn KHÓA tài khoản ${user.email || user.full_name}?`;

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(user.id);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          is_active: nextStatus,
          action: 'toggle_status',
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi cập nhật tài khoản');

      toast.success(
        nextStatus
          ? `Đã mở khóa tài khoản ${user.email || user.full_name}`
          : `Đã khóa tài khoản ${user.email || user.full_name}`
      );
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Reset Mật khẩu
  const handleResetPassword = async (user: AccountUser) => {
    if (!user.email) {
      toast.error('Tài khoản này không có địa chỉ Email để gửi link đặt lại mật khẩu');
      return;
    }

    if (!confirm(`Bạn có muốn phát lệnh gửi email ĐẶT LẠI MẬT KHẨU tới ${user.email}?`)) return;

    setActionLoadingId(user.id);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'reset_password',
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi gửi yêu cầu reset mật khẩu');

      toast.success(resData.message || `Đã gửi liên kết đặt lại mật khẩu tới ${user.email}`);
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalActive = useMemo(() => accounts.filter((a) => a.is_active).length, [accounts]);
  const totalLocked = useMemo(() => accounts.filter((a) => !a.is_active).length, [accounts]);
  const totalKyc = useMemo(
    () => accounts.filter((a) => a.kyc_status === 'verified').length,
    [accounts]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-accent" /> Quản lý Tài khoản Người dùng
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Khởi tạo, cập nhật, phân vai trò, khóa/mở khóa tài khoản và bảo mật cho thành viên doanh nghiệp.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl h-11 px-5 shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" /> Thêm tài khoản mới
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-ink-muted">TỔNG TÀI KHOẢN</p>
              <p className="text-2xl font-extrabold text-ink mt-1">{accounts.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-600">ĐANG HOẠT ĐỘNG</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{totalActive}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-red-600">TÀI KHOẢN ĐÃ KHÓA</p>
              <p className="text-2xl font-extrabold text-red-700 mt-1">{totalLocked}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <UserX className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-indigo-600">ĐÃ XÁC MINH KYC</p>
              <p className="text-2xl font-extrabold text-indigo-700 mt-1">{totalKyc}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Card Table */}
      <Card className="rounded-2xl border border-border bg-white shadow-xs p-6 space-y-4">
        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <Input
              placeholder="Tìm theo tên, email hoặc SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl h-10 border-border bg-bg-base/30 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-ink-muted font-bold">
              <Filter className="h-3.5 w-3.5" /> Lọc:
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-xl border border-border bg-white px-3 text-xs font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Tất cả vai trò</option>
              <option value="manager">Quản lý vận hành tòa nhà</option>
              <option value="sales_agent">Chuyên viên tư vấn / Sales</option>
              <option value="accountant">Kế toán viên</option>
              <option value="employee">Nhân viên</option>
              <option value="tenant">Khách thuê phòng</option>
              <option value="customer">Khách hàng tìm phòng</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-border bg-white px-3 text-xs font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">🟢 Đang hoạt động</option>
              <option value="locked">🔴 Đã khóa</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-ink-muted font-medium">Đang tải danh sách tài khoản...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-bg-base/30">
            <User className="h-8 w-8 mx-auto mb-2 text-ink-muted opacity-40" />
            <p className="text-sm font-medium text-ink-muted">Không tìm thấy tài khoản người dùng phù hợp</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-bg-subtle/80 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase">
                    Người dùng / Email
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase">
                    Vai trò hệ thống
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold text-ink-muted uppercase">
                    Định danh KYC
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold text-ink-muted uppercase">
                    Trạng thái tài khoản
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-ink-muted uppercase">
                    Thao tác quản trị
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-ink">
                {filteredAccounts.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-accent/5 transition-all cursor-pointer group"
                    onClick={() => {
                      setViewAccount(user);
                      setIsViewOpen(true);
                    }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/10 text-accent font-extrabold flex items-center justify-center shrink-0">
                          {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-ink text-sm">
                            {user.full_name || 'Chưa cập nhật tên'}
                          </p>
                          <p className="text-xs text-ink-muted font-mono">{user.email || 'Chưa có email'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200 font-bold text-xs">
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {user.kyc_status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Đã xác minh
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Chưa KYC
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {user.is_active ? (
                        <Badge variant="default" className="bg-emerald-600 text-white font-semibold">
                          🟢 Hoạt động
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="font-semibold">
                          🔴 Đã khóa
                        </Badge>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Nút Sửa */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditAccount(user);
                            setIsEditOpen(true);
                          }}
                          className="h-8 rounded-lg text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1"
                          title="Chỉnh sửa tài khoản"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Sửa
                        </Button>

                        {/* Nút Khóa / Mở khóa */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoadingId === user.id}
                          onClick={() => handleToggleStatus(user)}
                          className={`h-8 rounded-lg text-xs font-bold gap-1 ${
                            user.is_active
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={user.is_active ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}
                        >
                          {actionLoadingId === user.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : user.is_active ? (
                            <>
                              <Lock className="h-3.5 w-3.5" /> Khóa
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3.5 w-3.5" /> Mở khóa
                            </>
                          )}
                        </Button>

                        {/* Nút Reset Mật khẩu */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoadingId === user.id}
                          onClick={() => handleResetPassword(user)}
                          className="h-8 rounded-lg text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                          title="Gửi email đặt lại mật khẩu"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Reset
                        </Button>

                        {/* Nút Xóa */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoadingId === user.id || user.id === currentProfile?.id}
                          onClick={() => handleDeleteAccount(user)}
                          className="h-8 rounded-lg text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 gap-1"
                          title="Xóa tài khoản này"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Thêm tài khoản mới */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border border-border shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 font-heading font-extrabold text-base text-ink">
              <UserPlus className="h-5 w-5 text-accent" /> Thêm tài khoản người dùng mới
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAccount} className="space-y-4 pt-3 text-sm">
            <div>
              <Label htmlFor="add_full_name" className="text-xs font-bold text-ink uppercase">
                Họ và tên <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add_full_name"
                name="full_name"
                required
                placeholder="VD: Nguyễn Văn A"
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div>
              <Label htmlFor="add_email" className="text-xs font-bold text-ink uppercase">
                Email đăng nhập <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add_email"
                name="email"
                type="email"
                required
                placeholder="VD: nguyenvana@realhome.vn"
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add_phone" className="text-xs font-bold text-ink uppercase">
                  Số điện thoại
                </Label>
                <Input
                  id="add_phone"
                  name="phone"
                  placeholder="0987654321"
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <Label htmlFor="add_role" className="text-xs font-bold text-ink uppercase">
                  Vai trò hệ thống <span className="text-red-500">*</span>
                </Label>
                <select
                  id="add_role"
                  name="role"
                  defaultValue="sales_agent"
                  className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent mt-1"
                >
                  <option value="manager">Quản lý vận hành tòa nhà</option>
                  <option value="sales_agent">Chuyên viên tư vấn / Sales</option>
                  <option value="accountant">Kế toán viên</option>
                  <option value="employee">Nhân viên</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="add_password" className="text-xs font-bold text-ink uppercase">
                Mật khẩu khởi tạo
              </Label>
              <Input
                id="add_password"
                name="password"
                type="password"
                placeholder="Mặc định: RealHome@2026!"
                className="rounded-xl h-10 mt-1"
              />
              <p className="text-[11px] text-ink-muted mt-1">
                Nếu để trống, mật khẩu mặc định sẽ là <code className="font-mono bg-slate-100 px-1 rounded">RealHome@2026!</code>
              </p>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl h-10 px-4"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl h-10 px-6"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Tạo tài khoản
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Chỉnh sửa tài khoản */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border border-border shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 font-heading font-extrabold text-base text-ink">
              <Pencil className="h-5 w-5 text-accent" /> Chỉnh sửa thông tin tài khoản
            </DialogTitle>
          </DialogHeader>

          {editAccount && (
            <form onSubmit={handleUpdateAccount} className="space-y-4 pt-3 text-sm">
              <div>
                <Label htmlFor="edit_email" className="text-xs font-bold text-ink uppercase">
                  Email đăng nhập
                </Label>
                <Input
                  id="edit_email"
                  value={editAccount.email || ''}
                  disabled
                  className="rounded-xl h-10 mt-1 bg-slate-100 cursor-not-allowed text-slate-500"
                />
              </div>

              <div>
                <Label htmlFor="edit_full_name" className="text-xs font-bold text-ink uppercase">
                  Họ và tên <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_full_name"
                  name="full_name"
                  defaultValue={editAccount.full_name || ''}
                  required
                  placeholder="Họ tên người dùng"
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit_phone" className="text-xs font-bold text-ink uppercase">
                    Số điện thoại
                  </Label>
                  <Input
                    id="edit_phone"
                    name="phone"
                    defaultValue={editAccount.phone || ''}
                    placeholder="0987654321"
                    className="rounded-xl h-10 mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit_role" className="text-xs font-bold text-ink uppercase">
                    Vai trò hệ thống <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="edit_role"
                    name="role"
                    defaultValue={editAccount.role}
                    className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent mt-1"
                  >
                    <option value="manager">Quản lý vận hành tòa nhà</option>
                    <option value="sales_agent">Chuyên viên tư vấn / Sales</option>
                    <option value="accountant">Kế toán viên</option>
                    <option value="employee">Nhân viên</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl h-10 px-4"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl h-10 px-6"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Lưu thay đổi
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border border-border shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 font-heading font-extrabold text-base text-ink">
              <User className="h-5 w-5 text-accent" /> Chi tiết tài khoản người dùng
            </DialogTitle>
          </DialogHeader>

          {viewAccount && (
            <div className="space-y-4 pt-3 text-sm text-ink">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-base border border-border">
                <div className="w-12 h-12 rounded-full bg-accent text-white font-extrabold flex items-center justify-center text-lg">
                  {(viewAccount.full_name || viewAccount.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-base text-ink">
                    {viewAccount.full_name || 'Chưa cập nhật tên'}
                  </h4>
                  <p className="text-xs text-ink-muted font-mono">{viewAccount.email || '—'}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Số điện thoại:</span>
                  <span className="font-mono font-bold text-ink">{viewAccount.phone || '—'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Vai trò hệ thống:</span>
                  <span className="font-bold text-ink">{getRoleLabel(viewAccount.role)}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Trạng thái tài khoản:</span>
                  <span>
                    {viewAccount.is_active ? (
                      <span className="font-bold text-emerald-600">🟢 Hoạt động</span>
                    ) : (
                      <span className="font-bold text-red-600">🔴 Đã bị khóa</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Định danh KYC:</span>
                  <span>
                    {viewAccount.kyc_status === 'verified' ? (
                      <span className="font-bold text-emerald-600">✅ Đã xác minh</span>
                    ) : (
                      <span className="font-bold text-amber-600">⚠️ Chưa KYC</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-ink-muted font-medium">Ngày khởi tạo:</span>
                  <span className="font-mono text-ink">
                    {new Date(viewAccount.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
