'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, X, Send, PhoneCall, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';
import { createConsultation } from '@/src/features/staff/services/consultations';
import { createLead, createLeadActivity } from '@/src/features/staff/services/leads';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect, useRef } from 'react';

export function FloatingConsultation() {
  const { company } = useCustomerCompany();
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{fullName?: string; phone?: string}>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen && profile && formRef.current) {
      const nameInput = formRef.current.elements.namedItem('fullName') as HTMLInputElement;
      const phoneInput = formRef.current.elements.namedItem('phone') as HTMLInputElement;
      if (nameInput && !nameInput.value) nameInput.value = profile.full_name || '';
      if (phoneInput && !phoneInput.value) phoneInput.value = profile.phone || '';
    }
  }, [isOpen, profile]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company?.id) {
      setError('Lỗi không xác định công ty');
      return;
    }
    
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const full_name = (fd.get('fullName') as string) || '';
    const phone = (fd.get('phone') as string) || '';
    const notes = (fd.get('notes') as string) || '';

    // Validate
    const newErrors: {fullName?: string; phone?: string} = {};
    if (!full_name.trim()) newErrors.fullName = 'Bạn cần nhập Họ và tên';
    if (!phone.trim()) newErrors.phone = 'Bạn cần nhập Số điện thoại';

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setLoading(false);
      return;
    }

    setFieldErrors({});

    try {
      await createConsultation({
        company_id: company.id,
        full_name,
        phone,
        email: undefined,
        message: notes || 'Tư vấn bất động sản',
        source: 'website',
      });

      const lead = await createLead({
        company_id: company.id,
        full_name,
        phone,
        email: null,
        source: 'website',
        status: 'new',
        interest: null,
        budget: 0,
        preferred_area: null,
        preferred_room_type: null,
        interested_area: null,
        assigned_to: null,
        notes: notes || 'Tư vấn bất động sản',
        last_contacted_at: null,
      });

      await createLeadActivity({
        lead_id: lead.id,
        company_id: company.id,
        type: 'note',
        content: 'Lead tạo từ Floating Widget trên website',
        old_status: null,
        new_status: null,
        created_by: null,
        created_by_name: 'Website',
      });
      
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi yêu cầu lúc này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-36 lg:bottom-22 right-6 z-50 h-14 w-14 bg-accent hover:bg-accent-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Tư vấn và Liên hệ"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Floating Dialog/Panel */}
      <div
        className={`fixed bottom-36 lg:bottom-22 right-6 z-50 w-[calc(100vw-48px)] max-w-[360px] bg-card border border-border-subtle rounded-2xl shadow-xl overflow-hidden transition-all duration-300 transform origin-bottom-right ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-10 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="bg-accent p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="font-bold text-sm font-heading">Tư vấn & Liên hệ</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {company?.phone && (
            <a 
              href={`tel:${company.phone.replace(/\\D/g, '')}`}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-xl mb-6 font-semibold transition-colors"
            >
              <PhoneCall className="h-4 w-4" />
              Gọi ngay: {company.phone}
            </a>
          )}

          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-bold text-ink mb-1">Gửi thành công!</p>
              <p className="text-sm text-ink-muted mb-6">Chúng tôi sẽ liên hệ lại với bạn sớm nhất.</p>
              <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                Gửi yêu cầu khác
              </Button>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
              <p className="text-sm text-ink-muted text-center mb-4">
                Để lại thông tin, chuyên viên sẽ hỗ trợ bạn tìm bất động sản phù hợp.
              </p>

              {error && (
                <div className="p-3 bg-danger/10 text-danger text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="float-name" className="text-xs font-semibold text-ink">Họ và tên <span className="text-red-500">*</span></Label>
                <Input id="float-name" name="fullName" placeholder="Ví dụ: Nguyễn Văn A" className={`h-10 text-sm ${fieldErrors.fullName ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
                {fieldErrors.fullName && <p className="text-xs text-red-500">{fieldErrors.fullName}</p>}
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="float-phone" className="text-xs font-semibold text-ink">Số điện thoại <span className="text-red-500">*</span></Label>
                <Input id="float-phone" name="phone" placeholder="Ví dụ: 0912345678" type="tel" className={`h-10 text-sm ${fieldErrors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
                {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="float-notes" className="text-xs font-semibold text-ink">Lời nhắn / Nhu cầu</Label>
                <Textarea 
                  id="float-notes" 
                  name="notes" 
                  placeholder="Tôi muốn tìm thuê phòng tại..." 
                  className="resize-none h-20 text-sm"
                />
              </div>

              <Button type="submit" className="w-full h-11 bg-accent hover:bg-accent/90 text-white shadow-none mt-2" disabled={loading}>
                {loading ? 'Đang gửi...' : <><Send className="h-4 w-4 mr-2" /> Gửi yêu cầu</>}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
