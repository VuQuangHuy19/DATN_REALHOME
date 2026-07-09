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
  loading?: boolean;
  icon: React.ElementType;
}

function CrudTable({ data, columns, onEdit, onDelete, loading, icon: Icon }: CrudTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 border border-dashed rounded-lg">
        <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Chưa có dữ liệu. Nhấn &quot;Thêm mới&quot; để bắt đầu.</p>
      </div>
    );
  }
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-slate-600">
                {col.label}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium text-slate-600">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-slate-700">
                  {item[col.key] ?? '—'}
                </td>
              ))}
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    if (!confirm('Bạn có chắc muốn xóa mục này?')) return;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Danh mục</h1>
          <p className="text-slate-500">Quản lý khoảng giá, tiện ích, loại phòng và tra cứu địa chỉ hành chính</p>
        </div>
        {activeTab !== 'areas' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm mới
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} {getTabLabel()}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 pt-4">
                {getFormFields().map((field) => (
                  <div key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      defaultValue={editItem?.[field.name] ?? ''}
                    />
                  </div>
                ))}
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Lưu
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="prices">
            <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" />Khoảng giá
          </TabsTrigger>
          <TabsTrigger value="amenities">
            <Sparkles className="h-4 w-4 mr-1 hidden sm:inline" />Tiện ích
          </TabsTrigger>
          <TabsTrigger value="roomtypes">
            <BedDouble className="h-4 w-4 mr-1 hidden sm:inline" />Loại phòng
          </TabsTrigger>
          <TabsTrigger value="areas">
            <MapPin className="h-4 w-4 mr-1 hidden sm:inline" />Địa chỉ
          </TabsTrigger>
        </TabsList>

        {/* ─── Khoảng giá ─── */}
        <TabsContent value="prices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />Khoảng giá
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
                icon={DollarSign}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tiện ích ─── */}
        <TabsContent value="amenities" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />Tiện ích
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
                icon={Sparkles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Loại phòng ─── */}
        <TabsContent value="roomtypes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BedDouble className="h-5 w-5" />Loại phòng
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
                icon={BedDouble}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Địa chỉ hành chính ─── */}
        <TabsContent value="areas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />Tra cứu địa chỉ hành chính
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">
                Dữ liệu hành chính Hà Nội được tích hợp sẵn. Chọn Tỉnh/Thành → Quận/Huyện → Phường/Xã để tra cứu.
              </p>

              {/* Tỉnh/Thành */}
              <div>
                <Label>Tỉnh / Thành phố</Label>
                <select
                  className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              <div>
                <Label>Quận / Huyện</Label>
                <select
                  className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                <div>
                  <Label>Phường / Xã / Thị trấn</Label>
                  {loadingWards ? (
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                    </div>
                  ) : (
                    <div className="mt-2 border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-slate-600">Tên</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-600">Cấp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {wards.map((w) => (
                            <tr key={w.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-slate-700">{w.name}</td>
                              <td className="px-4 py-2 text-slate-500 text-xs">{w.level}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{wards.length} phường/xã trong quận/huyện này</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
