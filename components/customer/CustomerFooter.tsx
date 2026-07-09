import Link from 'next/link';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';

export function CustomerFooter() {
  return (
    <footer className="w-full border-t bg-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/customer" className="flex items-center">
              <img src="/logo.png" alt="RealHome Logo" className="h-20 w-auto object-contain" />
            </Link>
            <p className="text-sm text-slate-600">
              Đối tác đáng tin cậy của bạn trong việc tìm kiếm bất động sản phù hợp. Chúng tôi cung cấp các giải pháp bất động sản toàn diện cho mọi nhu cầu.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-4">Liên kết nhanh</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/customer" className="text-sm text-slate-600 hover:text-slate-900">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/customer/properties" className="text-sm text-slate-600 hover:text-slate-900">
                  Tìm kiếm
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-4">Dịch vụ</h3>
            <ul className="space-y-2">
              <li className="text-sm text-slate-600">Mua bán bất động sản</li>
              <li className="text-sm text-slate-600">Cho thuê bất động sản</li>
              <li className="text-sm text-slate-600">Quản lý bất động sản</li>
              <li className="text-sm text-slate-600">Tư vấn đầu tư</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-4">Liên hệ</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4" />
                113 Yên Hòa, Cầu Giấy, Hà Nội
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-4 w-4" />
                0857.844.999
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4" />
                realhomesupport@gmail.com
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-slate-500">
          © {new Date().getFullYear()} RealHome. Bảo lưu mọi quyền.
        </div>
      </div>
    </footer>
  );
}
