'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useBuildings } from '@/src/features/properties/hooks/useBuildings';
import { useLandlords } from '@/src/features/properties/hooks/useLandlords';
import { supabase } from '@/lib/supabase/client';
import { getServiceReadings, saveServiceReading } from '@/src/features/rooms/services/service_readings';
import { getRentalContracts } from '@/src/features/finance/services/rental_contracts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Sparkles, Building2, Calendar, ClipboardCheck, Zap, Droplets, Search, X, User, Phone, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface RoomReadingRow {
  roomId: string;
  roomCode: string;
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  buildingAddress?: string;
  landlordOrManagerName: string;
  tenantName: string;
  tenantPhone: string;
  isRented: boolean;
  roomStatus: string;
  electricityOld: number;
  electricityNew: number;
  waterOld: number;
  waterNew: number;
  readingId?: string;
  saving?: boolean;
}

export default function ServiceReadingsPage() {
  const router = useRouter();
  const { company, role, profile } = useAuth();
  const { items: buildings, loading: buildingsLoading } = useBuildings(company?.id);
  const { items: landlordList } = useLandlords(company?.id);
  
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
  const [buildingSearchTerm, setBuildingSearchTerm] = useState<string>('');
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const handlePeriodChange = (deltaMonths: number) => {
    const [yearStr, monthStr] = selectedPeriod.split('-');
    const date = new Date(Number(yearStr), Number(monthStr) - 1 + deltaMonths, 1);
    const newPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedPeriod(newPeriod);
  };
  
  const [rows, setRows] = useState<RoomReadingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (buildings.length > 0 && !selectedBuildingId) {
      setSelectedBuildingId('all');
    }
  }, [buildings, selectedBuildingId]);

  // Filter building options by search term (Tên tòa, Mã tòa, Mã chủ nhà, Tên chủ nhà, SĐT)
  const filteredBuildings = useMemo(() => {
    if (!buildingSearchTerm.trim()) return buildings;
    const q = buildingSearchTerm.trim().toLowerCase();

    // Tìm mã/id của chủ nhà khớp với từ khóa q
    const matchingLandlordKeys = new Set(
      landlordList
        .filter((l) => 
          l.name.toLowerCase().includes(q) ||
          (l.code && l.code.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q))
        )
        .flatMap((l) => [l.id, l.code].filter((k): k is string => Boolean(k)))
    );

    return buildings.filter((b) => {
      const nameMatch = b.name.toLowerCase().includes(q);
      const codeMatch = b.code ? b.code.toLowerCase().includes(q) : false;
      const landlordIdMatch = b.landlord_id ? b.landlord_id.toLowerCase().includes(q) : false;
      const landlordRefMatch = b.landlord_id ? matchingLandlordKeys.has(b.landlord_id) : false;

      return nameMatch || codeMatch || landlordIdMatch || landlordRefMatch;
    });
  }, [buildings, landlordList, buildingSearchTerm]);

  const loadData = useCallback(async () => {
    if (!company?.id || !selectedPeriod) return;
    setLoading(true);
    try {
      const landlordId = role === 'landlord' ? (profile?.landlord_id || undefined) : undefined;

      // 1. Lấy danh sách phòng của toà nhà (Cách ly chặt chẽ theo Tòa nhà thuộc về Chủ nhà)
      let roomsQuery = supabase
        .from('rooms')
        .select('*')
        .order('floor', { ascending: true })
        .order('code', { ascending: true });

      if (company?.id) {
        roomsQuery = roomsQuery.eq('company_id', company.id);
      }

      if (selectedBuildingId && selectedBuildingId !== 'all') {
        const targetBuilding = buildings.find((b) => b.id === selectedBuildingId || b.code === selectedBuildingId);
        const buildingKeys = targetBuilding
          ? Array.from(new Set([targetBuilding.id, targetBuilding.code].filter((k): k is string => Boolean(k))))
          : [selectedBuildingId];
        roomsQuery = roomsQuery.in('building_id', buildingKeys);
      } else if (landlordId) {
        // Lọc cách ly tòa nhà thuộc về Chủ nhà đang đăng nhập
        const landlordBuildingKeys = Array.from(new Set(
          buildings.flatMap((b) => [b.id, b.code].filter((k): k is string => Boolean(k)))
        ));
        if (landlordBuildingKeys.length > 0) {
          roomsQuery = roomsQuery.in('building_id', landlordBuildingKeys);
        }
      }

      const { data: rooms, error: roomsError } = await roomsQuery;
      if (roomsError) throw roomsError;

      // 2. Lấy danh sách hợp đồng thuê đang active để map tên & SĐT khách hàng
      const activeContracts = await getRentalContracts(company.id, landlordId);

      // 3. Lấy chỉ số dịch vụ đã ghi nhận cho kỳ này
      const currentReadings = await getServiceReadings(company.id, selectedPeriod, landlordId);

      // 4. BATCH QUERY chỉ số cũ gần nhất trong 1 câu lệnh duy nhất (LOẠI BỎ TOÀN BỘ N+1 HTTP REQUESTS)
      const { data: allPrevReadings } = await supabase
        .from('service_readings')
        .select('*')
        .eq('company_id', company.id)
        .lt('period', selectedPeriod)
        .order('period', { ascending: false });

      const prevReadingMap = new Map<string, { electricity_new: number; water_new: number }>();
      for (const pr of allPrevReadings ?? []) {
        if (pr.room_id && !prevReadingMap.has(pr.room_id)) {
          prevReadingMap.set(pr.room_id, {
            electricity_new: Number(pr.electricity_new) || 0,
            water_new: Number(pr.water_new) || 0,
          });
        }
      }

      const computedRows: RoomReadingRow[] = [];

      for (const room of rooms ?? []) {
        const contract = activeContracts.find(
          (c) => (c.room_id === room.id || c.room_id === room.code) && c.status === 'active'
        );
        const currentReading = currentReadings.find((cr) => cr.room_id === room.id);

        const building = buildings.find(
          (b) => b.id === room.building_id || b.code === room.building_id
        );
        const landlordObj = landlordList.find(
          (l) => l.id === building?.landlord_id || l.code === building?.landlord_id
        );
        const landlordOrManagerName = landlordObj
          ? (landlordObj.code ? `${landlordObj.name} (${landlordObj.code})` : landlordObj.name)
          : (profile?.full_name || company?.owner_name || 'Chủ nhà');

        let elecOld = 0;
        let waterOld = 0;

        if (currentReading) {
          elecOld = Number(currentReading.electricity_old);
          waterOld = Number(currentReading.water_old);
        } else {
          // Tra cứu từ prevReadingMap trong bộ nhớ O(1) - Không gọi HTTP request lẻ
          const prevReading = prevReadingMap.get(room.id);
          if (prevReading) {
            elecOld = prevReading.electricity_new;
            waterOld = prevReading.water_new;
          }
        }

        const isRented = !!contract || room.status === 'rented';
        const roomStatus = room.status || (isRented ? 'rented' : 'available');

        computedRows.push({
          roomId: room.id,
          roomCode: room.code,
          buildingId: building?.id || room.building_id || 'unknown_bldg',
          buildingName: building?.name || 'Tòa nhà',
          buildingCode: building?.code || room.building_id || '',
          buildingAddress: building?.address || '',
          landlordOrManagerName,
          tenantName: contract ? contract.party_b_name : '',
          tenantPhone: contract ? (contract.party_b_phone || '') : '',
          isRented,
          roomStatus,
          electricityOld: elecOld,
          electricityNew: currentReading ? Number(currentReading.electricity_new) : elecOld,
          waterOld: waterOld,
          waterNew: currentReading ? Number(currentReading.water_new) : waterOld,
          readingId: currentReading?.id,
        });
      }

      setRows(computedRows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('Error loading service readings:', err);
      toast.error('Lỗi khi tải dữ liệu: ' + msg);
    } finally {
      setLoading(false);
    }
  }, [company?.id, selectedBuildingId, selectedPeriod, role, profile?.landlord_id, buildings, landlordList, company?.owner_name, profile?.full_name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side search filter by Room code, Tenant Name, Phone, or Building Name
  const displayedRows = useMemo(() => {
    if (!filterKeyword.trim()) return rows;
    const q = filterKeyword.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.roomCode.toLowerCase().includes(q) ||
        r.tenantName.toLowerCase().includes(q) ||
        r.tenantPhone.toLowerCase().includes(q) ||
        r.buildingName.toLowerCase().includes(q) ||
        r.buildingCode.toLowerCase().includes(q)
    );
  }, [rows, filterKeyword]);

  // Group displayed rows by Building for a clean structured UI
  const groupedByBuilding = useMemo(() => {
    const map = new Map<string, {
      buildingId: string;
      buildingName: string;
      buildingCode: string;
      buildingAddress?: string;
      landlordOrManagerName: string;
      rows: RoomReadingRow[];
    }>();

    for (const row of displayedRows) {
      const key = row.buildingId || 'default_bldg';
      if (!map.has(key)) {
        map.set(key, {
          buildingId: row.buildingId,
          buildingName: row.buildingName,
          buildingCode: row.buildingCode,
          buildingAddress: row.buildingAddress,
          landlordOrManagerName: row.landlordOrManagerName,
          rows: [],
        });
      }
      map.get(key)!.rows.push(row);
    }

    return Array.from(map.values());
  }, [displayedRows]);

  const formatThousand = (val: number | string) => {
    if (val === undefined || val === null || val === '') return '0';
    const numStr = String(val).replace(/\D/g, '');
    if (!numStr) return '0';
    return Number(numStr).toLocaleString('vi-VN');
  };

  const parseThousand = (val: string): number => {
    const raw = val.replace(/\D/g, '');
    return raw ? parseInt(raw, 10) : 0;
  };

  const handleRowChange = (index: number, field: 'electricityNew' | 'waterNew' | 'electricityOld' | 'waterOld', value: number) => {
    setRows((prev) => {
      const copy = [...prev];
      const realIndex = prev.findIndex((r) => r.roomId === displayedRows[index].roomId);
      if (realIndex !== -1) {
        copy[realIndex] = { ...copy[realIndex], [field]: value };
      }
      return copy;
    });
  };

  const handleSaveRowByRoomId = async (roomId: string) => {
    if (!company?.id) return;
    const targetIndex = rows.findIndex((r) => r.roomId === roomId);
    if (targetIndex === -1) return;
    const row = rows[targetIndex];

    setRows((prev) => {
      const copy = [...prev];
      copy[targetIndex] = { ...copy[targetIndex], saving: true };
      return copy;
    });

    try {
      await saveServiceReading({
        id: row.readingId,
        company_id: company.id,
        room_id: row.roomId,
        period: selectedPeriod,
        reading_date: new Date().toISOString().slice(0, 10),
        electricity_old: row.electricityOld,
        electricity_new: row.electricityNew,
        water_old: row.waterOld,
        water_new: row.waterNew,
        note: null,
      });
      
      toast.success(`Đã lưu chỉ số phòng ${row.roomCode}`);
      loadData();
    } catch (err: any) {
      toast.error(`Lỗi khi lưu chỉ số phòng ${row.roomCode}: ${err.message}`);
      setRows((prev) => {
        const copy = [...prev];
        copy[targetIndex] = { ...copy[targetIndex], saving: false };
        return copy;
      });
    }
  };

  const handleSaveAll = async () => {
    if (!company?.id || displayedRows.length === 0) return;
    
    let successCount = 0;
    toast.loading('Đang lưu chỉ số các phòng...', { id: 'save-all-toast' });
    
    for (let i = 0; i < displayedRows.length; i++) {
      const row = displayedRows[i];

      try {
        await saveServiceReading({
          id: row.readingId,
          company_id: company.id,
          room_id: row.roomId,
          period: selectedPeriod,
          reading_date: new Date().toISOString().slice(0, 10),
          electricity_old: row.electricityOld,
          electricity_new: row.electricityNew,
          water_old: row.waterOld,
          water_new: row.waterNew,
          note: null,
        });
        successCount++;
      } catch (err) {
        console.error(`Error saving room ${row.roomCode}`, err);
      }
    }
    
    toast.dismiss('save-all-toast');
    toast.success(`Đã lưu thành công ${successCount}/${displayedRows.length} phòng.`);
    loadData();
  };

  const handleSaveAndGenerateAllInvoices = async () => {
    await handleSaveAll();
    const targetPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/landlord') 
      ? '/landlord/invoices' 
      : '/admin/services/invoices';
    router.push(`${targetPath}?period=${selectedPeriod}&autoCreate=true`);
  };

  const renderStatusBadge = (status: string, isRented: boolean, tenantName: string, tenantPhone: string) => {
    if (isRented || status === 'rented') {
      return (
        <div className="space-y-1">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold text-[10px] rounded-full uppercase tracking-wider shadow-sm flex items-center w-fit gap-1" variant="outline">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Đang thuê
          </Badge>
          {tenantName && (
            <div className="text-xs font-bold text-ink flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3 text-ink-muted shrink-0" />
              <span>{tenantName}</span>
            </div>
          )}
          {tenantPhone && (
            <div className="text-[11px] font-semibold text-ink-muted flex items-center gap-1">
              <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>{tenantPhone}</span>
            </div>
          )}
        </div>
      );
    }
    if (status === 'reserved') {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-300 font-bold text-[10px] rounded-full uppercase tracking-wider shadow-sm flex items-center w-fit gap-1" variant="outline">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Đã cọc giữ chỗ
        </Badge>
      );
    }
    if (status === 'maintenance') {
      return (
        <Badge className="bg-rose-50 text-rose-700 border-rose-300 font-bold text-[10px] rounded-full uppercase tracking-wider shadow-sm flex items-center w-fit gap-1" variant="outline">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Đang bảo trì
        </Badge>
      );
    }
    return (
      <Badge className="bg-sky-50 text-sky-700 border-sky-300 font-bold text-[10px] rounded-full uppercase tracking-wider shadow-sm flex items-center w-fit gap-1" variant="outline">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> Phòng trống
      </Badge>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Chỉ Số Dịch Vụ Định Kỳ</h1>
          <p className="text-ink-muted text-sm mt-0.5">Chốt chỉ số điện/nước tiêu thụ hàng tháng theo tòa nhà</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveAll} disabled={loading || displayedRows.length === 0} className="bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold shadow-md">
            <Save className="h-4 w-4 mr-2" /> Lưu tất cả ({displayedRows.length} phòng)
          </Button>
          <Button onClick={handleSaveAndGenerateAllInvoices} disabled={loading || displayedRows.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md">
            <FileText className="h-4 w-4 mr-2" /> ⚡ Lập hóa đơn ({displayedRows.length} phòng)
          </Button>
        </div>
      </div>

      {/* Bộ lọc thông minh */}
      <Card className="border-border shadow-none rounded-xl bg-white">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Ô 1: Chọn Tòa nhà (5 cols) */}
          <div className="md:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-ink font-bold text-xs uppercase tracking-wider">
                <Building2 className="h-4 w-4 text-accent" /> Chọn Tòa Nhà ({filteredBuildings.length}/{buildings.length})
              </Label>
              {selectedBuildingId !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBuildingId('all');
                    setBuildingSearchTerm('');
                  }}
                  className="text-xs text-accent hover:underline font-semibold"
                >
                  × Tất cả tòa
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <Input
                placeholder="🔍 Gõ Tên/Mã tòa nhà hoặc Mã/Tên chủ nhà (VD: TH01)..."
                value={buildingSearchTerm}
                onChange={(e) => setBuildingSearchTerm(e.target.value)}
                className="h-8 text-xs rounded-md border-border bg-slate-50 focus-visible:ring-accent"
              />

              {buildingsLoading ? (
                <div className="flex items-center gap-2 h-10 text-xs text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" /> Đang tải tòa nhà...
                </div>
              ) : (
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all">— Tất cả Tòa nhà ({buildings.length} tòa) —</option>
                  {filteredBuildings.map((b) => {
                    const landlordObj = landlordList.find(l => l.id === b.landlord_id || l.code === b.landlord_id);
                    const landlordLabel = landlordObj 
                      ? `${landlordObj.name} (${landlordObj.code || 'CHỦ NHÀ'})` 
                      : b.landlord_id || 'Công ty';
                    
                    return (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `[${b.code}]` : ''} — Chủ: {landlordLabel}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>

          {/* Ô 2: Tìm kiếm thông minh Phòng / Khách thuê / SĐT (4 cols) */}
          <div className="md:col-span-4 space-y-1.5">
            <Label className="flex items-center gap-1.5 text-ink font-bold text-xs uppercase tracking-wider">
              <Search className="h-4 w-4 text-accent" /> Tìm nhanh Phòng / Khách / SĐT
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input
                placeholder="Gõ Số phòng (302), Tên khách, SĐT..."
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                className="pl-9 pr-8 h-10 text-sm rounded-lg border-border font-semibold focus-visible:ring-accent"
              />
              {filterKeyword && (
                <button
                  onClick={() => setFilterKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Ô 3: Kỳ chốt (Tháng/Năm) (3 cols) */}
          <div className="md:col-span-3 space-y-1.5">
            <Label className="flex items-center gap-1.5 text-ink font-bold text-xs uppercase tracking-wider">
              <Calendar className="h-4 w-4 text-accent" /> Kỳ chốt (Tháng/Năm)
            </Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handlePeriodChange(-1)}
                title="Tháng trước"
                className="h-10 w-9 shrink-0 rounded-lg border-border hover:bg-accent/10 hover:text-accent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-lg border-border h-10 font-black text-sm text-center focus-visible:ring-accent bg-amber-50/30 px-1 cursor-pointer"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handlePeriodChange(1)}
                title="Tháng sau"
                className="h-10 w-9 shrink-0 rounded-lg border-border hover:bg-accent/10 hover:text-accent"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bảng ghi nhận chỉ số */}
      <Card className="border-border shadow-none rounded-xl bg-white overflow-hidden">
        <CardHeader className="bg-bg-subtle/30 border-b border-border pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-heading font-bold text-ink">Bảng chốt chỉ số Điện & Nước</CardTitle>
              <CardDescription className="text-xs text-ink-muted mt-0.5">
                Hiển thị {displayedRows.length} / {rows.length} phòng thuộc {groupedByBuilding.length} tòa nhà kỳ {selectedPeriod}
                {filterKeyword && <span className="ml-1 text-accent font-semibold">(Đang lọc theo: &quot;{filterKeyword}&quot;)</span>}
              </CardDescription>
            </div>
            <span className="text-[10px] bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Tự động lấy số cũ (Tối ưu 100%)
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* Desktop view */}
              <table className="w-full text-sm hidden md:table border-collapse">
                <thead className="bg-slate-100 dark:bg-zinc-800 border-b-2 border-border text-ink font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-left font-black text-ink">Phòng</th>
                    <th className="px-6 py-4 text-left font-black text-ink">Trạng thái & Khách thuê</th>
                    <th className="px-4 py-4 text-center bg-amber-100/70 text-amber-900 border-x border-amber-200/80 font-bold">
                      <div className="flex items-center justify-center gap-1.5">
                        <Zap className="h-4 w-4 text-amber-600 fill-amber-500" />
                        <span>Điện cũ (Số)</span>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center bg-amber-300/80 text-amber-950 border-x border-amber-400 font-black text-sm shadow-inner">
                      <div className="flex items-center justify-center gap-1.5">
                        <Zap className="h-4.5 w-4.5 text-amber-700 fill-amber-400 animate-pulse" />
                        <span className="tracking-wide">⚡ Điện mới (Số)</span>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center bg-sky-100/70 text-sky-900 border-x border-sky-200/80 font-bold">
                      <div className="flex items-center justify-center gap-1.5">
                        <Droplets className="h-4 w-4 text-sky-600 fill-sky-500" />
                        <span>Nước cũ (m³)</span>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center bg-sky-300/80 text-sky-950 border-x border-sky-400 font-black text-sm shadow-inner">
                      <div className="flex items-center justify-center gap-1.5">
                        <Droplets className="h-4.5 w-4.5 text-sky-700 fill-sky-400 animate-pulse" />
                        <span className="tracking-wide">💧 Nước mới (m³)</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center font-black text-ink">Hành động</th>
                  </tr>
                </thead>
                {groupedByBuilding.map((group) => (
                  <tbody key={group.buildingId} className="divide-y divide-border border-b-2 border-slate-300">
                    {/* Header bar bọc các phòng thuộc Tòa nhà */}
                    <tr className="bg-slate-100 hover:bg-slate-200/70 transition-colors">
                      <td colSpan={7} className="px-6 py-3 bg-slate-100 border-y border-slate-300">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-accent shrink-0" />
                            {group.buildingCode && (
                              <span className="font-mono font-extrabold text-xs text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                                [{group.buildingCode}]
                              </span>
                            )}
                            <span className="font-bold text-ink text-base font-heading">
                              {group.buildingName}
                            </span>
                            {group.buildingAddress && (
                              <span className="text-xs text-ink-muted hidden sm:inline-block font-normal">
                                — {group.buildingAddress}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs font-semibold">
                            <span className="text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-300 shadow-xs flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-accent shrink-0" />
                              <span>Quản lý / Chủ nhà: <strong className="text-ink font-bold">{group.landlordOrManagerName}</strong></span>
                            </span>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono font-bold">
                              {group.rows.length} phòng
                            </Badge>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* Các dòng phòng thuộc tòa nhà này */}
                    {group.rows.map((row) => {
                      const originalIndex = displayedRows.findIndex((r) => r.roomId === row.roomId);

                      return (
                        <tr key={row.roomId} className="hover:bg-bg-subtle/50 transition-colors">
                          {/* Số phòng */}
                          <td className="px-6 py-4 font-bold text-accent font-mono text-sm">
                            Phòng {row.roomCode}
                          </td>

                          {/* Trạng thái & Khách thuê */}
                          <td className="px-6 py-4">
                            {renderStatusBadge(row.roomStatus, row.isRented, row.tenantName, row.tenantPhone)}
                          </td>

                          {/* Điện cũ */}
                          <td className="px-4 py-4 bg-amber-50/20 text-center border-x border-amber-100">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatThousand(row.electricityOld)}
                              onChange={(e) => handleRowChange(originalIndex, 'electricityOld', parseThousand(e.target.value))}
                              disabled={row.saving}
                              className="w-24 mx-auto text-center font-mono font-bold text-amber-900 rounded-lg border-amber-200 bg-amber-50/30 focus-visible:ring-amber-500"
                            />
                          </td>

                          {/* Điện mới - Highlighted */}
                          <td className="px-4 py-4 bg-amber-100/40 text-center border-x border-amber-300">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatThousand(row.electricityNew)}
                              onChange={(e) => handleRowChange(originalIndex, 'electricityNew', parseThousand(e.target.value))}
                              disabled={row.saving}
                              className="w-28 mx-auto text-center font-black font-mono text-amber-950 border-2 border-amber-400 bg-amber-50/90 focus-visible:ring-amber-500 rounded-lg text-base shadow-sm"
                            />
                          </td>

                          {/* Nước cũ */}
                          <td className="px-4 py-4 bg-sky-50/20 text-center border-x border-sky-100">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatThousand(row.waterOld)}
                              onChange={(e) => handleRowChange(originalIndex, 'waterOld', parseThousand(e.target.value))}
                              disabled={row.saving}
                              className="w-24 mx-auto text-center font-mono font-bold text-sky-900 rounded-lg border-sky-200 bg-sky-50/30 focus-visible:ring-sky-500"
                            />
                          </td>

                          {/* Nước mới - Highlighted */}
                          <td className="px-4 py-4 bg-sky-100/40 text-center border-x border-sky-300">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatThousand(row.waterNew)}
                              onChange={(e) => handleRowChange(originalIndex, 'waterNew', parseThousand(e.target.value))}
                              disabled={row.saving}
                              className="w-28 mx-auto text-center font-black font-mono text-sky-950 border-2 border-sky-400 bg-sky-50/90 focus-visible:ring-sky-500 rounded-lg text-base shadow-sm"
                            />
                          </td>

                          {/* Cột Hành động - Lưu & Hóa đơn */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleSaveRowByRoomId(row.roomId)}
                                disabled={row.saving}
                                title={`Lưu chỉ số phòng ${row.roomCode}`}
                                className="bg-accent text-white hover:bg-accent-500 rounded-lg shadow-sm font-semibold h-9 w-9 p-0 flex items-center justify-center"
                              >
                                {row.saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const targetPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/landlord') 
                                    ? '/landlord/invoices' 
                                    : '/admin/services/invoices';
                                  router.push(`${targetPath}?period=${selectedPeriod}&search=${encodeURIComponent(row.roomCode)}&autoCreate=true`);
                                }}
                                title={`Xem / Lập hóa đơn phòng ${row.roomCode}`}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-semibold h-9 w-9 p-0 flex items-center justify-center"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
                {displayedRows.length === 0 && (
                  <tbody>
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-ink-muted bg-white">
                        <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-35" />
                        {filterKeyword
                          ? `Không tìm thấy phòng hoặc khách thuê phù hợp với "${filterKeyword}".`
                          : 'Tòa nhà này hiện không có phòng nào.'}
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border bg-white">
                {groupedByBuilding.map((group) => (
                  <div key={group.buildingId} className="divide-y divide-border">
                    {/* Header tòa nhà cho giao diện Mobile */}
                    <div className="bg-slate-100 p-3 flex items-center justify-between gap-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-accent" />
                        <span className="font-bold text-ink text-xs font-heading">
                          {group.buildingCode ? `[${group.buildingCode}] ` : ''}{group.buildingName}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono font-bold text-[10px]">
                        {group.rows.length} phòng
                      </Badge>
                    </div>

                    {group.rows.map((row) => (
                      <div key={row.roomId} className="p-4 space-y-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-ink text-sm">Phòng {row.roomCode}</span>
                          {renderStatusBadge(row.roomStatus, row.isRented, row.tenantName, row.tenantPhone)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1 bg-amber-50/30 p-2 rounded-lg border border-amber-200">
                            <Label className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1"><Zap className="h-3 w-3 text-amber-600" /> Điện cũ (Số)</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatThousand(row.electricityOld)}
                              onChange={(e) => {
                                const origIndex = rows.findIndex((r) => r.roomId === row.roomId);
                                if (origIndex !== -1) handleRowChange(origIndex, 'electricityOld', parseThousand(e.target.value));
                              }}
                              disabled={row.saving}
                              className="text-center font-mono font-bold text-amber-900 rounded-lg border-amber-300 h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-1 bg-amber-100/40 p-2 rounded-lg border-2 border-amber-400">
                            <Label className="text-[10px] font-black text-amber-950 uppercase flex items-center gap-1"><Zap className="h-3 w-3 text-amber-700 fill-amber-500" /> ⚡ Điện mới</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatThousand(row.electricityNew)}
                              onChange={(e) => {
                                const origIndex = rows.findIndex((r) => r.roomId === row.roomId);
                                if (origIndex !== -1) handleRowChange(origIndex, 'electricityNew', parseThousand(e.target.value));
                              }}
                              disabled={row.saving}
                              className="text-center font-black font-mono text-amber-950 border-amber-400 h-8 text-sm bg-amber-50"
                            />
                          </div>
                          <div className="space-y-1 bg-sky-50/30 p-2 rounded-lg border border-sky-200">
                            <Label className="text-[10px] font-bold text-sky-800 uppercase flex items-center gap-1"><Droplets className="h-3 w-3 text-sky-600" /> Nước cũ (m³)</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatThousand(row.waterOld)}
                              onChange={(e) => {
                                const origIndex = rows.findIndex((r) => r.roomId === row.roomId);
                                if (origIndex !== -1) handleRowChange(origIndex, 'waterOld', parseThousand(e.target.value));
                              }}
                              disabled={row.saving}
                              className="text-center font-mono font-bold text-sky-900 rounded-lg border-sky-300 h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-1 bg-sky-100/40 p-2 rounded-lg border-2 border-sky-400">
                            <Label className="text-[10px] font-black text-sky-950 uppercase flex items-center gap-1"><Droplets className="h-3 w-3 text-sky-700 fill-sky-500" /> 💧 Nước mới</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatThousand(row.waterNew)}
                              onChange={(e) => {
                                const origIndex = rows.findIndex((r) => r.roomId === row.roomId);
                                if (origIndex !== -1) handleRowChange(origIndex, 'waterNew', parseThousand(e.target.value));
                              }}
                              disabled={row.saving}
                              className="text-center font-black font-mono text-sky-950 border-sky-400 h-8 text-sm bg-sky-50"
                            />
                          </div>
                        </div>

                        {/* Tiêu thụ tức thì & Cảnh báo */}
                        <div className="flex items-center justify-between text-[11px] font-bold px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 rounded-lg border border-slate-200/80">
                          <span className={row.electricityNew < row.electricityOld ? 'text-rose-600 font-extrabold animate-bounce' : 'text-amber-700 font-mono'}>
                            {row.electricityNew < row.electricityOld ? '⚠️ Điện mới < Điện cũ' : `⚡ Dùng: ${row.electricityNew - row.electricityOld} số`}
                          </span>
                          <span className={row.waterNew < row.waterOld ? 'text-rose-600 font-extrabold animate-bounce' : 'text-sky-700 font-mono'}>
                            {row.waterNew < row.waterOld ? '⚠️ Nước mới < Nước cũ' : `💧 Dùng: ${row.waterNew - row.waterOld} m³`}
                          </span>
                        </div>

                        <div className="pt-1 flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveRowByRoomId(row.roomId)}
                            disabled={row.saving}
                            className="bg-accent hover:bg-accent-500 text-white font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5"
                          >
                            {row.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Lưu chỉ số
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const targetPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/landlord') 
                                ? '/landlord/invoices' 
                                : '/admin/services/invoices';
                              router.push(`${targetPath}?period=${selectedPeriod}&search=${encodeURIComponent(row.roomCode)}&autoCreate=true`);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3 rounded-lg flex items-center gap-1"
                          >
                            <FileText className="h-4 w-4" /> Xem Hóa đơn
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {displayedRows.length === 0 && (
                  <div className="p-8 text-center text-ink-muted">
                    <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-35" />
                    <p className="text-sm font-semibold">Không tìm thấy phòng nào phù hợp.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}