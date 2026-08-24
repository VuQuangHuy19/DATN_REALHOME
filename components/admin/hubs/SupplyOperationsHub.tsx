'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  DoorOpen,
  UserCheck,
  Plus,
  MapPin,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wrench,
  Loader2,
  ArrowLeft,
  Filter,
  Phone,
  User,
  Calendar,
  DollarSign,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAdminModule } from '@/features/admin/context/admin-module-context';
import { getDashboardStats } from '@/lib/supabase/repositories/dashboard';

import { getRoomDisplayStatus, formatDateDisplay } from '@/lib/room-status';

function extractSoonVacantDate(room: any, contracts: any[] = []): string | null {
  if (!room) return null;
  const ds = getRoomDisplayStatus(room, contracts);
  if (ds.expectedEmptyDate) {
    return formatDateDisplay(ds.expectedEmptyDate);
  }
  if (room.available_date) return String(room.available_date);
  if (room.expected_available_date) return String(room.expected_available_date);

  const text = `${room.description || ''} ${room.notes || ''} ${room.title || ''}`;
  const match = text.match(/\[Sắp trống:\s*([^\]]+)\]/i) || text.match(/Sắp trống[:\s]+([\d\/]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

function getRoomStatusCategory(room: any, contracts: any[] = []): 'vacant' | 'rented' | 'soon_vacant' {
  if (!room) return 'rented';
  const ds = getRoomDisplayStatus(room, contracts);
  if (ds.isSoonAvailable || ds.status === 'soon_available') {
    return 'soon_vacant';
  }
  if (ds.status === 'available' || ds.status === 'vacant') {
    return 'vacant';
  }

  const st = (room.status || '').toLowerCase();
  const text = `${room.description || ''} ${room.notes || ''} ${room.title || ''}`.toLowerCase();

  if (
    st === 'soon_available' ||
    st === 'sap_trong' ||
    st === 'soon_vacant' ||
    st === 'soon' ||
    Boolean(room.available_date) ||
    Boolean(room.expected_available_date) ||
    text.includes('sắp trống') ||
    text.includes('sap trong')
  ) {
    return 'soon_vacant';
  }

  return 'rented';
}

export function SupplyOperationsHub() {
  const { company } = useAuth();
  const { activeModule, setActiveModule } = useAdminModule();
  const companyId = company?.id;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBuildings: 0,
    totalRooms: 0,
    vacantRooms: 0,
    rentedRooms: 0,
    soonVacantRooms: 0,
    pendingLandlordKYC: 0,
    occupancyRate: 0,
  });

  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [landlordsList, setLandlordsList] = useState<any[]>([]);
  const [contractsList, setContractsList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'matrix' | 'map'>('matrix');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  const [selectedLandlordFilter, setSelectedLandlordFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'rented' | 'vacant' | 'soon_vacant'>('all');
  const [selectedRoomModal, setSelectedRoomModal] = useState<{ room: any; building: any; landlord: any } | null>(null);

  useEffect(() => {
    if (!companyId) return;

    async function fetchSupplyData() {
      setLoading(true);
      try {
        const dashStats = await getDashboardStats(companyId || '', undefined, 'all_time');

        let bList = (dashStats?.buildingsList as any[]) || [];
        const rList = (dashStats?.roomsList as any[]) || [];

        // Fetch active rental contracts to accurately classify soon_vacant rooms
        let cQuery = supabase
          .from('rental_contracts')
          .select('id, room_id, status, end_date')
          .eq('status', 'active');
        if (companyId) {
          cQuery = cQuery.or(`company_id.eq.${companyId},company_id.is.null`);
        }
        const { data: cData } = await cQuery;
        const fetchedContracts = cData || [];
        setContractsList(fetchedContracts);

        // If bList items missing landlord_id, fetch buildings directly from DB to enrich landlord_id
        if (bList.length > 0 && bList.some((b) => !b.landlord_id)) {
          let bQuery = supabase
            .from('buildings')
            .select('id, code, name, address, area, landlord_id, total_rooms, total_floors');
          if (companyId) {
            bQuery = bQuery.or(`company_id.eq.${companyId},company_id.is.null`);
          }
          const { data: bData } = await bQuery;
          if (bData && bData.length > 0) {
            const bMap = new Map<string, any>(bData.map((b: any) => [b.id, b]));
            bList = bList.map((b: any) => {
              const freshB = bMap.get(b.id);
              return freshB && (freshB as any).landlord_id ? { ...b, landlord_id: (freshB as any).landlord_id } : b;
            });
          }
        }

        setBuildingsList(bList);
        setRoomsList(rList);

        // Fetch Landlords
        let lQuery = supabase
          .from('landlords')
          .select('id, name, phone, address, properties_count, code, is_kyc_verified, kyc_status, created_at');
        if (companyId) {
          lQuery = lQuery.or(`company_id.eq.${companyId},company_id.is.null`);
        }
        const { data: lData } = await lQuery.order('created_at', { ascending: false });

        const allLandlords = lData || [];
        setLandlordsList(allLandlords);

        const pendingKYC = allLandlords.filter(
          (l: any) => l.is_kyc_verified === false || l.kyc_status === 'pending' || !l.is_kyc_verified
        ).length;

        const totalBuildings = bList.length;
        const totalRooms = rList.length;
        let vacant = 0;
        let rented = 0;
        let soonVacant = 0;

        rList.forEach((r: any) => {
          const cat = getRoomStatusCategory(r, fetchedContracts);
          if (cat === 'soon_vacant') soonVacant++;
          else if (cat === 'vacant') vacant++;
          else rented++;
        });

        const occRate = totalRooms > 0 ? Math.round((rented / totalRooms) * 1000) / 10 : 0;

        setStats({
          totalBuildings,
          totalRooms,
          vacantRooms: vacant,
          rentedRooms: rented,
          soonVacantRooms: soonVacant,
          pendingLandlordKYC: pendingKYC,
          occupancyRate: occRate,
        });
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu phân hệ Nguồn hàng:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSupplyData();
  }, [companyId]);

  // Extract unique areas list (trimmed & deduplicated)
  const allAreasList = useMemo(() => {
    const set = new Set<string>();
    buildingsList.forEach((b) => {
      if (b.area) {
        const cleaned = b.area.trim().replace(/\s+/g, ' ');
        if (cleaned) set.add(cleaned);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [buildingsList]);

  // Group rooms by building and floor
  const groupedBuildingMatrix = useMemo(() => {
    if (!roomsList || !buildingsList) return [];

    let filteredBuildings = [...buildingsList];

    if (selectedAreaFilter !== 'all') {
      const targetArea = selectedAreaFilter.trim().toLowerCase();
      filteredBuildings = filteredBuildings.filter((b) => {
        const bArea = (b.area || 'Khác').trim().toLowerCase();
        return bArea === targetArea;
      });
    }

    if (selectedLandlordFilter !== 'all') {
      filteredBuildings = filteredBuildings.filter((b) => {
        if (!b.landlord_id) return false;
        const bL = b.landlord_id.toString().trim().toLowerCase();
        const target = selectedLandlordFilter.toString().trim().toLowerCase();

        const matchedLandlord = landlordsList.find(
          (l) =>
            (l.code && l.code.toString().trim().toLowerCase() === target) ||
            (l.id && l.id.toString().trim().toLowerCase() === target)
        );

        const targetCode = (matchedLandlord?.code || '').toString().trim().toLowerCase();
        const targetId = (matchedLandlord?.id || '').toString().trim().toLowerCase();

        return bL === target || (targetCode && bL === targetCode) || (targetId && bL === targetId);
      });
    }

    return filteredBuildings
      .map((b) => {
        // Match landlord (check code or ID case-insensitively)
        const landlord = landlordsList.find((l) => {
          if (!b.landlord_id) return false;
          const bL = b.landlord_id.toString().trim().toLowerCase();
          const lCode = (l.code || '').toString().trim().toLowerCase();
          const lId = (l.id || '').toString().trim().toLowerCase();
          return (lCode && bL === lCode) || (lId && bL === lId);
        });

        // Match rooms for this building (flexible case-insensitive key matching)
        let bRooms = roomsList.filter((r) => {
          if (!r.building_id) return false;
          const rB = r.building_id.toString().trim().toLowerCase();
          const bCode = (b.code || '').toString().trim().toLowerCase();
          const bId = (b.id || '').toString().trim().toLowerCase();
          return (bCode && rB === bCode) || (bId && rB === bId);
        });

        if (searchTerm.trim()) {
          const q = searchTerm.trim().toLowerCase();
          const bNameMatch = (b.name || '').toLowerCase().includes(q);
          const bCodeMatch = (b.code || '').toLowerCase().includes(q);
          const bAddrMatch = (b.address || '').toLowerCase().includes(q);
          const bLandlordIdMatch = (b.landlord_id || '').toLowerCase().includes(q);
          const lNameMatch = (landlord?.name || '').toLowerCase().includes(q);
          const lCodeMatch = (landlord?.code || '').toLowerCase().includes(q);
          const lPhoneMatch = (landlord?.phone || '').includes(q);

          const buildingOrLandlordMatches =
            bNameMatch || bCodeMatch || bAddrMatch || bLandlordIdMatch || lNameMatch || lCodeMatch || lPhoneMatch;

          if (!buildingOrLandlordMatches) {
            bRooms = bRooms.filter((r) => (r.code || '').toLowerCase().includes(q));
          }
        }

        if (selectedStatusFilter !== 'all') {
          bRooms = bRooms.filter((r) => {
            const cat = getRoomStatusCategory(r, contractsList);
            return cat === selectedStatusFilter;
          });
        }

        // Group rooms by floor
        const floorMap = new Map<number, any[]>();
        bRooms.forEach((r) => {
          const fl = r.floor || 1;
          if (!floorMap.has(fl)) floorMap.set(fl, []);
          floorMap.get(fl)!.push(r);
        });

        const sortedFloors = Array.from(floorMap.entries())
          .map(([floorNum, roomsOnFloor]) => ({
            floorNum,
            rooms: roomsOnFloor.sort((x, y) => (x.code || '').localeCompare(y.code || '', undefined, { numeric: true })),
          }))
          .sort((x, y) => y.floorNum - x.floorNum);

        const totalRoomsCount = bRooms.length;
        const rentedCount = bRooms.filter((r) => ['rented', 'occupied'].includes((r.status || '').toLowerCase())).length;

        return {
          building: b,
          landlord,
          floors: sortedFloors,
          totalRoomsCount,
          rentedCount,
        };
      })
      .filter((group) => {
        // If building or landlord matches search, keep it even if zero rooms match status
        if (searchTerm.trim()) {
          const q = searchTerm.trim().toLowerCase();
          const b = group.building;
          const landlord = group.landlord;
          const bNameMatch = (b.name || '').toLowerCase().includes(q);
          const bCodeMatch = (b.code || '').toLowerCase().includes(q);
          const bAddrMatch = (b.address || '').toLowerCase().includes(q);
          const bLandlordIdMatch = (b.landlord_id || '').toLowerCase().includes(q);
          const lNameMatch = (landlord?.name || '').toLowerCase().includes(q);
          const lCodeMatch = (landlord?.code || '').toLowerCase().includes(q);
          const lPhoneMatch = (landlord?.phone || '').includes(q);

          if (bNameMatch || bCodeMatch || bAddrMatch || bLandlordIdMatch || lNameMatch || lCodeMatch || lPhoneMatch) {
            return true;
          }
        }
        return group.floors.length > 0 || (!searchTerm && selectedStatusFilter === 'all' && selectedAreaFilter === 'all' && selectedLandlordFilter === 'all');
      });
  }, [roomsList, buildingsList, landlordsList, contractsList, selectedAreaFilter, selectedLandlordFilter, selectedStatusFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner Hub */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 p-6 text-white shadow-lg">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {activeModule !== 'all' && (
              <button
                onClick={() => setActiveModule('all')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all mb-3 cursor-pointer border border-white/20 backdrop-blur-md"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Quay lại Tổng quan Tất cả</span>
              </button>
            )}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-sky-100 backdrop-blur-md mb-2">
              <Building2 className="h-3.5 w-3.5 text-sky-300" />
              <span>Nguồn Hàng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Khu vực Nguồn hàng</h1>
            <p className="text-sm text-sky-100/90 mt-1 max-w-xl">
              Dữ liệu thực từ hệ thống: Quản lý {stats.totalBuildings} Tòa nhà, {stats.totalRooms} Phòng/Căn hộ, theo dõi sơ đồ mặt bằng tòa nhà &amp; danh sách Chủ nhà.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className="bg-white text-blue-700 hover:bg-sky-50 font-bold shadow-md text-xs">
              <Link href="/admin/realhome/buildings">
                <Plus className="h-4 w-4 mr-1" />
                Thêm Tòa Nhà
              </Link>
            </Button>
            <Button asChild className="bg-sky-500/30 hover:bg-sky-500/40 text-white font-bold backdrop-blur-md border border-white/30 text-xs">
              <Link href="/admin/realhome/rooms">
                <DoorOpen className="h-4 w-4 mr-1" />
                Danh Sách Phòng
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Tổng Tòa Nhà</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalBuildings} Tòa</div>
          <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Thực tế từ DB
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Tổng Số Phòng</span>
            <DoorOpen className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalRooms} Phòng</div>
          <div className="text-[11px] font-medium text-indigo-600">Tỷ lệ lấp đầy: {stats.occupancyRate}%</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Phòng Trống Sẵn Sàng</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.vacantRooms} Phòng</div>
          <div className="text-[11px] font-medium text-slate-400">Đang chờ khách thuê</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Chủ Nhà Trong Hệ Thống</span>
            <UserCheck className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{landlordsList.length} Chủ nhà</div>
          <div className="text-[11px] font-medium text-amber-600">{stats.pendingLandlordKYC} chờ KYC</div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-slate-500">Đang tải sơ đồ mặt bằng &amp; nguồn hàng thực tế từ DB...</p>
        </div>
      ) : (
        /* Main Workspace: Matrix vs Landlords vs Tools */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Floor-by-Floor Building Matrix */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Sơ Đồ Mặt Bằng Phòng Theo Tòa &amp; Chủ Nhà</h2>
                    <p className="text-xs text-slate-400">Trực quan hóa vị trí phòng, tầng, chủ nhà sở hữu &amp; trạng thái trống</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab('matrix')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'matrix' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Matrix Sơ Đồ
                  </button>
                  <button
                    onClick={() => setActiveTab('map')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'map' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Bản Đồ BĐS
                  </button>
                </div>
              </div>

              {/* Multi-Filter Bar */}
              <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-700/60">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Tìm mã phòng, tên tòa, chủ nhà..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 text-xs h-8 bg-white dark:bg-zinc-900"
                    />
                  </div>

                  {/* Filter by Area */}
                  <Select value={selectedAreaFilter} onValueChange={setSelectedAreaFilter}>
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                      <SelectValue placeholder="Lọc theo Khu vực" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs font-bold text-blue-600">
                        📍 Tất cả Khu vực ({allAreasList.length})
                      </SelectItem>
                      {allAreasList.map((area) => (
                        <SelectItem key={area} value={area} className="text-xs">
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filter by Landlord */}
                  <Select value={selectedLandlordFilter} onValueChange={setSelectedLandlordFilter}>
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                      <SelectValue placeholder="Lọc theo Chủ nhà" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs font-bold text-indigo-600">
                        👤 Tất cả Chủ nhà ({landlordsList.length})
                      </SelectItem>
                      {landlordsList.map((l) => (
                        <SelectItem key={l.id} value={l.code || l.id} className="text-xs">
                          {l.code ? `${l.code} - ` : ''}{l.name} {l.phone ? `(${l.phone})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Pills Filter */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200/60 dark:border-zinc-700/60">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
                    <button
                      onClick={() => setSelectedStatusFilter('all')}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                        selectedStatusFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200/70 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setSelectedStatusFilter('vacant')}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                        selectedStatusFilter === 'vacant' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      🟢 Trống ({stats.vacantRooms})
                    </button>
                    <button
                      onClick={() => setSelectedStatusFilter('rented')}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                        selectedStatusFilter === 'rented' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                    >
                      🔴 Đã thuê ({stats.rentedRooms})
                    </button>
                    <button
                      onClick={() => setSelectedStatusFilter('soon_vacant')}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                        selectedStatusFilter === 'soon_vacant' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                      }`}
                    >
                      🟡 Sắp trống ({stats.soonVacantRooms})
                    </button>
                  </div>

                  {(selectedAreaFilter !== 'all' || selectedLandlordFilter !== 'all' || selectedStatusFilter !== 'all' || searchTerm) && (
                    <button
                      onClick={() => {
                        setSelectedAreaFilter('all');
                        setSelectedLandlordFilter('all');
                        setSelectedStatusFilter('all');
                        setSearchTerm('');
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      ✕ Xóa bộ lọc
                    </button>
                  )}
                </div>
              </div>

              {/* Floor-by-Floor Matrix View Render */}
              {activeTab === 'matrix' ? (
                groupedBuildingMatrix.length > 0 ? (
                  <div className="space-y-5 max-h-[600px] overflow-y-auto pr-1">
                    {groupedBuildingMatrix.map(({ building, landlord, floors, totalRoomsCount, rentedCount }) => {
                      const occPct = totalRoomsCount > 0 ? Math.round((rentedCount / totalRoomsCount) * 100) : 0;

                      return (
                        <div key={building.id} className="bg-slate-50/80 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-700/80 p-4 space-y-3">
                          {/* Building Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-zinc-700/80">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                                  {building.name}
                                </h3>
                                {building.code && (
                                  <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white dark:bg-zinc-900">
                                    Mã: {building.code}
                                  </Badge>
                                )}
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                                  {building.area || 'Hà Nội'} {building.address ? `• ${building.address}` : ''}
                                </span>
                              </div>

                              {/* Landlord Owner Badge */}
                              <div className="flex items-center gap-2 text-xs pt-0.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-[11px]">
                                  <UserCheck className="h-3 w-3 text-indigo-600" />
                                  Chủ nhà: <strong>
                                    {landlord?.name
                                      ? `${landlord.name} ${landlord.code ? `(${landlord.code})` : ''}`
                                      : (building.landlord_id ? `Mã: ${building.landlord_id}` : 'Chưa gán chủ nhà')}
                                  </strong>
                                  {landlord?.phone && <span className="text-[10px] text-indigo-600 font-mono">({landlord.phone})</span>}
                                </span>
                                {landlord?.is_kyc_verified && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                                    ✓ Đã KYC
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <Badge variant="outline" className="bg-white dark:bg-zinc-900 border-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold px-2.5 py-1">
                                Lấp đầy: <strong className="text-blue-600 dark:text-blue-400 ml-1">{rentedCount}/{totalRoomsCount} phòng ({occPct}%)</strong>
                              </Badge>
                            </div>
                          </div>

                          {/* Floor-by-Floor Grid */}
                          <div className="space-y-2 pt-1">
                            {floors.map(({ floorNum, rooms }) => (
                              <div key={floorNum} className="flex items-start gap-3 bg-white dark:bg-zinc-900/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700/60">
                                <div className="w-16 shrink-0 font-extrabold text-xs text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  Tầng {floorNum}
                                </div>

                                <div className="flex-1 flex flex-wrap gap-2">
                                  {rooms.map((room: any) => {
                                    const cat = getRoomStatusCategory(room, contractsList);
                                    const availDate = extractSoonVacantDate(room, contractsList);
                                    let btnBg = 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200';
                                    let statusText = 'Đã thuê';

                                    if (cat === 'vacant') {
                                      btnBg = 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs';
                                      statusText = 'Trống';
                                    } else if (cat === 'soon_vacant') {
                                      btnBg = 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 font-bold';
                                      statusText = availDate ? `Sắp trống (${availDate})` : 'Sắp trống';
                                    }

                                    const priceFormatted = room.price ? `${(Number(room.price) / 1000000).toFixed(1)}M` : '0';
                                    const shortDate = availDate ? availDate.slice(0, 5) : null;

                                    return (
                                      <button
                                        key={room.id}
                                        onClick={() => setSelectedRoomModal({ room, building, landlord })}
                                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-extrabold transition-all transform hover:scale-105 flex items-center gap-1.5 cursor-pointer ${btnBg}`}
                                        title={`Click xem chi tiết P.${room.code} (${statusText})`}
                                      >
                                        <span>P.{room.code}</span>
                                        {cat === 'soon_vacant' && shortDate && (
                                          <span className="text-[10px] font-extrabold bg-amber-200/90 dark:bg-amber-900/90 text-amber-900 dark:text-amber-100 px-1 py-0.2 rounded border border-amber-400/50 font-mono">
                                            [{shortDate}]
                                          </span>
                                        )}
                                        <span className="text-[10px] opacity-90 font-semibold">({priceFormatted})</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <Building2 className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-600">Không tìm thấy phòng hoặc tòa nhà khớp với bộ lọc.</p>
                  </div>
                )
              ) : (
                <div className="py-16 text-center text-xs text-slate-400 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700">
                  <MapPin className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  Bản đồ vị trí Tòa nhà BĐS đang được đồng bộ dữ liệu tọa độ GPS...
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500">
                <span>Tổng hiển thị sơ đồ: {groupedBuildingMatrix.length} tòa nhà</span>
                <Link href="/admin/realhome/rooms" className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                  Quản lý tất cả danh sách phòng <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Landlords List & Operations Tools */}
          <div className="space-y-4">
            {/* Preferred Landlords Widget */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Danh Sách Chủ Nhà Thân Thiết</h3>
                </div>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                  {landlordsList.length} Chủ nhà
                </Badge>
              </div>

              <div className="space-y-3 mt-4 max-h-[380px] overflow-y-auto pr-1">
                {landlordsList.length > 0 ? (
                  landlordsList.slice(0, 6).map((l) => (
                    <div key={l.id} className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{l.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          l.is_kyc_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {l.is_kyc_verified ? 'Đã KYC' : 'Chờ duyệt KYC'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{l.address || 'Chưa cập nhật địa chỉ'}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-zinc-700/60">
                        <span>SĐT: {l.phone || 'N/A'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{l.code ? `Mã: ${l.code}` : ''}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Chưa có chủ nhà nào trong hệ thống.
                  </div>
                )}
              </div>

              <Button asChild className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2">
                <Link href="/admin/landlords">Quản Lý Tất Cả Chủ Nhà</Link>
              </Button>
            </div>

            {/* Quick Property Actions Widget */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-sky-400" /> Công Cụ Vận Hành Nguồn Hàng
              </h4>
              <p className="text-xs text-slate-300">
                Nhập phòng hàng loạt từ Google Sheet, cập nhật giá phòng nhanh hoặc đồng bộ dữ liệu ký gửi.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button asChild size="sm" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs">
                  <Link href="/admin/categories">Danh Mục Tiện Ích</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs">
                  <Link href="/admin/realhome/rooms">Danh Sách Phòng</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Room Detail Modal */}
      {selectedRoomModal && (
        <Dialog open={Boolean(selectedRoomModal)} onOpenChange={() => setSelectedRoomModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-blue-600" />
                <DialogTitle className="text-base font-extrabold">
                  Phòng {selectedRoomModal.room.code} • Tầng {selectedRoomModal.room.floor || 1}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                {selectedRoomModal.building?.name} ({selectedRoomModal.building?.area || 'Hà Nội'})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Status & Price Row */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700">
                <div>
                  <span className="text-slate-400 block text-[11px]">Trạng thái phòng</span>
                  <span className={`font-bold inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] ${
                    getRoomStatusCategory(selectedRoomModal.room, contractsList) === 'vacant'
                      ? 'bg-emerald-100 text-emerald-800'
                      : getRoomStatusCategory(selectedRoomModal.room, contractsList) === 'soon_vacant'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {getRoomStatusCategory(selectedRoomModal.room, contractsList) === 'vacant'
                      ? '🟢 Phòng trống'
                      : getRoomStatusCategory(selectedRoomModal.room, contractsList) === 'soon_vacant'
                      ? `🟡 Sắp trống ${extractSoonVacantDate(selectedRoomModal.room, contractsList) ? `(Dự kiến: ${extractSoonVacantDate(selectedRoomModal.room, contractsList)})` : ''}`
                      : '🔴 Đã cho thuê'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Giá niêm yết</span>
                  <span className="font-extrabold text-sm text-blue-600">
                    {selectedRoomModal.room.price ? Number(selectedRoomModal.room.price).toLocaleString('vi-VN') + ' đ/tháng' : '0 đ'}
                  </span>
                </div>
              </div>

              {/* Landlord Details Card */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  Thông Tin Chủ Nhà Sở Hữu
                </span>
                <div className="flex items-center justify-between text-indigo-950 dark:text-indigo-100 pt-1">
                  <span>Họ &amp; Tên: <strong>{selectedRoomModal.landlord?.name || 'Chủ nhà chưa gán'}</strong></span>
                  {selectedRoomModal.landlord?.is_kyc_verified && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                      ✓ Đã KYC
                    </span>
                  )}
                </div>
                <p className="text-indigo-800 dark:text-indigo-300">SĐT Liên hệ: <strong>{selectedRoomModal.landlord?.phone || 'N/A'}</strong></p>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400">Địa chỉ: {selectedRoomModal.landlord?.address || 'Chưa cập nhật'}</p>
              </div>

              {/* Room Specifications */}
              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                <div className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-lg">
                  <span className="text-slate-400 text-[10px] block">Loại phòng</span>
                  <span className="font-bold">{selectedRoomModal.room.room_type || 'Căn hộ chung cư'}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-lg">
                  <span className="text-slate-400 text-[10px] block">Diện tích</span>
                  <span className="font-bold">{selectedRoomModal.room.size ? `${selectedRoomModal.room.size} m²` : '—'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <Button asChild variant="outline" size="sm" className="text-xs font-semibold">
                <Link href="/admin/customers/appointments">Tạo Lịch Hẹn</Link>
              </Button>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                <Link href="/admin/realhome/rooms">Xem Chi Tiết Phòng</Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
