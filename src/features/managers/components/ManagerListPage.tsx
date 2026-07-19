'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus, Search, UserCog, Loader2, AlertCircle } from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useManagers, useLandlords } from '@/lib/hooks/useEntities';
import { usePropertiesFeature } from '@/src/features/properties/hooks/usePropertiesFeature';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';
import type { DBManager } from '@/lib/supabase/types';
import { supabase } from '@/lib/supabase/client';

export function ManagerListPage() {
  const { company } = useAuth();
  const { items: managerList, loading, error, add, update, remove } = useManagers(company?.id);
  const { items: landlordList, refetch: refetchLandlords } = useLandlords(company?.id);
  const { items: buildingList, refetch: refetchBuildings } = usePropertiesFeature(company?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [editItem, setEditItem] = useState<DBManager | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [managerAvatar, setManagerAvatar] = useState<string>('');
  
  // Building Assignment states
  const [selectedLandlordId, setSelectedLandlordId] = useState<string>('');
  const [assignedBuildingIds, setAssignedBuildingIds] = useState<string[]>([]);

  // Landlord Quick Create states
  const [isLandlordDialogOpen, setIsLandlordDialogOpen] = useState(false);
  const [creatingLandlord, setCreatingLandlord] = useState(false);
  const [newLandlordAvatar, setNewLandlordAvatar] = useState<string>('');

  // Derived filtered buildings based on selected landlord
  const selectedLandlordCode = landlordList.find(l => l.id === selectedLandlordId)?.code;
  const landlordBuildings = buildingList.filter(b => selectedLandlordCode ? b.landlord_id === selectedLandlordCode : false);

  const filtered = managerList.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.phone ?? '').includes(searchQuery) ||
    (m.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLandlordId) {
      toast.error('Vui lòng chọn Chủ nhà!');
      setSaving(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const payload = {
      company_id: company?.id ?? '',
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      manager_type: formData.get('manager_type') as 'individual' | 'company' | null,
      company_name: formData.get('company_name') as string || null,
      avatar_url: managerAvatar || null,
      landlord_id: selectedLandlordId,
    };
    
    let savedManager: DBManager | null = null;

    if (editItem) {
      savedManager = await update(editItem.id, payload) as DBManager;
      toast.success('Cập nhật người quản lý thành công!');
    } else {
      savedManager = await add(payload) as DBManager;
      toast.success('Tạo người quản lý thành công!');
    }

    if (savedManager) {
      const managerId = savedManager.id;
      // Identify buildings to add this manager to, and buildings to remove this manager from
      const buildingsToAdd = assignedBuildingIds;
      const buildingsToRemove = buildingList
        .filter(b => b.manager_ids?.includes(managerId) && !assignedBuildingIds.includes(b.id))
        .map(b => b.id);

      for (const bId of buildingsToAdd) {
        const building = buildingList.find(b => b.id === bId);
        if (building && !building.manager_ids?.includes(managerId)) {
          const newIds = [...(building.manager_ids || []), managerId];
          await supabase.from('buildings').update({ manager_ids: newIds }).eq('id', bId);
        }
      }

      for (const bId of buildingsToRemove) {
        const building = buildingList.find(b => b.id === bId);
        if (building && building.manager_ids?.includes(managerId)) {
          const newIds = building.manager_ids.filter(id => id !== managerId);
          await supabase.from('buildings').update({ manager_ids: newIds }).eq('id', bId);
        }
      }
      
      if (buildingsToAdd.length > 0 || buildingsToRemove.length > 0) {
        refetchBuildings();
      }
    }

    setSaving(false);
    setIsDialogOpen(false);
    setEditItem(null);
    setAssignedBuildingIds([]);
    setSelectedLandlordId('');
    setManagerAvatar('');
  };

  const handleCreateLandlord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingLandlord(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      company_id: company?.id ?? '',
      name: formData.get('name') as string,
      code: formData.get('code') as string || null,
      phone: formData.get('phone') as string || null,
      address: formData.get('address') as string || null,
      notes: formData.get('notes') as string || null,
      owner_type: formData.get('owner_type') as 'individual' | 'company' | null,
      company_name: formData.get('company_name') as string || null,
      image_url: newLandlordAvatar || null
    };

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const { data } = await res.json();
      toast.success('Tạo chủ nhà thành công!');
      
      if (refetchLandlords) await refetchLandlords();
      setSelectedLandlordId(data.id);
      setIsLandlordDialogOpen(false);
      setNewLandlordAvatar('');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo chủ nhà');
    } finally {
      setCreatingLandlord(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} người quản lý đã chọn không? Thao tác này không thể hoàn tác.`)) return;
    try {
      await Promise.all(selectedIds.map(id => remove(id)));
      setSelectedIds([]);
      toast.success('Đã xóa thành công');
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi xóa');
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setAssignedBuildingIds([]);
    setSelectedLandlordId('');
    setManagerAvatar('');
    setIsDialogOpen(true);
  };

  const openEdit = (item: DBManager) => {
    setEditItem(item);
    // Find all buildings currently assigned to this manager
    const currentAssignments = buildingList.filter(b => b.manager_ids?.includes(item.id)).map(b => b.id);
    setAssignedBuildingIds(currentAssignments);
    setSelectedLandlordId(item.landlord_id || ''); 
    setManagerAvatar(item.avatar_url || '');
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Người quản lý</h1>
          <p className="text-ink-muted text-sm">Quản lý danh sách người quản lý và vận hành tòa nhà</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-accent hover:bg-accent-500 text-white rounded-lg">
              <Plus className="h-4 w-4 mr-2" />Thêm quản lý
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg rounded-lg border border-border bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg text-ink font-bold">
                {editItem ? 'Chỉnh sửa' : 'Thêm'} người quản lý
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-ink font-semibold text-xs uppercase tracking-wider">Họ tên <span className="text-red-500">*</span></Label>
                  <Input id="name" name="name" defaultValue={editItem?.name} required className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại <span className="text-red-500">*</span></Label>
                  <Input id="phone" name="phone" defaultValue={editItem?.phone ?? ''} className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-ink font-semibold text-xs uppercase tracking-wider">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editItem?.email ?? ''} className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
                </div>
                <div>
                  <Label htmlFor="manager_type" className="text-ink font-semibold text-xs uppercase tracking-wider">Loại quản lý</Label>
                  <select
                    id="manager_type"
                    name="manager_type"
                    defaultValue={editItem?.manager_type ?? 'individual'}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border-border mt-1.5 focus-visible:ring-accent"
                  >
                    <option value="individual">Cá nhân</option>
                    <option value="company">Công ty</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="company_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Tên công ty (Nếu là Cty)</Label>
                <Input id="company_name" name="company_name" defaultValue={editItem?.company_name ?? ''} className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Hình ảnh người quản lý</Label>
                <ImageUpload 
                  value={managerAvatar} 
                  onChange={(url) => setManagerAvatar(Array.isArray(url) ? url[0] : url || '')} 
                />
              </div>
              
              <div className="border border-border p-4 rounded-lg bg-bg-subtle/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink block uppercase tracking-wider">Phân công tòa nhà quản lý</span>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Chủ nhà <span className="text-red-500">*</span></Label>
                    <Button 
                      type="button" 
                      variant="link" 
                      className="h-auto p-0 text-accent text-xs"
                      onClick={() => {
                        setNewLandlordAvatar('');
                        setIsLandlordDialogOpen(true);
                      }}
                    >
                      + Tạo nhanh chủ nhà
                    </Button>
                  </div>
                  <select
                    value={selectedLandlordId}
                    onChange={(e) => setSelectedLandlordId(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    required
                  >
                    <option value="">-- Bắt buộc chọn Chủ nhà --</option>
                    {landlordList.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.code ? `${l.code} - ` : ''}{l.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedLandlordId && (
                  <div className="space-y-2 mt-2">
                    <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Chọn tòa nhà</Label>
                    <div className="max-h-40 overflow-y-auto border border-border rounded-lg bg-white divide-y divide-border">
                      {landlordBuildings.length === 0 ? (
                        <div className="p-3 text-sm text-ink-muted text-center">Không có tòa nhà nào thuộc chủ nhà này.</div>
                      ) : (
                        landlordBuildings.map(b => (
                          <label key={b.id} className="flex items-center gap-3 p-3 hover:bg-bg-subtle cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                              checked={assignedBuildingIds.includes(b.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssignedBuildingIds(prev => [...prev, b.id]);
                                } else {
                                  setAssignedBuildingIds(prev => prev.filter(id => id !== b.id));
                                }
                              }}
                            />
                            <div>
                              <div className="font-semibold text-sm text-ink">{b.name}</div>
                              <div className="text-xs text-ink-muted">{b.code} - {b.area}</div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {assignedBuildingIds.length > 0 && (
                  <div className="mt-3">
                    <Label className="text-ink font-semibold text-xs uppercase tracking-wider mb-2 block">Tòa nhà đã chọn ({assignedBuildingIds.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {assignedBuildingIds.map(bId => {
                        const b = buildingList.find(x => x.id === bId);
                        if (!b) return null;
                        return (
                          <div key={bId} className="flex items-center gap-1 bg-white border border-border px-2 py-1 rounded-md text-xs font-semibold text-ink">
                            {b.name}
                            <button
                              type="button"
                              onClick={() => setAssignedBuildingIds(prev => prev.filter(id => id !== bId))}
                              className="ml-1 text-ink-muted hover:text-danger hover:bg-danger/10 rounded p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <Button type="submit" className="w-full bg-accent hover:bg-accent-500 text-white rounded-lg mt-2" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isLandlordDialogOpen} onOpenChange={setIsLandlordDialogOpen}>
        <DialogContent className="max-w-xl rounded-lg border border-border bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-ink font-bold">
              Tạo nhanh Chủ nhà / Nhóm đầu tư
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLandlord} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner_type" className="text-ink font-semibold text-xs uppercase tracking-wider">Loại chủ nhà</Label>
                <select
                  id="owner_type"
                  name="owner_type"
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-accent mt-1.5"
                >
                  <option value="individual">Cá nhân</option>
                  <option value="company">Công ty</option>
                </select>
              </div>
              <div>
                <Label htmlFor="ll_code" className="text-ink font-semibold text-xs uppercase tracking-wider">Mã chủ nhà</Label>
                <Input id="ll_code" name="code" className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
              </div>
            </div>
            <div>
              <Label htmlFor="ll_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Tên chủ nhà / Người đại diện <span className="text-red-500">*</span></Label>
              <Input id="ll_name" name="name" required className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
            </div>
            <div>
              <Label htmlFor="ll_company_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Tên công ty / Nhóm đầu tư</Label>
              <Input id="ll_company_name" name="company_name" className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ll_phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại</Label>
                <Input id="ll_phone" name="phone" className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
              </div>
              <div>
                <Label htmlFor="ll_address" className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ</Label>
                <Input id="ll_address" name="address" className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
              </div>
            </div>
            <div>
              <Label htmlFor="ll_notes" className="text-ink font-semibold text-xs uppercase tracking-wider">Ghi chú</Label>
              <Input id="ll_notes" name="notes" className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Hình ảnh chủ nhà</Label>
              <ImageUpload 
                value={newLandlordAvatar} 
                onChange={(url) => setNewLandlordAvatar(Array.isArray(url) ? url[0] : url || '')} 
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsLandlordDialogOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-accent hover:bg-accent-500 text-white" disabled={creatingLandlord}>
                {creatingLandlord ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu chủ nhà
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <Card className="border-border rounded-lg shadow-none bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input placeholder="Tìm theo tên, SĐT hoặc email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-lg border-border focus-visible:ring-accent" />
            </div>
            {selectedIds.length > 0 && (
              <Button onClick={handleBulkDelete} size="sm" className="bg-red-500 hover:bg-red-600 text-white rounded-lg whitespace-nowrap h-10">
                <Trash2 className="h-4 w-4 mr-2" /> Xóa {selectedIds.length} mục
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink-muted" /></div>
          ) : (
            <div className="overflow-hidden border-t border-border">
              <table className="w-full text-sm hidden md:table border-collapse">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                        onChange={handleSelectAll}
                        checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Họ tên</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Số điện thoại</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Loại</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="px-4 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => handleSelect(item.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt={item.name} className="h-8 w-8 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-bg-subtle flex items-center justify-center flex-shrink-0 border border-border">
                              <UserCog className="h-4 w-4 text-ink-muted" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-ink text-sm flex items-center gap-2">
                              {item.name}
                              {item.code && <span className="bg-bg-subtle border border-border px-1.5 py-0.5 rounded text-[10px] font-mono text-ink-muted">{item.code}</span>}
                            </div>
                            {item.company_name && <div className="text-xs text-ink-muted truncate max-w-[180px]">{item.company_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-ink-muted font-mono text-xs">{item.phone ?? '—'}</td>
                      <td className="px-6 py-4 text-ink-muted text-sm">{item.email ?? '—'}</td>
                      <td className="px-6 py-4 text-ink-muted text-sm">
                        {item.manager_type === 'company' ? 'Công ty' : 'Cá nhân'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle rounded-md"
                            onClick={() => openEdit(item)}
                            title="Chỉnh sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10 rounded-md"
                            onClick={() => {
                              if (window.confirm('Bạn có chắc muốn xóa người quản lý này? Thao tác này không thể hoàn tác.')) {
                                remove(item.id);
                              }
                            }}
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-ink-muted bg-white">
                        <UserCog className="h-10 w-10 mx-auto mb-2 opacity-35" />
                        <p className="text-sm">Chưa có người quản lý nào</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Mobile View Omitted for brevity, using same logic as desktop for now to keep it simple, or I can add a basic mobile card list */}
              <div className="md:hidden divide-y divide-border bg-white">
                {filtered.map((item) => (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {item.avatar_url ? (
                          <img src={item.avatar_url} alt={item.name} className="h-9 w-9 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-bg-subtle flex items-center justify-center flex-shrink-0 border border-border">
                            <UserCog className="h-5 w-5 text-ink-muted" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-ink text-sm flex items-center gap-2">
                            {item.name}
                            {item.code && <span className="bg-bg-subtle border border-border px-1.5 py-0.5 rounded text-[10px] font-mono text-ink-muted">{item.code}</span>}
                          </span>
                          {item.company_name && <span className="text-xs text-ink-muted">{item.company_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
                      <div><span className="font-medium text-ink-muted">SĐT:</span> <span className="text-ink font-mono">{item.phone ?? '—'}</span></div>
                      <div><span className="font-medium text-ink-muted">Email:</span> <span className="text-ink">{item.email ?? '—'}</span></div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-border/50">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-danger" onClick={() => { if (window.confirm('Xóa?')) remove(item.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
