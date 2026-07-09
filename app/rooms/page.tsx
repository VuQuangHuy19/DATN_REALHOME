'use client';

import { useState, useEffect } from 'react';
import Pagination from '@/components/Pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DoorOpen, Loader2, AlertCircle } from 'lucide-react';

interface Room {
  id: string;
  code: string;
  price: number;
  status: 'available' | 'rented' | 'maintenance' | 'reserved';
  size: number | null;
  room_type: string | null;
  floor: number;
}

interface Meta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

const statusLabels: Record<string, string> = {
  available: 'Còn trống',
  rented: 'Đã thuê',
  maintenance: 'Bảo trì',
  reserved: 'Đang giữ',
};

const statusColor = (status: string) => {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-700 hover:bg-green-100';
    case 'rented': return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
    case 'maintenance': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
    case 'reserved': return 'bg-purple-100 text-purple-700 hover:bg-purple-100';
    default: return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
  }
};

export default function RoomsListPage() {
  const [page, setPage] = useState<number>(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [meta, setMeta] = useState<Meta>({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 5,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(`/api/rooms?page=${page}&limit=5`)
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải danh sách phòng');
        return res.json();
      })
      .then((resData) => {
        if (active) {
          setRooms(resData.data);
          setMeta(resData.meta);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [page]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <DoorOpen className="h-6 w-6 text-indigo-600" />
          Danh sách Phòng
        </h1>
        <p className="text-slate-500">Xem danh sách toàn bộ phòng trong hệ thống (Server-side Pagination)</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Đang tải danh sách phòng...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Mã phòng</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Loại phòng</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Diện tích</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Tầng</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Giá thuê</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-700">{room.code}</td>
                        <td className="px-4 py-3 text-slate-600">{room.room_type || 'Tiêu chuẩn'}</td>
                        <td className="px-4 py-3 text-slate-600">{room.size ? `${room.size} m²` : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">Tầng {room.floor}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {Number(room.price).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusColor(room.status)}>
                            {statusLabels[room.status] || room.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {rooms.length === 0 && (
                  <div className="text-center py-10 text-slate-400">
                    <DoorOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Không tìm thấy phòng nào trong hệ thống</p>
                  </div>
                )}
              </div>

              {/* Component phân trang */}
              <Pagination
                currentPage={meta.currentPage}
                totalPages={meta.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
