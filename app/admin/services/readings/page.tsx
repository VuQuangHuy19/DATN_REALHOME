'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useBuildings } from '@/lib/hooks/useEntities';
import { supabase } from '@/lib/supabase/client';
import { getServiceReadings, getPreviousReading, saveServiceReading } from '@/src/features/rooms/services/service_readings';
import { getRentalContracts } from '@/src/features/finance/services/rental_contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save, Sparkles, Building2, Calendar, ClipboardCheck } from 'lucide-react';

interface RoomReadingRow {
  roomId: string;
  roomCode: string;
  tenantName: string;
  isRented: boolean;
  electricityOld: number;
  electricityNew: number;
  waterOld: number;
  waterNew: number;
  readingId?: string;
  saving?: boolean;
}

export default function ServiceReadingsPage() {
  const { company, role, profile } = useAuth();
  const { items: buildings, loading: buildingsLoading } = useBuildings(company?.id);
  
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [rows, setRows] = useState<RoomReadingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (buildings.length > 0 && !selectedBuildingId) {
      setSelectedBuildingId(buildings[0].id);
    }
  }, [buildings, selectedBuildingId]);

  const loadData = async () => {
    if (!company?.id || !selectedBuildingId || !selectedPeriod) return;
    setLoading(true);
    try {
      const landlordId = role === 'landlord' ? (profile?.landlord_id || undefined) : undefined;

      // 1. Lấy danh sách phòng của toà nhà
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('building_id', selectedBuildingId)
        .order('floor', { ascending: true })
        .order('code', { ascending: true });

      if (roomsError) throw roomsError;

      // 2. Lấy danh sách hợp đồng thuê đang active để map tên khách hàng
      const activeContracts = await getRentalContracts(company.id, landlordId);

      // 3. Lấy chỉ số dịch vụ đã ghi nhận cho kỳ này
      const currentReadings = await getServiceReadings(company.id, selectedPeriod, landlordId);

      const computedRows: RoomReadingRow[] = [];

      for (const room of rooms ?? []) {
        const contract = activeContracts.find(
          (c) => c.room_id === room.id && c.status === 'active'
        );
        const currentReading = currentReadings.find((cr) => cr.room_id === room.id);

        let elecOld = 0;
        let waterOld = 0;

        if (currentReading) {
          elecOld = Number(currentReading.electricity_old);
          waterOld = Number(currentReading.water_old);
        } else {
          // Lấy chỉ số cũ gần nhất từ cơ sở dữ liệu
          const prevReading = await getPreviousReading(room.id, selectedPeriod);
          if (prevReading) {
            elecOld = Number(prevReading.electricity_new);
            waterOld = Number(prevReading.water_new);
          }
        }

        computedRows.push({
          roomId: room.id,
          roomCode: room.code,
          tenantName: contract ? contract.party_b_name : '',
          isRented: !!contract,
          electricityOld: elecOld,
          electricityNew: currentReading ? Number(currentReading.electricity_new) : elecOld,
          waterOld: waterOld,
          waterNew: currentReading ? Number(currentReading.water_new) : waterOld,
          readingId: currentReading?.id,
        });
      }

      setRows(computedRows);
    } catch (err: any) {
      console.error('Error loading service readings:', err);
      toast.error('Lỗi khi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBuildingId, selectedPeriod, company?.id]);

  const handleRowChange = (index: number, field: 'electricityNew' | 'waterNew' | 'electricityOld' | 'waterOld', value: number) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveRow = async (index: number) => {
    if (!company?.id) return;
    const row = rows[index];
    
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], saving: true };
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
      // Reload to ensure state remains synced with IDs from DB
      loadData();
    } catch (err: any) {
      toast.error(`Lỗi khi lưu chỉ số phòng ${row.roomCode}: ${err.message}`);
      setRows((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], saving: false };
        return copy;
      });
    }
  };

  const handleSaveAll = async () => {
    if (!company?.id || rows.length === 0) return;
    
    let successCount = 0;
    toast.loading('Đang lưu tất cả chỉ số...', { id: 'save-all-toast' });
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.isRented) continue; // Chỉ lưu phòng đang thuê

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
    toast.success(`Đã lưu thành công ${successCount}/${rows.filter(r => r.isRented).length} phòng đang thuê.`);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chỉ Số Dịch Vụ Định Kỳ</h1>
          <p className="text-slate-500">Chốt chỉ số điện/nước tiêu thụ hàng tháng của các phòng đang thuê</p>
        </div>
        <Button onClick={handleSaveAll} disabled={loading || rows.filter(r => r.isRented).length === 0} className="bg-indigo-650 hover:bg-indigo-700 text-white shadow-sm">
          <Save className="h-4 w-4 mr-2" /> Lưu tất cả
        </Button>
      </div>

      {/* Bộ lọc */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-slate-400" /> Chọn tòa nhà</Label>
            {buildingsLoading ? (
              <div className="h-10 border rounded flex items-center px-3 text-slate-400"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải tòa nhà...</div>
            ) : (
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>-- Chọn tòa nhà --</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" /> Kỳ chốt (Tháng/Năm)</Label>
            <Input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bảng ghi nhận chỉ số */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-800">Bảng nhập chỉ số</CardTitle>
              <CardDescription>Ghi nhận chỉ số điện nước cho kỳ {selectedPeriod}</CardDescription>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Tự động lấy số cũ
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/75 border-b text-slate-700 font-medium">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Phòng</th>
                    <th className="px-6 py-3.5 text-left">Trạng thái / Khách thuê</th>
                    <th className="px-6 py-3.5 text-center bg-yellow-50/30">Điện cũ (Số)</th>
                    <th className="px-6 py-3.5 text-center bg-yellow-50/30">Điện mới (Số)</th>
                    <th className="px-6 py-3.5 text-center bg-blue-50/30">Nước cũ (Khối/Số)</th>
                    <th className="px-6 py-3.5 text-center bg-blue-50/30">Nước mới (Khối/Số)</th>
                    <th className="px-6 py-3.5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {rows.map((row, index) => (
                    <tr key={row.roomId} className={`hover:bg-slate-50/50 transition-colors ${!row.isRented ? 'opacity-60 bg-slate-50/30' : ''}`}>
                      <td className="px-6 py-4 font-semibold text-slate-900">Phòng {row.roomCode}</td>
                      <td className="px-6 py-4">
                        {row.isRented ? (
                          <div className="space-y-0.5">
                            <span className="text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full border border-green-200">Đang thuê</span>
                            <p className="text-sm font-medium text-slate-800 mt-1">{row.tenantName}</p>
                          </div>
                        ) : (
                          <span className="text-xs bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full border">Trống / Bảo trì</span>
                        )}
                      </td>
                      
                      {/* Điện cũ */}
                      <td className="px-4 py-4 bg-yellow-50/10">
                        <Input
                          type="number"
                          value={row.electricityOld}
                          onChange={(e) => handleRowChange(index, 'electricityOld', Number(e.target.value))}
                          disabled={!row.isRented || row.saving}
                          className="w-24 mx-auto text-center font-mono"
                        />
                      </td>

                      {/* Điện mới */}
                      <td className="px-4 py-4 bg-yellow-50/15">
                        <Input
                          type="number"
                          value={row.electricityNew}
                          onChange={(e) => handleRowChange(index, 'electricityNew', Number(e.target.value))}
                          disabled={!row.isRented || row.saving}
                          className="w-28 mx-auto text-center font-semibold font-mono border-indigo-200"
                        />
                      </td>

                      {/* Nước cũ */}
                      <td className="px-4 py-4 bg-blue-50/10">
                        <Input
                          type="number"
                          value={row.waterOld}
                          onChange={(e) => handleRowChange(index, 'waterOld', Number(e.target.value))}
                          disabled={!row.isRented || row.saving}
                          className="w-24 mx-auto text-center font-mono"
                        />
                      </td>

                      {/* Nước mới */}
                      <td className="px-4 py-4 bg-blue-50/15">
                        <Input
                          type="number"
                          value={row.waterNew}
                          onChange={(e) => handleRowChange(index, 'waterNew', Number(e.target.value))}
                          disabled={!row.isRented || row.saving}
                          className="w-28 mx-auto text-center font-semibold font-mono border-indigo-200"
                        />
                      </td>

                      {/* Nút lưu */}
                      <td className="px-6 py-4 text-right">
                        {row.isRented ? (
                          <Button
                            size="sm"
                            onClick={() => handleSaveRow(index)}
                            disabled={row.saving}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
                          >
                            {row.saving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400 bg-white">
                        <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-35" />
                        Tòa nhà này hiện không có phòng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
