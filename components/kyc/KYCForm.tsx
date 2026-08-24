'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Upload,
  UserCheck,
  Building2,
  FileText,
  Camera,
  XCircle,
  Loader2,
  RefreshCw,
  Info,
  Sparkles,
  Wand2
} from 'lucide-react';
import { compressImage } from '@/lib/image-utils';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface KYCFormProps {
  userId: string;
  userRole?: string;
  landlordId?: string;
  companyId?: string;
  onSuccess?: () => void;
}

export default function KYCForm({ userId, userRole = 'sale', landlordId, companyId, onSuccess }: KYCFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scanningOcr, setScanningOcr] = useState(false);
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>('unverified');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const fixedTarget = (userRole === 'landlord' || landlordId) ? 'landlord' : ((userRole === 'sale' || userRole === 'sales_agent') ? 'sale' : null);
  const [targetType, setTargetType] = useState<'landlord' | 'sale'>(
    fixedTarget || (userRole === 'landlord' || landlordId ? 'landlord' : 'sale')
  );

  useEffect(() => {
    if (fixedTarget) {
      setTargetType(fixedTarget);
    }
  }, [fixedTarget]);
  const [fullName, setFullName] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardIssueDate, setIdCardIssueDate] = useState('');
  const [idCardIssuePlace, setIdCardIssuePlace] = useState('');

  const [frontCardUrl, setFrontCardUrl] = useState('');
  const [backCardUrl, setBackCardUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState(''); // Ảnh 3D / Chân dung
  const [ownershipDocumentUrl, setOwnershipDocumentUrl] = useState(''); // Giấy tờ BDS

  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch current KYC Status
  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const res = await fetch(`/api/kyc/status?userId=${userId}`);
        const result = await res.json();
        if (result.success && result.data) {
          const record = result.data;
          setKycStatus(record.status);
          setTargetType(record.target_type || targetType);
          setFullName(record.full_name || '');
          setIdCardNumber(record.id_card_number || '');
          setIdCardIssueDate(record.id_card_issue_date || '');
          setIdCardIssuePlace(record.id_card_issue_place || '');
          setFrontCardUrl(record.front_card_url || '');
          setBackCardUrl(record.back_card_url || '');
          setSelfieUrl(record.selfie_url || '');
          setOwnershipDocumentUrl(record.ownership_document_url || '');
          setRejectionReason(record.rejection_reason || null);
        }
      } catch (err) {
        console.error('Error fetching KYC:', err);
      } finally {
        setLoading(false);
      }
    }
    if (userId) fetchStatus();
  }, [userId]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auto OCR Scanning function
  const handleRunOcr = async (overrideFrontUrl?: string, overrideBackUrl?: string) => {
    const fUrl = overrideFrontUrl || frontCardUrl;
    const bUrl = overrideBackUrl || backCardUrl;

    if (!fUrl && !bUrl) {
      setErrorMsg('Vui lòng chọn hoặc upload ảnh CCCD trước khi tự động quét thông tin.');
      return;
    }

    try {
      setScanningOcr(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch('/api/kyc/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontCardUrl: fUrl || null,
          backCardUrl: bUrl || null,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error || !result.data) {
        throw new Error(result.error || 'Không thể đọc dữ liệu từ ảnh CCCD');
      }

      const { fullName: ocrName, idCardNumber: ocrNum, idCardIssueDate: ocrDate, idCardIssuePlace: ocrPlace } = result.data;

      let scannedCount = 0;
      if (ocrName) { setFullName(ocrName); setFieldErrors(prev => ({ ...prev, fullName: '' })); scannedCount++; }
      if (ocrNum) { setIdCardNumber(ocrNum); setFieldErrors(prev => ({ ...prev, idCardNumber: '' })); scannedCount++; }
      if (ocrDate) { setIdCardIssueDate(ocrDate); scannedCount++; }
      if (ocrPlace) { setIdCardIssuePlace(ocrPlace); scannedCount++; }

      if (scannedCount > 0) {
        setSuccessMsg(`✨ AI OCR đã tự động quét và điền thành công ${scannedCount} trường thông tin từ ảnh CCCD của bạn!`);
      } else {
        setErrorMsg('Không tự động nhận diện được thông tin từ ảnh. Vui lòng kiểm tra lại ảnh chụp rõ nét hơn hoặc tự điền vào các ô.');
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      // Log error
    } finally {
      setScanningOcr(false);
    }
  };

  // Helper upload image to Supabase Storage / R2 bucket 'kyc-documents'
  const handleUploadImage = async (file: File, type: 'front' | 'back' | 'selfie' | 'doc') => {
    try {
      if (type === 'front') setUploadingFront(true);
      if (type === 'back') setUploadingBack(true);
      if (type === 'selfie') setUploadingSelfie(true);
      if (type === 'doc') setUploadingDoc(true);
      setErrorMsg(null);

      // Compress image
      const compressed = await compressImage(file, 1600, 0.85);
      const fileExt = compressed.name.split('.').pop() || 'jpg';
      const fileName = `kyc_${userId}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      let url = '';
      try {
        const fd = new FormData();
        fd.append('file', compressed, fileName);
        fd.append('pathPrefix', 'kyc-documents');

        const r2Res = await fetch('/api/upload-r2', { method: 'POST', body: fd });
        const r2Data = await r2Res.json();

        if (r2Res.ok && r2Data.url) {
          url = r2Data.url;
        } else {
          throw new Error(r2Data.error || 'Fallback to Supabase Storage');
        }
      } catch (r2Err) {
        const { data, error } = await supabase.storage
          .from('kyc-documents')
          .upload(filePath, compressed, { upsert: true });

        if (error) {
          console.error('Upload storage error:', error);
          if (error.message.includes('Bucket not found') || error.message.includes('400') || (error as any).status === 400) {
            throw new Error('Chưa tạo Bucket Storage "kyc-documents" trên Supabase. Vui lòng chạy file SQL migration 20260802000000_create_kyc_verifications_table.sql trong Supabase Dashboard.');
          }
          throw new Error(error.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from('kyc-documents')
          .getPublicUrl(filePath);

        url = publicUrlData.publicUrl;
      }

      if (type === 'front') {
        setFrontCardUrl(url);
        setFieldErrors(prev => ({ ...prev, frontCardUrl: '' }));
        // Auto trigger AI OCR
        handleRunOcr(url, backCardUrl);
      }
      if (type === 'back') {
        setBackCardUrl(url);
        setFieldErrors(prev => ({ ...prev, backCardUrl: '' }));
        // Auto trigger AI OCR
        handleRunOcr(frontCardUrl, url);
      }
      if (type === 'selfie') { setSelfieUrl(url); setFieldErrors(prev => ({ ...prev, selfieUrl: '' })); }
      if (type === 'doc') { setOwnershipDocumentUrl(url); setFieldErrors(prev => ({ ...prev, ownershipDocumentUrl: '' })); }

    } catch (err: any) {
      console.error('Upload Error:', err);
      setErrorMsg(`Lỗi tải ảnh lên: ${err.message || 'Không thể upload ảnh'}`);
    } finally {
      if (type === 'front') setUploadingFront(false);
      if (type === 'back') setUploadingBack(false);
      if (type === 'selfie') setUploadingSelfie(false);
      if (type === 'doc') setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Không được để trống';
    if (!idCardNumber.trim()) newErrors.idCardNumber = 'Không được để trống';
    if (!frontCardUrl) newErrors.frontCardUrl = 'Không được để trống';
    if (!backCardUrl) newErrors.backCardUrl = 'Không được để trống';
    if (!selfieUrl) newErrors.selfieUrl = 'Không được để trống';
    if (targetType === 'landlord' && !ownershipDocumentUrl) {
      newErrors.ownershipDocumentUrl = 'Không được để trống';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setErrorMsg('Vui lòng điền đầy đủ các trường thông tin bắt buộc bên dưới.');
      return;
    }
    setFieldErrors({});

    try {
      setSubmitting(true);
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          targetType,
          landlordId: landlordId || null,
          companyId: companyId || null,
          fullName,
          idCardNumber,
          idCardIssueDate,
          idCardIssuePlace,
          frontCardUrl,
          backCardUrl,
          selfieUrl,
          ownershipDocumentUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gửi hồ sơ KYC thất bại');
      }

      setKycStatus('pending');
      setSuccessMsg(data.message);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi gửi hồ sơ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />
        <span className="text-slate-600 font-medium">Đang tải thông tin KYC...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Status Banner */}
      {kycStatus === 'verified' && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-4">
          <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-md">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
              Đã xác thực KYC thành công!
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                <ShieldCheck className="w-3.5 h-3.5" /> Nguồn hàng sạch / Sale chuẩn người thực
              </span>
            </h3>
            <p className="text-sm text-emerald-700">
              Hồ sơ xác thực danh tính của bạn đã được Admin kiểm duyệt thành công. Tất cả các bất động sản và hoạt động giao dịch của bạn hiện đã được gắn nhãn uy tín.
            </p>
          </div>
        </div>
      )}

      {kycStatus === 'pending' && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
          <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-amber-900">
              Hồ sơ KYC đang chờ duyệt...
            </h3>
            <p className="text-sm text-amber-700">
              Hệ thống đã ghi nhận hồ sơ và 3 ảnh đối chiếu của bạn. Ban quản trị sẽ tiến hành xác minh và phê duyệt trong vòng 2-24 giờ làm việc.
            </p>
          </div>
        </div>
      )}

      {kycStatus === 'rejected' && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4">
          <div className="p-3 bg-rose-500 text-white rounded-xl shadow-md">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-rose-900">
              Hồ sơ KYC chưa được phê duyệt
            </h3>
            <p className="text-sm text-rose-700">
              Lý do: <span className="font-semibold">{rejectionReason || 'Thông tin hoặc hình ảnh không khớp / mờ nét.'}</span>
            </p>
            <p className="text-xs text-rose-600 mt-1">Vui lòng kiểm tra lại thông tin và chụp/upload lại ảnh bên dưới để gửi yêu cầu mới.</p>
          </div>
        </div>
      )}

      {/* Main KYC Form */}
      {kycStatus !== 'verified' && (
        <form onSubmit={handleSubmit} noValidate className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
          {/* Header */}
          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Đăng ký Xác thực Danh tính (KYC)</h2>
                <p className="text-sm text-slate-500">Đảm bảo minh bạch nguồn hàng sạch và uy tín môi giới trên RealHome</p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Target Type Display or Selector */}
          {fixedTarget ? (
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {targetType === 'landlord' ? (
                  <Building2 className="w-6 h-6 text-blue-600 shrink-0" />
                ) : (
                  <UserCheck className="w-6 h-6 text-blue-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm text-blue-950 flex items-center gap-2">
                    {targetType === 'landlord' ? '🏠 Xác thực KYC Chủ nhà (Landlord)' : '💼 Xác thực KYC Môi giới / Sale'}
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-600 text-white">
                      Tự động nhận diện
                    </span>
                  </div>
                  <div className="text-xs text-blue-700 font-medium">
                    {targetType === 'landlord'
                      ? 'Bảo chứng nguồn hàng sạch 100% & Kích hoạt gói đẩy tin 10 ngày miễn phí'
                      : 'Cấp Badge Môi giới chính thức RealHome & Ưu tiên nhận Lead CRM'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">Đối tượng đăng ký KYC</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTargetType('landlord')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    targetType === 'landlord'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Building2 className={`w-6 h-6 ${targetType === 'landlord' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-bold text-sm">Chủ nhà (Landlord)</div>
                    <div className="text-xs text-slate-500">Đáng tin cậy, gắn nhãn Nguồn hàng sạch</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('sale')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    targetType === 'sale'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <UserCheck className={`w-6 h-6 ${targetType === 'sale' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-bold text-sm">Sale / Môi giới</div>
                    <div className="text-xs text-slate-500">Môi giới chính thức RealHome</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Information */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> 1. Thông tin cá nhân trên CCCD
              </h3>
              <button
                type="button"
                onClick={() => handleRunOcr()}
                disabled={scanningOcr || (!frontCardUrl && !backCardUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50 self-start sm:self-auto"
                title="Tự động đọc Họ tên, Số CCCD, Ngày cấp từ ảnh CCCD bằng AI"
              >
                {scanningOcr ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI đang quét ảnh...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Quét tự động từ ảnh CCCD (AI OCR)
                  </>
                )}
              </button>
            </div>

            {scanningOcr && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-900 animate-pulse font-medium">
                <Wand2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>AI đang phân tích hình ảnh và tự động nhận diện Họ tên, Số CCCD, Ngày cấp...</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (e.target.value.trim()) setFieldErrors(prev => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="Ví dụ: NGUYỄN VĂN A"
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 outline-none uppercase ${
                    fieldErrors.fullName ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="text-xs font-bold text-rose-500 mt-1 flex items-center gap-1">
                    ⚠️ Không được để trống
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số CCCD / CMND <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={idCardNumber}
                  onChange={(e) => {
                    setIdCardNumber(e.target.value);
                    if (e.target.value.trim()) setFieldErrors(prev => ({ ...prev, idCardNumber: '' }));
                  }}
                  placeholder="Nhập 12 số CCCD"
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 outline-none ${
                    fieldErrors.idCardNumber ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
                {fieldErrors.idCardNumber && (
                  <p className="text-xs font-bold text-rose-500 mt-1 flex items-center gap-1">
                    ⚠️ Không được để trống
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày cấp</label>
                <input
                  type="date"
                  value={idCardIssueDate}
                  onChange={(e) => setIdCardIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nơi cấp</label>
                <input
                  type="text"
                  value={idCardIssuePlace}
                  onChange={(e) => setIdCardIssuePlace(e.target.value)}
                  placeholder="Cục Cảnh sát QLHC về trật tự xã hội"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Required 3 Verification Images */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" /> 2. Upload 3 ảnh xác thực sinh trắc học
              </h3>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
                Bắt buộc 3 ảnh đối chiếu
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Front Card */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  1. CCCD Mặt trước <span className="text-rose-500">*</span>
                </label>
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors relative group ${
                  fieldErrors.frontCardUrl ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 hover:border-blue-500 bg-slate-50'
                }`}>
                  {frontCardUrl ? (
                    <div className="space-y-2">
                      <img src={frontCardUrl} alt="Mặt trước CCCD" className="h-32 mx-auto object-cover rounded-lg shadow-sm" />
                      <span className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã chọn mặt trước
                      </span>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <div className="text-xs text-slate-500">Kéo thả hoặc chọn ảnh mặt trước CCCD</div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0], 'front')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploadingFront}
                  />
                  {uploadingFront && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
                {fieldErrors.frontCardUrl && (
                  <p className="text-xs font-bold text-rose-500 mt-1 flex items-center gap-1">
                    ⚠️ Không được để trống
                  </p>
                )}
              </div>

              {/* Back Card */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  2. CCCD Mặt sau <span className="text-rose-500">*</span>
                </label>
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors relative group ${
                  fieldErrors.backCardUrl ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 hover:border-blue-500 bg-slate-50'
                }`}>
                  {backCardUrl ? (
                    <div className="space-y-2">
                      <img src={backCardUrl} alt="Mặt sau CCCD" className="h-32 mx-auto object-cover rounded-lg shadow-sm" />
                      <span className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã chọn mặt sau
                      </span>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <div className="text-xs text-slate-500">Kéo thả hoặc chọn ảnh mặt sau CCCD</div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0], 'back')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploadingBack}
                  />
                  {uploadingBack && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
                {fieldErrors.backCardUrl && (
                  <p className="text-xs font-bold text-rose-500 mt-1 flex items-center gap-1">
                    ⚠️ Không được để trống
                  </p>
                )}
              </div>

              {/* 3D Selfie / Real Person */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  3. Ảnh Chân dung 3D Người thực <span className="text-rose-500">*</span>
                </label>
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors relative group ${
                  fieldErrors.selfieUrl ? 'border-rose-500 bg-rose-50/20' : 'border-blue-300 hover:border-blue-500 bg-blue-50/30'
                }`}>
                  {selfieUrl ? (
                    <div className="space-y-2">
                      <img src={selfieUrl} alt="Chân dung người thực" className="h-32 mx-auto object-cover rounded-lg shadow-sm border border-blue-200" />
                      <span className="text-xs text-blue-700 font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Đã chọn ảnh chân dung 3D
                      </span>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <Camera className="w-8 h-8 text-blue-500 mx-auto" />
                      <div className="text-xs text-blue-900 font-medium">Chụp/Kéo thả ảnh chân dung cầm CCCD rõ mặt</div>
                      <div className="text-[10px] text-slate-500">Xác thực người thực chống mạo danh</div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0], 'selfie')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploadingSelfie}
                  />
                  {uploadingSelfie && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
                {fieldErrors.selfieUrl && (
                  <p className="text-xs font-bold text-rose-500 mt-1 flex items-center gap-1">
                    ⚠️ Không được để trống
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Ownership Document (For Landlord) */}
          {targetType === 'landlord' && (
            <div className="space-y-3 pt-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                <Building2 className="w-5 h-5 text-blue-600" /> 3. Giấy tờ pháp lý Bất động sản (Chủ nhà) <span className="text-rose-500">*</span>
              </h3>
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                fieldErrors.ownershipDocumentUrl ? 'border-rose-500 bg-rose-50/20' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-800">Giấy chứng nhận quyền sở hữu / Hợp đồng ủy quyền BDS</div>
                  <div className="text-xs text-slate-500">Tải lên sổ hồng, sổ đỏ hoặc hợp đồng giao quản lý bất động sản để chứng minh Nguồn hàng sạch.</div>
                </div>

                <div className="relative shrink-0">
                  <button
                    type="button"
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    {ownershipDocumentUrl ? 'Thay đổi tài liệu' : 'Tải lên giấy tờ BDS'}
                  </button>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0], 'doc')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploadingDoc}
                  />
                </div>
              </div>
              {fieldErrors.ownershipDocumentUrl && (
                <p className="text-xs font-bold text-rose-500 mt-1 flex items-center gap-1">
                  ⚠️ Không được để trống
                </p>
              )}

              {ownershipDocumentUrl && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã tải lên giấy chứng nhận sở hữu BDS thành công!</span>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="border-t border-slate-100 pt-6 flex items-center justify-end gap-4">
            <button
              type="submit"
              disabled={submitting || uploadingFront || uploadingBack || uploadingSelfie || uploadingDoc}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi hồ sơ...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" /> Gửi hồ sơ Xác thực KYC
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
