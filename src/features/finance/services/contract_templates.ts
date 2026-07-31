import { supabase } from '@/lib/supabase/client';

export interface ContractTemplateItem {
  id?: string;
  company_id?: string | null;
  name: string;
  type: 'deposit' | 'rental' | 'handover' | 'invoice' | 'maintenance';
  content: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Các mẫu A4 mặc định với biến động chuẩn ─────────────────────────────

export const DEFAULT_DEPOSIT_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13.5pt; line-height: 1.6; color: #000;">
  <div style="text-align: center;">
    <h3 style="font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <h4 style="font-weight: bold; font-size: 11pt; margin: 2px 0 0 0;">Độc lập – Tự do – Hạnh phúc</h4>
    <div style="width: 130px; height: 1px; background-color: #000; margin: 4px auto 0 auto;"></div>
  </div>

  <div style="text-align: center; margin-top: 24px; margin-bottom: 18px;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">HỢP ĐỒNG ĐẶT CỌC THUÊ PHÒNG</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Hôm nay, ngày {AGREEMENT_DATE} tại {SIGN_LOCATION}</p>
  </div>

  <p style="font-weight: bold; font-style: italic;">Chúng tôi gồm có:</p>

  <div style="margin-bottom: 12px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN CHO THUÊ PHÒNG (BÊN A):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 100px;">Họ và tên:</td>
        <td style="font-weight: bold;">{PARTY_A_NAME}</td>
        <td style="width: 90px;">Điện thoại:</td>
        <td>{PARTY_A_PHONE}</td>
      </tr>
      <tr>
        <td>Địa chỉ:</td>
        <td colspan="3">{PARTY_A_ADDRESS}</td>
      </tr>
      <tr>
        <td>CMND/CCCD:</td>
        <td>{PARTY_A_ID_CARD}</td>
        <td>Cấp tại:</td>
        <td>{PARTY_A_ID_PLACE}</td>
      </tr>
    </table>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN THUÊ PHÒNG (BÊN B):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 100px;">Họ và tên:</td>
        <td style="font-weight: bold;">{PARTY_B_NAME}</td>
        <td style="width: 90px;">Điện thoại:</td>
        <td>{PARTY_B_PHONE}</td>
      </tr>
      <tr>
        <td>CMND/CCCD:</td>
        <td>{PARTY_B_ID_CARD}</td>
        <td>Cấp tại:</td>
        <td>{PARTY_B_ID_PLACE}</td>
      </tr>
      <tr>
        <td>Thường trú:</td>
        <td colspan="3">{PARTY_B_ADDRESS}</td>
      </tr>
    </table>
  </div>

  <p>Hai bên thống nhất ký kết Hợp đồng đặt cọc thuê phòng với các điều khoản sau:</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 1: THỎA THUẬN THUÊ & TIỀN ĐẶT CỌC</p>
  <p style="margin: 0 0 4px 0;">1.1 Bên A đồng ý giữ chỗ cho Bên B thuê phòng số: <strong>{ROOM_CODE}</strong> thuộc tòa nhà <strong>{BUILDING_NAME}</strong> tại địa chỉ: {BUILDING_ADDRESS}.</p>
  <p style="margin: 0 0 4px 0;">1.2 Giá thuê thỏa thuận: <strong>{RENT_PRICE} VNĐ/tháng</strong>.</p>
  <p style="margin: 0 0 4px 0;">1.3 Đơn giá dịch vụ: Điện {ELECTRICITY_PRICE} VNĐ/kWh | Nước {WATER_PRICE} | Phí dịch vụ {SERVICE_PRICE}.</p>
  <p style="margin: 0 0 4px 0;">1.4 Bên B đặt cọc trước số tiền: <strong style="font-size: 14pt;">{DEPOSIT_AMOUNT} VNĐ</strong> (Bằng chữ: {DEPOSIT_AMOUNT_WORDS}).</p>
  <p style="margin: 0 0 4px 0;">1.5 Hạn cuối ký hợp đồng thuê chính thức: <strong>{DEADLINE_SIGN_DATE}</strong>.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 2: XỬ LÝ TIỀN CỌC</p>
  <p style="margin: 0 0 4px 0;">- Nếu Bên B từ chối ký hợp đồng thuê đúng hạn mà không có lý do chính đáng được Bên A chấp thuận thì Bên B bị mất toàn bộ tiền đặt cọc.</p>
  <p style="margin: 0 0 4px 0;">- Nếu Bên A từ chối cho Bên B thuê phòng theo đúng cam kết thì Bên A phải hoàn trả 100% tiền đặt cọc cho Bên B.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 3: ĐIỀU KHOẢN CHUNG</p>
  <p style="margin: 0 0 16px 0;">Hợp đồng lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">ĐẠI DIỆN BÊN A</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
        <p style="font-weight: bold; margin: 0;">{PARTY_A_NAME}</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">ĐẠI DIỆN BÊN B</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
        <p style="font-weight: bold; margin: 0;">{PARTY_B_NAME}</p>
      </td>
    </tr>
  </table>
</div>
`;

export const DEFAULT_RENTAL_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13.5pt; line-height: 1.6; color: #000;">
  <div style="text-align: center;">
    <h3 style="font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <h4 style="font-weight: bold; font-size: 11pt; margin: 2px 0 0 0;">Độc lập – Tự do – Hạnh phúc</h4>
    <div style="width: 130px; height: 1px; background-color: #000; margin: 4px auto 0 auto;"></div>
  </div>

  <div style="text-align: center; margin-top: 24px; margin-bottom: 18px;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">HỢP ĐỒNG THUÊ CĂN HỘ / PHÒNG TRỌ</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Mã hợp đồng: {CONTRACT_CODE} — Lập ngày {AGREEMENT_DATE}</p>
  </div>

  <p style="font-weight: bold; font-style: italic;">Hôm nay, hai bên chúng tôi gồm có:</p>

  <div style="margin-bottom: 12px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN CHO THUÊ (BÊN A):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 110px;">Họ và tên:</td>
        <td style="font-weight: bold;">{PARTY_A_NAME}</td>
        <td style="width: 90px;">Điện thoại:</td>
        <td>{PARTY_A_PHONE}</td>
      </tr>
      <tr>
        <td>Địa chỉ:</td>
        <td colspan="3">{PARTY_A_ADDRESS}</td>
      </tr>
      <tr>
        <td>CMND/CCCD:</td>
        <td>{PARTY_A_ID_CARD}</td>
        <td>Nơi cấp:</td>
        <td>{PARTY_A_ID_PLACE}</td>
      </tr>
    </table>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN THUÊ (BÊN B):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 110px;">Họ và tên:</td>
        <td style="font-weight: bold;">{PARTY_B_NAME}</td>
        <td style="width: 90px;">Điện thoại:</td>
        <td>{PARTY_B_PHONE}</td>
      </tr>
      <tr>
        <td>CMND/CCCD:</td>
        <td>{PARTY_B_ID_CARD}</td>
        <td>Nơi cấp:</td>
        <td>{PARTY_B_ID_PLACE}</td>
      </tr>
      <tr>
        <td>Thường trú:</td>
        <td colspan="3">{PARTY_B_ADDRESS}</td>
      </tr>
      <tr>
        <td>Số người ở:</td>
        <td colspan="3"><strong>{TENANT_COUNT} người</strong></td>
      </tr>
    </table>
  </div>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 1: PHÒNG THUÊ VÀ THỜI HẠN</p>
  <p style="margin: 0 0 4px 0;">1.1 Bên A đồng ý cho Bên B thuê phòng số: <strong>{ROOM_CODE}</strong> thuộc tòa nhà <strong>{BUILDING_NAME}</strong> tại {BUILDING_ADDRESS}.</p>
  <p style="margin: 0 0 4px 0;">1.2 Thời hạn thuê: <strong>{LEASE_DURATION_MONTHS} tháng</strong>, bắt đầu từ ngày <strong>{START_DATE}</strong> đến hết ngày <strong>{END_DATE}</strong>.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 2: GIÁ CẢ VÀ PHƯƠNG THỨC THANH TOÁN</p>
  <p style="margin: 0 0 4px 0;">2.1 Giá thuê phòng: <strong style="font-size: 14pt;">{RENT_PRICE} VNĐ/tháng</strong>.</p>
  <p style="margin: 0 0 4px 0;">2.2 Tiền cọc giữ tài sản: <strong>{DEPOSIT_AMOUNT} VNĐ</strong>.</p>
  <p style="margin: 0 0 4px 0;">2.3 Chi phí dịch vụ hàng tháng:</p>
  <ul style="margin: 0 0 6px 20px; padding: 0;">
    <li>Điện: {ELECTRICITY_PRICE} VNĐ/kWh (tính theo công tơ)</li>
    <li>Nước: {WATER_PRICE}</li>
    <li>Dịch vụ chung: {SERVICE_PRICE}</li>
  </ul>
  <p style="margin: 0 0 4px 0;">2.4 Tiền nhà thanh toán định kỳ vào ngày <strong>05 hàng tháng</strong>.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 3: QUY ĐỊNH VẬN HÀNH & TRÁCH NHIỆM</p>
  <p style="margin: 0 0 4px 0;">- Bên B có trách nhiệm bảo quản tài sản trang thiết bị phòng theo biên bản bàn giao.</p>
  <p style="margin: 0 0 4px 0;">- Giữ gìn an ninh trật tự, vệ sinh chung, tuân thủ nội quy tòa nhà.</p>
  <p style="margin: 0 0 16px 0;">- Khi hết hạn hợp đồng hoặc muốn chấm dứt trước hạn phải báo trước ít nhất 30 ngày.</p>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN CHO THUÊ (BÊN A)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
        <p style="font-weight: bold; margin: 0;">{PARTY_A_NAME}</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN THUÊ (BÊN B)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
        <p style="font-weight: bold; margin: 0;">{PARTY_B_NAME}</p>
      </td>
    </tr>
  </table>
</div>
`;

export const DEFAULT_HANDOVER_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13.5pt; line-height: 1.6; color: #000;">
  <div style="text-align: center;">
    <h3 style="font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <h4 style="font-weight: bold; font-size: 11pt; margin: 2px 0 0 0;">Độc lập – Tự do – Hạnh phúc</h4>
    <div style="width: 130px; height: 1px; background-color: #000; margin: 4px auto 0 auto;"></div>
  </div>

  <div style="text-align: center; margin-top: 24px; margin-bottom: 18px;">
    <h2 style="font-weight: bold; font-size: 15pt; text-transform: uppercase; margin: 0;">BIÊN BẢN BÀN GIAO PHÒNG & THIẾT BỊ NỘI THẤT</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Ngày lập: {AGREEMENT_DATE} tại phòng {ROOM_CODE} — {BUILDING_NAME}</p>
  </div>

  <p><strong>Bên bàn giao (BQL/Bên A):</strong> {PARTY_A_NAME} — SĐT: {PARTY_A_PHONE}</p>
  <p><strong>Bên nhận bàn giao (Khách thuê/Bên B):</strong> {PARTY_B_NAME} — SĐT: {PARTY_B_PHONE}</p>

  <p style="font-weight: bold; margin-top: 14px; margin-bottom: 6px;">1. BÀN GIAO CHỈ SỐ ĐỒNG HỒ BAN ĐẦU:</p>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 14px;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #000; padding: 6px;">Hạng mục</th>
        <th style="border: 1px solid #000; padding: 6px;">Chỉ số đầu (Bàn giao)</th>
        <th style="border: 1px solid #000; padding: 6px;">Đơn vị tính</th>
        <th style="border: 1px solid #000; padding: 6px;">Ghi chú hiện trạng</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Chỉ số Công tơ Điện</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{ELECTRICITY_START}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">kWh (Số)</td>
        <td style="border: 1px solid #000; padding: 6px;">Công tơ hoạt động bình thường</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Chỉ số Đồng hồ Nước</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{WATER_START}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">m³ (Khối)</td>
        <td style="border: 1px solid #000; padding: 6px;">Không rò rỉ nước</td>
      </tr>
    </tbody>
  </table>

  <p style="font-weight: bold; margin-top: 14px; margin-bottom: 6px;">2. DANH SÁCH THIẾT BỊ NỘI THẤT BÀN GIAO:</p>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #000; padding: 6px; width: 40px;">STT</th>
        <th style="border: 1px solid #000; padding: 6px;">Tên trang thiết bị</th>
        <th style="border: 1px solid #000; padding: 6px; width: 70px;">Số lượng</th>
        <th style="border: 1px solid #000; padding: 6px;">Tình trạng bàn giao</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">1</td><td style="border: 1px solid #000; padding: 6px;">Điều hòa nhiệt độ + Điều khiển</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">01 bộ</td><td style="border: 1px solid #000; padding: 6px;">Hoạt động tốt, làm lạnh nhanh</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">2</td><td style="border: 1px solid #000; padding: 6px;">Bình nóng lạnh Ariston</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">01 cái</td><td style="border: 1px solid #000; padding: 6px;">Nóng nhanh, an toàn chống giật</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">3</td><td style="border: 1px solid #000; padding: 6px;">Tủ lạnh / Giường / Tủ quần áo</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">Đầy đủ</td><td style="border: 1px solid #000; padding: 6px;">Mới 98%, không hư hại</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">4</td><td style="border: 1px solid #000; padding: 6px;">Chìa khóa phòng / Thẻ từ thang máy</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">02 bộ</td><td style="border: 1px solid #000; padding: 6px;">Quẹt thẻ & mở khóa tốt</td></tr>
    </tbody>
  </table>

  <p style="margin-top: 14px;">Hai bên đã kiểm tra trực tiếp và xác nhận đầy đủ số lượng cũng như tình trạng thiết bị như trên.</p>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN BÀN GIAO (BÊN A)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký xác nhận)</p>
        <p style="font-weight: bold; margin: 0;">{PARTY_A_NAME}</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN NHẬN BÀN GIAO (BÊN B)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký xác nhận)</p>
        <p style="font-weight: bold; margin: 0;">{PARTY_B_NAME}</p>
      </td>
    </tr>
  </table>
</div>
`;

export const DEFAULT_INVOICE_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13.5pt; line-height: 1.6; color: #000;">
  <div style="text-align: center;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">PHIẾU BẢNG KÊ HÓA ĐƠN TIỀN NHÀ & DỊCH VỤ</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Kỳ thanh toán: {PERIOD} — Mã HĐ: {INVOICE_CODE}</p>
  </div>

  <div style="margin-top: 16px; margin-bottom: 14px;">
    <p style="margin: 0 0 4px 0;"><strong>Khách thuê (Bên B):</strong> {PARTY_B_NAME} — SĐT: {PARTY_B_PHONE}</p>
    <p style="margin: 0 0 4px 0;"><strong>Căn hộ:</strong> Phòng {ROOM_CODE} — {BUILDING_NAME}</p>
    <p style="margin: 0 0 4px 0;"><strong>Hạn thanh toán:</strong> <span style="color: #c53030; font-weight: bold;">{DUE_DATE}</span></p>
  </div>

  <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 16px;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 40px;">STT</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Hạng mục dịch vụ</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center;">Số cũ</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center;">Số mới</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center;">Sử dụng</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right;">Thành tiền (VNĐ)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">1</td>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Tiền thuê phòng tháng</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">1 tháng</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">{RENT_AMOUNT}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">2</td>
        <td style="border: 1px solid #000; padding: 6px;">Tiền điện sinh hoạt</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{ELEC_OLD}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{ELEC_NEW}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{ELEC_USAGE} kWh</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{ELEC_AMOUNT}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">3</td>
        <td style="border: 1px solid #000; padding: 6px;">Tiền nước sử dụng</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{WATER_OLD}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{WATER_NEW}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">{WATER_USAGE} m³</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{WATER_AMOUNT}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">4</td>
        <td style="border: 1px solid #000; padding: 6px;">Phí dịch vụ chung tòa nhà</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">1 phòng</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">{SERVICE_AMOUNT}</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td colspan="5" style="border: 1px solid #000; padding: 8px; font-weight: bold; text-align: right;">TỔNG CỘNG THANH TOÁN:</td>
        <td style="border: 1px solid #000; padding: 8px; font-weight: bold; text-align: right; font-size: 14pt; color: #b7791f;">{TOTAL_AMOUNT} VNĐ</td>
      </tr>
    </tbody>
  </table>

  <div style="border: 1px dashed #000; padding: 10px; margin-top: 14px; border-radius: 4px;">
    <p style="font-weight: bold; margin: 0 0 4px 0;">THÔNG TIN CHUYỂN KHOẢN THANH TOÁN:</p>
    <p style="margin: 0;">- Ngân hàng: <strong>{BANK_NAME}</strong> | Số tài khoản: <strong>{BANK_ACCOUNT}</strong></p>
    <p style="margin: 0;">- Chủ tài khoản: <strong>{BANK_OWNER}</strong></p>
    <p style="margin: 0;">- Nội dung chuyển khoản: <strong>{TRANSFER_MEMO}</strong></p>
  </div>
</div>
`;

export const DEFAULT_MAINTENANCE_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13.5pt; line-height: 1.6; color: #000;">
  <div style="text-align: center;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">PHIẾU TIẾP NHẬN & BẢO TRÌ SỬA CHỮA</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Mã phiếu: {MAINTENANCE_ID} — Ngày gửi: {CREATED_AT}</p>
  </div>

  <div style="margin-top: 18px; margin-bottom: 14px;">
    <p style="margin: 0 0 4px 0;"><strong>Khách thuê báo sự cố:</strong> {SENDER_NAME} — SĐT: {SENDER_PHONE}</p>
    <p style="margin: 0 0 4px 0;"><strong>Căn hộ:</strong> Phòng {ROOM_CODE} — {BUILDING_NAME}</p>
    <p style="margin: 0 0 4px 0;"><strong>Tiêu đề sự cố:</strong> <span style="font-weight: bold; color: #c53030;">{ISSUE_TITLE}</span></p>
    <p style="margin: 0 0 4px 0;"><strong>Mức độ ưu tiên:</strong> {PRIORITY}</p>
  </div>

  <div style="border: 1px solid #000; padding: 12px; margin-bottom: 16px; min-height: 80px;">
    <p style="font-weight: bold; margin: 0 0 4px 0;">MÔ TẢ CHI TIẾT SỰ CỐ:</p>
    <p style="margin: 0;">{ISSUE_DESCRIPTION}</p>
  </div>

  <div style="border: 1px solid #000; padding: 12px; margin-bottom: 16px; min-height: 80px;">
    <p style="font-weight: bold; margin: 0 0 4px 0;">KẾT QUẢ XỬ LÝ CỦA ĐỘI KỸ THUẬT & BQL:</p>
    <p style="margin: 0; color: #666; font-style: italic;">{SOLUTION_NOTE}</p>
  </div>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">ĐỘI KỸ THUẬT XỬ LÝ</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">KHÁCH THUÊ XÁC NHẬN</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
        <p style="font-weight: bold; margin: 0;">{SENDER_NAME}</p>
      </td>
    </tr>
  </table>
</div>
`;

// Helper lấy template chuẩn mặc định theo type
export function getDefaultTemplateContent(type: ContractTemplateItem['type']): string {
  switch (type) {
    case 'deposit':
      return DEFAULT_DEPOSIT_TEMPLATE;
    case 'rental':
      return DEFAULT_RENTAL_TEMPLATE;
    case 'handover':
      return DEFAULT_HANDOVER_TEMPLATE;
    case 'invoice':
      return DEFAULT_INVOICE_TEMPLATE;
    case 'maintenance':
      return DEFAULT_MAINTENANCE_TEMPLATE;
    default:
      return DEFAULT_RENTAL_TEMPLATE;
  }
}

// Fetch template từ DB
export async function getContractTemplate(companyId?: string | null, type: ContractTemplateItem['type'] = 'rental'): Promise<string> {
  try {
    let query = supabase.from('contract_templates').select('content').eq('type', type);
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).single();

    if (!error && data?.content) {
      return data.content;
    }
  } catch (err) {
    // Ignore error, fallback to default template
  }
  return getDefaultTemplateContent(type);
}

// Lưu/Cập nhật template vào DB
export async function saveContractTemplate(
  type: ContractTemplateItem['type'],
  name: string,
  content: string,
  companyId?: string | null
): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('contract_templates')
      .select('id')
      .eq('type', type)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('contract_templates')
        .update({
          name,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('contract_templates').insert({
        company_id: companyId || null,
        name,
        type,
        content,
      });
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error('Error saving contract template:', err);
    return false;
  }
}
