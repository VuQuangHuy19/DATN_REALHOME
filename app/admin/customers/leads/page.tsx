'use client';

import { useState, useEffect, useMemo } from 'react';

import { useRoomTypesCatalog, useProfiles } from '@/lib/hooks/useEntities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus, Search, UserSearch, Phone, Mail, MapPin,
  Clock, Edit, Trash2, Calendar,
  MessageCircle, PhoneCall, ArrowRightLeft, Video, MessageSquare,
  Loader2, AlertCircle,
} from 'lucide-react';
import { useLeads, useLeadDetail } from '@/lib/hooks/useLeads';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBLead, DBLeadActivity } from '@/lib/supabase/types';

const statusConfig: Record<string, { label: string; color: string }> = {
  new:         { label: 'Mới',          color: 'bg-slate-100 text-slate-700' },
  consulting:  { label: 'Đang tư vấn',  color: 'bg-blue-100 text-blue-700' },
  appointment: { label: 'Hẹn xem',      color: 'bg-purple-100 text-purple-700' },
  viewed:      { label: 'Đã xem',       color: 'bg-teal-100 text-teal-700' },
  deposited:   { label: 'Đã cọc',       color: 'bg-orange-100 text-orange-700' },
  rented:      { label: 'Đã thuê',      color: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Đã hủy',       color: 'bg-red-100 text-red-700' },
  contacted:   { label: 'Đã liên hệ',   color: 'bg-cyan-100 text-cyan-700' },
  won:         { label: 'Thành công',   color: 'bg-emerald-100 text-emerald-700' },
  lost:        { label: 'Thất bại',     color: 'bg-rose-100 text-rose-700' },
};

const sourceConfig: Record<string, string> = {
  website: 'Website', facebook: 'Facebook', tiktok: 'TikTok', zalo: 'Zalo',
  chotot: 'Chợ Tốt', referral: 'Giới thiệu', cold_call: 'Gọi lạnh', walk_in: 'Trực tiếp', other: 'Khác',
};

const activityTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  call:          { label: 'Cuộc gọi',       icon: PhoneCall,     color: 'bg-blue-100 text-blue-600' },
  meeting:       { label: 'Gặp mặt',        icon: Calendar,      color: 'bg-green-100 text-green-600' },
  zalo:          { label: 'Zalo',           icon: MessageSquare, color: 'bg-teal-100 text-teal-600' },
  email:         { label: 'Email',          icon: Mail,          color: 'bg-purple-100 text-purple-600' },
  note:          { label: 'Ghi chú',        icon: MessageCircle, color: 'bg-slate-100 text-slate-600' },
  status_change: { label: 'Đổi trạng thái', icon: ArrowRightLeft, color: 'bg-amber-100 text-amber-600' },
};

const statusOrder = ['new', 'consulting', 'appointment', 'viewed', 'deposited', 'rented', 'cancelled', 'contacted', 'won', 'lost'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function LeadDetail({ leadId, onClose, currentUserId, currentUserName }: {
  leadId: string;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
}) {
  const { lead, activities, addActivity, changeStatus } = useLeadDetail(leadId);
  const [newActivityContent, setNewActivityContent] = useState('');
  const [newActivityType, setNewActivityType] = useState<'call' | 'meeting' | 'zalo' | 'email' | 'note'>('call');
  const [newStatus, setNewStatus] = useState('');

  if (!lead) return <div className="py-8 text-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;

  const sc = statusConfig[lead.status] ?? statusConfig.new;

  const handleAddActivity = async () => {
    if (!newActivityContent.trim()) return;
    await addActivity({
      lead_id: leadId,
      company_id: lead.company_id,
      type: newActivityType,
      content: newActivityContent,
      old_status: null,
      new_status: null,
      created_by: currentUserId,
      created_by_name: currentUserName,
    });
    setNewActivityContent('');
  };

  const handleChangeStatus = async () => {
    if (!newStatus || newStatus === lead.status) return;
    await changeStatus(newStatus as DBLead['status'], currentUserId, currentUserName);
    setNewStatus('');
  };

  return (
    <div className="space-y-5 pt-2">
      <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg text-sm">
        <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{lead.phone}</div>
        <div className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4 text-slate-400" />{lead.email ?? '—'}</div>
        <div className="col-span-2 flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 text-xs">Trạng thái hiện tại:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
        </div>
        <div className="text-xs text-slate-600"><span className="text-slate-400">Quan tâm:</span> {lead.interest ?? '—'}</div>
        <div className="text-xs text-slate-600"><span className="text-slate-400">Ngân sách:</span> {lead.budget.toLocaleString('vi-VN')}đ</div>
        <div className="text-xs text-slate-600"><span className="text-slate-400">Khu vực:</span> {lead.preferred_area ?? '—'}</div>
      </div>

      <div className="flex items-center gap-2">
        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">-- Chuyển trạng thái --</option>
          {statusOrder.map((s) => <option key={s} value={s}>{statusConfig[s]?.label}</option>)}
        </select>
        <Button size="sm" onClick={handleChangeStatus} disabled={!newStatus}>Cập nhật</Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-slate-800 text-sm">Ghi nhận hoạt động</h3>
        <div className="flex gap-2">
          <select value={newActivityType} onChange={(e) => setNewActivityType(e.target.value as any)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {(['call', 'meeting', 'zalo', 'email', 'note'] as const).map((t) => (
              <option key={t} value={t}>{activityTypeConfig[t].label}</option>
            ))}
          </select>
          <Input placeholder="Nội dung hoạt động..." value={newActivityContent} onChange={(e) => setNewActivityContent(e.target.value)} className="flex-1" />
          <Button size="sm" onClick={handleAddActivity} disabled={!newActivityContent.trim()}>Thêm</Button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-800 text-sm mb-3">Lịch sử hoạt động</h3>
        <div className="space-y-3">
          {activities.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">Chưa có hoạt động nào</p>
          )}
          {activities.map((entry) => {
            const tc = activityTypeConfig[entry.type] ?? activityTypeConfig.note;
            const EntryIcon = tc.icon;
            return (
              <div key={entry.id} className="flex gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${tc.color}`}>
                  <EntryIcon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0 pb-3 border-b border-dashed last:border-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-600">{tc.label}</span>
                    <span className="text-xs text-slate-400">· {entry.created_by_name}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />{formatDate(entry.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5">{entry.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const { company, user, role, profile } = useAuth();
  const { leads: leadList, loading, error, add, update, remove } = useLeads(company?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<DBLead | null>(null);
  const [saving, setSaving] = useState(false);
  const { items: profiles } = useProfiles(company?.id);

  const isSale = role === 'sales_agent';

  const { items: roomTypes } = useRoomTypesCatalog(company?.id);

  const visibleLeads = useMemo(() => {
    if (isSale && user?.id) {
      return leadList.filter((l) => l.assigned_to === user.id);
    }
    return leadList;
  }, [leadList, isSale, user?.id]);

  const assignableProfiles = useMemo(() => {
    return profiles.filter((p) => p.role !== 'landlord');
  }, [profiles]);

  const getAssigneeName = (assignedToId: string | null) => {
    if (!assignedToId) return 'Chưa phân công';
    const prof = profiles.find((p) => p.id === assignedToId);
    return prof?.full_name || prof?.email || 'Chưa phân công';
  };

  const filtered = visibleLeads.filter((l) => {
    const matchSearch =
      l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      (l.email ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      company_id: company?.id ?? '',
      full_name: fd.get('fullName') as string,
      phone: fd.get('phone') as string,
      email: fd.get('email') as string || null,
      source: fd.get('source') as DBLead['source'],
      status: fd.get('status') as DBLead['status'],
      interest: fd.get('interest') as string || null,
      budget: Number(String(fd.get('budget') || '0').replace(/\./g, '')),
      preferred_area: fd.get('preferredArea') as string || null,
      preferred_room_type: fd.get('preferredRoomType') as string || null,
      interested_area: null,
      assigned_to: isSale ? (user?.id ?? null) : (fd.get('assignedTo') as string || null),
      notes: fd.get('notes') as string || null,
      last_contacted_at: null,
    };
    if (editItem) {
      await update(editItem.id, payload);
    } else {
      await add(payload);
    }
    setSaving(false);
    setIsFormOpen(false);
    setEditItem(null);
  };

  const counts = Object.keys(statusConfig).reduce((acc, s) => {
    acc[s] = visibleLeads.filter((l) => l.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Khách hàng tiềm năng</h1>
          <p className="text-slate-500">Quản lý và theo dõi leads bán hàng</p>
        </div>
        <Button onClick={() => { setEditItem(null); setIsFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Thêm lead
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isSale && (
          <div className="w-full text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg mb-2 flex items-center gap-1.5 border border-indigo-100">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-indigo-500" /> Chỉ hiển thị Leads được phân công cho bạn
          </div>
        )}
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Tất cả ({visibleLeads.length})
        </button>
        {statusOrder.filter((s) => counts[s] > 0 || s === 'new').map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {statusConfig[s]?.label} ({counts[s] || 0})
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Tìm theo tên, SĐT hoặc email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[750px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Khách hàng</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng thái</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Quan tâm</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Sale phụ trách</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Nguồn</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Ngân sách</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => {
                    const sc = statusConfig[item.status] || statusConfig.new;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          setSelectedLeadId(item.id);
                          setIsDetailOpen(true);
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{item.full_name}</div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Phone className="h-3 w-3" />{item.phone}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="text-sm">{item.preferred_room_type || '—'}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />{item.preferred_area || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border">
                            {getAssigneeName(item.assigned_to)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{sourceConfig[item.source] || item.source}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 font-medium">
                          {item.budget.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditItem(item); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            {role !== 'sales_agent' && (
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); remove(item.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <UserSearch className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Không tìm thấy lead nào</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserSearch className="h-5 w-5" />
              {leadList.find((l) => l.id === selectedLeadId)?.full_name}
            </DialogTitle>
          </DialogHeader>
          {selectedLeadId && isDetailOpen && (
            <LeadDetail
              leadId={selectedLeadId}
              onClose={() => setIsDetailOpen(false)}
              currentUserId={user?.id ?? ''}
              currentUserName={profile?.full_name ?? 'Admin'}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="fullName">Họ và tên <span className="text-red-500">*</span></Label>
                <Input id="fullName" name="fullName" defaultValue={editItem?.full_name} required />
              </div>
              <div>
                <Label htmlFor="phone">Số điện thoại <span className="text-red-500">*</span></Label>
                <Input id="phone" name="phone" defaultValue={editItem?.phone} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editItem?.email ?? ''} />
              </div>
              <div>
                <Label htmlFor="source">Nguồn lead</Label>
                <select id="source" name="source" defaultValue={editItem?.source ?? 'website'} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {Object.entries(sourceConfig).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="status">Trạng thái</Label>
                <select id="status" name="status" defaultValue={editItem?.status ?? 'new'} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {statusOrder.map((s) => <option key={s} value={s}>{statusConfig[s]?.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="interest">Quan tâm</Label>
                <Input id="interest" name="interest" defaultValue={editItem?.interest ?? ''} placeholder="Căn hộ 2PN view sông..." />
              </div>
              <div>
                <Label htmlFor="budget">Ngân sách (đ/tháng)</Label>
                <Input 
                  id="budget" 
                  name="budget" 
                  type="text" 
                  defaultValue={editItem?.budget ? Number(editItem.budget).toLocaleString('vi-VN') : ''} 
                  onChange={(e) => {
                    const val = e.target.value;
                    const clean = val.replace(/\D/g, '');
                    e.target.value = clean ? Number(clean).toLocaleString('vi-VN') : '';
                  }} 
                />
              </div>
              <div>
                <Label htmlFor="preferredArea">Khu vực</Label>
                <Input id="preferredArea" name="preferredArea" defaultValue={editItem?.preferred_area ?? ''} />
              </div>
              <div>
                <Label htmlFor="preferredRoomType">Loại phòng</Label>
                <select
                  id="preferredRoomType"
                  name="preferredRoomType"
                  defaultValue={editItem?.preferred_room_type ?? ''}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">-- Chọn loại phòng --</option>
                  {roomTypes.map((rt: any) => (
                    <option key={rt.id} value={rt.name}>{rt.name}</option>
                  ))}
                </select>
              </div>
              {!isSale && (
                <div>
                  <Label htmlFor="assignedTo">Phân công</Label>
                  <select id="assignedTo" name="assignedTo" defaultValue={editItem?.assigned_to ?? ''} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">-- Chọn nhân viên --</option>
                    {assignableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Input id="notes" name="notes" defaultValue={editItem?.notes ?? ''} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
