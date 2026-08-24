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
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; word-break: break-word; overflow-wrap: anywhere;">
  <div style="text-align: center;">
    <h3 style="font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <h4 style="font-weight: bold; font-size: 11pt; margin: 2px 0 0 0;">Độc lập – Tự do – Hạnh phúc</h4>
    <p style="font-weight: bold; font-size: 10pt; margin: 2px 0 0 0;">--------o0o--------</p>
  </div>

  <div style="text-align: center; margin-top: 18px; margin-bottom: 16px;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">HỢP ĐỒNG ĐẶT CỌC TIỀN PHÒNG</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Hôm nay, ngày ... tháng ... năm 20... Tại địa chỉ: .................................................................</p>
  </div>

  <div style="font-style: italic; font-size: 11pt; margin-bottom: 12px; padding-left: 10px;">
    <p style="margin: 0 0 2px 0;">- Căn cứ Bộ luật Dân sự và Bộ luật Hình sự nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.</p>
    <p style="margin: 0 0 2px 0;">- Căn cứ Luật Thương mại và Luật Kinh doanh Bất động sản (cho thuê nhà) hiện hành.</p>
    <p style="margin: 0 0 2px 0;">- Căn cứ nhu cầu và khả năng của hai bên.</p>
  </div>

  <p style="font-weight: bold; font-style: italic; margin-bottom: 6px;">Chúng tôi những người ký tên dưới đây gồm:</p>

  <div style="margin-bottom: 12px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">1/ BÊN NHẬN TIỀN ĐẶT CỌC (BÊN A):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 110px; white-space: nowrap;">Ông/Bà:</td>
        <td style="font-weight: bold;">...............................................................</td>
        <td style="width: 85px; white-space: nowrap;">Ngày sinh:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">CMND/CCCD:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Cấp ngày:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Nơi cấp:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Điện thoại:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Thường trú:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
    </table>
    <p style="font-style: italic; margin: 4px 0 0 0; font-size: 11pt;">(Là đại diện BQL/Chủ sở hữu và sử dụng hợp pháp của toàn bộ căn nhà nêu tại Điều 1 dưới đây)</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">2/ BÊN GIAO TIỀN ĐẶT CỌC (BÊN B):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 110px; white-space: nowrap;">Ông/Bà:</td>
        <td style="font-weight: bold;">...............................................................</td>
        <td style="width: 85px; white-space: nowrap;">Ngày sinh:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">CMND/CCCD:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Cấp ngày:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Nơi cấp:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Điện thoại:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Thường trú:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
    </table>
  </div>

  <p style="margin-bottom: 8px;">Sau khi bàn bạc, hai Bên cùng đi đến thống nhất một số điều khoản như sau:</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 1: TIỀN ĐẶT CỌC, MỤC ĐÍCH ĐẶT CỌC</p>
  <p style="margin: 0 0 4px 0;">1.1 Bên B đồng ý thuê của Bên A phòng số: <strong>............</strong> thuộc Tòa nhà có địa chỉ: .................................................................................................................................... do Bên A đại diện là BQL tòa nhà với các thỏa thuận trong hợp đồng như sau:</p>
  <ul style="margin: 2px 0 6px 20px; padding: 0;">
    <li>Mục đích thuê: Để ở và sinh hoạt | Số lượng người đăng ký ở: <strong>...... người</strong></li>
    <li>Hợp đồng có thời hạn: <strong>...... tháng</strong> và bắt đầu tính tiền từ ngày: <strong>.../.../20...</strong></li>
    <li>Giá thuê phòng: <strong>........................................ VNĐ/tháng</strong></li>
    <li>Phương thức thanh toán: Đặt cọc 01 tháng và thanh toán 01 tháng tiền nhà</li>
  </ul>
  <p style="margin: 0 0 4px 0;">1.2 Để đảm bảo chắc chắn việc ký hợp đồng thuê phòng và trả tiền thuê phòng muộn nhất vào ngày: <strong>.../.../20...</strong>. Nay Bên B tự nguyện đóng cho Bên A một số tiền là: <strong style="font-size: 14pt;">........................................ VNĐ</strong> (Bằng chữ: ....................................................................................................) gọi là tiền đặt cọc.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 2: THỎA THUẬN VỀ VIỆC GIẢI QUYẾT TIỀN ĐẶT CỌC</p>
  <p style="margin: 0 0 4px 0;">2.1 Từ ngày ký hợp đồng này đến ngày <strong>.../.../20...</strong> (là ngày Bên B phải ký hợp đồng thuê và trả tiền thuê phòng) mà Bên B không liên hệ để ký hợp đồng thuê phòng và trả tiền thuê phòng thì Bên B sẽ mất toàn bộ số tiền đã đặt cọc.</p>
  <p style="margin: 0 0 4px 0;">2.2 Nếu đến hết ngày <strong>.../.../20...</strong> (là ngày Bên A phải ký hợp đồng với Bên B), mà Bên A không ký hợp đồng cho thuê với Bên B thì Bên A phải trả lại cho Bên B toàn bộ số tiền mà Bên B đã đặt cọc cho Bên A.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 3: CAM KẾT CỦA HAI BÊN</p>
  <p style="margin: 0 0 4px 0;">3.1 Hai bên xác định hoàn toàn tự nguyện khi ký hợp đồng này và cam kết cùng nhau thực hiện nghiêm túc những điều khoản trên đây.</p>
  <p style="margin: 0 0 16px 0;">3.2 Hợp đồng này có hiệu lực từ ngày ký, hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau. Sau khi đọc hợp đồng cả 2 bên đã hiểu rõ quyền lợi và nghĩa vụ của mình và cùng ký tên dưới đây.</p>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN NHẬN TIỀN ĐẶT CỌC (BÊN A)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN GIAO TIỀN ĐẶT CỌC (BÊN B)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
    </tr>
  </table>
</div>
`;

export const DEFAULT_BUILDING_DEPOSIT_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; word-break: break-word; overflow-wrap: anywhere;">
  <div style="text-align: center;">
    <h3 style="font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <h4 style="font-weight: bold; font-size: 11pt; margin: 2px 0 0 0;"><u>Độc lập – Tự do – Hạnh phúc</u></h4>
  </div>

  <div style="text-align: center; margin-top: 20px; margin-bottom: 16px;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">HỢP ĐỒNG ĐẶT CỌC THUÊ NHÀ</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Hôm nay, ngày ... tháng ... năm 20... Tại địa chỉ: .................................................................</p>
  </div>

  <div style="font-style: italic; font-size: 11pt; margin-bottom: 12px; padding-left: 10px;">
    <p style="margin: 0 0 2px 0;">- Căn cứ quy định tại Bộ luật Dân sự, Luật Nhà ở hiện hành.</p>
    <p style="margin: 0 0 2px 0;">- Theo sự thỏa thuận của các bên.</p>
  </div>

  <p style="font-weight: bold; font-style: italic; margin-bottom: 6px;">Chúng tôi gồm có:</p>

  <div style="margin-bottom: 12px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN NHẬN ĐẶT CỌC (BÊN A):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 110px; white-space: nowrap;">Ông/Bà:</td>
        <td style="font-weight: bold;">...............................................................</td>
        <td style="width: 85px; white-space: nowrap;">Năm sinh:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">CMND/CCCD:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Cấp ngày:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Nơi cấp:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Điện thoại:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Hộ khẩu:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Thường trú:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
    </table>
    <p style="font-style: italic; margin: 4px 0 0 0; font-size: 11pt;">(Là chủ sở hữu nhà ở & đất tại địa chỉ nêu tại Điều 1)</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN ĐẶT CỌC (BÊN B):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 110px; white-space: nowrap;">Ông/Bà:</td>
        <td style="font-weight: bold;">...............................................................</td>
        <td style="width: 85px; white-space: nowrap;">Năm sinh:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">CMND/CCCD:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Cấp ngày:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Nơi cấp:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Điện thoại:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Thường trú:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Mã số thuế:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Số tài khoản:</td>
        <td>........................................</td>
      </tr>
    </table>
  </div>

  <p style="margin-bottom: 8px;">Sau khi trao đổi thỏa thuận hai bên cùng nhau ký kết Hợp đồng đặt cọc với những nội dung sau:</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 1: TIỀN ĐẶT CỌC, MỤC ĐÍCH & THANH TOÁN</p>
  <p style="margin: 0 0 4px 0;">1.1 Bên A đồng ý sẽ cho Bên B thuê nhà, đất do mình là chủ sở hữu tại địa chỉ: ....................................................................................................................................</p>
  <ul style="margin: 2px 0 6px 20px; padding: 0;">
    <li>a) Tổng diện tích sử dụng: .................... m²</li>
    <li>b) Diện tích xây dựng: .................... m²</li>
    <li>c) Số phòng sử dụng: .................... phòng</li>
  </ul>
  <p style="margin: 0 0 4px 0;">Với một số thỏa thuận cơ bản sẽ ký kết trong Hợp đồng thuê nhà như sau:</p>
  <ul style="margin: 2px 0 6px 20px; padding: 0;">
    <li>Mục đích thuê để sử dụng: ................................................................................</li>
    <li>Hợp đồng có thời hạn: ...... năm (...... tháng) bắt đầu tính tiền nhà từ ngày: .../.../20...</li>
    <li>Giá thuê nhà là: <strong>........................................ VNĐ/tháng</strong> (Bằng chữ: ....................................................................................................)</li>
    <li>Giá này sẽ được điều chỉnh từ năm thứ ...... với mức tăng không quá ......%</li>
    <li>Phương thức thanh toán: ................................................................................</li>
  </ul>
  <p style="margin: 0 0 4px 0;">1.2 Để đảm bảo việc ký kết Hợp đồng thuê nhà muộn nhất vào ngày: <strong>.../.../20...</strong>. Nay Bên B đồng ý đóng cho Bên A một số tiền là: <strong style="font-size: 14pt;">........................................ VNĐ</strong> (Bằng chữ: ....................................................................................................) gọi là tiền cọc.</p>
  <p style="margin: 0 0 4px 0;">1.3 Mục đích đặt cọc: Đảm bảo thực hiện việc ký kết Hợp đồng thuê nhà.</p>
  <p style="margin: 0 0 4px 0;">1.4 Thời gian đặt cọc: Ngay sau khi hai bên cùng ký hợp đồng đặt cọc này.</p>
  <p style="margin: 0 0 4px 0;">1.5 Hình thức thanh toán: ................................................................................ Sau khi nhận tiền Bên A ghi rõ đã nhận đủ tiền vào cuối Hợp đồng này.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 2: THỎA THUẬN VỀ VIỆC GIẢI QUYẾT TIỀN ĐẶT CỌC</p>
  <p style="margin: 0 0 4px 0;">Bên B có trách nhiệm giao tiền đặt cọc cho Bên A theo đúng thỏa thuận.</p>
  <p style="margin: 0 0 4px 0;">Nếu trong thời gian từ khi ký Hợp đồng cọc này đến hết ngày: <strong>.../.../20...</strong> (là ngày ký Hợp đồng thuê nhà) tất cả các nội dung trong hợp đồng thuê nhà đã được thống nhất mà Bên B không chủ động liên hệ để ký Hợp đồng thuê nhà thì Bên B phải chịu mất toàn bộ số tiền đã đặt cọc.</p>
  <p style="margin: 0 0 4px 0;">Ngược lại, nếu đến hết ngày: <strong>.../.../20...</strong> (là ngày ký Hợp đồng thuê nhà), tất cả các nội dung trong hợp đồng thuê nhà đã được thống nhất mà Bên A không ký Hợp đồng thuê nhà thì Bên A phải trả lại cho Bên B toàn bộ số tiền đặt cọc đã nhận và <strong>bồi thường cho Bên B gấp 3 lần số tiền đặt cọc đã nhận từ Bên B</strong> (Tổng số tiền phạt & cọc trả lại là: ........................................ VNĐ - Bằng chữ: ....................................................................................................).</p>
  <p style="margin: 0 0 4px 0;">Ngoài các thỏa thuận cơ bản sẽ ký kết trong hợp đồng thuê nhà như đã thống nhất tại Điều 1 Hợp đồng này, nếu hai bên không thống nhất các điều khoản phát sinh thì Bên A sẽ trả lại tiền cọc cho Bên B và hai bên nhất trí không có yêu cầu bồi thường.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 3: ĐIỀU KHOẢN CHUNG</p>
  <p style="margin: 0 0 4px 0;">3.1 Hai bên xác định hoàn toàn tự nguyện khi giao kết Hợp đồng này. Những thông tin về nhân thân là hoàn toàn đúng sự thật và cam kết cùng nhau thực hiện nghiêm túc những điều đã thỏa thuận trong hợp đồng này. Bên A cam kết thông tin về ngôi nhà là đúng sự thật, thuộc trường hợp được cho thuê theo quy định của pháp luật và không bị tranh chấp hay kê biên thi hành án.</p>
  <p style="margin: 0 0 4px 0;">3.2 Nếu phát sinh tranh chấp, các bên cùng nhau thương lượng giải quyết trên nguyên tắc hòa giải cùng có lợi. Nếu không giải quyết được thì một trong hai bên có quyền khởi kiện ra Tòa án có thẩm quyền giải quyết theo quy định của pháp luật.</p>
  <p style="margin: 0 0 16px 0;">3.3 Hợp đồng này có hiệu lực kể từ khi hai bên cùng ký, hợp đồng có 02 trang được lập thành 02 bản, có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN NHẬN ĐẶT CỌC (BÊN A)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN ĐẶT CỌC (BÊN B)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
    </tr>
  </table>
</div>
`;

export const DEFAULT_DEPOSIT_NOTARY_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; word-break: break-word; overflow-wrap: anywhere;">
  <div style="text-align: center;">
    <h3 style="font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <h4 style="font-weight: bold; font-size: 11pt; margin: 2px 0 0 0;">Độc lập - Tự do - Hạnh phúc</h4>
    <p style="font-weight: bold; font-size: 10pt; margin: 2px 0 0 0;">---------------</p>
  </div>

  <div style="text-align: center; margin-top: 18px; margin-bottom: 16px;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">HỢP ĐỒNG ĐẶT CỌC</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 2px;">(V/v: Đặt cọc thuê nhà)</p>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Hôm nay, ngày ... tháng ... năm 20... tại .................................................................</p>
  </div>

  <p style="font-weight: bold; font-style: italic; margin-bottom: 6px;">Chúng tôi gồm có:</p>

  <div style="margin-bottom: 12px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN ĐẶT CỌC (BÊN A):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 110px; white-space: nowrap;">Ông/Bà:</td>
        <td style="font-weight: bold;" colspan="3">...................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Địa chỉ:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Điện thoại:</td>
        <td colspan="3">........................................</td>
      </tr>
    </table>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN NHẬN ĐẶT CỌC (BÊN B):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 110px; white-space: nowrap;">Ông:</td>
        <td style="font-weight: bold;">...............................................................</td>
        <td style="width: 95px; white-space: nowrap;">Số CCCD/HC:</td>
        <td>........................................ (cấp ngày .../.../......)</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Bà:</td>
        <td style="font-weight: bold;">...............................................................</td>
        <td style="white-space: nowrap;">Số CCCD/HC:</td>
        <td>........................................ (cấp ngày .../.../......)</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Địa chỉ:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Điện thoại:</td>
        <td colspan="3">........................................</td>
      </tr>
    </table>
  </div>

  <p style="font-style: italic; margin-bottom: 8px;">Sau khi trao đổi, thỏa thuận, hai bên cùng nhau ký kết hợp đồng đặt cọc này với nội dung như sau:</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 1: TIỀN ĐẶT CỌC, MỤC ĐÍCH & THANH TOÁN</p>
  <p style="margin: 0 0 4px 0;">1.1 Theo đề nghị của Bên A, Bên B đồng ý sẽ cho Bên A thuê căn nhà số: .................................................................................................................................... do mình là chủ sở hữu.</p>
  <p style="margin: 0 0 4px 0;">1.2 Để bảo đảm việc ký kết Hợp đồng thuê nhà dự kiến vào ngày: <strong>.../.../20...</strong>, nay Bên A đồng ý đóng cho Bên B một số tiền là: <strong style="font-size: 14pt;">........................................ VNĐ</strong> (Bằng chữ: ....................................................................................................) gọi là tiền đặt cọc.</p>
  <p style="margin: 0 0 4px 0;">1.3 Mục đích đặt cọc: Bảo đảm thực hiện việc ký kết hợp đồng thuê nhà chính thức.</p>
  <p style="margin: 0 0 4px 0;">1.4 Thời gian đặt cọc: Ngay sau khi hai bên cùng ký hợp đồng đặt cọc này.</p>
  <p style="margin: 0 0 4px 0;">1.5 Hình thức thanh toán: ................................................................................</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 2: THỎA THUẬN VỀ VIỆC GIẢI QUYẾT TIỀN ĐẶT CỌC</p>
  <p style="font-weight: bold; margin: 0 0 4px 0;">2.1 Đối với Bên A (Bên đặt cọc):</p>
  <ul style="margin: 2px 0 6px 20px; padding: 0;">
    <li>Giao tiền đặt cọc cho Bên B theo đúng thỏa thuận.</li>
    <li>Nếu trong thời gian từ khi ký hợp đồng này đến ngày <strong>.../.../20...</strong> mà thay đổi ý định, không muốn thuê nhà nữa thì phải chịu mất toàn bộ số tiền đã đặt cọc.</li>
    <li>Nếu đến hết ngày <strong>.../.../20...</strong> (là ngày dự kiến ký hợp đồng thuê nhà) mà Bên A không liên hệ để ký hợp đồng thuê nhà thì cũng xem như đã tự ý không muốn thuê nhà nữa (ngoại trừ trường hợp có lý do chính đáng, báo trước tối thiểu 02 ngày và được Bên B chấp nhận bằng văn bản).</li>
    <li>Được nhận lại toàn bộ số tiền đã đặt cọc sau khi hai bên chính thức ký hợp đồng thuê nhà tại Phòng công chứng (trừ trường hợp hai bên có thỏa thuận cọc cấn trừ tiền nhà).</li>
    <li>Các quyền và nghĩa vụ khác của bên đặt cọc theo quy định tại Bộ luật Dân sự.</li>
  </ul>

  <p style="font-weight: bold; margin: 6px 0 4px 0;">2.2 Đối với Bên B (Bên nhận đặt cọc):</p>
  <ul style="margin: 2px 0 6px 20px; padding: 0;">
    <li>Được nhận số tiền đặt cọc theo thỏa thuận tại Điều 1.</li>
    <li>Được sở hữu và sử dụng toàn bộ số tiền đặt cọc đã nhận nếu Bên A thay đổi ý kiến (không thuê nhà nữa) hoặc đến hết ngày <strong>.../.../20...</strong> mà Bên A không liên hệ để ký kết hợp đồng thuê nhà.</li>
    <li>Nếu từ ngày ký hợp đồng này đến hết ngày <strong>.../.../20...</strong> mà Bên B thay đổi ý kiến (không cho Bên A thuê nhà nữa) thì Bên B phải trả lại cho Bên A toàn bộ số tiền đặt cọc đã nhận và <strong>bồi thường cho Bên A thêm một khoản tiền tương đương số tiền đặt cọc</strong> (Tổng cộng phải trả lại cọc & bồi thường cọc là: ........................................ VNĐ).</li>
    <li>Các quyền và nghĩa vụ khác của bên nhận đặt cọc theo quy định tại Bộ luật Dân sự.</li>
  </ul>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 3: ĐIỀU KHOẢN CHUNG</p>
  <p style="margin: 0 0 4px 0;">3.1 Hai bên xác định hoàn toàn tự nguyện khi giao kết hợp đồng này, cam kết cùng nhau thực hiện nghiêm túc những điều đã thỏa thuận trên đây.</p>
  <p style="margin: 0 0 4px 0;">3.2 Nếu phát sinh tranh chấp, các bên cùng nhau thương lượng giải quyết trên nguyên tắc hòa giải, cùng có lợi. Nếu không giải quyết được, thì một trong hai bên có quyền khởi kiện để yêu cầu Toà án có thẩm quyền giải quyết theo quy định của pháp luật. <strong>Bên thua kiện phải chịu trả toàn bộ các chi phí liên quan đến vụ kiện, kể cả chi phí thuê luật sư cho bên thắng kiện.</strong></p>
  <p style="margin: 0 0 16px 0;">3.3 Hợp đồng này có hiệu lực kể từ khi hai bên cùng ký, được lập thành 02 (hai) bản có giá trị như nhau, mỗi bên giữ 01 (một) bản.</p>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN A (BÊN ĐẶT CỌC)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN B (BÊN NHẬN ĐẶT CỌC)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 4px 0;">(Ký và ghi rõ họ tên)</p>
        <p style="font-style: italic; font-size: 9.5pt; margin: 0 0 50px 0;">(Ghi rõ đã nhận đủ số tiền ....................)</p>
      </td>
    </tr>
  </table>
</div>
`;

export const DEFAULT_DEPOSIT_HCM_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; word-break: break-word; overflow-wrap: anywhere;">
  <div style="text-align: center;">
    <h3 style="font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <h4 style="font-weight: bold; font-size: 11pt; margin: 2px 0 0 0;">Độc Lập - Tự Do - Hạnh Phúc</h4>
    <p style="font-weight: bold; font-size: 10pt; margin: 2px 0 0 0;">---o0o---</p>
  </div>

  <div style="text-align: center; margin-top: 18px; margin-bottom: 16px;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">HỢP ĐỒNG NHẬN TIỀN ĐẶT CỌC</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 2px;">(Về việc: Giao kết thuê / cho thuê phòng trọ, nhà trọ)</p>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Hôm nay, ngày ... tháng ... năm 20... Tại địa chỉ: .................................................................</p>
  </div>

  <div style="font-style: italic; font-size: 11pt; margin-bottom: 12px; padding-left: 10px;">
    <p style="margin: 0 0 2px 0;">- Căn cứ Bộ luật Dân sự năm 2015.</p>
    <p style="margin: 0 0 2px 0;">- Căn cứ Luật Thương mại năm 2005.</p>
  </div>

  <p style="font-weight: bold; font-style: italic; margin-bottom: 6px;">Chúng tôi những người ký tên dưới đây gồm:</p>

  <div style="margin-bottom: 12px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN A: BÊN NHẬN TIỀN ĐẶT CỌC</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 110px; white-space: nowrap;">Ông/bà:</td>
        <td style="font-weight: bold;">...............................................................</td>
        <td style="width: 85px; white-space: nowrap;">Năm sinh:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">CMND/CCCD:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Ngày cấp:</td>
        <td>.................... Nơi cấp: ....................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Hộ khẩu:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Địa chỉ:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Điện thoại:</td>
        <td colspan="3">........................................</td>
      </tr>
    </table>
    <p style="font-style: italic; margin: 4px 0 0 0; font-size: 11pt;">(Là chủ sở hữu và sử dụng hợp pháp của toàn bộ căn phòng trọ/nhà trọ nêu tại Điều 1 dưới đây - Sau đây gọi tắt là "Bên A")</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN B: BÊN GIAO TIỀN ĐẶT CỌC</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 110px; white-space: nowrap;">Ông/bà:</td>
        <td style="font-weight: bold;">...............................................................</td>
        <td style="width: 85px; white-space: nowrap;">Năm sinh:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">CMND/CCCD:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Ngày cấp:</td>
        <td>.................... Nơi cấp: ....................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Hộ khẩu:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Địa chỉ:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Điện thoại:</td>
        <td colspan="3">........................................</td>
      </tr>
    </table>
    <p style="font-style: italic; margin: 4px 0 0 0; font-size: 11pt;">(Sau đây gọi tắt là "Bên B")</p>
  </div>

  <p style="margin-bottom: 8px;">Hai Bên cùng nhau tiến hành lập hợp đồng này và thực hiện việc giao nhận tiền đặt cọc theo thỏa thuận Bên A cho Bên B thuê căn phòng trọ/nhà trọ nêu tại Điều 1 theo các điều, khoản thỏa thuận của "Hợp đồng thuê phòng trọ/nhà trọ" phù hợp quy định của pháp luật Việt Nam hiện hành cùng với các thỏa thuận quy định sau:</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 1: NỘI DUNG GIAO KẾT</p>
  <p style="margin: 0 0 4px 0;">Bên A đồng ý cho Bên B thuê căn phòng trọ/nhà trọ số: <strong>............</strong> tại địa chỉ: ....................................................................................................................................</p>
  <p style="margin: 0 0 4px 0;">- Giấy chứng nhận quyền sở hữu và sử dụng số: <strong>....................</strong> do Ủy Ban Nhân Dân cấp ngày .../.../...... Cho: ................................................................................</p>
  <p style="margin: 0 0 4px 0;">- Diện tích cho thuê: Tổng diện tích sử dụng: <strong>...... m²</strong> (Rộng ...... m x Dài ...... m x ...... tầng).</p>
  <p style="margin: 0 0 4px 0;">- Giá cho thuê: <strong style="font-size: 14pt;">........................................ VNĐ/tháng</strong>.</p>
  <p style="margin: 0 0 4px 0;">- Thời hạn cho thuê: <strong>...... tháng</strong> từ ngày ký kết "Hợp đồng thuê phòng trọ/nhà trọ" (Sau đây gọi tắt là "Căn phòng").</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 2: TIỀN ĐẶT CỌC VÀ THỜI HẠN GIAO KẾT</p>
  <p style="margin: 0 0 4px 0;">2.1 Bên A đã nhận đủ số tiền do Bên B giao là: <strong style="font-size: 14pt;">........................................ VNĐ</strong> (Viết bằng chữ: ....................................................................................................). Tiền đặt cọc này sẽ được Bên A hoàn trả lại Bên B sau khi ký "Hợp đồng thuê phòng trọ/nhà trọ" chính thức.</p>
  <p style="margin: 0 0 4px 0;">2.2 Thời hạn giao kết hai Bên sẽ ký kết "Hợp đồng thuê phòng trọ/nhà trọ" là <strong>...... ngày</strong>. Bắt đầu từ ngày <strong>.../.../20...</strong> đến hết ngày <strong>.../.../20...</strong></p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 3: CAM KẾT CỦA HAI BÊN</p>
  <p style="font-weight: bold; margin: 0 0 4px 0;">3.1 Cam kết của Bên A:</p>
  <p style="margin: 0 0 4px 0;">- Bên A cam kết căn phòng nêu tại Điều 1.1 là tài sản thuộc quyền sở hữu và sử dụng của mình, các thành viên có quyền đồng sở hữu và sử dụng hoàn toàn đồng ý cho Bên B thuê. Tại thời điểm giao kết biên bản này căn phòng nêu trên không bị thế chấp, kê biên hoặc tranh chấp.</p>
  <p style="margin: 0 0 4px 0;">- Bên A không cho bất kỳ một bên nào khác thuê căn phòng nêu tại Điều 1.1 trong thời hạn giao kết.</p>
  <p style="font-weight: bold; margin: 6px 0 4px 0;">3.2 Cam kết của Bên B:</p>
  <p style="margin: 0 0 4px 0;">- Bên B chắc chắn thuê căn phòng của Bên A nêu tại Điều 1 trong thời hạn giao kết. Khi thuê Căn phòng không sử dụng phòng thuê để kinh doanh các mặt hàng quốc cấm.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 4: PHẠT DO VI PHẠM CAM KẾT</p>
  <p style="margin: 0 0 4px 0;">4.1 Bên A vi phạm cam kết sẽ phải trả lại cho Bên B toàn bộ số tiền Bên B đã đặt cọc nêu tại Điều 2.1; Đồng thời Bên A phải <strong>bồi thường cho Bên B một khoản tiền bằng với số tiền Bên B đã đặt cọc cho Bên A</strong> để Bên B tìm địa điểm thuê khác.</p>
  <p style="margin: 0 0 4px 0;">4.2 Bên B vi phạm cam kết sẽ bị <strong>mất toàn bộ số tiền Bên B đã đặt cọc</strong> cho Bên A nêu tại Điều 2.1 để Bên A tìm khách hàng thuê khác.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 5: ĐIỀU KHOẢN CHUNG</p>
  <p style="margin: 0 0 4px 0;">5.1 Hai bên xác định hoàn toàn tự nguyện khi giao kết biên bản này, cam kết cùng nhau thực hiện nghiêm túc những điều đã thỏa thuận trong biên bản này.</p>
  <p style="margin: 0 0 4px 0;">5.2 Nếu có phát sinh tranh chấp, hai bên cùng nhau thương lượng giải quyết trên nguyên tắc hòa giải, cùng có lợi. Nếu không giải quyết được, thì một trong hai bên có quyền khởi kiện để yêu cầu tòa án có thẩm quyền giải quyết theo quy định của pháp luật. <strong>Bên thua kiện phải chịu trả toàn bộ các chi phí liên quan đến vụ kiện, kể cả chi phí thuê luật sư cho bên thắng kiện.</strong></p>
  <p style="margin: 0 0 4px 0;">5.3 Ngoài các điều khoản đã nêu trong hợp đồng này, các điều khoản khác được thực hiện theo quy định của pháp luật.</p>
  <p style="margin: 0 0 16px 0;">5.4 Hợp đồng này có hiệu lực kể từ ngày ký; Được lập thành 02 (hai) bản, có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản.</p>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN NHẬN TIỀN ĐẶT CỌC (BÊN A)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN GIAO TIỀN ĐẶT CỌC (BÊN B)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
    </tr>
  </table>
</div>
`;

export const DEFAULT_RENTAL_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; word-break: break-word; overflow-wrap: anywhere;">
  <div style="text-align: center;">
    <h3 style="font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <h4 style="font-weight: bold; font-size: 11pt; margin: 2px 0 0 0;">Độc lập – Tự do – Hạnh phúc</h4>
    <p style="font-weight: bold; font-size: 10pt; margin: 2px 0 0 0;">---------------</p>
  </div>

  <div style="text-align: center; margin-top: 18px; margin-bottom: 16px;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">HỢP ĐỒNG THUÊ CĂN HỘ / PHÒNG TRỌ</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Mã hợp đồng: .................... — Lập ngày ... tháng ... năm 20...</p>
  </div>

  <div style="font-style: italic; font-size: 11pt; margin-bottom: 12px; padding-left: 10px;">
    <p style="margin: 0 0 2px 0;">- Căn cứ Bộ luật Dân sự ngày 24 tháng 11 năm 2015;</p>
    <p style="margin: 0 0 2px 0;">- Căn cứ Luật Kinh doanh bất động sản ngày 28 tháng 11 năm 2023 và các văn bản hướng dẫn thi hành;</p>
    <p style="margin: 0 0 2px 0;">- Căn cứ vào nhu cầu và khả năng thực tế của hai bên.</p>
  </div>

  <p style="font-weight: bold; font-style: italic; margin-bottom: 6px;">Hôm nay, hai bên chúng tôi gồm có:</p>

  <div style="margin-bottom: 12px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN CHO THUÊ (BÊN A):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 130px; white-space: nowrap;">Họ và tên / Tổ chức:</td>
        <td style="font-weight: bold;">...............................................................</td>
        <td style="width: 90px; white-space: nowrap;">Điện thoại:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Địa chỉ:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">CMND/CCCD/ĐKKD:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Nơi cấp:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Số tài khoản:</td>
        <td colspan="3">........................................ (Ngân hàng: ........................................)</td>
      </tr>
    </table>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">BÊN THUÊ (BÊN B):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 130px; white-space: nowrap;">Họ và tên / Tổ chức:</td>
        <td style="font-weight: bold;">...............................................................</td>
        <td style="width: 90px; white-space: nowrap;">Điện thoại:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">CMND/CCCD số:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Cấp ngày:</td>
        <td>.../.../...... (Nơi cấp: ....................)</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Hộ khẩu thường trú:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Số người ở cố định:</td>
        <td colspan="3"><strong>...... người</strong> (Thông tin người ở chung theo phụ lục đính kèm)</td>
      </tr>
    </table>
  </div>

  <p style="margin-bottom: 8px;">Hai bên thống nhất ký kết Hợp đồng thuê căn hộ / phòng trọ với các điều khoản chi tiết như sau:</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 1. PHÒNG THUÊ VÀ THỜI HẠN</p>
  <p style="margin: 0 0 4px 0;">1.1 Bên A đồng ý cho Bên B thuê phòng số: <strong>............</strong> thuộc Tòa nhà: <strong>........................................</strong> tại địa chỉ: ....................................................................................................................................</p>
  <p style="margin: 0 0 4px 0;">1.2 Diện tích sử dụng: <strong>...... m²</strong>.</p>
  <p style="margin: 0 0 4px 0;">1.3 Thời hạn thuê: <strong>...... tháng</strong>, bắt đầu từ ngày <strong>.../.../20...</strong> đến hết ngày <strong>.../.../20...</strong></p>
  <p style="margin: 0 0 4px 0;">1.4 Khi hết hạn hợp đồng, nếu Bên B muốn tiếp tục thuê thì phải báo trước cho Bên A tối thiểu 30 ngày để gia hạn.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 2. GIÁ THUÊ, TIỀN ĐẶT CỌC VÀ CHI PHÍ DỊCH VỤ</p>
  <p style="margin: 0 0 4px 0;">2.1 Giá thuê phòng: <strong style="font-size: 14pt;">........................................ VNĐ/tháng</strong> (Bằng chữ: ....................................................................................................). Giá này cố định trong suốt thời hạn hợp đồng.</p>
  <p style="margin: 0 0 4px 0;">2.2 Tiền đặt cọc bảo đảm: <strong style="font-size: 14pt;">........................................ VNĐ</strong> (Bằng chữ: ....................................................................................................). Tiền đặt cọc được Bên A giữ để đảm bảo việc Bên B thực hiện hợp đồng, giữ gìn tài sản và thanh toán đầy đủ các khoản phí.</p>
  <p style="margin: 0 0 4px 0;">2.3 Các chi phí dịch vụ hàng tháng Bên B phải thanh toán:</p>
  <ul style="margin: 2px 0 6px 20px; padding: 0;">
    <li>Tiền điện: Tính theo công tơ điện riêng với giá: .................... VNĐ/kWh.</li>
    <li>Tiền nước: Tính theo chỉ số đồng hồ với giá: .................... VNĐ/m³ (hoặc .................... VNĐ/người/tháng).</li>
    <li>Phí dịch vụ chung (Vệ sinh, thang máy, chiếu sáng hành lang): .................... VNĐ/tháng.</li>
    <li>Phí gửi xe / internet (nếu có): .................... VNĐ/tháng.</li>
  </ul>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 3. PHƯƠNG THỨC VÀ THỜI HẠN THANH TOÁN</p>
  <p style="margin: 0 0 4px 0;">3.1 Phương thức thanh toán: Thanh toán bằng tiền Việt Nam qua chuyển khoản ngân hàng vào tài khoản Bên A hoặc trả tiền mặt.</p>
  <p style="margin: 0 0 4px 0;">3.2 Thời hạn thanh toán: Định kỳ hàng tháng, Bên B thanh toán tiền nhà và tiền dịch vụ cho Bên A từ ngày <strong>01 đến ngày 05 hàng tháng</strong>.</p>
  <p style="margin: 0 0 4px 0;">3.3 Nếu Bên B chậm thanh toán quá 05 ngày mà không có lý do được Bên A chấp thuận, Bên B phải chịu phạt chậm trả 0.5%/ngày trên tổng số tiền chậm thanh toán.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 4. TRANG THIẾT BỊ VÀ BIÊN BẢN BÀN GIAO</p>
  <p style="margin: 0 0 4px 0;">4.1 Trang thiết bị trong phòng được hai bên kiểm tra, ghi nhận chi tiết tại <strong>Biên bản bàn giao nhà và trang thiết bị kèm theo</strong> khi Bên B nhận phòng.</p>
  <p style="margin: 0 0 4px 0;">4.2 Bên B có trách nhiệm giữ gìn, bảo quản toàn bộ trang thiết bị nội thất. Nếu làm hỏng hóc, mất mát do lỗi của Bên B thì Bên B phải bồi thường theo giá thị trường hoặc sửa chữa về đúng hiện trạng ban đầu.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 5. NGHĨA VỤ VÀ QUYỀN HẠN CỦA BÊN A</p>
  <p style="margin: 0 0 4px 0;">5.1 Bàn giao phòng và trang thiết bị cho Bên B đúng thời hạn thỏa thuận.</p>
  <p style="margin: 0 0 4px 0;">5.2 Bảo đảm quyền sử dụng phòng ổn định, riêng tư cho Bên B trong thời hạn thuê.</p>
  <p style="margin: 0 0 4px 0;">5.3 Sửa chữa kịp thời các hư hỏng thuộc về kết cấu tòa nhà hoặc hệ thống điện nước chung không phải do lỗi Bên B.</p>
  <p style="margin: 0 0 4px 0;">5.4 Được quyền kiểm tra định kỳ tình trạng phòng (báo trước cho Bên B tối thiểu 24h) và thu tiền thuê/dịch vụ đúng hạn.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 6. NGHĨA VỤ VÀ QUYỀN HẠN CỦA BÊN B</p>
  <p style="margin: 0 0 4px 0;">6.1 Sử dụng phòng đúng mục đích ở, thanh toán tiền thuê nhà và phí dịch vụ đầy đủ, đúng thời hạn.</p>
  <p style="margin: 0 0 4px 0;">6.2 Chấp hành nghiêm chỉnh nội quy tòa nhà, giữ gìn an ninh trật tự, vệ sinh chung, không gây ồn ào ảnh hưởng xung quanh.</p>
  <p style="margin: 0 0 4px 0;">6.3 Đăng ký tạm trú đầy đủ với cơ quan công an địa phương theo quy định.</p>
  <p style="margin: 0 0 4px 0;">6.4 Không tự ý sửa chữa, đục phá tường, cải tạo kết cấu phòng khi chưa được Bên A đồng ý bằng văn bản.</p>
  <p style="margin: 0 0 4px 0;">6.5 Tuyệt đối không cho thuê lại, sang nhượng phòng hoặc chứa chấp hàng cấm, chất cháy nổ, ma túy, tệ nạn xã hội trong phòng.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 7. ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG VÀ PHẠT VI PHẠM</p>
  <p style="margin: 0 0 4px 0;">7.1 Bên B đơn phương chấm dứt hợp đồng trước thời hạn mà không báo trước 30 ngày hoặc không có lý do chính đáng: <strong>Bên B bị mất 100% tiền đặt cọc</strong>.</p>
  <p style="margin: 0 0 4px 0;">7.2 Bên A đơn phương chấm dứt hợp đồng lấy lại phòng trước thời hạn không có lý do hợp pháp: Bên A phải hoàn trả 100% tiền cọc và <strong>bồi thường cho Bên B một khoản tiền tương đương tiền cọc (đền cọc x1)</strong>.</p>
  <p style="margin: 0 0 4px 0;">7.3 Trường hợp Bên B chậm thanh toán tiền nhà quá 10 ngày hoặc vi phạm nghiêm trọng quy định an ninh/PCCC/hàng cấm: Bên A có quyền đơn phương chấm dứt hợp đồng, cắt dịch vụ điện nước, thu hồi phòng và Bên B bị mất tiền cọc.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 8. GIẢI QUYẾT TRANH CHẤP & CHI PHÍ LUẬT SƯ</p>
  <p style="margin: 0 0 4px 0;">8.1 Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng. Mọi tranh chấp phát sinh sẽ được thương lượng hòa giải trên tinh thần hợp tác.</p>
  <p style="margin: 0 0 4px 0;">8.2 Nếu không tự hòa giải được, vụ việc sẽ được đưa ra Tòa án có thẩm quyền giải quyết. <strong>Bên thua kiện phải chịu toàn bộ án phí, chi phí tố tụng và chi phí thuê luật sư cho bên thắng kiện.</strong></p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 9. ĐIỀU KHOẢN THI HÀNH</p>
  <p style="margin: 0 0 16px 0;">Hợp đồng này có hiệu lực kể từ ngày ký, được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản để thực hiện.</p>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN CHO THUÊ (BÊN A)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN THUÊ (BÊN B)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
    </tr>
  </table>
</div>
`;

export const DEFAULT_RENTAL_OFFICIAL_2024_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; word-break: break-word; overflow-wrap: anywhere;">
  <div style="text-align: center;">
    <h3 style="font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <h4 style="font-weight: bold; font-size: 11pt; margin: 2px 0 0 0;">Độc lập - Tự do - Hạnh phúc</h4>
    <p style="font-weight: bold; font-size: 10pt; margin: 2px 0 0 0;">________________________</p>
  </div>

  <div style="text-align: center; margin-top: 18px; margin-bottom: 16px;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">HỢP ĐỒNG THUÊ NHÀ Ở</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Số: .................... — Lập ngày ... tháng ... năm 20...</p>
  </div>

  <div style="font-style: italic; font-size: 11pt; margin-bottom: 12px; padding-left: 10px;">
    <p style="margin: 0 0 2px 0;">- Căn cứ Bộ luật Dân sự ngày 24 tháng 11 năm 2015;</p>
    <p style="margin: 0 0 2px 0;">- Căn cứ Luật Kinh doanh bất động sản ngày 28 tháng 11 năm 2023;</p>
    <p style="margin: 0 0 2px 0;">- Căn cứ Nghị định của Chính phủ quy định chi tiết một số điều của Luật Kinh doanh bất động sản;</p>
    <p style="margin: 0 0 2px 0;">- Căn cứ nhu cầu và khả năng thực tế của hai bên.</p>
  </div>

  <p style="font-weight: bold; font-style: italic; margin-bottom: 6px;">Hai bên chúng tôi gồm:</p>

  <div style="margin-bottom: 12px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">I. BÊN CHO THUÊ NHÀ Ở (sau đây gọi tắt là Bên cho thuê):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 130px; white-space: nowrap;">Tên tổ chức/cá nhân:</td>
        <td style="font-weight: bold;" colspan="3">...................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">MST/Số ĐKKD:</td>
        <td>........................................</td>
        <td style="width: 100px; white-space: nowrap;">Người đại diện:</td>
        <td>........................................ (Chức vụ: ............)</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Số CCCD/Hộ chiếu:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Cấp ngày:</td>
        <td>.................... tại: ....................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Địa chỉ:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Điện thoại liên hệ:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Số tài khoản:</td>
        <td>........................................ (Ngân hàng: ............)</td>
      </tr>
    </table>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">II. BÊN THUÊ NHÀ Ở (sau đây gọi tắt là Bên thuê):</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 130px; white-space: nowrap;">Tên tổ chức/cá nhân:</td>
        <td style="font-weight: bold;" colspan="3">...................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Thẻ CCCD/Hộ chiếu:</td>
        <td>........................................</td>
        <td style="width: 100px; white-space: nowrap;">Cấp ngày:</td>
        <td>.................... tại: ....................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Đăng ký cư trú:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Địa chỉ liên hệ:</td>
        <td colspan="3">....................................................................................................................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Điện thoại liên hệ:</td>
        <td>........................................</td>
        <td style="white-space: nowrap;">Mã số thuế:</td>
        <td>........................................</td>
      </tr>
      <tr>
        <td style="white-space: nowrap;">Số tài khoản:</td>
        <td colspan="3">........................................ (Mở tại Ngân hàng: ........................................)</td>
      </tr>
    </table>
  </div>

  <p style="margin-bottom: 8px;">Hai bên chúng tôi thống nhất ký kết hợp đồng cho thuê nhà ở với các nội dung sau đây:</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 1. CÁC THÔNG TIN VỀ NHÀ Ở CHO THUÊ</p>
  <p style="margin: 0 0 4px 0;">1. Loại nhà ở: Biệt thự / Căn hộ chung cư / Nhà ở riêng lẻ / Phòng trọ.</p>
  <p style="margin: 0 0 4px 0;">2. Vị trí, địa điểm nhà ở: Phòng số <strong>............</strong> thuộc Tòa nhà/Dự án: <strong>........................................</strong> tại địa chỉ: ....................................................................................................................................</p>
  <p style="margin: 0 0 4px 0;">3. Diện tích nhà ở: Tổng diện tích sàn sử dụng: <strong>...... m²</strong>.</p>
  <p style="margin: 0 0 4px 0;">4. Công năng sử dụng: Để ở và sinh hoạt hộ gia đình / cá nhân.</p>
  <p style="margin: 0 0 4px 0;">5. Trang thiết bị kèm theo: Chi tiết theo Biên bản bàn giao thiết bị đính kèm hợp đồng.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 2. GIÁ THUÊ NHÀ Ở</p>
  <p style="margin: 0 0 4px 0;">1. Giá thuê nhà ở là: <strong style="font-size: 14pt;">........................................ VNĐ/tháng</strong> (Bằng chữ: ....................................................................................................). Giá thuê này đã bao gồm chi phí bảo trì và quản lý vận hành theo thỏa thuận.</p>
  <p style="margin: 0 0 4px 0;">2. Các chi phí sử dụng điện, nước, internet, vệ sinh và dịch vụ khác do Bên thuê trực tiếp thanh toán theo chỉ số sử dụng hàng tháng.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 3. PHƯƠNG THỨC VÀ THỜI HẠN THANH TOÁN</p>
  <p style="margin: 0 0 4px 0;">1. Phương thức thanh toán: Thanh toán bằng tiền Việt Nam thông qua hình thức chuyển khoản qua ngân hàng hoặc tiền mặt.</p>
  <p style="margin: 0 0 4px 0;">2. Thời hạn thực hiện thanh toán: Định kỳ hàng tháng vào trước ngày <strong>05 hàng tháng</strong>.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 4. THỜI HẠN CHO THUÊ & THỜI ĐIỂM GIAO NHẬN</p>
  <p style="margin: 0 0 4px 0;">1. Thời hạn cho thuê nhà ở: <strong>...... tháng</strong>, bắt đầu từ ngày <strong>.../.../20...</strong> đến hết ngày <strong>.../.../20...</strong></p>
  <p style="margin: 0 0 4px 0;">2. Thời điểm giao nhận nhà ở: Ngày <strong>.../.../20...</strong></p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 5. SỬ DỤNG NHÀ Ở THUÊ</p>
  <p style="margin: 0 0 4px 0;">1. Mục đích sử dụng: Sử dụng làm nơi ở hợp pháp, giữ gìn an ninh trật tự và vệ sinh chung.</p>
  <p style="margin: 0 0 4px 0;">2. Ban hành và tuân thủ nội quy, quy chế quản lý vận hành khu nhà ở/tòa nhà.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 6. QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ</p>
  <p style="margin: 0 0 4px 0;">1. Quyền của bên cho thuê: Theo Điều 18 Luật Kinh doanh bất động sản 2023. Yêu cầu Bên thuê thanh toán đúng hạn, bảo quản nhà ở đúng hiện trạng và đơn phương chấm dứt hợp đồng khi Bên thuê vi phạm nghiêm trọng.</p>
  <p style="margin: 0 0 4px 0;">2. Nghĩa vụ của bên cho thuê: Theo Điều 19 Luật Kinh doanh bất động sản 2023. Giao nhà đúng thời hạn, bảo đảm quyền sử dụng ổn định cho Bên thuê và bảo trì sửa chữa nhà ở theo định kỳ.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 7. QUYỀN VÀ NGHĨA VỤ CỦA BÊN THUÊ</p>
  <p style="margin: 0 0 4px 0;">1. Quyền của bên thuê: Theo Điều 20 Luật Kinh doanh bất động sản 2023. Yêu cầu Bên cho thuê giao nhà đúng hiện trạng, cung cấp đầy đủ thông tin và sửa chữa hư hỏng kết cấu do hao mòn tự nhiên.</p>
  <p style="margin: 0 0 4px 0;">2. Nghĩa vụ của bên thuê: Theo Điều 21 Luật Kinh doanh bất động sản 2023. Bảo quản sử dụng nhà đúng mục đích, thanh toán đầy đủ tiền thuê & chi phí dịch vụ, không tự ý cải tạo phá dỡ khi chưa được chấp thuận bằng văn bản.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 8. TRÁCH NHIỆM VI PHẠM & BẤT KHẢ KHÁNG</p>
  <p style="margin: 0 0 4px 0;">Các bên chịu trách nhiệm bồi thường thiệt hại nếu vi phạm hợp đồng. Trong trường hợp bất khả kháng (thiên tai, dịch bệnh, thay đổi pháp luật) các bên không bị coi là vi phạm hợp đồng.</p>

  <p style="font-weight: bold; margin-top: 10px; margin-bottom: 4px;">ĐIỀU 9. GIẢI QUYẾT TRANH CHẤP & HIỆU LỰC</p>
  <p style="margin: 0 0 4px 0;">Tranh chấp được giải quyết thông qua thương lượng hòa giải. Nếu không thành sẽ yêu cầu Tòa án có thẩm quyền giải quyết theo quy định pháp luật.</p>
  <p style="margin: 0 0 16px 0;">Hợp đồng này có hiệu lực kể từ ngày ký, được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản.</p>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN THUÊ NHÀ Ở</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN CHO THUÊ NHÀ Ở</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký, ghi rõ họ tên & đóng dấu nếu có)</p>
      </td>
    </tr>
  </table>
</div>
`;

export const DEFAULT_HANDOVER_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; word-break: break-word; overflow-wrap: anywhere;">
  <div style="text-align: center;">
    <h3 style="font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <h4 style="font-weight: bold; font-size: 11pt; margin: 2px 0 0 0;">Độc lập – Tự do – Hạnh phúc</h4>
    <div style="width: 140px; height: 1px; background-color: #000; margin: 4px auto 0 auto;"></div>
  </div>

  <div style="text-align: center; margin-top: 20px; margin-bottom: 16px;">
    <h2 style="font-weight: bold; font-size: 15pt; text-transform: uppercase; margin: 0;">BIÊN BẢN BÀN GIAO PHÒNG & TRANG THIẾT BỊ NỘI THẤT</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">(Đính kèm Hợp đồng thuê số: .................... — Lập ngày ... tháng ... năm 20...)</p>
  </div>

  <div style="margin-bottom: 12px;">
    <p style="margin: 0 0 4px 0;"><strong>Hôm nay, ngày ... tháng ... năm 20..., tại phòng:</strong> .................... Tòa nhà: ....................................................................</p>
    <p style="margin: 0 0 4px 0;">Địa chỉ: ........................................................................................................................................................................................</p>
  </div>

  <div style="margin-bottom: 12px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">I. BÊN BÀN GIAO (BÊN A / BAN QUẢN LÝ / CHỦ NHÀ):</p>
    <p style="margin: 0 0 2px 0;">- Họ và tên / Đơn vị: ........................................................................................ — Điện thoại: ....................................</p>
    <p style="margin: 0 0 2px 0;">- Số CCCD / ĐKKD: .................................................... Cấp ngày: .................... Tại: ....................................</p>
  </div>

  <div style="margin-bottom: 14px;">
    <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">II. BÊN NHẬN BÀN GIAO (BÊN B / KHÁCH THUÊ):</p>
    <p style="margin: 0 0 2px 0;">- Họ và tên: .................................................................................................... — Điện thoại: ....................................</p>
    <p style="margin: 0 0 2px 0;">- Số CCCD / Hộ chiếu: ................................................ Cấp ngày: .................... Tại: ....................................</p>
  </div>

  <p style="margin-bottom: 8px;">Hai bên tiến hành kiểm tra thực tế và thống nhất lập biên bản bàn giao với các nội dung chi tiết dưới đây:</p>

  <p style="font-weight: bold; margin-top: 14px; margin-bottom: 6px;">1. BÀN GIAO CHỈ SỐ ĐỒNG HỒ ĐIỆN - NƯỚC BAN ĐẦU:</p>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 14px;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 40px;">STT</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Hạng mục đồng hồ</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 140px;">Chỉ số bàn giao</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 90px;">Đơn vị</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Ghi chú hiện trạng ban đầu</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">1</td>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Chỉ số Công tơ Điện</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">............................</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">kWh (Số)</td>
        <td style="border: 1px solid #000; padding: 6px;">............................................................</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">2</td>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Chỉ số Đồng hồ Nước</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">............................</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">m³ (Khối)</td>
        <td style="border: 1px solid #000; padding: 6px;">............................................................</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">3</td>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Chỉ số Khác (Gas / Năng lượng)</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">............................</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">......</td>
        <td style="border: 1px solid #000; padding: 6px;">............................................................</td>
      </tr>
    </tbody>
  </table>

  <p style="font-weight: bold; margin-top: 14px; margin-bottom: 6px;">2. CHÌA KHÓA & THẺ TỪ TRUY CẬP BÀN GIAO:</p>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 14px;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 40px;">STT</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Loại chìa / Thẻ từ / Remote</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 100px;">Số lượng</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Tình trạng & Ghi chú</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">1</td><td style="border: 1px solid #000; padding: 6px;">Chìa khóa cửa phòng / Cửa chính</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">........................................................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">2</td><td style="border: 1px solid #000; padding: 6px;">Thẻ từ thang máy / Thẻ từ tòa nhà / Xe</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">........................................................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">3</td><td style="border: 1px solid #000; padding: 6px;">Mật khẩu / Vân tay khóa cửa điện tử</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">........................................................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">4</td><td style="border: 1px solid #000; padding: 6px;">Điều khiển (Remote) Điều hòa / Tivi</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">........................................................................</td></tr>
    </tbody>
  </table>

  <p style="font-weight: bold; margin-top: 14px; margin-bottom: 6px;">3. DANH MỤC TRANG THIẾT BỊ NỘI THẤT & ĐIỆN MÁY BÀN GIAO:</p>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 14px;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 40px;">STT</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Tên trang thiết bị nội thất</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 90px;">Số lượng</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left; width: 220px;">Tình trạng hoạt động / Hiện trạng</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Ghi chú đính kèm</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">1</td><td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Điều hòa nhiệt độ (Máy lạnh)</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">2</td><td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Bình nóng lạnh & Aptomat chống giật</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">3</td><td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Tủ lạnh dung tích ...... lít</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">4</td><td style="border: 1px solid #000; padding: 6px;">Máy giặt / Máy sấy quần áo</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">5</td><td style="border: 1px solid #000; padding: 6px;">Bếp gas / Bếp từ / Máy hút mùi</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">6</td><td style="border: 1px solid #000; padding: 6px;">Giường ngủ & Đệm / Ga nệm</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">7</td><td style="border: 1px solid #000; padding: 6px;">Tủ quần áo (Gỗ / Nhôm kính)</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">8</td><td style="border: 1px solid #000; padding: 6px;">Bàn ghế ăn / Bàn ghế làm việc</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">9</td><td style="border: 1px solid #000; padding: 6px;">Tủ bếp trên / Tủ bếp dưới + Vòi / Chậu rửa</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">10</td><td style="border: 1px solid #000; padding: 6px;">Bồn cầu, Lavabo, Vòi sen & Gương soi WC</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">11</td><td style="border: 1px solid #000; padding: 6px;">Quạt trần / Quạt treo tường / Hệ thống đèn</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">12</td><td style="border: 1px solid #000; padding: 6px;">Rèm cửa chống nắng & Giàn phơi đồ</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">13</td><td style="border: 1px solid #000; padding: 6px;">Tường, trần nhà, sàn gạch / sàn gỗ</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
      <tr><td style="border: 1px solid #000; padding: 6px; text-align: center;">14</td><td style="border: 1px solid #000; padding: 6px;">Tài sản / Trang thiết bị khác đính kèm</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">..................</td><td style="border: 1px solid #000; padding: 6px;">............................................................</td><td style="border: 1px solid #000; padding: 6px;">..........................................</td></tr>
    </tbody>
  </table>

  <p style="font-weight: bold; margin-top: 14px; margin-bottom: 4px;">4. XÁC NHẬN VÀ CAM KẾT CỦA CÁC BÊN:</p>
  <p style="margin: 0 0 4px 0;">1. Bên B xác nhận đã cùng Bên A kiểm tra trực tiếp tình trạng thực tế của căn hộ, hoạt động bình thường của các thiết bị điện máy và đồng ý nhận bàn giao đầy đủ như danh mục trên.</p>
  <p style="margin: 0 0 4px 0;">2. Bên B có trách nhiệm quản lý, giữ gìn tài sản trong suốt thời gian thuê. Không tự ý đục phá, cải tạo kết cấu hoặc di dời tài sản ra khỏi căn hộ khi chưa có sự đồng ý bằng văn bản của Bên A.</p>
  <p style="margin: 0 0 14px 0;">3. Khi chấm dứt hợp đồng, Bên B có nghĩa vụ bàn giao lại đầy đủ tài sản và chìa khóa đúng trạng thái ban đầu (trừ các hao mòn tự nhiên). Mọi hư hỏng do lỗi sử dụng hoặc mất mát tài sản Bên B phải chịu trách nhiệm sửa chữa hoặc đền bù theo giá trị thực tế.</p>

  <p style="margin-bottom: 16px;">Biên bản được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản để làm căn cứ đối soát.</p>

  <table style="width: 100%; text-align: center; margin-top: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN BÀN GIAO (BÊN A)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <p style="font-weight: bold; text-transform: uppercase; margin: 0;">BÊN NHẬN BÀN GIAO (BÊN B)</p>
        <p style="font-style: italic; font-size: 10pt; margin: 2px 0 60px 0;">(Ký và ghi rõ họ tên)</p>
      </td>
    </tr>
  </table>
</div>
`;

export const DEFAULT_INVOICE_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; word-break: break-word; overflow-wrap: anywhere;">
  <div style="text-align: center;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">PHIẾU BẢNG KÊ HÓA ĐƠN TIỀN NHÀ & DỊCH VỤ</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Kỳ thanh toán: ....../20... — Mã HĐ: ....................</p>
  </div>

  <div style="margin-top: 16px; margin-bottom: 14px;">
    <p style="margin: 0 0 4px 0;"><strong>Khách thuê (Bên B):</strong> .................................................. — SĐT: ....................................</p>
    <p style="margin: 0 0 4px 0;"><strong>Căn hộ:</strong> Phòng ...... — ..................................................</p>
    <p style="margin: 0 0 4px 0;"><strong>Hạn thanh toán:</strong> <span style="color: #c53030; font-weight: bold;">.../.../20...</span></p>
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
        <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">....................</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">2</td>
        <td style="border: 1px solid #000; padding: 6px;">Tiền điện sinh hoạt</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">......</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">......</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">...... kWh</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">....................</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">3</td>
        <td style="border: 1px solid #000; padding: 6px;">Tiền nước sử dụng</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">......</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">......</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">...... m³</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">....................</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">4</td>
        <td style="border: 1px solid #000; padding: 6px;">Phí dịch vụ chung tòa nhà</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">1 phòng</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">....................</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td colspan="5" style="border: 1px solid #000; padding: 8px; font-weight: bold; text-align: right;">TỔNG CỘNG THANH TOÁN:</td>
        <td style="border: 1px solid #000; padding: 8px; font-weight: bold; text-align: right; font-size: 14pt; color: #b7791f;">.................... VNĐ</td>
      </tr>
    </tbody>
  </table>

  <div style="border: 1px dashed #000; padding: 10px; margin-top: 14px; border-radius: 4px;">
    <p style="font-weight: bold; margin: 0 0 4px 0;">THÔNG TIN CHUYỂN KHOẢN THANH TOÁN:</p>
    <p style="margin: 0;">- Ngân hàng: <strong>...................................</strong> | Số tài khoản: <strong>...................................</strong></p>
    <p style="margin: 0;">- Chủ tài khoản: <strong>...................................</strong></p>
    <p style="margin: 0;">- Nội dung chuyển khoản: <strong>...................................</strong></p>
  </div>
</div>
`;

export const DEFAULT_MAINTENANCE_TEMPLATE = `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; word-break: break-word; overflow-wrap: anywhere;">
  <div style="text-align: center;">
    <h2 style="font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0;">PHIẾU TIẾP NHẬN & BẢO TRÌ SỬA CHỮA</h2>
    <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">Mã phiếu: .................... — Ngày gửi: .../.../20...</p>
  </div>

  <div style="margin-top: 18px; margin-bottom: 14px;">
    <p style="margin: 0 0 4px 0;"><strong>Khách thuê báo sự cố:</strong> .................................................. — SĐT: ....................................</p>
    <p style="margin: 0 0 4px 0;"><strong>Căn hộ:</strong> Phòng ...... — ..................................................</p>
    <p style="margin: 0 0 4px 0;"><strong>Tiêu đề sự cố:</strong> <span style="font-weight: bold; color: #c53030;">..................................................</span></p>
    <p style="margin: 0 0 4px 0;"><strong>Mức độ ưu tiên:</strong> ....................</p>
  </div>

  <div style="border: 1px solid #000; padding: 12px; margin-bottom: 16px; min-height: 80px;">
    <p style="font-weight: bold; margin: 0 0 4px 0;">MÔ TẢ CHI TIẾT SỰ CỐ:</p>
    <p style="margin: 0;">............................................................................................................................................................................................</p>
  </div>

  <div style="border: 1px solid #000; padding: 12px; margin-bottom: 16px; min-height: 80px;">
    <p style="font-weight: bold; margin: 0 0 4px 0;">KẾT QUẢ XỬ LÝ CỦA ĐỘI KỸ THUẬT & BQL:</p>
    <p style="margin: 0; color: #666; font-style: italic;">............................................................................................................................................................................................</p>
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
