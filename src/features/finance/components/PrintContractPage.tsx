'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getDepositContract, type DepositContractWithRoom } from '@/src/features/finance/services/deposit_contracts';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2, AlertCircle, Download } from 'lucide-react';
import Link from 'next/link';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ContractPDFTemplate from '@/components/ContractPDFTemplate';

export function PrintContractPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathPrefix = pathname?.startsWith('/landlord') ? '/landlord' : '/admin';
  const [contract, setContract] = useState<DepositContractWithRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    getDepositContract(params.id)
      .then((data) => {
        if (!data) {
          setError('Không tìm thấy hợp đồng đặt cọc');
        } else {
          setContract(data);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500 font-medium">Đang tải nội dung hợp đồng...</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white border border-slate-200 rounded-xl shadow-sm text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Không tìm thấy hợp đồng</h2>
        <p className="text-sm text-slate-500">{error || 'Hợp đồng không tồn tại hoặc đã bị xóa.'}</p>
        <Button asChild className="w-full">
          <Link href={`${pathPrefix}/contracts`}>Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const otherServices = contract.other_services as Record<string, string> || {};

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      {/* Thanh điều khiển - ẩn khi in */}
      <div className="max-w-[210mm] mx-auto mb-6 px-4 py-3 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href={`${pathPrefix}/contracts`}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 mr-2">Mã HĐ: {contract.contract_code}</span>
          <Button onClick={handlePrint} size="sm" variant="outline" className="text-slate-700 border-slate-200">
            <Printer className="h-4 w-4 mr-2" /> In trình duyệt
          </Button>
          {isMounted && (
            <PDFDownloadLink
              document={<ContractPDFTemplate contractData={contract} />}
              fileName={`Hop-dong-coc-${contract.contract_code}.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <Button
                  size="sm"
                  disabled={pdfLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {pdfLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang tạo PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Tải PDF
                    </>
                  )}
                </Button>
              )}
            </PDFDownloadLink>
          )}
        </div>
      </div>

      {/* Bản in A4 */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-[25mm] shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0 font-serif text-[13.5px] leading-relaxed text-black">
        {/* Quốc hiệu tiêu ngữ */}
        <div className="text-center space-y-1">
          <h2 className="font-bold text-sm tracking-wider uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
          <h3 className="font-semibold text-xs tracking-wide">Độc lập – Tự do – Hạnh phúc</h3>
          <div className="w-[120px] h-[0.75px] bg-black mx-auto mt-1" />
        </div>

        {/* Tiêu đề hợp đồng */}
        <div className="text-center mt-8 mb-6 space-y-1">
          <h1 className="font-bold text-lg uppercase tracking-wider">HỢP ĐỒNG ĐẶT CỌC THUÊ PHÒNG</h1>
          <p className="italic text-xs text-gray-700">
            Hôm nay, ngày {contract.agreement_date ? new Date(contract.agreement_date).getDate() : '...'} tháng {contract.agreement_date ? new Date(contract.agreement_date).getMonth() + 1 : '...'} năm {contract.agreement_date ? new Date(contract.agreement_date).getFullYear() : '...'}
            {contract.sign_location ? ` tại: ${contract.sign_location}` : '...........................................................................................'}
          </p>
        </div>

        <p className="font-semibold italic mb-2">Chúng tôi gồm:</p>

        {/* Bên A */}
        <div className="space-y-1">
          <p className="font-bold uppercase">BÊN CHO THUÊ PHÒNG (BÊN A)</p>
          <table className="w-full text-left table-fixed">
            <tbody>
              <tr>
                <td className="w-[80px]">Họ và tên:</td>
                <td className="font-semibold">{contract.party_a_name}</td>
                <td className="w-[80px]">Sinh ngày:</td>
                <td>{contract.party_a_dob ? new Date(contract.party_a_dob).toLocaleDateString('vi-VN') : '.....................'}</td>
              </tr>
              <tr>
                <td>Địa chỉ:</td>
                <td colSpan={3}>{contract.party_a_address || '................................................................................................................................'}</td>
              </tr>
              <tr>
                <td>Số CMND/CCCD:</td>
                <td>{contract.party_a_id_card || '.....................'}</td>
                <td>Cấp ngày:</td>
                <td>{contract.party_a_id_date ? new Date(contract.party_a_id_date).toLocaleDateString('vi-VN') : '.....................'}</td>
              </tr>
              <tr>
                <td>Tại:</td>
                <td>{contract.party_a_id_place || '................................'}</td>
                <td>Điện thoại:</td>
                <td>{contract.party_a_phone || '.....................'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bên B */}
        <div className="space-y-1 mt-4">
          <p className="font-bold uppercase">BÊN THUÊ PHÒNG (BÊN B)</p>
          <table className="w-full text-left table-fixed">
            <tbody>
              <tr>
                <td className="w-[80px]">Họ và tên:</td>
                <td className="font-semibold">{contract.party_b_name}</td>
                <td className="w-[80px]">Sinh ngày:</td>
                <td>{contract.party_b_dob ? new Date(contract.party_b_dob).toLocaleDateString('vi-VN') : '.....................'}</td>
              </tr>
              <tr>
                <td>Số CMND/CCCD:</td>
                <td>{contract.party_b_id_card || '.....................'}</td>
                <td>Cấp ngày:</td>
                <td>{contract.party_b_id_date ? new Date(contract.party_b_id_date).toLocaleDateString('vi-VN') : '.....................'}</td>
              </tr>
              <tr>
                <td>Tại:</td>
                <td>{contract.party_b_id_place || '................................'}</td>
                <td>Điện thoại:</td>
                <td>{contract.party_b_phone || '.....................'}</td>
              </tr>
              <tr>
                <td>Hộ khẩu thường trú:</td>
                <td colSpan={3}>{contract.party_b_address || '................................................................................................................................'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 mb-2">Sau khi trao đổi thỏa thuận hai bên cùng nhau ký kết Hợp đồng đặt cọc với những nội dung sau:</p>

        {/* ĐIỀU 1 */}
        <div className="space-y-1">
          <p className="font-bold">ĐIỀU 1: TIỀN ĐẶT CỌC, MỤC ĐÍCH VÀ THANH TOÁN</p>
          <p>
            <span className="font-semibold">1.1.</span> Bên A đồng ý sẽ cho bên B thuê phòng số: <span className="font-bold">{contract.rooms?.code || '......'}</span> do bên A đại diện là BQL tòa nhà tại địa chỉ: <span className="font-medium">{contract.rooms?.buildings?.address || '............................................................'}</span> với một số thỏa thuận cơ bản sẽ ký kết trong Hợp đồng thuê phòng như sau:
          </p>
          <div className="pl-4 space-y-0.5">
            <p>• Giá thuê: <span className="font-bold text-[14px]">{Number(contract.rent_price).toLocaleString('vi-VN')} đ/tháng</span></p>
            <p>• Giá Dịch Vụ:</p>
            <div className="pl-4 grid grid-cols-2 gap-y-0.5">
              <p>+ Điện: {Number(contract.electricity_price).toLocaleString('vi-VN')} đ/số</p>
              <p>+ Nước: {contract.water_price}</p>
              <p className="col-span-2">+ Phí dịch vụ chung: {contract.service_price}</p>
              {otherServices.internet && <p>+ Internet: {otherServices.internet}</p>}
              {otherServices.laundry && <p>+ Máy giặt/sấy: {otherServices.laundry}</p>}
            </div>
          </div>
          <p>
            <span className="font-semibold">1.2.</span> Mục đích thuê để sử dụng: để ở và sinh hoạt với số lượng người đăng ký ở: <span className="font-semibold">{contract.tenant_count || '0'} người</span>.
          </p>
          <p>
            <span className="font-semibold">1.3.</span> Thanh toán: {contract.payment_method || 'Đặt cọc 01 tháng và thanh toán theo tiến độ thỏa thuận'}.
          </p>
          <p>
            <span className="font-semibold">1.4.</span> Hợp đồng ký kết: <span className="font-semibold">{contract.lease_duration_months || '...'} tháng</span>.
          </p>
          <p>
            <span className="font-semibold">1.5.</span> Trong thời gian hợp đồng còn hiệu lực, nếu bên A muốn lấy lại nhà phải báo trước cho bên B là <span className="font-semibold">{contract.termination_notice_days || '30'} ngày</span> và trả lại toàn bộ tiền cọc cho bên B.
          </p>
          {contract.room_repair_support_date && (
            <p>
              <span className="font-semibold">1.6.</span> Bên A hỗ trợ Bên B sửa chữa phòng trước ngày ký hợp đồng: {new Date(contract.room_repair_support_date).toLocaleDateString('vi-VN')}.
            </p>
          )}
          <p>
            <span className="font-semibold">1.7.</span> Để đảm bảo việc ký kết Hợp đồng thuê phòng muộn nhất vào ngày: <span className="font-bold">{contract.deadline_sign_contract ? new Date(contract.deadline_sign_contract).toLocaleDateString('vi-VN') : '...'}</span>. Nay bên B đồng ý đóng trước cho bên A một số tiền là: <span className="font-bold text-[14px]">{Number(contract.deposit_amount).toLocaleString('vi-VN')} VNĐ</span> gọi là tiền đặt cọc giữ chỗ.
          </p>
        </div>

        {/* ĐIỀU 2 */}
        <div className="space-y-1 mt-4">
          <p className="font-bold">ĐIỀU 2: THỎA THUẬN VỀ VIỆC GIẢI QUYẾT TIỀN ĐẶT CỌC</p>
          <p>Bên B có trách nhiệm giao tiền đặt cọc cho bên A theo đúng thỏa thuận. Nếu thanh toán bằng hình thức chuyển khoản, Bên B chuyển khoản vào tài khoản sau:</p>
          {contract.bank_name ? (
            <div className="border border-black p-2.5 rounded my-2 bg-slate-50/50 print:bg-transparent">
              <table className="w-full text-left">
                <tbody>
                  <tr>
                    <td className="w-[100px] font-semibold">Ngân hàng:</td>
                    <td>{contract.bank_name}</td>
                    <td className="w-[100px] font-semibold">Số tài khoản:</td>
                    <td>{contract.bank_account_number}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Chủ tài khoản:</td>
                    <td>{contract.bank_account_owner}</td>
                    <td className="font-semibold">Cú pháp CK:</td>
                    <td className="font-mono text-xs">{contract.transfer_content_template}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="italic text-gray-500">Chưa thiết lập thông tin ngân hàng nhận cọc.</p>
          )}
          <p className="text-justify">
            Nếu trong thời gian từ khi ký Hợp đồng cọc này đến hết ngày <span className="font-semibold">{contract.deadline_sign_contract ? new Date(contract.deadline_sign_contract).toLocaleDateString('vi-VN') : '...'}</span>, tất cả các nội dung trong hợp đồng thuê phòng đã được hai bên thống nhất mà Bên B không chủ động liên hệ để ký kết Hợp đồng thuê phòng chính thức thì Bên B phải chịu mất toàn bộ số tiền đã đặt cọc ở trên.
          </p>
          <p className="text-justify">
            Ngược lại, nếu đến hết thời hạn trên, tất cả các nội dung thỏa thuận đã được thống nhất mà Bên A không đồng ý ký kết Hợp đồng thuê phòng cho Bên B thì Bên A phải trả lại cho Bên B toàn bộ số tiền đặt cọc đã nhận.
          </p>
        </div>

        {/* ĐIỀU 3 */}
        <div className="space-y-1 mt-4">
          <p className="font-bold">ĐIỀU 3: ĐIỀU KHOẢN CHUNG</p>
          <p className="text-justify">
            3.1 Hai bên xác định hoàn toàn tự nguyện khi giao kết Hợp đồng cọc này. Những thông tin về nhân thân đã ghi nhận là hoàn toàn đúng sự thật. Bên A cam kết ngôi nhà thuộc quyền quản lý/cho thuê hợp pháp theo đúng quy định, không tranh chấp, không kê biên thi hành án.
          </p>
          <p className="text-justify">
            3.2 Hợp đồng cọc này có hiệu lực kể từ ngày ký, được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để làm căn cứ thực hiện.
          </p>
        </div>

        {/* Chữ ký hai bên */}
        <div className="grid grid-cols-2 text-center mt-12 mb-20">
          <div className="space-y-1">
            <p className="font-bold uppercase text-[12.5px]">ĐẠI DIỆN BÊN A</p>
            <p className="text-xs italic text-slate-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="font-bold text-[14px]">{contract.party_a_name}</p>
          </div>
          <div className="space-y-1">
            <p className="font-bold uppercase text-[12.5px]">ĐẠI DIỆN BÊN B</p>
            <p className="text-xs italic text-slate-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="font-bold text-[14px]">{contract.party_b_name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
