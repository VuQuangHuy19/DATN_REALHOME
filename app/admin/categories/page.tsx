'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Trash2, Plus, DollarSign, Sparkles, BedDouble, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  usePriceRanges,
  useAmenities,
  useRoomTypesCatalog,
  useVnProvinces,
  useVnDistricts,
  useVnWards,
} from '@/lib/hooks/useEntities';
import type { DBPriceRange, DBAmenity, DBRoomType } from '@/lib/supabase/repositories/categories';

// ─── Generic CRUD Table ──────────────────────────────────────────────────────

interface CrudTableProps {
  data: any[];
  columns: { key: string; label: string }[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  loading?: boolean;
  icon: React.ElementType;
}

function CrudTable({ data, columns, onEdit, onDelete, onBulkDelete, loading, icon: Icon }: CrudTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-ink-muted border border-dashed border-border rounded-lg bg-bg-base/30">
        <Icon className="h-8 w-8 mx-auto mb-2 opacity-35" />
        <p className="text-sm">Chưa có dữ liệu. Nhấn &quot;Thêm mới&quot; để bắt đầu.</p>
      </div>
    );
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(data.map(item => item.id));
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
    if (!onBulkDelete) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} mục đã chọn không? Thao tác này không thể hoàn tác.`)) return;
    try {
      await onBulkDelete(selectedIds);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-3">
      {selectedIds.length > 0 && onBulkDelete && (
        <div className="flex justify-end">
          <Button onClick={handleBulkDelete} size="sm" className="bg-red-500 hover:bg-red-600 text-white rounded-lg whitespace-nowrap h-9">
            <Trash2 className="h-4 w-4 mr-2" /> Xóa {selectedIds.length} mục
          </Button>
        </div>
      )}
      <div className="border border-border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-bg-subtle border-b border-border">
            <tr>
              {onBulkDelete && (
                <th className="px-4 py-3 text-left w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                    onChange={handleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === data.length}
                  />
                </th>
              )}
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">
                {col.label}
              </th>
            ))}
            <th className="px-6 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-ink">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
              {onBulkDelete && (
                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                    checked={selectedIds.includes(item.id)}
                    onChange={(e) => handleSelect(item.id, e.target.checked)}
                  />
                </td>
              )}
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 text-sm font-medium text-ink">
                  {col.key === 'min' || col.key === 'max'
                    ? (item[col.key] !== null && item[col.key] !== undefined ? `${Number(item[col.key]).toLocaleString('vi-VN')}đ` : '—')
                    : (item[col.key] ?? '—')}
                </td>
              ))}
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle rounded-md"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10 rounded-md"
                    onClick={() => {
                      if (window.confirm('Bạn có chắc muốn xóa mục này? Thao tác này không thể hoàn tác.')) {
                        onDelete(item.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const { company } = useAuth();
  const [activeTab, setActiveTab] = useState('prices');
  const [editItem, setEditItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { items: priceRanges, loading: loadingPrices, add: addPrice, update: updatePrice, remove: removePrice } = usePriceRanges(company?.id);
  const { items: amenities, loading: loadingAmenities, add: addAmenity, update: updateAmenity, remove: removeAmenity } = useAmenities(company?.id);
  const { items: roomTypes, loading: loadingRoomTypes, add: addRoomType, update: updateRoomType, remove: removeRoomType } = useRoomTypesCatalog(company?.id);

  // Location picker state
  const { items: provinces, loading: loadingProvinces } = useVnProvinces();
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const { items: districts, loading: loadingDistricts } = useVnDistricts(selectedProvince || undefined);
  const { items: wards, loading: loadingWards } = useVnWards(selectedDistrict || undefined);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditItem(null);
    setSelectedProvince('');
    setSelectedDistrict('');
    setIsDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Confirmation is now handled in CrudTable
    if (activeTab === 'prices') await removePrice(id);
    if (activeTab === 'amenities') await removeAmenity(id);
    if (activeTab === 'roomtypes') await removeRoomType(id);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company?.id) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      if (activeTab === 'prices') {
        const payload = {
          company_id: company.id,
          label: fd.get('label') as string,
          min: Number(fd.get('min')),
          max: fd.get('max') ? Number(fd.get('max')) : null,
        };
        if (editItem) await updatePrice(editItem.id, payload);
        else await addPrice(payload);
      }

      if (activeTab === 'amenities') {
        const payload = {
          company_id: company.id,
          name: fd.get('name') as string,
          icon: (fd.get('icon') as string) || null,
        };
        if (editItem) await updateAmenity(editItem.id, payload);
        else await addAmenity(payload);
      }

      if (activeTab === 'roomtypes') {
        const payload = {
          company_id: company.id,
          name: fd.get('name') as string,
          description: (fd.get('description') as string) || null,
        };
        if (editItem) await updateRoomType(editItem.id, payload);
        else await addRoomType(payload);
      }

      setIsDialogOpen(false);
      setEditItem(null);
    } finally {
      setSaving(false);
    }
  };

  const getFormFields = () => {
    switch (activeTab) {
      case 'prices':
        return [
          { name: 'label', label: 'Nhãn hiển thị', type: 'text', placeholder: 'VD: Dưới 3 triệu' },
          { name: 'min', label: 'Giá tối thiểu (VND)', type: 'number', placeholder: '0' },
          { name: 'max', label: 'Giá tối đa (VND, để trống = không giới hạn)', type: 'number', placeholder: '' },
        ];
      case 'amenities':
        return [
          { name: 'name', label: 'Tên tiện ích', type: 'text', placeholder: 'VD: Wifi, Điều hòa...' },
          { name: 'icon', label: 'Biểu tượng (emoji hoặc tên icon)', type: 'text', placeholder: 'VD: 📶 hoặc wifi' },
        ];
      case 'roomtypes':
        return [
          { name: 'name', label: 'Tên loại phòng', type: 'text', placeholder: 'VD: Studio, 1PN, 2PN...' },
          { name: 'description', label: 'Mô tả', type: 'text', placeholder: 'Mô tả ngắn...' },
        ];
      default:
        return [];
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'prices': return 'Khoảng giá';
      case 'amenities': return 'Tiện ích';
      case 'roomtypes': return 'Loại phòng';
      default: return '';
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Quản lý Danh mục</h1>
          <p className="text-ink-muted text-sm">Quản lý khoảng giá, tiện ích, loại phòng và tra cứu địa chỉ hành chính</p>
        </div>
        {activeTab !== 'areas' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={openAdd} className="bg-accent hover:bg-accent-500 text-white rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              Thêm mới
            </Button>
            <DialogContent className="max-w-md rounded-lg border border-border bg-white">
              <DialogHeader>
                <DialogTitle className="font-heading text-lg font-bold text-ink">
                  {editItem ? 'Chỉnh sửa' : 'Thêm'} {getTabLabel()}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 pt-4">
                {getFormFields().map((field) => (
                  <div key={field.name} className="space-y-1.5">
                    <Label htmlFor={field.name} className="text-ink font-semibold text-xs uppercase tracking-wider">{field.label}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      defaultValue={editItem?.[field.name] ?? ''}
                      className="rounded-lg border-border focus-visible:ring-accent"
                    />
                  </div>
                ))}
                <Button type="submit" className="w-full bg-accent hover:bg-accent-500 text-white rounded-lg mt-2" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Lưu
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-md bg-bg-subtle p-1 border border-border rounded-lg">
          <TabsTrigger value="prices" className="text-xs font-semibold text-ink-muted data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm rounded-md transition-all">
            <DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Khoảng giá
          </TabsTrigger>
          <TabsTrigger value="amenities" className="text-xs font-semibold text-ink-muted data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm rounded-md transition-all">
            <Sparkles className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Tiện ích
          </TabsTrigger>
          <TabsTrigger value="roomtypes" className="text-xs font-semibold text-ink-muted data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm rounded-md transition-all">
            <BedDouble className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Loại phòng
          </TabsTrigger>
          <TabsTrigger value="areas" className="text-xs font-semibold text-ink-muted data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm rounded-md transition-all">
            <MapPin className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Địa chỉ
          </TabsTrigger>
        </TabsList>

        {/* ─── Khoảng giá ─── */}
        <TabsContent value="prices" className="mt-6">
          <Card className="border-border rounded-lg shadow-none bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <DollarSign className="h-5 w-5 text-accent" />Khoảng giá
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CrudTable
                data={priceRanges}
                loading={loadingPrices}
                columns={[
                  { key: 'label', label: 'Nhãn' },
                  { key: 'min', label: 'Tối thiểu (VND)' },
                  { key: 'max', label: 'Tối đa (VND)' },
                ]}
                onEdit={openEdit}
                onDelete={handleDelete}
                onBulkDelete={async (ids) => {
                  await Promise.all(ids.map(id => removePrice(id)));
                }}
                icon={DollarSign}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tiện ích ─── */}
        <TabsContent value="amenities" className="mt-6">
          <Card className="border-border rounded-lg shadow-none bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <Sparkles className="h-5 w-5 text-accent" />Tiện ích
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CrudTable
                data={amenities}
                loading={loadingAmenities}
                columns={[
                  { key: 'icon', label: 'Biểu tượng' },
                  { key: 'name', label: 'Tên' },
                ]}
                onEdit={openEdit}
                onDelete={handleDelete}
                onBulkDelete={async (ids) => {
                  await Promise.all(ids.map(id => removeAmenity(id)));
                }}
                icon={Sparkles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Loại phòng ─── */}
        <TabsContent value="roomtypes" className="mt-6">
          <Card className="border-border rounded-lg shadow-none bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <BedDouble className="h-5 w-5 text-accent" />Loại phòng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CrudTable
                data={roomTypes}
                loading={loadingRoomTypes}
                columns={[
                  { key: 'name', label: 'Tên' },
                  { key: 'description', label: 'Mô tả' },
                ]}
                onEdit={openEdit}
                onDelete={handleDelete}
                onBulkDelete={async (ids) => {
                  await Promise.all(ids.map(id => removeRoomType(id)));
                }}
                icon={BedDouble}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Địa chỉ hành chính ─── */}
        <TabsContent value="areas" className="mt-6">
          <Card className="border-border rounded-lg shadow-none bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <MapPin className="h-5 w-5 text-accent" />Tra cứu địa chỉ hành chính
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ink-muted">
                Dữ liệu hành chính Hà Nội được tích hợp sẵn. Chọn Tỉnh/Thành → Quận/Huyện → Phường/Xã để tra cứu.
              </p>

              {/* Tỉnh/Thành */}
              <div className="space-y-1.5">
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Tỉnh / Thành phố</Label>
                <select
                  className="w-full mt-1.5 h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={selectedProvince}
                  onChange={(e) => { setSelectedProvince(e.target.value); setSelectedDistrict(''); }}
                  disabled={loadingProvinces}
                >
                  <option value="">— Chọn tỉnh/thành —</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Quận/Huyện */}
              <div className="space-y-1.5">
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Quận / Huyện</Label>
                <select
                  className="w-full mt-1.5 h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!selectedProvince || loadingDistricts}
                >
                  <option value="">— Chọn quận/huyện —</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Phường/Xã */}
              {selectedDistrict && (
                <div className="space-y-1.5">
                  <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Phường / Xã / Thị trấn</Label>
                  {loadingWards ? (
                    <div className="flex items-center gap-2 mt-2 text-sm text-ink-muted">
                      <Loader2 className="h-4 w-4 animate-spin text-accent" /> Đang tải...
                    </div>
                  ) : (
                    <div className="mt-2 border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto bg-white">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-bg-subtle border-b border-border sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Tên</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Cấp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-ink">
                          {wards.map((w) => (
                            <tr key={w.id} className="hover:bg-bg-subtle/50 transition-colors">
                              <td className="px-4 py-2.5 text-sm font-medium text-ink">{w.name}</td>
                              <td className="px-4 py-2.5 text-xs text-ink-muted font-semibold">{w.level}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-xs text-ink-muted font-medium mt-1.5">{wards.length} phường/xã trong quận/huyện này</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
