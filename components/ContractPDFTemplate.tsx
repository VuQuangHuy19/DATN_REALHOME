'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Đăng ký font Roboto hỗ trợ tiếng Việt không lỗi dấu
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/Roboto-Regular.ttf' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/Roboto-Bold.ttf', fontWeight: 'bold' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/Roboto-Italic.ttf', fontStyle: 'italic' }
  ]
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    padding: 40,
    fontSize: 12,
    lineHeight: 1.5,
    color: '#000000',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  nationalTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  nationalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  lineSeparator: {
    width: 120,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 120,
    color: '#333333',
  },
  value: {
    flex: 1,
    fontWeight: 'bold',
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 'bold',
  },
  signContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signBox: {
    width: '45%',
    textAlign: 'center',
  },
  signTitle: {
    fontWeight: 'bold',
  },
  signSubtitle: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#666666',
    marginTop: 2,
    marginBottom: 50,
  },
});

export interface ContractData {
  contract_code: string;
  party_a_name: string;
  party_a_phone?: string | null;
  party_a_id_card?: string | null;
  party_b_name: string;
  party_b_phone: string;
  party_b_id_card?: string | null;
  rent_price: number;
  deposit_amount: number;
  deadline_sign_contract?: string | null;
}

interface ContractPDFTemplateProps {
  contractData: ContractData;
}

export default function ContractPDFTemplate({ contractData }: ContractPDFTemplateProps) {
  const formattedRent = Number(contractData.rent_price).toLocaleString('vi-VN') + ' đ/tháng';
  const formattedDeposit = Number(contractData.deposit_amount).toLocaleString('vi-VN') + ' đ';
  const formattedDeadline = contractData.deadline_sign_contract
    ? new Date(contractData.deadline_sign_contract).toLocaleDateString('vi-VN')
    : '.../.../...';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Tiêu ngữ */}
        <View style={styles.header}>
          <Text style={styles.nationalTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
          <Text style={styles.nationalSubtitle}>Độc lập – Tự do – Hạnh phúc</Text>
          <View style={styles.lineSeparator} />
        </View>

        {/* Tiêu đề hợp đồng */}
        <View style={styles.header}>
          <Text style={styles.documentTitle}>HỢP ĐỒNG ĐẶT CỌC THUÊ PHÒNG</Text>
          <Text style={styles.subTitle}>Mã hợp đồng: {contractData.contract_code}</Text>
        </View>

        {/* Thông tin Bên A */}
        <Text style={styles.sectionTitle}>BÊN CHO THUÊ PHÒNG (BÊN A)</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Họ và tên:</Text>
          <Text style={styles.value}>{contractData.party_a_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Điện thoại:</Text>
          <Text style={styles.value}>{contractData.party_a_phone || '........................'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Số CMND/CCCD:</Text>
          <Text style={styles.value}>{contractData.party_a_id_card || '........................'}</Text>
        </View>

        {/* Thông tin Bên B */}
        <Text style={styles.sectionTitle}>BÊN THUÊ PHÒNG (BÊN B)</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Họ và tên:</Text>
          <Text style={styles.value}>{contractData.party_b_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Điện thoại:</Text>
          <Text style={styles.value}>{contractData.party_b_phone}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Số CMND/CCCD:</Text>
          <Text style={styles.value}>{contractData.party_b_id_card || '........................'}</Text>
        </View>

        {/* Điều 1 */}
        <Text style={styles.sectionTitle}>ĐIỀU 1: TIỀN ĐẶT CỌC VÀ THỎA THUẬN THUÊ</Text>
        <Text style={styles.paragraph}>
          Bên A đồng ý giữ chỗ cho Bên B thuê phòng với giá thuê đã thỏa thuận là: <Text style={styles.bold}>{formattedRent}</Text>.
        </Text>
        <Text style={styles.paragraph}>
          Để đảm bảo việc ký kết hợp đồng, Bên B gửi Bên A số tiền đặt cọc giữ chỗ là: <Text style={styles.bold}>{formattedDeposit}</Text>.
        </Text>
        <Text style={styles.paragraph}>
          Hạn cuối hai bên tiến hành ký hợp đồng thuê phòng chính thức là ngày: <Text style={styles.bold}>{formattedDeadline}</Text>.
        </Text>

        {/* Điều 2 */}
        <Text style={styles.sectionTitle}>ĐIỀU 2: CÁC ĐIỀU KHOẢN CHUNG</Text>
        <Text style={styles.paragraph}>
          [Các điều khoản quy định về hủy cọc và phạt vi phạm hợp đồng...]
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
