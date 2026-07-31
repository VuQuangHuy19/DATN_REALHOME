'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Star,
  Zap,
  Droplets,
  Wind,
  Home,
  HelpCircle,
  Calendar,
  ChevronRight,
  UserCheck,
  Phone
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface MaintenanceRequest {
  id: string;
  category: 'electrical' | 'plumbing' | 'ac' | 'furniture' | 'other';
  title: string;
  description: string;
  preferredSlot: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  images: string[];
  assignedTechnician?: { name: string; phone: string };
  rating?: number;
}

const CATEGORY_CONFIG = {
  electrical: { label: 'Hệ thống Điện', icon: Zap, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  plumbing: { label: 'Hệ thống Nước', icon: Droplets, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  ac: { label: 'Điều hòa / Tủ lạnh', icon: Wind, color: 'text-cyan-500 bg-cyan-50 border-cyan-200' },
  furniture: { label: 'Nội thất / Thiết bị', icon: Home, color: 'text-purple-500 bg-purple-50 border-purple-200' },
  other: { label: 'Khác', icon: HelpCircle, color: 'text-slate-500 bg-slate-50 border-slate-200' },
};

const INITIAL_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'REQ-101',
    category: 'ac',
    title: 'Điều hòa phòng ngủ không lạnh',
    description: 'Điều hòa chạy nhưng phát ra tiếng kêu nhỏ và chỉ ra gió thường, không mát.',
    preferredSlot: 'Chiều (14:00 - 17:00)',
    status: 'in_progress',
    createdAt: '2026-07-24 10:30',
    images: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop'],
    assignedTechnician: { name: 'Chú Tuấn (Thợ điện lạnh)', phone: '0988 123 456' },
  },
  {
    id: 'REQ-100',
    category: 'plumbing',
    title: 'Rò rỉ nước vòi hoa sen phòng tắm',
    description: 'Vòi rỉ nước liên tục gây thất thoát nước.',
    preferredSlot: 'Sáng (08:30 - 11:30)',
    status: 'completed',
    createdAt: '2026-07-20 15:15',
    images: [],
    assignedTechnician: { name: 'Anh Nam (Kỹ thuật tòa nhà)', phone: '0912 345 678' },
    rating: 5,
  },
];

export default function TenantMaintenancePage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>(INITIAL_REQUESTS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [category, setCategory] = useState<MaintenanceRequest['category']>('electrical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('Sáng (08:30 - 11:30)');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleMockUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setUploadedImages((prev) => [
        ...prev,
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop',
      ]);
      setIsUploading(false);
      toast.success('Đã tải ảnh đính kèm thành công');
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Vui lòng điền đầy đủ tiêu đề và mô tả sự cố.');
      return;
    }

    const newReq: MaintenanceRequest = {
      id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
      category,
      title,
      description,
      preferredSlot,
      status: 'pending',
      createdAt: new Date().toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      images: uploadedImages,
    };

    setRequests([newReq, ...requests]);
    toast.success('Đã gửi yêu cầu bảo trì thành công! Quản lý sẽ liên hệ hẹn giờ xử lý.');
    setIsDialogOpen(false);
    // Reset form
    setTitle('');
    setDescription('');
    setUploadedImages([]);
  };

  const handleRate = (reqId: string, stars: number) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, rating: stars } : r))
    );
    toast.success(`Cảm ơn bạn đã đánh giá ${stars} sao cho dịch vụ sửa chữa!`);
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 md:p-8 text-white border border-amber-500/30 shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-400/30">
              <Wrench className="h-3.5 w-3.5 text-amber-400" /> Dịch vụ hỗ trợ sự cố 24/7
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight">
              Yêu Cầu Bảo Trì &amp; Sửa Chữa
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Gửi phản ánh thiết bị hỏng hóc hoặc sự cố trong phòng. Đội ngũ kỹ thuật tòa nhà sẽ có mặt theo khung giờ bạn đặt hẹn.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0">
                <Plus className="h-5 w-5" />
                Tạo yêu cầu mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl bg-white border border-border-subtle p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-heading text-slate-950 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-amber-500" /> Gửi Yêu Cầu Sửa Chữa
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                {/* Chọn danh mục */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Danh mục sự cố</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map((catKey) => {
                      const cfg = CATEGORY_CONFIG[catKey];
                      const Icon = cfg.icon;
                      const isSelected = category === catKey;
                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => setCategory(catKey)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-400'
                              : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span className="text-[11px] text-center leading-tight">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tiêu đề */}
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tên sự cố / Tiêu đề</Label>
                  <Input
                    id="title"
                    placeholder="Ví dụ: Vòi nước bồn rửa mặt bị rỉ nước"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="rounded-xl border-slate-200 focus:ring-amber-500"
                  />
                </div>

                {/* Mô tả */}
                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mô tả chi tiết</Label>
                  <textarea
                    id="desc"
                    rows={3}
                    placeholder="Mô tả biểu hiện, vị trí cụ thể trong phòng..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Khung giờ hẹn */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Khung giờ hẹn thợ đến</Label>
                  <select
                    value={preferredSlot}
                    onChange={(e) => setPreferredSlot(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Sáng (08:30 - 11:30)">Sáng (08:30 - 11:30)</option>
                    <option value="Trưa (12:00 - 13:30)">Trưa (12:00 - 13:30)</option>
                    <option value="Chiều (14:00 - 17:00)">Chiều (14:00 - 17:00)</option>
                    <option value="Tối (17:30 - 19:30)">Tối (17:30 - 19:30)</option>
                  </select>
                </div>

                {/* Upload đính kèm */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hình ảnh minh chứng</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleMockUpload}
                      disabled={isUploading}
                      className="rounded-xl border-dashed border-amber-500/50 text-amber-700 hover:bg-amber-50"
                    >
                      <UploadCloud className="h-4 w-4 mr-1.5 text-amber-600" />
                      {isUploading ? 'Đang tải lên...' : 'Tải ảnh đính kèm'}
                    </Button>
                    <span className="text-xs text-slate-400 font-medium">
                      Đã chọn {uploadedImages.length} ảnh
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                    Hủy
                  </Button>
                  <Button type="submit" className="rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold">
                    Gửi yêu cầu
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* List Yêu cầu */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-heading text-slate-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-600" /> Danh Sách Yêu Cầu Của Bạn ({requests.length})
        </h2>

        {requests.length === 0 ? (
          <Card className="border-border-subtle rounded-2xl p-12 text-center text-slate-400">
            <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-sm">Bạn chưa gửi yêu cầu bảo trì nào.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {requests.map((item) => {
              const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
              const Icon = cfg.icon;

              return (
                <Card key={item.id} className="border border-border-subtle rounded-2xl bg-white shadow-sm overflow-hidden hover:border-amber-400/50 transition-all">
                  <CardContent className="p-5 md:p-6 space-y-5">
                    {/* Header Item */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${cfg.color} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-400">{item.id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                              {cfg.label}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-0.5 font-heading">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      {/* Badge trạng thái */}
                      <div>
                        {item.status === 'pending' && (
                          <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 font-bold px-3 py-1 rounded-full text-xs">
                            ⏳ Chờ tiếp nhận
                          </Badge>
                        )}
                        {item.status === 'in_progress' && (
                          <Badge className="bg-blue-500/10 text-blue-700 border-blue-300 font-bold px-3 py-1 rounded-full text-xs animate-pulse">
                            🔧 Đang xử lý / Đã phân thợ
                          </Badge>
                        )}
                        {item.status === 'completed' && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold px-3 py-1 rounded-full text-xs">
                            ✅ Đã hoàn tất
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stepper Timeline Tiến Độ */}
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between max-w-xl mx-auto relative">
                        {/* Line */}
                        <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />
                        <div
                          className="absolute top-1/2 left-8 -translate-y-1/2 h-0.5 bg-amber-500 transition-all duration-500 z-0"
                          style={{
                            width:
                              item.status === 'pending'
                                ? '0%'
                                : item.status === 'in_progress'
                                ? '50%'
                                : '100%',
                          }}
                        />

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="h-7 w-7 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shadow-md">
                            1
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 mt-1">Đã gửi yêu cầu</span>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`h-7 w-7 rounded-full font-bold text-xs flex items-center justify-center transition-colors ${
                              item.status === 'in_progress' || item.status === 'completed'
                                ? 'bg-amber-500 text-slate-950 shadow-md'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            2
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 mt-1">Đã tiếp nhận &amp; Phân thợ</span>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`h-7 w-7 rounded-full font-bold text-xs flex items-center justify-center transition-colors ${
                              item.status === 'completed'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            3
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 mt-1">Hoàn tất sửa chữa</span>
                        </div>
                      </div>
                    </div>

                    {/* Chi tiết nội dung */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-400 block uppercase text-[10px] tracking-wider">Mô tả sự cố:</span>
                        <p className="text-slate-800 mt-1 leading-relaxed">{item.description}</p>
                        <div className="mt-2 text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="h-3.5 w-3.5" /> Gửi lúc: {item.createdAt}
                        </div>
                      </div>

                      <div className="space-y-2 bg-amber-50/40 p-3 rounded-xl border border-amber-200/50">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-700">Khung giờ hẹn:</span>
                          <span className="font-bold text-amber-700">{item.preferredSlot}</span>
                        </div>
                        {item.assignedTechnician && (
                          <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-amber-600" />
                              <span className="font-bold text-slate-900">{item.assignedTechnician.name}</span>
                            </div>
                            <a
                              href={`tel:${item.assignedTechnician.phone}`}
                              className="text-amber-700 hover:underline font-mono font-bold flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" /> {item.assignedTechnician.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Đánh giá 1-5 sao khi đã hoàn tất */}
                    {item.status === 'completed' && (
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Đánh giá chất lượng sửa chữa:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRate(item.id, star)}
                              className="p-1 hover:scale-125 transition-transform"
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  (item.rating || 0) >= star
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
