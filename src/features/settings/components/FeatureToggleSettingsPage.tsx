'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Receipt, TrendingUp, MessageSquare, Bot, Lock, RotateCcw, AlertCircle, CheckCircle2, Sparkles, Wrench } from 'lucide-react';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';

export function FeatureToggleSettingsPage() {
  const { role } = useAuth();
  const { toggles, updateToggle, resetToDefaults } = useFeatureToggles();
  const isLandlord = role === 'landlord';

  const handleToggle = (key: any, val: boolean, label: string) => {
    updateToggle(key, val);
    toast.success(`Đã ${val ? 'bật' : 'tắt'} module: ${label}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 text-xs font-bold text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
            <span>Tùy Chỉnh Phân Hệ & Bảo Mật Quyền Riêng Tư</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Cấu Hình Module & Privacy Shield
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            {isLandlord
              ? 'Bảo vệ thông tin tài chính riêng tư của Chủ nhà. Chủ động bật/tắt các phân hệ ủy thác vận hành theo nhu cầu.'
              : 'Quản lý tính năng hệ thống, bật/tắt tự động hóa Zalo ZNS và Trợ lý AI Copilot.'}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            resetToDefaults();
            toast.info('Đã khôi phục cài đặt mặc định.');
          }}
          className="text-xs font-semibold gap-1.5 self-start md:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          Mặc định ban đầu
        </Button>
      </div>

      {/* PRIVACY SHIELD NOTICE */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-bold text-sm">🛡️ Nguyên tắc Bảo mật Tài chính Chủ nhà (Privacy Shield)</p>
          <p className="leading-relaxed opacity-90">
            **Hóa đơn hàng tháng** và **Báo cáo Lợi nhuận P&L** mặc định **TẮT & ẨN HOÀN TOÀN**. Bạn chỉ bật khi có nhu cầu sử dụng ủy thác!
          </p>
        </div>
      </div>

      {/* MODULE TOGGLE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FINANCIAL PRIVACY GROUP */}
        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Tài Chính & Hóa Đơn
            </CardTitle>
            <CardDescription className="text-xs">
              Quản lý việc tính tiền điện nước, thu tiền nhà & báo cáo doanh thu ròng.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Quản lý Hóa đơn & Thu tiền phòng</span>
                  {!toggles.enableInvoices && (
                    <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300">
                      Ẩn khỏi Sàn
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tự động tính chỉ số điện nước & lập hóa đơn thu tiền nhà hàng tháng.
                </p>
              </div>
              <Switch
                checked={toggles.enableInvoices}
                onCheckedChange={(v) => handleToggle('enableInvoices', v, 'Quản lý Hóa đơn')}
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Báo cáo Lợi nhuận ròng & Net Profit</span>
                  <Lock className="h-3 w-3 text-amber-500" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Thống kê P&L tài chính riêng tư. Ẩn hoàn toàn với nhân viên Sàn.
                </p>
              </div>
              <Switch
                checked={toggles.enableProfitReport}
                onCheckedChange={(v) => handleToggle('enableProfitReport', v, 'Báo cáo Lợi nhuận')}
              />
            </div>
          </CardContent>
        </Card>

        {/* AUTOMATION & ZALO GROUP */}
        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Tự Động Nhắn Zalo ZNS & SMS
            </CardTitle>
            <CardDescription className="text-xs">
              Gửi tin nhắn tự động nhắc hóa đơn, báo xuất phát & gia hạn hợp đồng.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Gửi Zalo ZNS Hóa đơn ngày 25</span>
                  <Badge className="bg-blue-600 text-white text-[10px]">Tự động</Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gửi Zalo kèm mã VietQR động tự động vào ngày 25 hàng tháng.
                </p>
              </div>
              <Switch
                checked={toggles.enableZaloZns}
                onCheckedChange={(v) => handleToggle('enableZaloZns', v, 'Tự động Nhắn Zalo ZNS')}
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Báo Zalo khi Sale xuất phát</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nhắn Zalo ngay cho Chủ nhà khi Sale bấm xuất phát dẫn khách.
                </p>
              </div>
              <Switch
                checked={toggles.enableZaloZns}
                onCheckedChange={(v) => handleToggle('enableZaloZns', v, 'Thông báo Zalo Dẫn khách')}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI SMART ASSISTANT GROUP */}
        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 md:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Bot className="h-5 w-5 text-purple-600" />
              Trợ Lý Trí Tuệ Nhân Tạo (RealHome AI Copilot)
            </CardTitle>
            <CardDescription className="text-xs">
              AI tra cứu phòng trống tự động cho Admin/Chủ nhà & Bot trả lời Wifi, quy định cho cư dân.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>Trợ Lý AI Chatbot (Admin & Cư dân)</span>
                  <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50 text-[10px]">
                    <Sparkles className="h-3 w-3 mr-1 text-purple-600" /> AI Powered
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl">
                  Chat tra cứu dữ liệu phòng trống theo khu vực/ngân sách, tự động trả lời thắc mắc cư dân về Wifi, quy định và tiếp nhận Ticket báo sự cố hỏng hóc.
                </p>
              </div>
              <Switch
                checked={toggles.enableAiCopilot}
                onCheckedChange={(v) => handleToggle('enableAiCopilot', v, 'Trợ lý AI Copilot')}
              />
            </div>
          </CardContent>
        </Card>

        {/* MAINTENANCE MODULE GROUP */}
        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 md:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Wrench className="h-5 w-5 text-amber-600" />
              Bảo Trì &amp; Báo Hỏng Sự Cố
            </CardTitle>
            <CardDescription className="text-xs">
              Tiếp nhận báo hỏng hóc thiết bị từ cư dân &amp; phân công kỹ thuật viên.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Quản lý Bảo trì &amp; Sự cố</span>
                  {!toggles.enableMaintenance && (
                    <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300">
                      Ẩn khỏi Sidebar
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hiển thị menu &quot;Bảo trì &amp; Sự cố&quot; trên thanh điều hướng Sidebar khi bạn có nhu cầu vận hành.
                </p>
              </div>
              <Switch
                checked={toggles.enableMaintenance}
                onCheckedChange={(v) => handleToggle('enableMaintenance', v, 'Quản lý Bảo trì & Sự cố')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
