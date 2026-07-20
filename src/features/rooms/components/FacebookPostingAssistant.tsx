'use client';

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { 
  Copy, Download, Check, Loader2, Facebook, 
  Sparkles, Image as LucideImage, AlertCircle, 
  HelpCircle, Link as LinkIcon, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import type { RoomWithBuilding } from '../services/rooms';

interface FacebookPostingAssistantProps {
  room: RoomWithBuilding;
  images: Array<{
    id: string;
    url: string;
    thumbnail_url: string | null;
    is_thumbnail: boolean;
    priority: number;
  }>;
}

export function FacebookPostingAssistant({ room, images }: FacebookPostingAssistantProps) {
  // Sales Info State (auto-saved to localStorage)
  const [salesName, setSalesName] = useState('');
  const [salesPhone, setSalesPhone] = useState('');

  // UI States
  const [selectedTemplateId, setSelectedTemplateId] = useState('template1');
  const [editedContent, setEditedContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipProgress, setZipProgress] = useState('');
  const [copyingImgId, setCopyingImgId] = useState<string | null>(null);

  // Load Sales Info from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSalesName(localStorage.getItem('fb_sales_name') || '');
      setSalesPhone(localStorage.getItem('fb_sales_phone') || '');
    }
  }, []);

  // Save Sales Info to localStorage
  const handleSalesInfoChange = (nameVal: string, phoneVal: string) => {
    setSalesName(nameVal);
    setSalesPhone(phoneVal);
    localStorage.setItem('fb_sales_name', nameVal);
    localStorage.setItem('fb_sales_phone', phoneVal);
  };

  // Generate Templates function
  const getTemplates = () => {
    const priceStr = room.price ? `${room.price.toLocaleString('vi-VN')} đ` : '—';
    const buildingName = room.buildings?.name || '—';
    const address = room.buildings?.address || '—';
    const size = room.size ? `${room.size} m²` : '—';
    const bedrooms = room.bedrooms || 0;
    const bathrooms = room.bathrooms || 0;
    const balcony = room.has_private_balcony ? 'Có ban công riêng' : 'Không có ban công';
    const occupants = room.max_occupants ? `${room.max_occupants} người` : '—';
    const vehicles = room.max_vehicles_per_room ? `${room.max_vehicles_per_room} xe` : '—';
    const minContract = room.min_contract_months ? `${room.min_contract_months} tháng` : '—';
    const description = room.description || '';
    
    // Chi phí tòa nhà
    const electricity = room.buildings?.electricity_price ? `${room.buildings.electricity_price.toLocaleString('vi-VN')}đ/kWh` : '—';
    const water = room.buildings?.water_price ? `${room.buildings.water_price.toLocaleString('vi-VN')}đ/người` : '—';
    const internet = room.buildings?.internet_price ? `${room.buildings.internet_price.toLocaleString('vi-VN')}đ/phòng` : '—';
    const commonService = room.buildings?.common_service_price ? `${room.buildings.common_service_price.toLocaleString('vi-VN')}đ/${(room.buildings as any).common_service_unit || 'người'}` : '—';
    const washMachine = room.buildings?.washing_machine_type || 'Chưa cập nhật';
    const dryer = room.buildings?.dryer_type || 'Chưa cập nhật';

    const contactInfo = `📞 Liên hệ ngay để xem phòng trực tiếp:\n☎️ Hotline/Zalo: ${salesPhone || '[Chưa nhập số điện thoại]'}${salesName ? ` (${salesName})` : ''}`;

    return [
      {
        id: 'template1',
        name: '🔥 Mẫu 1: Đầy đủ & Thu hút',
        content: `🔥 CĂN HỘ XỊN MỊN - TRỐNG PHÒNG ${room.code} TẠI ${buildingName.toUpperCase()} 🔥
📍 Địa chỉ: ${address}
✨ Căn hộ ${room.room_type || 'Tiêu chuẩn'} rộng ${size}, thiết kế hiện đại với ${bedrooms} PN - ${bathrooms} WC, ban công: ${balcony}.

💵 Giá thuê chỉ: ${priceStr}/tháng (Hợp đồng tối thiểu ${minContract})
⚡ Điện: ${electricity} | 💧 Nước: ${water}
📶 Wifi: ${internet} | 🧹 Phí dịch vụ: ${commonService}

🏡 Tiện ích nổi bật của căn hộ:
- Máy giặt: ${washMachine} | Máy sấy: ${dryer}
- Số người ở tối đa: ${occupants} | Số xe máy tối đa: ${vehicles}
- Phòng thoáng đãng, ánh sáng tự nhiên tốt, giờ giấc tự do, không chung chủ.
- Ra vào khóa vân tay, camera giám sát, an ninh 24/7.
${description ? `📝 Mô tả chi tiết: ${description}\n` : ''}
${contactInfo}`
      },
      {
        id: 'template2',
        name: '📋 Mẫu 2: Chi tiết chi phí',
        content: `[TÌM KHÁCH THUÊ] PHÒNG TRỐNG ${room.code} - TOÀ NHÀ ${buildingName}
📌 Địa điểm: ${address}
📐 Diện tích: ${size} (Tầng ${room.floor})
🛋 Loại phòng: ${room.room_type || 'Tiêu chuẩn'} (${bedrooms} phòng ngủ, ${bathrooms} vệ sinh)

CHI TIẾT CHI PHÍ HÀNG THÁNG:
🔹 Giá thuê: ${priceStr}/tháng
🔹 Hợp đồng tối thiểu: ${minContract}
🔹 Tiền điện: ${electricity}
🔹 Tiền nước: ${water}
🔹 Internet/Wifi: ${internet}
🔹 Dịch vụ chung: ${commonService}

TIỆN NGHI SẴN CÓ:
- Ban công riêng: ${room.has_private_balcony ? 'Có ban công thoáng mát' : 'Không có'}
- Máy giặt: ${washMachine} | Máy sấy: ${dryer}
- Giới hạn: Tối đa ${occupants}, ${vehicles}
- Ra vào vân tay tiện lợi, giờ giấc hoàn toàn tự do, camera an ninh.
${description ? `📝 Ghi chú thêm: ${description}\n` : ''}
${contactInfo}`
      },
      {
        id: 'template3',
        name: '⚡ Mẫu 3: Ngắn gọn (Hot Deal)',
        content: `⚡️ CHỈ CÒN ĐÚNG 1 PHÒNG TRỐNG ${room.code} - XÁCH VALI VÀO Ở NGAY! ⚡️
📍 Vị trí trung tâm: ${buildingName} - ${address}
💸 Giá cực tốt: ${priceStr}/tháng (Rộng ${size}, Tầng ${room.floor})
👉 Thiết kế: ${bedrooms} PN, ${bathrooms} WC, ban công: ${room.has_private_balcony ? 'Thoáng mát' : 'Không có'}.

✅ Giờ giấc tự do, khóa vân tay, không chung chủ.
✅ Có máy giặt, máy sấy đầy đủ tiện nghi.
✅ Khu vực an ninh cao, giao thông thuận tiện.
${description ? `✅ Thêm: ${description}\n` : ''}
👇 Liên hệ xem phòng trực tiếp kẻo lỡ:
${contactInfo}`
      }
    ];
  };

  const templates = getTemplates();

  // Reset or Update content when template, sales info, or room details change
  useEffect(() => {
    const selected = templates.find(t => t.id === selectedTemplateId);
    if (selected) {
      setEditedContent(selected.content);
    }
  }, [selectedTemplateId, salesName, salesPhone, room]);

  // Copy Post Text to Clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      setIsCopied(true);
      toast.success('Đã sao chép nội dung bài đăng!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Không thể sao chép văn bản. Vui lòng copy thủ công.');
    }
  };

  // Copy Single Image to Clipboard (Canvas PNG helper)
  const handleCopyImage = async (imageUrl: string, imgId: string) => {
    setCopyingImgId(imgId);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const img = new (window as any).Image();
      img.crossOrigin = 'anonymous';
      
      const blobUrl = URL.createObjectURL(blob);
      img.src = blobUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể tạo canvas context');
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (pngBlob) => {
        URL.revokeObjectURL(blobUrl);
        if (!pngBlob) {
          toast.error('Lỗi định dạng ảnh PNG');
          setCopyingImgId(null);
          return;
        }
        try {
          const clipboardItem = new (window as any).ClipboardItem({
            'image/png': pngBlob
          });
          await navigator.clipboard.write([clipboardItem]);
          toast.success('Đã copy ảnh! Hãy sang Facebook và Dán (Ctrl+V hoặc Paste) để đính kèm.');
        } catch (err) {
          console.error(err);
          toast.error('Trình duyệt không hỗ trợ dán ảnh. Vui lòng tải xuống hoặc nhấn giữ để lưu.');
        } finally {
          setCopyingImgId(null);
        }
      }, 'image/png');
    } catch (error: any) {
      console.error(error);
      toast.error('Lỗi khi sao chép ảnh: ' + (error.message || 'CORS Error'));
      setCopyingImgId(null);
    }
  };

  // Download Single Image file
  const handleDownloadSingleImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Anh_Phong_${room.code}_${index + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success(`Đã tải ảnh ${index + 1} thành công.`);
    } catch (err) {
      toast.error('Lỗi khi tải ảnh. Thử nhấn giữ trực tiếp vào ảnh để lưu.');
    }
  };

  // Download All Images as ZIP
  const handleDownloadAllAsZip = async () => {
    if (images.length === 0) {
      toast.error('Không có hình ảnh nào để tải.');
      return;
    }
    setZipLoading(true);
    setZipProgress('Đang chuẩn bị khởi tạo...');
    
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        setZipProgress(`Đang tải ảnh ${i + 1}/${images.length}...`);
        const response = await fetch(img.url);
        if (!response.ok) throw new Error(`Lỗi tải ảnh số ${i + 1}`);
        const blob = await response.blob();
        
        const ext = img.url.split('.').pop()?.split('?')[0] || 'jpg';
        const filename = `Room_${room.code}_${i + 1}.${ext}`;
        zip.file(filename, blob);
      }
      
      setZipProgress('Đang nén file ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      
      const blobUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Anh_Phong_${room.code}_${room.buildings?.name || 'RealHome'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      
      toast.success('Đã tải xuống file ZIP ảnh phòng thành công!');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi tạo file ZIP: ' + (err.message || 'Không rõ nguyên nhân'));
    } finally {
      setZipLoading(false);
      setZipProgress('');
    }
  };

  // Copy all direct image URLs
  const handleCopyAllUrls = () => {
    if (images.length === 0) {
      toast.error('Không có link ảnh nào.');
      return;
    }
    const urlsText = images.map(img => img.url).join('\n');
    navigator.clipboard.writeText(urlsText)
      .then(() => toast.success('Đã sao chép toàn bộ đường dẫn ảnh!'))
      .catch(() => toast.error('Không thể sao chép link ảnh.'));
  };

  return (
    <Card className="border border-indigo-100 shadow-sm overflow-hidden bg-white rounded-xl">
      {/* Banner Header Style Facebook */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Facebook className="h-5 w-5 fill-white text-blue-700" />
          <div>
            <h3 className="font-heading text-sm font-bold tracking-wide">TRỢ LÝ QUẢNG CÁO FACEBOOK</h3>
            <p className="text-[10px] text-blue-100 opacity-90">Tạo bài viết & Chuẩn bị hình ảnh đăng bài tức thì</p>
          </div>
        </div>
        <Badge className="bg-white/20 border-none text-white text-[10px] uppercase font-bold tracking-wider rounded">
          Phòng {room.code}
        </Badge>
      </div>

      <CardContent className="p-4">
        {/* Sales Contact Info Fields */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Thông tin liên hệ của bạn (Tự động lưu)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="salesName" className="text-[10px] font-semibold text-slate-500 uppercase">Tên hiển thị</Label>
              <Input 
                id="salesName"
                value={salesName}
                onChange={(e) => handleSalesInfoChange(e.target.value, salesPhone)}
                placeholder="VD: Huy Vu"
                className="h-8 text-xs rounded border-slate-200 focus-visible:ring-blue-600 bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="salesPhone" className="text-[10px] font-semibold text-slate-500 uppercase">SĐT liên hệ</Label>
              <Input 
                id="salesPhone"
                value={salesPhone}
                onChange={(e) => handleSalesInfoChange(salesName, e.target.value)}
                placeholder="VD: 0987654321"
                className="h-8 text-xs rounded border-slate-200 focus-visible:ring-blue-600 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Tab System for Text vs Images */}
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid grid-cols-2 h-9 bg-slate-100 border border-slate-200/50 p-0.5 rounded-lg mb-4">
            <TabsTrigger value="text" className="text-xs font-semibold rounded-md py-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Nội dung bài viết
            </TabsTrigger>
            <TabsTrigger value="images" className="text-xs font-semibold rounded-md py-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
              <LucideImage className="h-3.5 w-3.5 mr-1.5" />
              Hình ảnh ({images.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: POST CONTENT */}
          <TabsContent value="text" className="space-y-4 outline-none">
            {/* Template Buttons */}
            <div className="flex flex-col sm:flex-row gap-1.5">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`flex-1 text-left px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-all ${
                    selectedTemplateId === t.id
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Content Textarea */}
            <div className="relative">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={12}
                className="w-full text-xs font-sans border-slate-200 focus-visible:ring-blue-600 leading-relaxed bg-white rounded-lg p-3 resize-none shadow-inner"
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 font-mono">
                {editedContent.length} ký tự
              </div>
            </div>

            {/* Copy Button */}
            <Button
              onClick={handleCopyText}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-transform text-white font-bold py-2 rounded-lg text-xs shadow-md flex items-center justify-center gap-1.5"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 stroke-[3px]" />
                  Đã sao chép bài đăng!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Sao chép nội dung đăng bài
                </>
              )}
            </Button>
          </TabsContent>

          {/* TAB 2: IMAGES */}
          <TabsContent value="images" className="space-y-4 outline-none">


            {/* Download/Copy Action Header */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadAllAsZip}
                disabled={zipLoading || images.length === 0}
                className="flex-1 border-slate-200 hover:bg-slate-50 text-slate-700 h-8 rounded-lg text-xs font-semibold"
              >
                {zipLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    {zipProgress || 'Đang tạo ZIP...'}
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                    Tải tất cả ảnh (.ZIP)
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleCopyAllUrls}
                disabled={images.length === 0}
                className="border-slate-200 hover:bg-slate-50 text-slate-700 h-8 rounded-lg text-xs font-semibold px-3"
                title="Sao chép toàn bộ đường dẫn ảnh"
              >
                <LinkIcon className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </div>

            {/* Images Grid */}
            {images.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-slate-400 bg-slate-50/50">
                <LucideImage className="h-8 w-8 mx-auto mb-1.5 opacity-40 text-slate-400" />
                <p className="text-xs">Chưa có hình ảnh nào cho phòng này</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {images.map((img, i) => (
                  <div 
                    key={img.id}
                    className={`relative rounded-lg overflow-hidden border bg-slate-50 flex flex-col justify-between transition-all ${
                      img.is_thumbnail ? 'border-amber-400 ring-1 ring-amber-400/30' : 'border-slate-200'
                    }`}
                  >
                    {/* Image Render */}
                    <div className="relative w-full aspect-video border-b border-slate-100 bg-black/5">
                      <Image
                        src={img.thumbnail_url || img.url}
                        alt={`Ảnh phòng ${i + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 250px"
                        className="object-cover"
                      />
                      {img.is_thumbnail && (
                        <div className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
                          ★ Ảnh chính
                        </div>
                      )}
                      <div className="absolute top-1 right-1">
                        <Badge className="bg-black/50 text-white border-none text-[8px] font-mono px-1">
                          #{i + 1}
                        </Badge>
                      </div>
                    </div>

                    {/* Image Action Buttons */}
                    <div className="p-1.5 bg-white flex flex-col gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={copyingImgId !== null}
                        onClick={() => handleCopyImage(img.url, img.id)}
                        className="w-full bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 h-6 rounded text-[10px] font-semibold transition-colors"
                      >
                        {copyingImgId === img.id ? (
                          <>
                            <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />
                            Đang copy...
                          </>
                        ) : (
                          <>
                            <Copy className="h-2.5 w-2.5 mr-1" />
                            Sao chép ảnh
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadSingleImage(img.url, i)}
                        className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-50 h-5 rounded text-[9px] font-medium"
                      >
                        <Download className="h-2.5 w-2.5 mr-1" />
                        Tải ảnh đơn
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
