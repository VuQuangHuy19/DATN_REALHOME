'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ShieldCheck, DollarSign, MessageSquare, Wrench, RefreshCw, Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function LandlordSettingsPage() {
  const [useInvoices, setUseInvoices] = useState<boolean>(true);
  const [zaloInvoices, setZaloInvoices] = useState<boolean>(true);
  const [zaloSaleAppointments, setZaloSaleAppointments] = useState<boolean>(true);
  const [useMaintenance, setUseMaintenance] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const inv = localStorage.getItem('landlord_settings_use_invoices');
      if (inv !== null) setUseInvoices(JSON.parse(inv));
      const main = localStorage.getItem('landlord_settings_use_maintenance');
      if (main !== null) setUseMaintenance(JSON.parse(main));
    }
  }, []);

  const notifyChange = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('landlord_settings_changed'));
    }
  };

  const handleToggleInvoices = (val: boolean) => {
    setUseInvoices(val);
    localStorage.setItem('landlord_settings_use_invoices', JSON.stringify(val));
    notifyChange();
    toast.success(
      `Đã ${val ? 'BẬT' : 'TẮT'} Quản lý Hóa đơn! (${val ? 'Hiển thị trên Sidebar' : 'Đã ẩn khỏi Sidebar'})`
    );
  };

  const handleToggleMaintenance = (val: boolean) => {
    setUseMaintenance(val);
    localStorage.setItem('landlord_settings_use_maintenance', JSON.stringify(val));
    notifyChange();
    toast.success(
      `Đã ${val ? 'BẬT' : 'TẮT'} Quản lý Bảo trì & Sự cố! (${val ? 'Hiển thị trên Sidebar' : 'Đã ẩn khỏi Sidebar'})`
    );
  };

  const handleReset = () => {
    setUseInvoices(true);
    setZaloInvoices(true);
    setZaloSaleAppointments(true);
    setUseMaintenance(false);
    localStorage.setItem('landlord_settings_use_invoices', JSON.stringify(true));
    localStorage.setItem('landlord_settings_use_maintenance', JSON.stringify(false));
    notifyChange();
    toast.success('Đã khôi phục cài đặt bảo mật mặc định ban đầu!');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
      {/* Top Banner Header Card */}
      <Card className="border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-xs w-fit flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Dành Cho Tài Khoản Chủ Nhà
            </Badge>
            <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">
              Cấu Hình Phân Hệ &amp; Bảo Mật Quyền Riêng Tư
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              Tùy chỉnh các module vận hành dành riêng cho Chủ nhà. Bạn có toàn quyền bật hoặc ẩn các tính năng tài chính, doanh thu đối với Sàn môi giới.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleReset}
            className="rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 font-semibold h-9 px-4 text-xs shrink-0 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Mặc định ban đầu</span>
          </Button>
        </div>
      </Card>

      {/* Privacy Shield Info Alert */}
      <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/80 p-3.5 sm:p-4 rounded-2xl flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-2xs">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            Quyền Riêng Tư Dữ Liệu Tài Chính Chủ Nhà (Landlord Privacy Shield)
          </h4>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
            RealHome tôn trọng quyền bảo mật tài chính của Chủ nhà. Mọi báo cáo tài chính ròng &amp; hóa đơn cá nhân được mã hóa độc lập.
          </p>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Tài chính & Hóa đơn */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold font-heading text-slate-900 dark:text-white text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Tài Chính &amp; Hóa Đơn
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Quản lý việc tính tiền điện nước, thu tiền nhà &amp; báo cáo doanh thu ròng.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      Sử dụng Quản lý Hóa đơn &amp; Thu tiền phòng
                    </span>
                    {useInvoices ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold px-2 py-0.2 rounded-md">
                        Đã hiển thị trên Sidebar
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-semibold px-2 py-0.2 rounded-md">
                        Đã ẩn khỏi Sidebar
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tự động tính chỉ số điện nước &amp; lập hóa đơn thu tiền phòng hàng tháng. Bật/Tắt sẽ hiện/ẩn mục &quot;Hóa đơn &amp; Dịch vụ&quot; trên Sidebar.
                  </p>
                </div>
                <Switch
                  checked={useInvoices}
                  onCheckedChange={handleToggleInvoices}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Tự Động Nhắn Zalo ZNS & SMS */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold font-heading text-slate-900 dark:text-white text-base flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Tự Động Nhắn Zalo ZNS &amp; SMS
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gửi tin nhắn tự động nhắc hóa đơn, báo xuất phát &amp; gia hạn hợp đồng.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      Gửi Zalo ZNS Hóa đơn ngày 25
                    </span>
                    <Badge className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.2 rounded-md">
                      Tự động
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Gửi Zalo kèm mã VietQR tự động vào ngày 25 hàng tháng.
                  </p>
                </div>
                <Switch
                  checked={zaloInvoices}
                  onCheckedChange={(v) => {
                    setZaloInvoices(v);
                    toast.success(`Đã ${v ? 'BẬT' : 'TẮT'} Gửi Zalo Hóa đơn!`);
                  }}
                  className="mt-1"
                />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    Báo Zalo khi Sale xuất phát dẫn khách
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Nhận Zalo ngay cho Chủ nhà khi Sale bấm xuất phát dẫn khách.
                  </p>
                </div>
                <Switch
                  checked={zaloSaleAppointments}
                  onCheckedChange={(v) => {
                    setZaloSaleAppointments(v);
                    toast.success(`Đã ${v ? 'BẬT' : 'TẮT'} Thông báo Zalo Sale dẫn khách!`);
                  }}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Vận Hành Bảo Trì & Tiếp Nhận Sự Cố */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col justify-between md:col-span-2">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold font-heading text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Vận Hành Bảo Trì &amp; Tiếp Nhận Sự Cố
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Theo dõi báo hỏng hóc từ cư dân, phân công thợ sửa chữa &amp; cập nhật tiến độ công việc.
              </p>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Sử dụng Quản lý Bảo trì &amp; Sự cố
                  </span>
                  {useMaintenance ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold px-2 py-0.2 rounded-md">
                      Đã hiển thị trên Sidebar
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-300 font-semibold px-2 py-0.2 rounded-md">
                      Đã ẩn khỏi Sidebar
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Hiển thị phân hệ &quot;Bảo trì &amp; Sự cố&quot; trên thanh điều hướng Sidebar khi bạn có nhu cầu tiếp nhận ticket hỏng hóc từ cư dân.
                </p>
              </div>
              <Switch
                checked={useMaintenance}
                onCheckedChange={handleToggleMaintenance}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
