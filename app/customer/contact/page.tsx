'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { createConsultation } from '@/src/features/staff/services/consultations';
import { createLead, createLeadActivity } from '@/src/features/staff/services/leads';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';

export default function ContactPage() {
  const { company } = useCustomerCompany();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contactInfo = [
    {
      icon: Phone,
      label: 'Hotline',
      value: company?.phone || '(028) 1234-5678',
      href: company?.phone ? `tel:${company.phone.replace(/\D/g, '')}` : 'tel:02812345678',
    },
    {
      icon: Mail,
      label: 'Email',
      value: company?.owner_email || 'contact@realhome.vn',
      href: company?.owner_email ? `mailto:${company.owner_email}` : 'mailto:contact@realhome.vn',
    },
    {
      icon: MapPin,
      label: 'Địa chỉ',
      value: company?.address || '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
      href: null,
    },
    {
      icon: Clock,
      label: 'Giờ làm việc',
      value: 'Thứ 2 – Thứ 7: 8:00 – 18:00',
      href: null,
    },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const full_name = fd.get('fullName') as string;
    const phone = fd.get('phone') as string;
    const email = (fd.get('email') as string) || undefined;
    const subject = (fd.get('subject') as string) || '';
    const messageText = fd.get('message') as string;
    const message = subject ? `[${subject}] ${messageText}` : messageText;

    if (!company?.id) {
      setError('Không xác định được công ty. Vui lòng tải lại trang.');
      setLoading(false);
      return;
    }

    try {
      await createConsultation({
        company_id: company.id,
        full_name,
        phone,
        email,
        message,
        source: 'website',
      });

      const lead = await createLead({
        company_id: company.id,
        full_name,
        phone,
        email: email ?? null,
        source: 'website',
        status: 'new',
        interest: subject || null,
        budget: 0,
        preferred_area: null,
        preferred_room_type: null,
        interested_area: null,
        assigned_to: null,
        notes: message,
        last_contacted_at: null,
      });

      await createLeadActivity({
        lead_id: lead.id,
        company_id: company.id,
        type: 'note',
        content: 'Lead tạo từ form liên hệ website',
        old_status: null,
        new_status: null,
        created_by: null,
        created_by_name: 'Website',
      });

      setSubmitted(true);
    } catch (err: any) {
      setError('Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 bg-bg-base min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold font-heading text-ink mb-3">Liên Hệ Với Chúng Tôi</h1>
          <p className="text-ink-muted text-lg max-w-xl mx-auto">
            Đội ngũ chuyên viên của chúng tôi luôn sẵn sàng hỗ trợ bạn tìm kiếm bất động sản phù hợp.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            {contactInfo.map(({ icon: Icon, label, value, href }) => (
              <Card key={label} className="border border-border-subtle shadow-none rounded-lg bg-card">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent-soft flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted font-bold uppercase tracking-wide mb-0.5">{label}</p>
                    {href ? (
                      <a href={href} className="text-ink font-semibold hover:text-accent transition-colors">
                        {value}
                      </a>
                    ) : (
                      <p className="text-ink font-semibold">{value}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border border-border-subtle shadow-none rounded-lg bg-card">
              <CardContent className="p-6">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-ink mb-2">Gửi thành công!</h3>
                    <p className="text-ink-muted text-sm max-w-sm mx-auto mb-6">Chúng tôi sẽ phản hồi yêu cầu của bạn trong vòng 24 giờ làm việc. Cảm ơn bạn đã quan tâm.</p>
                    <Button variant="outline" className="shadow-none border-border-subtle text-ink" onClick={() => setSubmitted(false)}>
                      Gửi tin nhắn khác
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h2 className="text-xl font-bold font-heading text-ink mb-2">Gửi Tin Nhắn</h2>

                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="fullName" className="text-xs font-bold text-ink uppercase tracking-wider">Họ và tên *</Label>
                        <Input id="fullName" name="fullName" placeholder="Nguyễn Văn A" required className="mt-1" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="phone" className="text-xs font-bold text-ink uppercase tracking-wider">Số điện thoại *</Label>
                        <Input id="phone" name="phone" placeholder="0912 345 678" required className="mt-1" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs font-bold text-ink uppercase tracking-wider">Email</Label>
                      <Input id="email" name="email" type="email" placeholder="email@example.com" className="mt-1" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="subject" className="text-xs font-bold text-ink uppercase tracking-wider">Chủ đề</Label>
                      <Input id="subject" name="subject" placeholder="Tôi muốn hỏi về..." className="mt-1" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="message" className="text-xs font-bold text-ink uppercase tracking-wider">Nội dung *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Mô tả chi tiết nhu cầu của bạn..."
                        required
                        rows={5}
                        className="mt-1 resize-none"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-accent hover:bg-accent-500 text-white font-semibold shadow-none" size="lg" disabled={loading}>
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Đang gửi...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Gửi tin nhắn
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
