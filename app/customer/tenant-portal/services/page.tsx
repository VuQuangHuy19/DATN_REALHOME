'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles, CheckCircle2, Plus, X, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth/AuthContext';

interface Service {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  description: string;
  icon: string;
  registered: boolean;
  features: string[];
}

// Icon mapping theo tên dịch vụ
function getServiceIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('dọn') || n.includes('vệ sinh')) return '🧹';
  if (n.includes('internet') || n.includes('wifi') || n.includes('mạng')) return '📶';
  if (n.includes('bảo vệ') || n.includes('an ninh')) return '🛡️';
  if (n.includes('giặt') || n.includes('ủi')) return '👔';
  if (n.includes('nước uống') || n.includes('bình nước')) return '💧';
  if (n.includes('gym') || n.includes('fitness') || n.includes('thể dục')) return '💪';
  if (n.includes('điện') || n.includes('electric')) return '⚡';
  if (n.includes('gửi xe') || n.includes('bãi xe') || n.includes('parking')) return '🚗';
  if (n.includes('hồ bơi') || n.includes('bể bơi')) return '🏊';
  if (n.includes('thang máy') || n.includes('elevator')) return '🛗';
  return '✨';
}

export default function ServicesPage() {
  const { user, profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  // Load services from DB based on user's room/building
  useEffect(() => {
    if (!user) return;

    async function fetchServices() {
      setLoading(true);
      try {
        // Gọi server API (chạy với quyền admin, vượt qua RLS)
        const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
        const res = await fetch('/api/customer/tenant-portal/services', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const apiData = await res.json();
        const svcData: any[] = apiData.services || [];

        if (svcData.length > 0) {
          setServices(
            svcData.map((s: any) => ({
              id: s.id,
              name: s.service_name,
              price: `${Number(s.price).toLocaleString('vi-VN')}đ/${s.unit || 'lần'}`,
              priceNum: Number(s.price),
              description: s.description || `Dịch vụ ${s.service_name} do tòa nhà cung cấp.`,
              icon: getServiceIcon(s.service_name),
              registered: false,
              features: [],
            }))
          );
        } else {
          setServices([]);
        }
      } catch (err) {
        console.error('Error fetching services:', err);
        setServices([]);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, [user, profile]);

  const totalRegistered = services.filter((s) => s.registered).length;
  const totalCost = services.filter((s) => s.registered).reduce((sum, s) => sum + s.priceNum, 0);

  const toggleService = async (id: string) => {
    const service = services.find((s) => s.id === id);
    if (!service) return;

    setSubscribing(id);

    // Optimistic update
    setServices((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, registered: !s.registered } : s
      )
    );

    try {
      // In real implementation, this would insert/delete from tenant_service_subscriptions table
      await new Promise((r) => setTimeout(r, 400));
      toast.success(
        service.registered ? `Đã hủy đăng ký ${service.name}` : `Đã đăng ký ${service.name}! BQL sẽ xác nhận trong 24h.`
      );
    } catch (err) {
      // Rollback
      setServices((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, registered: service.registered } : s
        )
      );
      toast.error('Không thể thực hiện. Vui lòng thử lại!');
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink font-heading flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-amber-600" />
          Dịch vụ bổ sung
        </h1>
        <p className="text-sm text-ink-muted mt-1">Đăng ký các dịch vụ tiện ích nâng cao trải nghiệm sống</p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-14 gap-2 text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
          <span className="text-sm font-medium">Đang tải danh sách dịch vụ...</span>
        </div>
      )}

      {/* Summary */}
      {!loading && services.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-100/90 dark:bg-amber-950/60 border-2 border-amber-400/80 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-amber-500/25 border border-amber-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-amber-800 dark:text-amber-200" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-amber-950 dark:text-amber-100">
              {totalRegistered > 0 ? (
                <>Đang sử dụng <span className="text-lg font-mono text-amber-900 dark:text-amber-200">{totalRegistered}</span> dịch vụ</>
              ) : (
                <>Tòa nhà cung cấp <span className="text-lg font-mono text-amber-900 dark:text-amber-200">{services.length}</span> dịch vụ</>
              )}
            </p>
            {totalRegistered > 0 && (
              <p className="text-xs font-semibold text-amber-900/90 dark:text-amber-200">
                Tổng phí: <span className="font-extrabold font-mono text-amber-950 dark:text-white">{totalCost.toLocaleString('vi-VN')}đ</span>/tháng
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && services.length === 0 && (
        <Card className="border border-dashed border-border-subtle">
          <CardContent className="py-14 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-amber-400" />
            </div>
            <p className="text-sm font-bold text-ink">Chưa có dịch vụ nào</p>
            <p className="text-xs text-ink-muted max-w-[280px]">Tòa nhà của bạn chưa có dịch vụ bổ sung nào được cấu hình. Vui lòng liên hệ Ban Quản Lý để biết thêm chi tiết.</p>
          </CardContent>
        </Card>
      )}

      {/* Grid Dịch vụ */}
      {!loading && services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id} className={`border transition-all duration-200 hover:shadow-md ${service.registered ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-border-subtle hover:border-amber-400'
              }`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{service.icon}</span>
                    <div>
                      <h3 className="text-sm font-bold text-ink font-heading">{service.name}</h3>
                      <p className="text-sm font-extrabold text-amber-900 dark:text-amber-300 font-mono mt-0.5">{service.price}</p>
                    </div>
                  </div>
                  {service.registered && (
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-400 text-[10px] font-extrabold border flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-0.5 text-emerald-700" />
                      Đã ĐK
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-1 space-y-3">
                <p className="text-xs text-ink-muted leading-relaxed">{service.description}</p>

                {service.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {service.features.map((f) => (
                      <Badge key={f} variant="outline" className="text-[10px] text-ink-muted font-medium">{f}</Badge>
                    ))}
                  </div>
                )}

                {/* Action Button */}
                <Button
                  size="sm"
                  className={`w-full rounded-xl font-extrabold text-xs shadow-sm ${service.registered
                      ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  variant={service.registered ? 'outline' : 'default'}
                  onClick={() => toggleService(service.id)}
                  disabled={subscribing === service.id}
                >
                  {subscribing === service.id ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Đang xử lý...</>
                  ) : service.registered ? (
                    <><X className="h-3.5 w-3.5 mr-1" /> Hủy đăng ký</>
                  ) : (
                    <><Plus className="h-3.5 w-3.5 mr-1" /> Đăng ký ngay</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
