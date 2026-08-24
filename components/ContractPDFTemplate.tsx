'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Đăng ký font Times New Roman hỗ trợ đầy đủ Tiếng Việt không lỗi dấu
Font.register({
  family: 'Times New Roman',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Bold.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Italic.ttf', fontStyle: 'italic' },
    { src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' }
  ]
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times New Roman',
    paddingTop: 30,
    paddingBottom: 35,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 10.5,
    lineHeight: 1.4,
    color: '#000000',
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
  },
  nationalTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  nationalSubtitle: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: 'bold',
  },
  lineSeparator: {
    width: 120,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    alignSelf: 'center',
    marginTop: 3,
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 2,
  },
  subTitle: {
    fontSize: 9.5,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 10.5,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  col2Left: {
    width: '50%',
    flexDirection: 'row',
  },
  col2Right: {
    width: '50%',
    flexDirection: 'row',
  },
  label: {
    width: 80,
    color: '#000000',
  },
  labelShort: {
    width: 60,
    color: '#000000',
  },
  value: {
    flex: 1,
    fontWeight: 'bold',
  },
  valueNormal: {
    flex: 1,
  },
  paragraph: {
    marginBottom: 3.5,
    textAlign: 'justify',
  },
  indentParagraph: {
    marginBottom: 2,
    paddingLeft: 12,
  },
  subIndent: {
    paddingLeft: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  bold: {
    fontWeight: 'bold',
  },
  bankBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 6,
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 2,
    backgroundColor: '#fafafa',
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  signContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  signBox: {
    width: '45%',
    textAlign: 'center',
  },
  signTitle: {
    fontWeight: 'bold',
    fontSize: 10.5,
  },
  signSubtitle: {
    fontSize: 8.5,
    fontStyle: 'italic',
    color: '#444444',
    marginTop: 2,
    marginBottom: 40,
  },
});

export interface ContractData {
  contract_code: string;
  agreement_date?: string | null;
  sign_location?: string | null;
  
  party_a_name: string;
  party_a_phone?: string | null;
  party_a_dob?: string | null;
  party_a_id_card?: string | null;
  party_a_id_date?: string | null;
  party_a_id_place?: string | null;
  party_a_address?: string | null;

  party_b_name: string;
  party_b_phone: string;
  party_b_dob?: string | null;
  party_b_id_card?: string | null;
  party_b_id_date?: string | null;
  party_b_id_place?: string | null;
  party_b_address?: string | null;

  rent_price: number;
  electricity_price?: number | null;
  water_price?: string | null;
  service_price?: string | null;
  other_services?: Record<string, string> | any;
  tenant_count?: number | null;
  payment_method?: string | null;
  lease_duration_months?: number | null;
  termination_notice_days?: number | null;
  room_repair_support_date?: string | null;
  deposit_amount: number;
  deadline_sign_contract?: string | null;

  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_owner?: string | null;
  transfer_content_template?: string | null;

  rooms?: {
    code?: string;
    buildings?: {
      address?: string | null;
      name?: string | null;
    } | null;
  } | null;
}

interface ContractPDFTemplateProps {
  contractData: ContractData;
}

const formatDate = (dStr?: string | null) => {
  if (!dStr) return '.....................';
  try {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('vi-VN');
  } catch {
    return dStr;
  }
};

export default function ContractPDFTemplate({ contractData }: ContractPDFTemplateProps) {
  const agrDateObj = contractData.agreement_date ? new Date(contractData.agreement_date) : null;
  const dayStr = agrDateObj ? agrDateObj.getDate() : '...';
  const monthStr = agrDateObj ? agrDateObj.getMonth() + 1 : '...';
  const yearStr = agrDateObj ? agrDateObj.getFullYear() : '...';
  const locationStr = contractData.sign_location ? ` tại: ${contractData.sign_location}` : '...........................................................................';

  const formattedRent = Number(contractData.rent_price || 0).toLocaleString('vi-VN') + ' đ/tháng';
  const formattedDeposit = Number(contractData.deposit_amount || 0).toLocaleString('vi-VN') + ' VNĐ';
  const formattedElec = Number(contractData.electricity_price || 0).toLocaleString('vi-VN') + ' đ/số';
  const formattedDeadline = formatDate(contractData.deadline_sign_contract);
  const otherServices = (contractData.other_services as Record<string, string>) || {};

  const roomCode = contractData.rooms?.code || '......';
  const buildingAddr = contractData.rooms?.buildings?.address || contractData.rooms?.buildings?.name || '...................................................';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Quốc hiệu Tiêu ngữ */}
        <View style={styles.header}>
          <Text style={styles.nationalTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
          <Text style={styles.nationalSubtitle}>Độc lập – Tự do – Hạnh phúc</Text>
          <View style={styles.lineSeparator} />
        </View>

        {/* Tiêu đề hợp đồng */}
        <View style={styles.header}>
          <Text style={styles.documentTitle}>HỢP ĐỒNG ĐẶT CỌC THUÊ PHÒNG</Text>
          <Text style={styles.subTitle}>
            Hôm nay, ngày {dayStr} tháng {monthStr} năm {yearStr}{locationStr}
          </Text>
        </View>

        <Text style={{ fontStyle: 'italic', fontWeight: 'bold', marginBottom: 4 }}>Chúng tôi gồm:</Text>

        {/* BÊN A */}
        <Text style={styles.sectionHeader}>BÊN CHO THUÊ PHÒNG (BÊN A)</Text>
        <View style={styles.tableRow}>
          <View style={styles.col2Left}>
            <Text style={styles.label}>Họ và tên:</Text>
            <Text style={styles.value}>{contractData.party_a_name}</Text>
          </View>
          <View style={styles.col2Right}>
            <Text style={styles.labelShort}>Sinh ngày:</Text>
            <Text style={styles.valueNormal}>{formatDate(contractData.party_a_dob)}</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.label}>Địa chỉ:</Text>
          <Text style={styles.valueNormal}>{contractData.party_a_address || '........................................................................................................'}</Text>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.col2Left}>
            <Text style={styles.label}>Số CMND/CCCD:</Text>
            <Text style={styles.valueNormal}>{contractData.party_a_id_card || '.....................'}</Text>
          </View>
          <View style={styles.col2Right}>
            <Text style={styles.labelShort}>Cấp ngày:</Text>
            <Text style={styles.valueNormal}>{formatDate(contractData.party_a_id_date)}</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.col2Left}>
            <Text style={styles.label}>Tại:</Text>
            <Text style={styles.valueNormal}>{contractData.party_a_id_place || '..........................'}</Text>
          </View>
          <View style={styles.col2Right}>
            <Text style={styles.labelShort}>Điện thoại:</Text>
            <Text style={styles.valueNormal}>{contractData.party_a_phone || '.....................'}</Text>
          </View>
        </View>

        {/* BÊN B */}
        <Text style={[styles.sectionHeader, { marginTop: 6 }]}>BÊN THUÊ PHÒNG (BÊN B)</Text>
        <View style={styles.tableRow}>
          <View style={styles.col2Left}>
            <Text style={styles.label}>Họ và tên:</Text>
            <Text style={styles.value}>{contractData.party_b_name}</Text>
          </View>
          <View style={styles.col2Right}>
            <Text style={styles.labelShort}>Sinh ngày:</Text>
            <Text style={styles.valueNormal}>{formatDate(contractData.party_b_dob)}</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.col2Left}>
            <Text style={styles.label}>Số CMND/CCCD:</Text>
            <Text style={styles.valueNormal}>{contractData.party_b_id_card || '.....................'}</Text>
          </View>
          <View style={styles.col2Right}>
            <Text style={styles.labelShort}>Cấp ngày:</Text>
            <Text style={styles.valueNormal}>{formatDate(contractData.party_b_id_date)}</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.col2Left}>
            <Text style={styles.label}>Tại:</Text>
            <Text style={styles.valueNormal}>{contractData.party_b_id_place || '..........................'}</Text>
          </View>
          <View style={styles.col2Right}>
            <Text style={styles.labelShort}>Điện thoại:</Text>
            <Text style={styles.valueNormal}>{contractData.party_b_phone}</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.label}>Thường trú:</Text>
          <Text style={styles.valueNormal}>{contractData.party_b_address || '........................................................................................................'}</Text>
        </View>

        <Text style={{ marginTop: 4, marginBottom: 4 }}>
          Sau khi trao đổi thỏa thuận hai bên cùng nhau ký kết Hợp đồng đặt cọc với những nội dung sau:
        </Text>

        {/* ĐIỀU 1 */}
        <Text style={styles.sectionHeader}>ĐIỀU 1: TIỀN ĐẶT CỌC, MỤC ĐÍCH VÀ THANH TOÁN</Text>
        <Text style={styles.paragraph}>
          1.1. Bên A đồng ý sẽ cho bên B thuê phòng số: <Text style={styles.bold}>{roomCode}</Text> do bên A đại diện BQL tòa nhà tại địa chỉ: <Text style={styles.bold}>{buildingAddr}</Text> với một số thỏa thuận cơ bản trong Hợp đồng thuê phòng như sau:
        </Text>
        <Text style={styles.indentParagraph}>
          • Giá thuê: <Text style={styles.bold}>{formattedRent}</Text>
        </Text>
        <Text style={styles.indentParagraph}>• Giá Dịch Vụ:</Text>
        <View style={styles.subIndent}>
          <Text style={{ width: '50%' }}>+ Điện: {formattedElec}</Text>
          <Text style={{ width: '50%' }}>+ Nước: {contractData.water_price || '...'}</Text>
          <Text style={{ width: '100%', marginTop: 1 }}>+ Phí dịch vụ chung: {contractData.service_price || '...'}</Text>
          {otherServices.internet ? <Text style={{ width: '50%', marginTop: 1 }}>+ Internet: {otherServices.internet}</Text> : null}
          {otherServices.laundry ? <Text style={{ width: '50%', marginTop: 1 }}>+ Máy giặt/sấy: {otherServices.laundry}</Text> : null}
        </View>
        <Text style={styles.paragraph}>
          1.2. Mục đích thuê để sử dụng: để ở và sinh hoạt với số lượng người đăng ký ở: <Text style={styles.bold}>{contractData.tenant_count || 0} người</Text>.
        </Text>
        <Text style={styles.paragraph}>
          1.3. Thanh toán: <Text style={styles.valueNormal}>{contractData.payment_method || 'Đặt cọc 01 tháng và thanh toán theo tiến độ thỏa thuận'}</Text>.
        </Text>
        <Text style={styles.paragraph}>
          1.4. Hợp đồng ký kết: <Text style={styles.bold}>{contractData.lease_duration_months || '...'} tháng</Text>.
        </Text>
        <Text style={styles.paragraph}>
          1.5. Trong thời gian hợp đồng còn hiệu lực, nếu bên A muốn lấy lại nhà phải báo trước cho bên B là <Text style={styles.bold}>{contractData.termination_notice_days || 30} ngày</Text> và trả lại toàn bộ tiền cọc cho bên B.
        </Text>
        {contractData.room_repair_support_date ? (
          <Text style={styles.paragraph}>
            1.6. Bên A hỗ trợ Bên B sửa chữa phòng trước ngày ký hợp đồng: <Text style={styles.bold}>{formatDate(contractData.room_repair_support_date)}</Text>.
          </Text>
        ) : null}
        <Text style={styles.paragraph}>
          1.7. Để đảm bảo việc ký kết Hợp đồng thuê phòng muộn nhất vào ngày: <Text style={styles.bold}>{formattedDeadline}</Text>. Nay bên B đồng ý đóng trước cho bên A một số tiền là: <Text style={styles.bold}>{formattedDeposit}</Text> gọi là tiền đặt cọc giữ chỗ.
        </Text>

        {/* ĐIỀU 2 */}
        <Text style={[styles.sectionHeader, { marginTop: 6 }]}>ĐIỀU 2: THỎA THUẬN VỀ VIỆC GIẢI QUYẾT TIỀN ĐẶT CỌC</Text>
        <Text style={styles.paragraph}>
          Bên B có trách nhiệm giao tiền đặt cọc cho bên A theo đúng thỏa thuận. Nếu thanh toán bằng hình thức chuyển khoản, Bên B chuyển khoản vào tài khoản sau:
        </Text>

        {contractData.bank_name ? (
          <View style={styles.bankBox}>
            <View style={styles.bankRow}>
              <View style={styles.col2Left}>
                <Text style={{ width: 70, fontWeight: 'bold' }}>Ngân hàng:</Text>
                <Text style={{ flex: 1 }}>{contractData.bank_name}</Text>
              </View>
              <View style={styles.col2Right}>
                <Text style={{ width: 70, fontWeight: 'bold' }}>Số tài khoản:</Text>
                <Text style={{ flex: 1, fontWeight: 'bold' }}>{contractData.bank_account_number}</Text>
              </View>
            </View>
            <View style={styles.bankRow}>
              <View style={styles.col2Left}>
                <Text style={{ width: 70, fontWeight: 'bold' }}>Chủ tài khoản:</Text>
                <Text style={{ flex: 1, fontWeight: 'bold' }}>{contractData.bank_account_owner}</Text>
              </View>
              <View style={styles.col2Right}>
                <Text style={{ width: 70, fontWeight: 'bold' }}>Cú pháp CK:</Text>
                <Text style={{ flex: 1 }}>{contractData.transfer_content_template}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <Text style={styles.paragraph}>
          Nếu trong thời gian từ khi ký Hợp đồng cọc này đến hết ngày <Text style={styles.bold}>{formattedDeadline}</Text>, tất cả các nội dung trong hợp đồng thuê phòng đã được hai bên thống nhất mà Bên B không chủ động liên hệ để ký kết Hợp đồng thuê phòng chính thức thì Bên B phải chịu mất toàn bộ số tiền đã đặt cọc ở trên.
        </Text>
        <Text style={styles.paragraph}>
          Ngược lại, nếu đến hết thời hạn trên, tất cả các nội dung thỏa thuận đã được thống nhất mà Bên A không đồng ý ký kết Hợp đồng thuê phòng cho Bên B thì Bên A phải trả lại cho Bên B toàn bộ số tiền đặt cọc đã nhận.
        </Text>

        {/* ĐIỀU 3 */}
        <Text style={[styles.sectionHeader, { marginTop: 6 }]}>ĐIỀU 3: ĐIỀU KHOẢN CHUNG</Text>
        <Text style={styles.paragraph}>
          3.1 Hai bên xác định hoàn toàn tự nguyện khi giao kết Hợp đồng cọc này. Những thông tin về nhân thân đã ghi nhận là hoàn toàn đúng sự thật. Bên A cam kết ngôi nhà thuộc quyền quản lý/cho thuê hợp pháp theo đúng quy định, không tranh chấp, không kê biên thi hành án.
        </Text>
        <Text style={styles.paragraph}>
          3.2 Hợp đồng cọc này có hiệu lực kể từ ngày ký, được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để làm căn cứ thực hiện.
        </Text>

        {/* Chữ ký hai bên */}
        <View style={styles.signContainer}>
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>ĐẠI DIỆN BÊN A</Text>
            <Text style={styles.signSubtitle}>(Ký và ghi rõ họ tên)</Text>
            <Text style={styles.bold}>{contractData.party_a_name}</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>ĐẠI DIỆN BÊN B</Text>
            <Text style={styles.signSubtitle}>(Ký và ghi rõ họ tên)</Text>
            <Text style={styles.bold}>{contractData.party_b_name}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
