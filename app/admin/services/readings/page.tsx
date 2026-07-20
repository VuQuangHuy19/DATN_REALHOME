'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useBuildings } from '@/src/features/properties/hooks/useBuildings';;
import { supabase } from '@/lib/supabase/client';
import { getServiceReadings, getPreviousReading, saveServiceReading } from '@/src/features/rooms/services/service_readings';
import { getRentalContracts } from '@/src/features/finance/services/rental_contracts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const loadData = useCallback(async () => {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('Error loading service readings:', err);
      toast.error('Lỗi khi tải dữ liệu: ' + msg);
    } finally {
      setLoading(false);
    }
  }, [company?.id, selectedBuildingId, selectedPeriod, role, profile?.landlord_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Chỉ Số Dịch Vụ Định Kỳ</h1>
          <p className="text-ink-muted text-sm mt-0.5">Chốt chỉ số điện/nước tiêu thụ hàng tháng của các phòng đang thuê</p>
        </div>
        <Button onClick={handleSaveAll} disabled={loading || rows.filter(r => r.isRented).length === 0} className="bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold shadow-none">
          <Save className="h-4 w-4 mr-2" /> Lưu tất cả
        </Button>
      </div>

      {/* Bộ lọc */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-ink font-semibold text-xs uppercase tracking-wider"><Building2 className="h-4 w-4 text-ink-muted" /> Chọn tòa nhà</Label>
            {buildingsLoading ? (
              <div className="h-10 border border-border rounded-lg flex items-center px-3 text-ink-muted bg-bg-subtle/50 text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2 text-accent" /> Đang tải tòa nhà...</div>
            ) : (
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="" disabled>-- Chọn tòa nhà --</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-ink font-semibold text-xs uppercase tracking-wider"><Calendar className="h-4 w-4 text-ink-muted" /> Kỳ chốt (Tháng/Năm)</Label>
            <Input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-lg border-border focus-visible:ring-accent"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bảng ghi nhận chỉ số */}
      <Card className="border-border shadow-none rounded-lg bg-white overflow-hidden">
        <CardHeader className="bg-bg-subtle/20 border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-heading font-bold text-ink">Bảng nhập chỉ số</CardTitle>
              <CardDescription className="text-xs text-ink-muted mt-0.5">Ghi nhận chỉ số điện nước cho kỳ {selectedPeriod}</CardDescription>
            </div>
            <span className="text-[10px] bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Tự động lấy số cũ
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
                <thead className="bg-bg-subtle border-b border-border text-ink-muted font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Phòng</th>
                    <th className="px-6 py-3.5 text-left">Trạng thái / Khách thuê</th>
                    <th className="px-6 py-3.5 text-center bg-yellow-50/10">Điện cũ (Số)</th>
                    <th className="px-6 py-3.5 text-center bg-yellow-50/20">Điện mới (Số)</th>
                    <th className="px-6 py-3.5 text-center bg-blue-50/10">Nước cũ (Khối)</th>
                    <th className="px-6 py-3.5 text-center bg-blue-50/20">Nước mới (Khối)</th>
                    <th className="px-6 py-3.5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {rows.map((row, index) => (
                    <tr key={row.roomId} className={`hover:bg-bg-subtle/50 transition-colors ${!row.isRented ? 'opacity-55 bg-bg-subtle/30' : ''}`}>
                      <td className="px-6 py-4 font-bold text-ink text-sm">Phòng {row.roomCode}</td>
                      <td className="px-6 py-4">
                        {row.isRented ? (
                          <div className="space-y-1">
                            <Badge className="bg-green-50 text-green-700 border-green-250 border font-bold text-[9px] rounded-full uppercase tracking-wider" variant="outline">Đang thuê</Badge>
                            <p className="text-xs font-semibold text-ink mt-0.5">{row.tenantName}</p>
                          </div>
                        ) : (
                          <Badge className="bg-bg-subtle text-ink-muted border-border border font-bold text-[9px] rounded-full uppercase tracking-wider" variant="outline">Trống / Bảo trì</Badge>
                        )}
                      </td>
                      
                      {/* Điện cũ */}
                      <td className="px-4 py-4 bg-yellow-50/5 text-center">
                        <Input
                          type="number"
                          value={row.electricityOld}
                          onChange={(e) => handleRowChange(index, 'electricityOld', Number(e.target.value))}
                          disabled={!row.isRented || row.saving}
                          className="w-24 mx-auto text-center font-mono rounded-lg border-border focus-visible:ring-accent"
                        />
                      </td>

                      {/* Điện mới */}
                      <td className="px-4 py-4 bg-yellow-50/10 text-center">
                        <Input
                          type="number"
                          value={row.electricityNew}
                          onChange={(e) => handleRowChange(index, 'electricityNew', Number(e.target.value))}
                          disabled={!row.isRented || row.saving}
                          className="w-28 mx-auto text-center font-bold font-mono border-accent/40 focus-visible:ring-accent rounded-lg"
                        />
                      </td>

                      {/* Nước cũ */}
                      <td className="px-4 py-4 bg-blue-50/5 text-center">
                        <Input
                          type="number"
                          value={row.waterOld}
                          onChange={(e) => handleRowChange(index, 'waterOld', Number(e.target.value))}
                          disabled={!row.isRented || row.saving}
                          className="w-24 mx-auto text-center font-mono rounded-lg border-border focus-visible:ring-accent"
                        />
                      </td>

                      {/* Nước mới */}
                      <td className="px-4 py-4 bg-blue-50/10 text-center">
                        <Input
                          type="number"
                          value={row.waterNew}
                          onChange={(e) => handleRowChange(index, 'waterNew', Number(e.target.value))}
                          disabled={!row.isRented || row.saving}
                          className="w-28 mx-auto text-center font-bold font-mono border-accent/40 focus-visible:ring-accent rounded-lg"
                        />
                      </td>

                      {/* Nút lưu */}
                      <td className="px-6 py-4 text-right">
                        {row.isRented ? (
                          <Button
                            size="sm"
                            onClick={() => handleSaveRow(index)}
                            disabled={row.saving}
                            className="bg-bg-subtle text-ink hover:bg-accent hover:text-white rounded-lg border border-border transition-colors h-9 w-9 p-0 flex items-center justify-center mx-auto"
                            variant="ghost"
                          >
                            {row.saving ? (
                              <Loader2 className="h-4 w-4 animate-spin text-accent" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <span className="text-ink-muted text-xs block text-center">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-ink-muted bg-white">
                        <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-35" />
                        Tòa nhà này hiện không có phòng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border bg-white">
                {rows.map((row, index) => (
                  <div key={row.roomId} className={`p-4 space-y-3.5 ${!row.isRented ? 'bg-bg-subtle/20' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink text-sm">Phòng {row.roomCode}</span>
                      {row.isRented ? (
                        <div className="flex flex-col items-end">
                          <Badge className="bg-green-50 text-green-700 border-green-250 border font-bold text-[9px] rounded-full uppercase tracking-wider" variant="outline">Đang thuê</Badge>
                        </div>
                      ) : (
                        <Badge className="bg-bg-subtle text-ink-muted border-border border font-bold text-[9px] rounded-full uppercase tracking-wider" variant="outline">Trống / Bảo trì</Badge>
                      )}
                    </div>

                    {row.isRented ? (
                      <>
                        <p className="text-xs font-semibold text-ink-muted">Khách thuê: <span className="text-ink font-bold">{row.tenantName}</span></p>
                        
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1 bg-yellow-50/5 p-2 rounded-lg border border-yellow-250/20">
                            <Label className="text-[10px] font-bold text-ink-muted uppercase">Điện cũ (Số)</Label>
                            <Input
                              type="number"
                              value={row.electricityOld}
                              onChange={(e) => handleRowChange(index, 'electricityOld', Number(e.target.value))}
                              disabled={row.saving}
                              className="text-center font-mono rounded-lg border-border focus-visible:ring-accent h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1 bg-yellow-50/10 p-2 rounded-lg border border-yellow-250/40">
                            <Label className="text-[10px] font-bold text-ink-muted uppercase">Điện mới (Số)</Label>
                            <Input
                              type="number"
                              value={row.electricityNew}
                              onChange={(e) => handleRowChange(index, 'electricityNew', Number(e.target.value))}
                              disabled={row.saving}
                              className="text-center font-bold font-mono border-accent/40 focus-visible:ring-accent rounded-lg h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1 bg-blue-50/5 p-2 rounded-lg border border-blue-250/20">
                            <Label className="text-[10px] font-bold text-ink-muted uppercase">Nước cũ (Khối)</Label>
                            <Input
                              type="number"
                              value={row.waterOld}
                              onChange={(e) => handleRowChange(index, 'waterOld', Number(e.target.value))}
                              disabled={row.saving}
                              className="text-center font-mono rounded-lg border-border focus-visible:ring-accent h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1 bg-blue-50/10 p-2 rounded-lg border border-blue-250/40">
                            <Label className="text-[10px] font-bold text-ink-muted uppercase">Nước mới (Khối)</Label>
                            <Input
                              type="number"
                              value={row.waterNew}
                              onChange={(e) => handleRowChange(index, 'waterNew', Number(e.target.value))}
                              disabled={row.saving}
                              className="text-center font-bold font-mono border-accent/40 focus-visible:ring-accent rounded-lg h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveRow(index)}
                            disabled={row.saving}
                            className="w-full bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold h-8 text-xs"
                          >
                            {row.saving ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                            ) : (
                              <Save className="h-3 w-3 mr-1.5" />
                            )}
                            Lưu chỉ số phòng {row.roomCode}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-ink-muted italic py-1">Phòng trống — không cần ghi nhận chỉ số dịch vụ.</p>
                    )}
                  </div>
                ))}
                {rows.length === 0 && (
                  <div className="text-center py-10 text-ink-muted bg-white">
                    <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-35" />
                    Tòa nhà này hiện không có phòng nào.
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
