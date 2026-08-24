'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Building2,
  UserCheck,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { KYCVerification } from '@/types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { useAuth } from '@/lib/auth/AuthContext';

export default function KYCApprovalAdminPage() {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState<KYCVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedRecord, setSelectedRecord] = useState<KYCVerification | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [rejectionInput, setRejectionInput] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/kyc/admin/list?status=${statusFilter}&targetType=${targetFilter}`);
      const data = await res.json();
      if (data.success) {
        setVerifications(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching KYC list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [statusFilter, targetFilter]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedRecord) return;
    if (action === 'reject' && !rejectionInput.trim()) {
      setActionError('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setReviewing(true);
      setActionError(null);

      const res = await fetch('/api/kyc/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kycId: selectedRecord.id,
          action,
          rejectionReason: action === 'reject' ? rejectionInput : null,
          reviewerId: user?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Thao tác thất bại');
      }

      setSelectedRecord(null);
      setShowRejectForm(false);
      setRejectionInput('');
      fetchVerifications();
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi xử lý phê duyệt');
    } finally {
      setReviewing(false);
    }
  };

  const filtered = verifications.filter((item) => {
    const matchSearch =
      item.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.idCardNumber?.includes(searchTerm) ||
      item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" /> Quản lý & Phê duyệt KYC
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kiểm duyệt 3 ảnh đối chiếu (CCCD + Chân dung 3D người thực) & Giấy tờ sở hữu BDS
          </p>
        </div>

        {/* Stats Quick Counter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" /> Chờ duyệt
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'verified'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> Đã xác thực
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <XCircle className="w-4 h-4" /> Từ chối
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, số CCCD, email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Phân loại:
          </label>
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg outline-none bg-white"
          >
            <option value="all">Tất cả (Chủ nhà & Sale)</option>
            <option value="landlord">Chủ nhà (Landlord)</option>
            <option value="sale">Sale / Môi giới</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> Đang tải danh sách hồ sơ...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="font-semibold">Không tìm thấy hồ sơ KYC nào</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                <tr>
                  <th className="px-6 py-4">Đối tượng</th>
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Số CCCD</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Ngày gửi</th>
                  <th className="px-6 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      {item.targetType === 'landlord' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          <Building2 className="w-3.5 h-3.5" /> Chủ nhà
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                          <UserCheck className="w-3.5 h-3.5" /> Sale
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {item.fullName}
                      <div className="text-xs font-normal text-slate-400">{item.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-700">{item.idCardNumber}</td>
                    <td className="px-6 py-4">
                      {item.status === 'verified' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-max">
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> Chờ duyệt
                        </span>
                      )}
                      {item.status === 'rejected' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-max">
                          <XCircle className="w-3.5 h-3.5" /> Từ chối
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" /> Xem 3 ảnh & Phê duyệt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail & Review Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-600" /> Thẩm định Hồ sơ KYC: {selectedRecord.fullName || (selectedRecord as any).full_name || (selectedRecord as any).profileFullName || 'Chưa cập nhật tên'}
              </h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
                {actionError}
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">Số CCCD:</span>
                <span className="font-bold font-mono text-sm text-slate-900">{selectedRecord.idCardNumber || (selectedRecord as any).id_card_number || 'Chưa có số CCCD'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Ngày cấp:</span>
                <span className="font-bold text-slate-800">{selectedRecord.idCardIssueDate || (selectedRecord as any).id_card_issue_date || 'Chưa rõ'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Đối tượng:</span>
                <span className="font-bold uppercase text-blue-600">{(selectedRecord.targetType || (selectedRecord as any).target_type) === 'landlord' ? 'Chủ nhà (Landlord)' : 'Sale / Môi giới'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Nơi cấp:</span>
                <span className="font-bold text-slate-800">{selectedRecord.idCardIssuePlace || (selectedRecord as any).id_card_issue_place || 'Chưa rõ'}</span>
              </div>
            </div>

            {/* 3 Verification Images Comparison */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                📸 So sánh 3 ảnh xác thực sinh trắc học người thực
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-700">1. CCCD Mặt trước</div>
                  {(selectedRecord.frontCardUrl || (selectedRecord as any).front_card_url) ? (
                    <a href={selectedRecord.frontCardUrl || (selectedRecord as any).front_card_url} target="_blank" rel="noreferrer">
                      <img
                        src={selectedRecord.frontCardUrl || (selectedRecord as any).front_card_url}
                        alt="CCCD Mặt trước"
                        className="w-full h-44 object-cover rounded-xl border border-slate-200 shadow-sm hover:opacity-90 transition-opacity bg-slate-100"
                      />
                    </a>
                  ) : (
                    <div className="w-full h-44 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400 italic">
                      Chưa có ảnh mặt trước
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-700">2. CCCD Mặt sau</div>
                  {(selectedRecord.backCardUrl || (selectedRecord as any).back_card_url) ? (
                    <a href={selectedRecord.backCardUrl || (selectedRecord as any).back_card_url} target="_blank" rel="noreferrer">
                      <img
                        src={selectedRecord.backCardUrl || (selectedRecord as any).back_card_url}
                        alt="CCCD Mặt sau"
                        className="w-full h-44 object-cover rounded-xl border border-slate-200 shadow-sm hover:opacity-90 transition-opacity bg-slate-100"
                      />
                    </a>
                  ) : (
                    <div className="w-full h-44 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400 italic">
                      Chưa có ảnh mặt sau
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-blue-900 flex items-center justify-between">
                    <span>3. Chân dung 3D người thực</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">Đối chiếu</span>
                  </div>
                  {(selectedRecord.selfieUrl || (selectedRecord as any).selfie_url) ? (
                    <a href={selectedRecord.selfieUrl || (selectedRecord as any).selfie_url} target="_blank" rel="noreferrer">
                      <img
                        src={selectedRecord.selfieUrl || (selectedRecord as any).selfie_url}
                        alt="Chân dung 3D"
                        className="w-full h-44 object-cover rounded-xl border-2 border-blue-400 shadow-sm hover:opacity-90 transition-opacity bg-slate-100"
                      />
                    </a>
                  ) : (
                    <div className="w-full h-44 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 flex items-center justify-center text-xs text-blue-400 italic">
                      Chưa có ảnh chân dung 3D
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Landlord Ownership Document */}
            {(selectedRecord.ownershipDocumentUrl || (selectedRecord as any).ownership_document_url) && (
              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Giấy chứng nhận sở hữu / ủy quyền BDS
                </h3>
                <div className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Giấy tờ pháp lý đính kèm</span>
                  <a
                    href={selectedRecord.ownershipDocumentUrl || (selectedRecord as any).ownership_document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-600 hover:bg-slate-100"
                  >
                    Xem tài liệu gốc ↗
                  </a>
                </div>
              </div>
            )}

            {/* Rejection Form Input */}
            {showRejectForm && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-rose-900">
                  Vui lòng nhập lý do từ chối hồ sơ:
                </label>
                <textarea
                  rows={3}
                  value={rejectionInput}
                  onChange={(e) => setRejectionInput(e.target.value)}
                  placeholder="Ví dụ: Ảnh CCCD bị mờ, ảnh chân dung 3D không rõ khuôn mặt..."
                  className="w-full p-2.5 text-xs border border-rose-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="border-t pt-4 flex items-center justify-between gap-4">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Đóng
              </button>

              <div className="flex items-center gap-3">
                {showRejectForm ? (
                  <>
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Hủy bỏ
                    </button>

                    <button
                      onClick={() => handleReview('reject')}
                      disabled={reviewing}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50"
                    >
                      {reviewing ? 'Đang xử lý...' : 'Xác nhận Từ chối'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all"
                    >
                      Từ chối / Yêu cầu lại
                    </button>

                    <button
                      onClick={() => handleReview('approve')}
                      disabled={reviewing}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Phê duyệt & Cấp Tích xanh KYC
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
