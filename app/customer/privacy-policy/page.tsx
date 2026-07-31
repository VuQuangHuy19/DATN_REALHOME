import type { Metadata } from 'next';
import { Shield, Lock, Eye, Database, Phone, Mail, UserCheck, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chính sách Bảo mật & Quyền riêng tư | RealHome',
  description:
    'Chính sách thu thập, sử dụng và bảo vệ dữ liệu cá nhân của RealHome theo Nghị định 13/2023/NĐ-CP.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-4">
            <Shield className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-ink font-heading mb-2">
            Chính sách Bảo mật & Quyền riêng tư
          </h1>
          <p className="text-sm text-ink-muted">
            Cập nhật lần cuối: Tháng 7 năm 2026 &nbsp;|&nbsp; Theo Nghị định 13/2023/NĐ-CP
          </p>
        </div>

        {/* Draft notice */}
        <div className="flex gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 mb-8">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <strong>Lưu ý:</strong> Đây là bản Chính sách Bảo mật mẫu. Doanh nghiệp sử dụng nền
            tảng RealHome cần tự rà soát và điều chỉnh nội dung này cho phù hợp với hoạt động
            thực tế và tư vấn pháp lý độc lập trước khi công bố chính thức.
          </p>
        </div>

        <div className="space-y-8 text-sm text-ink leading-relaxed">

          {/* Phần 1 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-base font-bold text-ink font-heading">
                1. Thông tin chúng tôi thu thập
              </h2>
            </div>
            <div className="pl-10 space-y-2">
              <p>Khi bạn sử dụng nền tảng RealHome hoặc điền vào các biểu mẫu trên website, chúng tôi có thể thu thập các thông tin sau:</p>
              <ul className="list-disc pl-5 space-y-1 text-ink-muted">
                <li><strong className="text-ink">Thông tin nhận dạng:</strong> Họ và tên, số điện thoại, địa chỉ email.</li>
                <li><strong className="text-ink">Thông tin liên lạc:</strong> Địa chỉ hiện tại hoặc địa chỉ mong muốn thuê.</li>
                <li><strong className="text-ink">Thông tin giao dịch:</strong> Lịch hẹn xem phòng, nội dung tư vấn, hợp đồng thuê (nếu có).</li>
                <li><strong className="text-ink">Thông tin kỹ thuật:</strong> Địa chỉ IP, loại thiết bị, trình duyệt (thu thập tự động để đảm bảo an ninh).</li>
              </ul>
            </div>
          </section>

          {/* Phần 2 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Database className="h-4 w-4 text-green-600" />
              </div>
              <h2 className="text-base font-bold text-ink font-heading">
                2. Mục đích sử dụng thông tin
              </h2>
            </div>
            <div className="pl-10 space-y-2">
              <p>Thông tin cá nhân của bạn được sử dụng cho các mục đích sau:</p>
              <ul className="list-disc pl-5 space-y-1 text-ink-muted">
                <li>Xử lý và xác nhận lịch hẹn xem phòng.</li>
                <li>Liên hệ tư vấn về bất động sản phù hợp với nhu cầu của bạn.</li>
                <li>Gửi thông báo liên quan đến hợp đồng thuê, hóa đơn và dịch vụ (nếu bạn là khách thuê).</li>
                <li>Cải thiện chất lượng dịch vụ và trải nghiệm người dùng.</li>
                <li>Tuân thủ các yêu cầu pháp lý theo quy định của pháp luật Việt Nam.</li>
              </ul>
            </div>
          </section>

          {/* Phần 3 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Lock className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="text-base font-bold text-ink font-heading">
                3. Bảo vệ dữ liệu cá nhân
              </h2>
            </div>
            <div className="pl-10 space-y-2 text-ink-muted">
              <p>
                Chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và tổ chức phù hợp để bảo vệ
                thông tin cá nhân của bạn, bao gồm mã hóa dữ liệu truyền tải (TLS/HTTPS), kiểm soát
                truy cập theo vai trò (RBAC), và lưu trữ mật khẩu bằng thuật toán băm một chiều (bcrypt).
              </p>
              <p>
                Dữ liệu được lưu trữ trên hạ tầng đám mây an toàn. Chúng tôi không bán, trao đổi
                hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba vì mục đích thương mại.
              </p>
            </div>
          </section>

          {/* Phần 4 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <UserCheck className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-base font-bold text-ink font-heading">
                4. Quyền của bạn theo Nghị định 13/2023/NĐ-CP
              </h2>
            </div>
            <div className="pl-10 space-y-2">
              <p>Theo quy định pháp luật về bảo vệ dữ liệu cá nhân tại Việt Nam, bạn có các quyền sau:</p>
              <ul className="list-disc pl-5 space-y-1 text-ink-muted">
                <li><strong className="text-ink">Quyền được biết:</strong> Biết về hoạt động xử lý dữ liệu của mình.</li>
                <li><strong className="text-ink">Quyền đồng ý / rút đồng ý:</strong> Đồng ý hoặc rút lại sự đồng ý cho phép thu thập và xử lý dữ liệu.</li>
                <li><strong className="text-ink">Quyền truy cập:</strong> Xem, chỉnh sửa thông tin cá nhân của mình.</li>
                <li><strong className="text-ink">Quyền xóa:</strong> Yêu cầu xóa thông tin cá nhân trong các trường hợp pháp luật cho phép.</li>
                <li><strong className="text-ink">Quyền phản đối:</strong> Phản đối việc xử lý dữ liệu ảnh hưởng đến quyền lợi của mình.</li>
              </ul>
            </div>
          </section>

          {/* Phần 5 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Phone className="h-4 w-4 text-slate-600" />
              </div>
              <h2 className="text-base font-bold text-ink font-heading">
                5. Liên hệ & Khiếu nại
              </h2>
            </div>
            <div className="pl-10 space-y-2 text-ink-muted">
              <p>
                Nếu bạn có câu hỏi, khiếu nại về việc xử lý dữ liệu cá nhân hoặc muốn thực hiện
                các quyền của mình, vui lòng liên hệ với chúng tôi qua:
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-amber-600" />
                  <span>Email: <a href="mailto:support@realhome.vn" className="text-amber-600 hover:underline font-medium">support@realhome.vn</a></span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-amber-600" />
                  <span>Hotline: <a href="tel:19001234" className="text-amber-600 hover:underline font-medium">1900 1234</a> (Thứ 2 — Thứ 6, 8:00–17:30)</span>
                </div>
              </div>
              <p className="mt-3">
                Chúng tôi cam kết phản hồi trong vòng <strong>05 ngày làm việc</strong> kể từ khi
                nhận được yêu cầu hợp lệ.
              </p>
            </div>
          </section>

          {/* Phần 6 — Cập nhật chính sách */}
          <section className="pt-4 border-t border-border-subtle">
            <p className="text-xs text-ink-muted text-center">
              Chính sách này có thể được cập nhật theo thời gian để phản ánh các thay đổi về pháp
              lý hoặc hoạt động kinh doanh. Phiên bản mới nhất luôn được đăng tại trang này.
              Việc tiếp tục sử dụng dịch vụ sau khi chính sách được cập nhật đồng nghĩa với việc
              bạn chấp nhận các thay đổi đó.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
