'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const LocationPickerDynamic = dynamic(() => import('./LocationPicker'), { ssr: false, loading: () => <div className="h-[300px] w-full rounded-md border bg-slate-100 animate-pulse flex items-center justify-center text-sm text-slate-500">Đang tải bản đồ...</div> });

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Search, Building2, Loader2, AlertCircle, Upload, RefreshCw } from 'lucide-react';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePropertiesFeature } from '../hooks/usePropertiesFeature';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { DBBuilding } from '@/lib/supabase/types';
import { useLandlords, useEmployees } from '@/lib/hooks/useEntities';
import { supabase } from '@/lib/supabase/client';

type VnProvince = { id: string; name: string };
type VnDistrict = { id: string; name: string; province_id: string };
type VnWard = { id: string; name: string; district_id: string };

export function BuildingListPage() {
  const { company, role, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { items: buildingList, loading, error, add, update, remove } = usePropertiesFeature(company?.id);
  const { items: landlordList } = useLandlords(company?.id);
  const { items: employeeList } = useEmployees(company?.id);

  const currentLandlord = landlordList.find(l => l.id === profile?.landlord_id);
  const currentLandlordCode = currentLandlord?.code || null;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterLandlord, setFilterLandlord] = useState('');
  const [editItem, setEditItem] = useState<DBBuilding | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [electricityPrice, setElectricityPrice] = useState('');
  const [waterPrice, setWaterPrice] = useState('');
  const [internetPrice, setInternetPrice] = useState('');
  const [commonServicePrice, setCommonServicePrice] = useState('');
  const [extraOccupantFee, setExtraOccupantFee] = useState('');
  const [electricVehicleFee, setElectricVehicleFee] = useState('');

  // --- Location cascade state ---
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [districts, setDistricts] = useState<VnDistrict[]>([]);
  const [wards, setWards] = useState<VnWard[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

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
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} mục đã chọn không? Thao tác này không thể hoàn tác.`)) return;
    try {
      await Promise.all(selectedIds.map(id => remove(id)));
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Load all provinces once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('vn_provinces').select('*').order('name');
      if (error) console.error('[Location] provinces error:', error);
      setProvinces((data as VnProvince[] | null) ?? []);
    })();
  }, []);

  // Load districts when province changes
  useEffect(() => {
    if (!selectedProvinceId) {
      setDistricts([]);
      setSelectedDistrictId('');
      setWards([]);
      setSelectedWardId('');
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    setSelectedDistrictId('');
    setWards([]);
    setSelectedWardId('');
    (async () => {
      console.log('[Location] fetching districts for provinceId:', selectedProvinceId, typeof selectedProvinceId);
      const res = await supabase
        .from('vn_districts')
        .select('*')
        .eq('province_id', selectedProvinceId)
        .order('name');
      console.log('[Location] districts raw response:', res);
      if (!cancelled) {
        if (res.error) console.error('[Location] districts error:', res.error);
        setDistricts((res.data as VnDistrict[] | null) ?? []);
        setLoadingDistricts(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedProvinceId]);

  // Load wards when district changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setWards([]);
      setSelectedWardId('');
      return;
    }
    let cancelled = false;
    setLoadingWards(true);
    setSelectedWardId('');
    (async () => {
      const { data, error } = await supabase
        .from('vn_wards')
        .select('*')
        .eq('district_id', selectedDistrictId)
        .order('name');
      if (!cancelled) {
        if (error) console.error('[Location] wards error:', error);
        setWards((data as VnWard[] | null) ?? []);
        setLoadingWards(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDistrictId]);

  // Compose the `area` string from selected location names
  const composedArea = useMemo(() => {
    const province = provinces.find(p => p.id === selectedProvinceId);
    const district = districts.find(d => d.id === selectedDistrictId);
    const ward = wards.find(w => w.id === selectedWardId);
    return [ward?.name, district?.name, province?.name].filter(Boolean).join(', ');
  }, [selectedProvinceId, selectedDistrictId, selectedWardId, provinces, districts, wards]);

  const formatNumber = (val: number | string) => {
    if (!val && val !== 0) return '';
    const num = String(val).replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseNumber = (val: string) => {
    return Number(val.replace(/\./g, '')) || 0;
  };

  const handlePriceChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setter(formatNumber(rawVal));
  };

  const areas = useMemo(() => Array.from(new Set(buildingList.map((b) => b.area).filter(Boolean))), [buildingList]);

  const filtered = buildingList.filter((b) => {
    const matchesSearch = b.code.toLowerCase().includes(searchQuery.toLowerCase()) || b.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = !filterArea || b.area === filterArea;
    const matchesLandlord = !filterLandlord || b.landlord_id === filterLandlord;
    return matchesSearch && matchesArea && matchesLandlord;
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const currentLandlord = landlordList.find(l => l.id === profile?.landlord_id);
    const currentLandlordCode = currentLandlord?.code || null;

    const payload = {
      company_id: company?.id ?? '',
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      area: composedArea || (formData.get('area') as string) || '',
      address: formData.get('address') as string,
      year_built: Number(formData.get('year_built')) || null,
      total_floors: Number(formData.get('total_floors')) || 0,
      total_rooms: Number(formData.get('total_rooms')) || 0,
      description: (formData.get('description') as string) || null,
      image_url: imageUrl || '',
      thumbnail_url: thumbnailUrl || '',
      landlord_id: role === 'landlord' ? currentLandlordCode : ((formData.get('landlord_id') as string) || null),
      manager_ids: selectedManagers,
      has_elevator: formData.get('has_elevator') === 'true',
      pccc_certified: formData.get('pccc_certified') === 'true',
      common_drying_area: (formData.get('common_drying_area') as string) || null,
      allow_pet: formData.get('allow_pet') === 'true',
      allow_foreigners: formData.get('allow_foreigners') === 'true',
      allow_vinfast_electric: formData.get('allow_vinfast_electric') === 'true',
      has_air_conditioner: formData.get('has_air_conditioner') === 'true',
      has_water_heater: formData.get('has_water_heater') === 'true',
      has_bed: formData.get('has_bed') === 'true',
      has_wardrobe: formData.get('has_wardrobe') === 'true',
      has_kitchen_cabinet: formData.get('has_kitchen_cabinet') === 'true',
      has_refrigerator: formData.get('has_refrigerator') === 'true',
      has_hood: formData.get('has_hood') === 'true',
      has_dressing_table: formData.get('has_dressing_table') === 'true',
      electricity_price: parseNumber(electricityPrice),
      water_price: parseNumber(waterPrice),
      internet_price: parseNumber(internetPrice),
      common_service_price: parseNumber(commonServicePrice),
      common_service_description: (formData.get('common_service_description') as string) || null,
      fingerprint_lock_desc: (formData.get('fingerprint_lock_desc') as string) || null,
      extra_occupant_fee: parseNumber(extraOccupantFee),
      has_car_parking: formData.get('has_car_parking') === 'true',
      washing_machine_type: (formData.get('washing_machine_type') as string) || 'chung',
      dryer_type: (formData.get('dryer_type') as string) || 'chung',
      electric_vehicle_fee: parseNumber(electricVehicleFee),
      latitude,
      longitude,
    };

    if (editItem) {
      await update(editItem.id, payload);
    } else {
      await add(payload);
    }
    setSaving(false);
    setIsDialogOpen(false);
    setEditItem(null);
    setImageUrl(null);
    setThumbnailUrl(null);
  };

  const openAdd = () => {
    setEditItem(null);
    setSelectedManagers([]);
    setImageUrl(null);
    setThumbnailUrl(null);
    setElectricityPrice('4.000');
    setWaterPrice('35.000');
    setInternetPrice('100.000');
    setCommonServicePrice('200.000');
    setExtraOccupantFee('0');
    setElectricVehicleFee('0');
    setLatitude(null);
    setLongitude(null);
    setSelectedProvinceId('');
    setSelectedDistrictId('');
    setSelectedWardId('');
    setDistricts([]);
    setWards([]);
    setIsDialogOpen(true);
  };

  const openEdit = (item: DBBuilding) => {
    setEditItem(item);
    setSelectedManagers(item.manager_ids || []);
    setImageUrl(item.image_url || null);
    setThumbnailUrl(item.thumbnail_url || null);
    setElectricityPrice(formatNumber(item.electricity_price ?? 4000));
    setWaterPrice(formatNumber(item.water_price ?? 35000));
    setInternetPrice(formatNumber(item.internet_price ?? 100000));
    setCommonServicePrice(formatNumber(item.common_service_price ?? 200000));
    setExtraOccupantFee(formatNumber(item.extra_occupant_fee ?? 0));
    setElectricVehicleFee(formatNumber(item.electric_vehicle_fee ?? 0));
    setLatitude(item.latitude ?? null);
    setLongitude(item.longitude ?? null);
    // Reset location selects — user can re-select if they want to change area
    setSelectedProvinceId('');
    setSelectedDistrictId('');
    setSelectedWardId('');
    setDistricts([]);
    setWards([]);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Quản lý Tòa nhà</h1>
          <p className="text-ink-muted text-sm">Quản lý tòa nhà và thông tin chi tiết</p>
        </div>
        <PermissionGate roles={['company_admin']}>
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push('/admin/system/import')} variant="outline" className="border-border hover:bg-bg-subtle text-ink rounded-lg">
              <Upload className="mr-2 h-4 w-4" /> Nhập Excel
            </Button>
            <Button
              onClick={async () => {
                setSyncing(true);
                try {
                  const res = await fetch('/api/buildings/sync-counts', { method: 'POST' });
                  const data = await res.json();
                  if (data.success) {
                    window.location.reload();
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setSyncing(false);
                }
              }}
              variant="outline"
              className="border-border hover:bg-bg-subtle text-ink rounded-lg"
              title="Đồng bộ lại số phòng/tầng từ dữ liệu thực tế"
            >
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Đồng bộ số phòng
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd} className="bg-accent hover:bg-accent-500 text-white rounded-lg"><Plus className="mr-2 h-4 w-4" /> Thêm tòa nhà</Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col rounded-lg border border-border bg-white">
                <DialogHeader className="flex-shrink-0 px-6 pt-6">
                  <DialogTitle className="font-heading text-lg font-bold text-ink">{editItem ? 'Cập nhật tòa nhà' : 'Thêm tòa nhà mới'}</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 px-6 pb-6">
                  <form id="building-form" onSubmit={handleSave} className="space-y-4 py-1">
                    {/* 1. Thông tin cơ bản */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Mã tòa nhà <span className="text-red-500">*</span></Label>
                        <Input name="code" defaultValue={editItem?.code} required className="rounded-lg border-border focus-visible:ring-accent" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Tên tòa nhà <span className="text-red-500">*</span></Label>
                        <Input name="name" defaultValue={editItem?.name} required className="rounded-lg border-border focus-visible:ring-accent" />
                      </div>
                    </div>
                    {/* Location cascade: Tỉnh → Huyện → Xã */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Tỉnh / Thành phố <span className="text-red-500">*</span></Label>
                        <select
                          value={selectedProvinceId}
                          onChange={e => setSelectedProvinceId(e.target.value)}
                          className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <option value="">-- Chọn tỉnh/thành --</option>
                          {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Quận / Huyện <span className="text-red-500">*</span></Label>
                        <select
                          value={selectedDistrictId}
                          onChange={e => setSelectedDistrictId(e.target.value)}
                          disabled={!selectedProvinceId || loadingDistricts}
                          className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">{loadingDistricts ? 'Đang tải...' : '-- Chọn quận/huyện --'}</option>
                          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Phường / Xã <span className="text-red-500">*</span></Label>
                        <select
                          value={selectedWardId}
                          onChange={e => setSelectedWardId(e.target.value)}
                          disabled={!selectedDistrictId || loadingWards}
                          className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">{loadingWards ? 'Đang tải...' : '-- Chọn phường/xã --'}</option>
                          {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                    </div>
                    {/* Hiển thị khu vực đã chọn hoặc giá trị cũ khi edit */}
                    {editItem?.area && !composedArea && (
                      <div className="text-xs text-ink-muted -mt-2 font-medium">
                        Khu vực hiện tại: <span className="font-semibold text-ink">{editItem.area}</span>
                        <span className="ml-1 text-ink-muted font-normal">(Chọn lại bên trên để cập nhật)</span>
                      </div>
                    )}
                    {composedArea && (
                      <div className="text-xs text-emerald-600 -mt-2 font-semibold">
                        ✓ Khu vực: {composedArea}
                      </div>
                    )}
                    <input name="area" value={composedArea || editItem?.area || ''} readOnly className="hidden" />
                    {role !== 'landlord' ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="landlord_id" className="text-ink font-semibold text-xs uppercase tracking-wider">Chủ nhà phụ trách</Label>
                        <select id="landlord_id" name="landlord_id" defaultValue={editItem?.landlord_id ?? ''} className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                          <option value="">-- Chọn chủ nhà --</option>
                          {landlordList.map((l) => <option key={l.id} value={l.code || ''}>{l.code ? `${l.code} - ` : ''}{l.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-ink-muted">
                        Chủ nhà: <span className="font-bold text-emerald-600">
                          {landlordList.find(l => l.id === profile?.landlord_id)?.name || profile?.full_name} ({currentLandlordCode})
                        </span>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ chi tiết <span className="text-red-500">*</span> <span className="text-ink-muted font-normal text-xs">(Số nhà, tên đường...)</span></Label>
                      <Input name="address" defaultValue={editItem?.address ?? ''} placeholder="Ví dụ: 123 Nguyễn Trãi" className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                    <div className="space-y-1.5 mt-2">
                      <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Tọa độ trên bản đồ</Label>
                      <LocationPickerDynamic latitude={latitude} longitude={longitude} onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Năm XD</Label>
                        <Input name="year_built" type="number" defaultValue={editItem?.year_built ?? ''} className="rounded-lg border-border focus-visible:ring-accent" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Số tầng <span className="text-red-500">*</span></Label>
                        <Input name="total_floors" type="number" defaultValue={editItem?.total_floors ?? 0} required className="rounded-lg border-border focus-visible:ring-accent" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Số phòng <span className="text-red-500">*</span></Label>
                        <Input name="total_rooms" type="number" defaultValue={editItem?.total_rooms ?? 0} required className="rounded-lg border-border focus-visible:ring-accent" />
                      </div>
                    </div>

                    {/* 2. Tiện ích & Quy định */}
                    <div className="border border-border p-4 rounded-lg bg-bg-subtle/30 space-y-4">
                      <span className="text-xs font-bold text-ink block uppercase tracking-wider">Tiện ích & Quy định chung</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="has_elevator" className="text-[11px] font-semibold text-ink-muted uppercase">Thang máy <span className="text-red-500">*</span></Label>
                          <select id="has_elevator" name="has_elevator" defaultValue={editItem ? String(editItem.has_elevator) : 'true'} className="w-full h-9 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-ink focus-visible:ring-accent">
                            <option value="true">Có thang máy</option>
                            <option value="false">Không thang máy</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="pccc_certified" className="text-[11px] font-semibold text-ink-muted uppercase">Hệ thống PCCC & Thoát hiểm <span className="text-red-500">*</span></Label>
                          <select id="pccc_certified" name="pccc_certified" defaultValue={editItem ? String(editItem.pccc_certified) : 'true'} className="w-full h-9 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-ink focus-visible:ring-accent">
                            <option value="true">Đảm bảo an toàn</option>
                            <option value="false">Chưa hoàn thiện</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="has_car_parking" className="text-[11px] font-semibold text-ink-muted uppercase">Chỗ đỗ xe ô tô</Label>
                          <select id="has_car_parking" name="has_car_parking" defaultValue={editItem ? String(editItem.has_car_parking) : 'false'} className="w-full h-9 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-ink focus-visible:ring-accent">
                            <option value="false">Không có chỗ đỗ ô tô</option>
                            <option value="true">Có chỗ đỗ ô tô</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="allow_pet" className="text-[11px] font-semibold text-ink-muted uppercase">Nuôi thú cưng <span className="text-red-500">*</span></Label>
                          <select id="allow_pet" name="allow_pet" defaultValue={editItem ? String(editItem.allow_pet) : 'false'} className="w-full h-9 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-ink focus-visible:ring-accent">
                            <option value="false">Không cho phép</option>
                            <option value="true">Cho phép</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="allow_foreigners" className="text-[11px] font-semibold text-ink-muted uppercase">Người nước ngoài <span className="text-red-500">*</span></Label>
                          <select id="allow_foreigners" name="allow_foreigners" defaultValue={editItem ? String(editItem.allow_foreigners) : 'false'} className="w-full h-9 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-ink focus-visible:ring-accent">
                            <option value="false">Chỉ khách Việt</option>
                            <option value="true">Cho phép</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="allow_vinfast_electric" className="text-[11px] font-semibold text-ink-muted uppercase">Xe điện VinFast <span className="text-red-500">*</span></Label>
                          <select id="allow_vinfast_electric" name="allow_vinfast_electric" defaultValue={editItem ? String(editItem.allow_vinfast_electric) : 'true'} className="w-full h-9 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-ink focus-visible:ring-accent">
                            <option value="true">Nhận & sạc điện</option>
                            <option value="false">Không nhận</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="electric_vehicle_fee" className="text-[11px] font-semibold text-ink-muted uppercase">Phí sạc xe điện (VND/xe)</Label>
                          <Input id="electric_vehicle_fee" name="electric_vehicle_fee" value={electricVehicleFee} onChange={handlePriceChange(setElectricVehicleFee)} className="h-9 text-xs rounded-lg border-border focus-visible:ring-accent" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="washing_machine_type" className="text-[11px] font-semibold text-ink-muted uppercase">Máy giặt</Label>
                          <select id="washing_machine_type" name="washing_machine_type" defaultValue={editItem?.washing_machine_type ?? 'chung'} className="w-full h-9 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-ink focus-visible:ring-accent">
                            <option value="chung">Máy giặt chung</option>
                            <option value="riêng">Máy giặt riêng</option>
                            <option value="không có">Không có máy giặt</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="dryer_type" className="text-[11px] font-semibold text-ink-muted uppercase">Máy sấy</Label>
                          <select id="dryer_type" name="dryer_type" defaultValue={editItem?.dryer_type ?? 'chung'} className="w-full h-9 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-ink focus-visible:ring-accent">
                            <option value="chung">Máy sấy chung</option>
                            <option value="riêng">Máy sấy riêng</option>
                            <option value="không có">Không có máy sấy</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="common_drying_area" className="text-[11px] font-semibold text-ink-muted uppercase">Khu vực phơi đồ chung</Label>
                        <Input id="common_drying_area" name="common_drying_area" defaultValue={editItem?.common_drying_area ?? ''} placeholder="Ban công tầng 7 rộng rãi, sân thượng..." className="h-9 text-xs rounded-lg border-border focus-visible:ring-accent" />
                      </div>
                    </div>

                    {/* 3. Nội thất mặc định */}
                    <div className="border border-border p-4 rounded-lg bg-bg-subtle/30 space-y-4">
                      <span className="text-xs font-bold text-ink block uppercase tracking-wider">Trang bị nội thất mặc định</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="has_air_conditioner" name="has_air_conditioner" defaultChecked={editItem ? editItem.has_air_conditioner : true} className="rounded border-border text-accent focus:ring-accent h-4 w-4" value="true" />
                          <Label htmlFor="has_air_conditioner" className="text-xs font-medium text-ink cursor-pointer select-none">Điều hòa</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="has_water_heater" name="has_water_heater" defaultChecked={editItem ? editItem.has_water_heater : true} className="rounded border-border text-accent focus:ring-accent h-4 w-4" value="true" />
                          <Label htmlFor="has_water_heater" className="text-xs font-medium text-ink cursor-pointer select-none">Nóng lạnh</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="has_bed" name="has_bed" defaultChecked={editItem ? editItem.has_bed : true} className="rounded border-border text-accent focus:ring-accent h-4 w-4" value="true" />
                          <Label htmlFor="has_bed" className="text-xs font-medium text-ink cursor-pointer select-none">Giường</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="has_wardrobe" name="has_wardrobe" defaultChecked={editItem ? editItem.has_wardrobe : true} className="rounded border-border text-accent focus:ring-accent h-4 w-4" value="true" />
                          <Label htmlFor="has_wardrobe" className="text-xs font-medium text-ink cursor-pointer select-none">Tủ quần áo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="has_kitchen_cabinet" name="has_kitchen_cabinet" defaultChecked={editItem ? editItem.has_kitchen_cabinet : true} className="rounded border-border text-accent focus:ring-accent h-4 w-4" value="true" />
                          <Label htmlFor="has_kitchen_cabinet" className="text-xs font-medium text-ink cursor-pointer select-none">Tủ bếp</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="has_refrigerator" name="has_refrigerator" defaultChecked={editItem ? editItem.has_refrigerator : true} className="rounded border-border text-accent focus:ring-accent h-4 w-4" value="true" />
                          <Label htmlFor="has_refrigerator" className="text-xs font-medium text-ink cursor-pointer select-none">Tủ lạnh</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="has_hood" name="has_hood" defaultChecked={editItem ? editItem.has_hood : true} className="rounded border-border text-accent focus:ring-accent h-4 w-4" value="true" />
                          <Label htmlFor="has_hood" className="text-xs font-medium text-ink cursor-pointer select-none">Máy hút mùi</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="has_dressing_table" name="has_dressing_table" defaultChecked={editItem ? editItem.has_dressing_table : true} className="rounded border-border text-accent focus:ring-accent h-4 w-4" value="true" />
                          <Label htmlFor="has_dressing_table" className="text-xs font-medium text-ink cursor-pointer select-none">Bàn trang điểm</Label>
                        </div>
                      </div>
                    </div>

                    {/* 4. Định mức chi phí dịch vụ */}
                    <div className="border border-border p-4 rounded-lg bg-bg-subtle/30 space-y-4">
                      <span className="text-xs font-bold text-ink block uppercase tracking-wider">Định mức chi phí dịch vụ & Phụ thu</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="electricity_price" className="text-[11px] font-semibold text-ink-muted uppercase">Giá điện (VND/kWh) <span className="text-red-500">*</span></Label>
                          <Input id="electricity_price" name="electricity_price" value={electricityPrice} onChange={handlePriceChange(setElectricityPrice)} className="h-9 text-xs rounded-lg border-border focus-visible:ring-accent" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="water_price" className="text-[11px] font-semibold text-ink-muted uppercase">Giá nước (VND/m³) <span className="text-red-500">*</span></Label>
                          <Input id="water_price" name="water_price" value={waterPrice} onChange={handlePriceChange(setWaterPrice)} className="h-9 text-xs rounded-lg border-border focus-visible:ring-accent" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="internet_price" className="text-[11px] font-semibold text-ink-muted uppercase">Giá Internet (VND/phòng) <span className="text-red-500">*</span></Label>
                          <Input id="internet_price" name="internet_price" value={internetPrice} onChange={handlePriceChange(setInternetPrice)} className="h-9 text-xs rounded-lg border-border focus-visible:ring-accent" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="common_service_price" className="text-[11px] font-semibold text-ink-muted uppercase">Dịch vụ chung (VND/người) <span className="text-red-500">*</span></Label>
                          <Input id="common_service_price" name="common_service_price" value={commonServicePrice} onChange={handlePriceChange(setCommonServicePrice)} className="h-9 text-xs rounded-lg border-border focus-visible:ring-accent" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="common_service_description" className="text-[11px] font-semibold text-ink-muted uppercase">Chi tiết dịch vụ chung bao gồm</Label>
                          <Input id="common_service_description" name="common_service_description" defaultValue={editItem?.common_service_description ?? 'Vệ sinh chung, đổ rác, bảo trì đồ đạc trong phòng, máy giặt chung'} className="h-9 text-xs rounded-lg border-border focus-visible:ring-accent" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="extra_occupant_fee" className="text-[11px] font-semibold text-ink-muted uppercase">Phụ thu quá số người (VND/người dôi ra)</Label>
                          <Input id="extra_occupant_fee" name="extra_occupant_fee" value={extraOccupantFee} onChange={handlePriceChange(setExtraOccupantFee)} placeholder="Ví dụ: 200.000" className="h-9 text-xs rounded-lg border-border focus-visible:ring-accent" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="fingerprint_lock_desc" className="text-[11px] font-semibold text-ink-muted uppercase">Mô tả cổng vân tay, gửi xe</Label>
                          <Input id="fingerprint_lock_desc" name="fingerprint_lock_desc" defaultValue={editItem?.fingerprint_lock_desc ?? 'Cổng vân tay gửi xe free'} className="h-9 text-xs rounded-lg border-border focus-visible:ring-accent" />
                        </div>
                      </div>
                    </div>

                    {/* 5. Mô tả chi tiết & Hình ảnh & Quản lý */}
                    <div className="space-y-1.5">
                      <Label htmlFor="description" className="text-ink font-semibold text-xs uppercase tracking-wider">Mô tả chi tiết tòa nhà</Label>
                      <textarea
                        id="description"
                        name="description"
                        defaultValue={editItem?.description ?? ''}
                        placeholder="Mô tả các thông tin chi tiết khác về tòa nhà..."
                        className="flex min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Hình ảnh tòa nhà</Label>
                      <ImageUpload allowVideo={true} value={imageUrl} onChange={(url, thumbUrl) => { setImageUrl(url); setThumbnailUrl(thumbUrl); }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Quản lý tòa nhà</Label>
                      <div className="flex flex-wrap gap-2 p-2.5 border border-border rounded-lg min-h-[44px] bg-white">
                        {employeeList.map((emp) => (
                          <Badge key={emp.id} variant={selectedManagers.includes(emp.id) ? 'default' : 'outline'} className={`cursor-pointer select-none rounded-md px-2 py-0.5 text-xs font-semibold ${selectedManagers.includes(emp.id) ? 'bg-accent text-white hover:bg-accent-500' : 'text-ink-muted border-border hover:bg-bg-subtle'}`} onClick={() => setSelectedManagers((prev) => prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id])}>
                            {emp.name}
                          </Badge>
                        ))}
                        {employeeList.length === 0 && <div className="text-ink-muted text-xs py-1 text-center w-full">Chưa có nhân viên nào</div>}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="ghost" className="text-ink hover:bg-bg-subtle rounded-lg" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                      <Button type="submit" form="building-form" className="bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu thông tin</Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </PermissionGate>
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm"><AlertCircle className="h-4 w-4 flex-shrink-0" />{error}</div>}

      <Card className="border-border rounded-lg shadow-none bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input placeholder="Tìm theo mã hoặc tên..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-lg border-border focus-visible:ring-accent" />
            </div>
            <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <option value="">Tất cả khu vực</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {role !== 'landlord' && (
              <select value={filterLandlord} onChange={(e) => setFilterLandlord(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <option value="">Tất cả chủ nhà</option>
                {landlordList.map((l) => (
                  <option key={l.id} value={l.code || ''}>
                    {l.code ? `${l.code} — ` : ''}{l.name}
                  </option>
                ))}
              </select>
            )}
            {selectedIds.length > 0 && (
              <PermissionGate roles={['company_admin']}>
                <Button onClick={handleBulkDelete} size="sm" className="bg-red-500 hover:bg-red-600 text-white rounded-lg whitespace-nowrap h-10">
                  <Trash2 className="h-4 w-4 mr-2" /> Xóa {selectedIds.length} mục
                </Button>
              </PermissionGate>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink-muted" /></div> : (
            <div className="border-t border-border overflow-hidden">
              {/* Desktop view */}
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
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Tên</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Khu vực</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Năm XD</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Số tầng</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Số phòng</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors cursor-pointer" onClick={(e) => { 
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return; 
                      const targetPrefix = pathname.startsWith('/landlord') ? '/landlord/buildings' : '/admin/realhome/buildings';
                      router.push(`${targetPrefix}/${item.id}`); 
                    }}>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => handleSelect(item.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-ink-muted text-xs">{item.code}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.thumbnail_url || item.image_url ? (
                            <Image src={item.thumbnail_url || item.image_url || ''} alt={item.name} width={40} height={40} className="w-10 h-10 object-cover rounded-lg border border-border flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-bg-subtle rounded-lg border border-border flex items-center justify-center text-ink-muted flex-shrink-0">
                              <Building2 className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-ink hover:text-accent block text-sm">{item.name}</span>
                            <span className="text-xs text-ink-muted block max-w-[240px] truncate">{item.address || 'Không có địa chỉ'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="border-border text-ink-muted rounded-md bg-white font-medium">{item.area}</Badge>
                      </td>
                      <td className="px-6 py-4 text-ink-muted font-mono text-sm">{item.year_built ?? '—'}</td>
                      <td className="px-6 py-4 text-ink-muted font-mono text-sm">{item.total_floors}</td>
                      <td className="px-6 py-4 text-ink-muted font-mono text-sm">{item.total_rooms}</td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <PermissionGate roles={['company_admin', 'manager']}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle rounded-md"
                              onClick={() => openEdit(item)}
                              title="Chỉnh sửa"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate roles={['company_admin']}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10 rounded-md"
                              onClick={() => {
                                if (window.confirm('Bạn có chắc muốn xóa tòa nhà này? Thao tác này không thể hoàn tác.')) {
                                  remove(item.id);
                                }
                              }}
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border bg-white">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const targetPrefix = pathname.startsWith('/landlord') ? '/landlord/buildings' : '/admin/realhome/buildings';
                      router.push(`${targetPrefix}/${item.id}`);
                    }}
                    className="p-4 hover:bg-bg-subtle/30 cursor-pointer transition-colors space-y-3.5"
                  >
                    <div className="flex items-start gap-3">
                      {item.thumbnail_url || item.image_url ? (
                        <Image src={item.thumbnail_url || item.image_url || ''} alt={item.name} width={56} height={56} className="w-14 h-14 object-cover rounded-lg border border-border flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 bg-bg-subtle rounded-lg border border-border flex items-center justify-center text-ink-muted flex-shrink-0">
                          <Building2 className="h-6 w-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-ink text-sm truncate">{item.name}</span>
                          <span className="font-mono text-xs text-ink-muted font-bold">{item.code}</span>
                        </div>
                        <span className="text-xs text-ink-muted block mt-1 line-clamp-1">{item.address || 'Không có địa chỉ'}</span>
                        <div className="mt-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-ink-muted rounded-md bg-white">
                            {item.area}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs text-ink-muted border-t border-border/50">
                      <div>
                        <div className="font-bold text-ink">{item.total_floors}</div>
                        <div className="text-[10px] text-ink-muted">Số tầng</div>
                      </div>
                      <div>
                        <div className="font-bold text-ink">{item.total_rooms}</div>
                        <div className="text-[10px] text-ink-muted">Số phòng</div>
                      </div>
                      <div>
                        <div className="font-bold text-ink font-mono">{item.year_built ?? '—'}</div>
                        <div className="text-[10px] text-ink-muted">Năm XD</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                      <PermissionGate roles={['company_admin', 'manager']}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle rounded-md" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      </PermissionGate>
                      <PermissionGate roles={['company_admin']}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10 rounded-md" 
                          onClick={() => {
                            if (window.confirm('Bạn có chắc muốn xóa tòa nhà này? Thao tác này không thể hoàn tác.')) {
                              remove(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && <div className="text-center py-12 text-ink-muted"><Building2 className="h-10 w-10 mx-auto mb-2 opacity-35" /><p className="text-sm">Chưa có tòa nhà nào</p></div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
