'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, Download, Upload, CheckCircle2, AlertTriangle, 
  Loader2, FileText, Check, ShieldAlert 
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type ValidationError = {
  sheet: string;
  row: number;
  column: string;
  value: any;
  message: string;
};

export function ExcelImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  // Parsed and mapped data
  const [landlordsData, setLandlordsData] = useState<any[]>([]);
  const [buildingsData, setBuildingsData] = useState<any[]>([]);
  const [roomsData, setRoomsData] = useState<any[]>([]);

  // Validation status
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResults, setImportResults] = useState<any | null>(null);

  // Helper to parse service prices (e.g. "100k/phòng", "200k/người", "150.000") to numeric values
  const parseServicePrice = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).toLowerCase().trim();
    if (!str) return 0;
    
    const match = str.match(/(\d+(?:\.\d+)?)\s*k/);
    if (match) {
      const num = Number(match[1].replace(/\./g, ''));
      return num * 1000;
    }
    
    const digitsOnly = str.replace(/[^\d]/g, '');
    return Number(digitsOnly) || 0;
  };

  // Helper to parse room type abbreviations like 2n1k or studio
  const parseRoomType = (typeStr: string): string => {
    const clean = typeStr.trim().toLowerCase();
    if (clean === 'studio') return 'Studio';
    if (clean === '2n1k') return '2N - 1K - 1WC';
    if (clean === '1n1k') return '1N - 1K - 1WC';
    if (clean === '3n1k') return '3N - 1K - 1WC';
    if (clean === 'gác xép' || clean === 'gac xep') return 'Gác xép';
    if (clean === 'duplex') return 'Duplex';
    
    // Dynamic matching of XnYk format
    const match = clean.match(/^(\d+)n(\d+)k$/);
    if (match) {
      return `${match[1]}N - ${match[2]}K - 1WC`;
    }
    
    // Default fallback: capitalize first letter
    return typeStr.trim().charAt(0).toUpperCase() + typeStr.trim().slice(1);
  };

  // Helper to parse size/area safely from inputs like "25", "25m2", "25.5 m2", "30,5m²"
  const parseSize = (sizeVal: any): number | null => {
    if (sizeVal === null || sizeVal === undefined) return null;
    if (typeof sizeVal === 'number') return sizeVal;
    
    const cleanStr = String(sizeVal).trim().replace(',', '.');
    const match = cleanStr.match(/^(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
  };

  // Helper to parse deposit terms and map abbreviations like "1 cọc 1" to "đóng 1 cọc 1"
  const parseDepositTerms = (val: any): string => {
    if (val === null || val === undefined) return 'đóng 1 cọc 1';
    const str = String(val).toLowerCase().trim();
    if (!str) return 'đóng 1 cọc 1';
    
    if (str === '1 cọc 1' || str === '1 coc 1' || str.includes('1 cọc 1') || str.includes('1 coc 1')) {
      return 'đóng 1 cọc 1';
    }
    return String(val).trim();
  };

  // Helper to normalize area/size texts like "25m2" or "25 m2" to "25 m²"
  const normalizeAreaText = (text: any): string => {
    if (text === null || text === undefined) return '';
    return String(text).replace(/(\d+(?:[.,]\d+)?)\s*(?:m2|m\^2|m²|M2)/gi, '$1 m²');
  };

  // Helper to parse floor number from room code (e.g. 302 -> 3, 1205 -> 12, P501 -> 5)
  const parseFloorFromRoomCode = (code: string): number => {
    const clean = code.trim();
    const numOnly = Number(clean.replace(/[^\d]/g, ''));
    if (!isNaN(numOnly) && numOnly > 0) {
      if (numOnly >= 100) {
        return Math.floor(numOnly / 100);
      }
      return numOnly;
    }
    return 1; // fallback
  };

  // Helper to generate building code (e.g. "ngõ 24 Thổ Quan" -> "24TQ")
  const generateBuildingCode = (address: string): string => {
    const clean = address.trim();
    if (!clean) return 'TN-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    const lower = clean.toLowerCase();
    let afterNgo = clean;
    const ngoIdx = lower.indexOf('ngõ');
    if (ngoIdx !== -1) {
      afterNgo = clean.slice(ngoIdx + 3).trim();
    } else {
      const ngachIdx = lower.indexOf('ngách');
      if (ngachIdx !== -1) {
        afterNgo = clean.slice(ngachIdx + 5).trim();
      }
    }

    // Split by common dividers to focus on the street name
    const streetPart = afterNgo.split(/[-–,.(]/)[0].trim();

    // Extract first number from the address (e.g. 24 or 102 or 678)
    const numMatch = clean.match(/\d+/);
    const numberStr = numMatch ? numMatch[0] : '';

    // Remove numbers and punctuation to isolate words
    const textOnly = streetPart.replace(/\d+/g, '').replace(/[-.,()]/g, ' ');
    const words = textOnly.split(/\s+/).filter(w => w && isNaN(Number(w)));

    // Get initials, normalize accents
    const initials = words
      .map(w => w.charAt(0).toUpperCase())
      .join('')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Đ/g, 'D');

    const code = `${numberStr}${initials}`.toUpperCase().trim();
    return code || 'TN-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  // Helper to generate building name starting from "Ngõ" or "Ngách"
  const generateBuildingName = (address: string): string => {
    const clean = address.trim();
    const lower = clean.toLowerCase();
    const ngoIdx = lower.indexOf('ngõ');
    if (ngoIdx !== -1) {
      return 'Ngõ ' + clean.slice(ngoIdx + 3).trim();
    }
    const ngachIdx = lower.indexOf('ngách');
    if (ngachIdx !== -1) {
      return 'Ngách ' + clean.slice(ngachIdx + 5).trim();
    }
    return clean;
  };

  // Helper to generate landlord code (e.g. "Võ Quang Huy" -> "CN-VOQUANGHUY")
  const generateLandlordCode = (name: string): string => {
    const clean = name.trim();
    if (!clean) return 'CN-HE_THONG';
    const normalized = clean
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Đ/g, 'D')
      .replace(/\s+/g, '')
      .toUpperCase();
    return `CN-${normalized}`;
  };

  // Helper to parse date from string like "10/7", "31/7", "10-7" or "7-Oct"
  const parseSoonDate = (statusStr: string): string | null => {
    const clean = statusStr.trim();
    if (!clean) return null;

    // Matches Excel serial date numbers (e.g. 46302)
    const serialNum = Number(clean);
    if (!isNaN(serialNum) && serialNum > 30000 && serialNum < 60000) {
      const dateObj = new Date((serialNum - 25569) * 86400 * 1000);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Matches e.g. "31/7", "31-7", "31/07", "31/7/2026", "31-7-2026"
    const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{4}))?$/;
    const match = clean.match(dateRegex);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = match[4] ? Number(match[4]) : new Date().getFullYear();
      
      const paddedMonth = String(month).padStart(2, '0');
      const paddedDay = String(day).padStart(2, '0');
      
      return `${year}-${paddedMonth}-${paddedDay}`;
    }

    // Matches e.g. "7-Oct", "10-Jul"
    const parsedTime = Date.parse(clean);
    if (!isNaN(parsedTime)) {
      const dateObj = new Date(parsedTime);
      const year = dateObj.getFullYear() || new Date().getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return null;
  };

  // Helper to extract hyperlink URL from a cell (even if display text is custom)
  const getCellHyperlink = (ws: XLSX.WorkSheet, rowIdx: number, colIdx: number): string | null => {
    const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
    const cell = ws[cellRef];
    if (cell && cell.l && cell.l.Target) {
      return cell.l.Target;
    }
    return null;
  };

  // Helper to parse latitude and longitude from string
  const parseLocation = (val: any): { lat: number | null; lng: number | null } => {
    if (!val) return { lat: null, lng: null };
    const str = String(val).trim();
    // Google Maps URL with @lat,lng
    const urlMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (urlMatch) {
      return { lat: Number(urlMatch[1]), lng: Number(urlMatch[2]) };
    }
    // Direct coordinate: "21.028511, 105.804817"
    const coordMatch = str.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      return { lat: Number(coordMatch[1]), lng: Number(coordMatch[2]) };
    }
    return { lat: null, lng: null };
  };

  // Programmatic XLSX Template generation (Single sheet consolidated layout matching user requirement)
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Helper to calculate max width of content in each column
    const getColWidths = (data: any[][]) => {
      return data[0].map((_, colIndex) => {
        const valLengths = data.map((row) => {
          const val = row[colIndex];
          if (val === null || val === undefined) return 0;
          if (typeof val === 'object' && val !== null && 'v' in val) {
            return String(val.v).length;
          }
          return String(val).length;
        });
        const maxLen = Math.max(...valLengths, 12); // minimum width of 12
        return { wch: maxLen + 5 }; // add padding
      });
    };

    const bangHangData = [
      [
        'Mã chủ nhà (*)', 'Chủ nhà (Tên)(*)', 'SĐT chủ nhà(*)', 'Email chủ nhà(*)', 
        'Tòa nhà (Địa chỉ) (*)', 'Tọa độ (Lat, Lng)', 'Khu vực(*)', 'Phòng trống (*)', 'Giá Phòng (*)', 
        'Loại Phòng(*)', 'Diện tích(*)', 'Phòng ngủ', 'Phòng tắm', 
        'Thang máy (Y/N)(*)', 'PCCC (Y/N)(*)', 'Nuôi Pet (Y/N)(*)', 'Khách nước ngoài (Y/N)(*)', 'Sạc xe điện (Phí/Tháng)(*)',
        'Ban Công Riêng(Y/N)(*)', 'Số xe(*)', 'Số người(*)', 'Thanh toán(*)', 'Internet(*)', 'DVC(*)', 
        'Trạng thái(*)', 'Link ảnh + video(*)', 'Hoa hồng (rose) (*)', 'Hợp đồng tối thiểu(*)'
      ],
      [
        'TH01', 'Nguyễn Đình Hải', '0963509359', 'buiconglam03022004@gmail.com',
        '24 ngách 24 ngõ Thổ Quan - Phố Khâm Thiên', '21.018314, 105.829140', 'Đống Đa', '501', '8.500.000',
        '2n1k', '55m2', 2, 1,
        'Y', 'Y', 'N', 'N', 'Y',
        'Y', 3, 4, '1 cọc 1', '100k/phòng', '200k/người',
        'Ở luôn', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', '40% - 6tr, 60% - 12th', 6
      ],
      [
        '', '', '', '',
        '', '', '', '602', '8.000.000',
        'studio', '30m2', 1, 1,
        '', '', '', '', '',
        'Y', 2, 2, '1 cọc 1', '100k/phòng', '200k/người',
        'Ở luôn', '', '', 6
      ],
      [
        'TH02', 'Nguyễn Đức Minh', '0912345678', 'minh@realhome.vn',
        '9 nghách 20 ngõ 102 Pháo Đài Láng', '21.019727, 105.803875', 'Đống Đa', '301', '4.800.000',
        'studio', '50m2', 1, 1,
        'N', 'Y', 'Y', 'Y', 'Y',
        'N', 3, 4, '1 cọc 1', '100k/phòng', '200k/người',
        '10/7', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00', '40% - 6tr, 60% - 12th', 12
      ],
      [
        '', '', '', '',
        '', '', '', '203', '8.500.000',
        '2n1k', '50m2', 2, 1,
        '', '', '', '', '',
        'N', 3, 4, '1 cọc 1', '100k/phòng', '200k/người',
        'Ở luôn', '', '', 12
      ]
    ];
    const wsBangHang = XLSX.utils.aoa_to_sheet(bangHangData);
    wsBangHang['!cols'] = getColWidths(bangHangData);
    XLSX.utils.book_append_sheet(wb, wsBangHang, 'Bảng hàng');

    XLSX.writeFile(wb, 'RealHome_Template_Import.xlsx');
    toast.success('Đã tải xuống file template mẫu đơn giản (1 Tab)!');
  };

  // Parsing file uploaded
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setParsing(true);
    setValidationErrors([]);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const wsFirst = workbook.Sheets[firstSheetName];
        const rowsFirst = XLSX.utils.sheet_to_json(wsFirst, { header: 1 }) as any[][];
        const headerRow = rowsFirst[0] || [];

        // Check if the uploaded sheet matches the simple single-sheet copy-paste format from the image
        const isSingleBoardFormat = headerRow.some((cell: any) => 
          String(cell).includes('Phòng trống') || 
          String(cell).includes('Giá Phòng') || 
          String(cell).includes('Loại Phòng')
        );

        let landlords: any[] = [];
        let buildings: any[] = [];
        let rooms: any[] = [];

        if (isSingleBoardFormat) {
          // ==========================================
          // PARSE SINGLE-SHEET INVENTORY BOARD FORMAT
          // ==========================================
          
          // 1. Create a default landlord
          landlords = [{
            rowIndex: 1,
            code: 'CN-HE_THONG',
            name: 'Chủ nhà hệ thống',
            phone: '0000000000',
            email: 'hethong@realhome.vn',
            address: 'Hệ thống',
            notes: 'Tự động tạo từ bảng hàng nhập nhanh'
          }];

          // Dynamic column indices matching the headers
          let bldColIdx = 0;
          let locationColIdx = -1;
          let areaColIdx = -1;
          let landlordCodeColIdx = -1;
          let landlordNameColIdx = -1;
          let landlordPhoneColIdx = -1;
          let landlordEmailColIdx = -1;
          let roomColIdx = 1;
          let priceColIdx = 2;
          let typeColIdx = 3;
          let sizeColIdx = 4;
          let bedroomColIdx = -1;
          let bathroomColIdx = -1;
          let pcccColIdx = -1;
          let petColIdx = -1;
          let foreignersColIdx = -1;
          let vinfastColIdx = -1;
          let internetColIdx = -1;
          let dvcColIdx = -1;
          let elevatorColIdxs: number[] = [];
          let balconyColIdx = -1;
          let xeColIdx = 5;
          let nguoiColIdx = 6;
          let depositColIdx = 7;
          let statusColIdx = 10;
          let imageColIdx = 11;
          let roseColIdx = -1;
          let minContractColIdx = -1;

          headerRow.forEach((cell: any, idx: number) => {
            const cellStr = String(cell || '').toLowerCase();
            if (cellStr.includes('tòa nhà') || cellStr.includes('địa chỉ')) bldColIdx = idx;
            else if (cellStr.includes('tọa độ') || cellStr.includes('vị trí') || cellStr.includes('map') || cellStr.includes('lat') || cellStr.includes('lng')) locationColIdx = idx;
            else if (cellStr.includes('khu vực') || cellStr.includes('quận') || cellStr.includes('huyện')) areaColIdx = idx;
            else if (cellStr.includes('mã chủ')) landlordCodeColIdx = idx;
            else if (cellStr.includes('email chủ') || cellStr.includes('gmail chủ')) landlordEmailColIdx = idx;
            else if (cellStr.includes('sđt chủ') || cellStr.includes('sđt') || cellStr.includes('số điện thoại chủ')) landlordPhoneColIdx = idx;
            else if (cellStr.includes('chủ nhà') || cellStr.includes('tên chủ')) landlordNameColIdx = idx;
            else if (cellStr.includes('phòng trống')) roomColIdx = idx;
            else if (cellStr.includes('giá phòng') || cellStr.includes('giá')) priceColIdx = idx;
            else if (cellStr.includes('loại phòng') || cellStr.includes('loại')) typeColIdx = idx;
            else if (cellStr.includes('diện tích') || cellStr.includes('m2')) sizeColIdx = idx;
            else if (cellStr.includes('phòng ngủ') || cellStr.includes('phong ngu')) bedroomColIdx = idx;
            else if (cellStr.includes('phòng tắm') || cellStr.includes('wc') || cellStr.includes('tắm') || cellStr.includes('phong tam')) bathroomColIdx = idx;
            else if (cellStr.includes('thang máy') || cellStr.includes('thang may') || cellStr.includes('elevator')) {
              elevatorColIdxs.push(idx);
            }
            else if (cellStr.includes('ban công') || cellStr.includes('ban cong') || cellStr.includes('balcony')) {
              balconyColIdx = idx;
            }
            else if (cellStr.includes('pccc')) pcccColIdx = idx;
            else if (cellStr.includes('pet') || cellStr.includes('nuôi') || cellStr.includes('thú cưng')) petColIdx = idx;
            else if (cellStr.includes('nước ngoài') || cellStr.includes('foreigner')) foreignersColIdx = idx;
            else if (cellStr.includes('vinfast') || cellStr.includes('xe điện') || cellStr.includes('sạc')) vinfastColIdx = idx;
            else if (cellStr.includes('internet') || cellStr.includes('mạng')) internetColIdx = idx;
            else if (cellStr.includes('dvc') || cellStr.includes('dịch vụ chung')) dvcColIdx = idx;
            else if (cellStr.includes('số xe') || cellStr.includes('xe')) xeColIdx = idx;
            else if (cellStr.includes('số người') || cellStr.includes('người')) nguoiColIdx = idx;
            else if (cellStr.includes('thanh toán') || cellStr.includes('đóng') || cellStr.includes('cọc')) depositColIdx = idx;
            else if (cellStr.includes('trạng thái')) statusColIdx = idx;
            else if (cellStr.includes('link') || cellStr.includes('ảnh') || cellStr.includes('video')) imageColIdx = idx;
            else if (cellStr.includes('hoa hồng') || cellStr.includes('rose')) roseColIdx = idx;
            else if (cellStr.includes('hợp đồng tối thiểu') || cellStr.includes('tối thiểu')) minContractColIdx = idx;
          });

          const uniqueBuildings = new Set<string>();
          let lastBuildingAddress = '';
          let lastBuildingArea = 'Hà Nội';
          let lastBuildingCode = '';
          let lastBuildingLat: number | null = null;
          let lastBuildingLng: number | null = null;
          let lastLandlordCode = '';
          let lastLandlordName = '';
          let lastLandlordPhone = '';
          let lastLandlordEmail = '';

          for (let i = 1; i < rowsFirst.length; i++) {
            const row = rowsFirst[i];
            if (!row || row.length === 0) continue;

            // Inherit building address and landlord if merged
            const rawBuildingAddress = row[bldColIdx] ? String(row[bldColIdx]).trim() : '';
            const rawLocation = locationColIdx !== -1 && row[locationColIdx] ? String(row[locationColIdx]).trim() : '';
            const rawArea = areaColIdx !== -1 && row[areaColIdx] ? String(row[areaColIdx]).trim() : '';
            const rawLandlordCode = landlordCodeColIdx !== -1 && row[landlordCodeColIdx] ? String(row[landlordCodeColIdx]).trim() : '';
            const rawLandlordName = landlordNameColIdx !== -1 && row[landlordNameColIdx] ? String(row[landlordNameColIdx]).trim() : '';
            const rawLandlordPhone = landlordPhoneColIdx !== -1 && row[landlordPhoneColIdx] ? String(row[landlordPhoneColIdx]).trim() : '';
            const rawLandlordEmail = landlordEmailColIdx !== -1 && row[landlordEmailColIdx] ? String(row[landlordEmailColIdx]).trim() : '';

            if (rawBuildingAddress) {
              lastBuildingAddress = rawBuildingAddress;
              lastBuildingCode = generateBuildingCode(rawBuildingAddress);
              
              const { lat, lng } = parseLocation(rawLocation);
              lastBuildingLat = lat;
              lastBuildingLng = lng;

              if (rawArea) {
                lastBuildingArea = rawArea;
              } else {
                // Fallback: extract from address
                const parts = lastBuildingAddress.split('-');
                lastBuildingArea = parts.length > 1 ? parts[parts.length - 1].trim() : 'Hà Nội';
              }
              if (rawLandlordCode) lastLandlordCode = rawLandlordCode;
              if (rawLandlordName) lastLandlordName = rawLandlordName;
              if (rawLandlordPhone) lastLandlordPhone = rawLandlordPhone;
              if (rawLandlordEmail) lastLandlordEmail = rawLandlordEmail;

              // Dynamically create landlord if code and name are provided
              let bldLandlordId = lastLandlordCode || 'CN-HE_THONG';
              if (lastLandlordCode && lastLandlordName) {
                const existingLd = landlords.find(l => l.code === bldLandlordId);
                if (!existingLd) {
                  landlords.push({
                    rowIndex: i + 1,
                    code: bldLandlordId,
                    name: lastLandlordName,
                    phone: lastLandlordPhone || '0000000000',
                    email: lastLandlordEmail || '',
                    address: 'Hà Nội',
                    notes: 'Tự động tạo từ bảng hàng nhập nhanh'
                  });
                }
              }

              if (!uniqueBuildings.has(lastBuildingCode)) {
                uniqueBuildings.add(lastBuildingCode);
                buildings.push({
                  rowIndex: i + 1,
                  code: lastBuildingCode,
                  name: generateBuildingName(lastBuildingAddress),
                  landlord_id: bldLandlordId,
                  area: lastBuildingArea,
                  address: lastBuildingAddress,
                  total_floors: 1,
                  total_rooms: 0,
                  year_built: null,
                  has_elevator: false,
                  pccc_certified: true,
                  allow_pet: false,
                  allow_foreigners: false,
                  allow_vinfast_electric: false,
                  electric_vehicle_fee: 0,
                  image_url: '',
                  deposit_terms: parseDepositTerms(row[depositColIdx]),
                  washing_machine_type: 'chung',
                  electricity_price: 4000,
                  water_price: 35000,
                  internet_price: 100000,
                  common_service_price: 200000,
                  latitude: lastBuildingLat,
                  longitude: lastBuildingLng
                });
              }
            } else {
              // Handle inherit of merged area or landlord on empty building address rows
              if (rawLocation) {
                const { lat, lng } = parseLocation(rawLocation);
                if (lat !== null && lng !== null) {
                  lastBuildingLat = lat;
                  lastBuildingLng = lng;
                }
              }
              if (rawArea) lastBuildingArea = rawArea;
              if (rawLandlordCode) lastLandlordCode = rawLandlordCode;
              if (rawLandlordName) lastLandlordName = rawLandlordName;
              if (rawLandlordPhone) lastLandlordPhone = rawLandlordPhone;
              if (rawLandlordEmail) lastLandlordEmail = rawLandlordEmail;

              if (lastBuildingCode && (rawLocation || rawArea || rawLandlordCode || rawLandlordName || rawLandlordPhone || rawLandlordEmail)) {
                const bld = buildings.find(b => b.code === lastBuildingCode);
                if (bld) {
                  if (lastBuildingLat !== null) bld.latitude = lastBuildingLat;
                  if (lastBuildingLng !== null) bld.longitude = lastBuildingLng;
                  if (rawArea) bld.area = lastBuildingArea;
                  if (lastLandlordCode) {
                    bld.landlord_id = lastLandlordCode;

                    if (lastLandlordName) {
                      const existingLd = landlords.find(l => l.code === lastLandlordCode);
                      if (!existingLd) {
                        landlords.push({
                          rowIndex: i + 1,
                          code: lastLandlordCode,
                          name: lastLandlordName,
                          phone: lastLandlordPhone || '0000000000',
                          email: lastLandlordEmail || '',
                          address: 'Hà Nội',
                          notes: 'Tự động tạo từ bảng hàng nhập nhanh'
                        });
                      }
                    }
                  }
                }
              }
            }

            const roomCode = row[roomColIdx] ? String(row[roomColIdx]).trim() : '';
            if (!roomCode || !lastBuildingCode) continue;

            // Bỏ qua các dòng chú thích, ghi chú hoặc tiêu đề dài ghi trong cột phòng trống
            if (roomCode.length > 15 || roomCode.toLowerCase().includes('lưu ý') || roomCode.toLowerCase().includes('ghi chú')) {
              continue;
            }

            // Parse price: extract digit characters
            const rawPrice = String(row[priceColIdx] || '').replace(/[^\d]/g, '');
            const price = Number(rawPrice) || 0;

            // Parse size: extract numeric value safely
            const size = parseSize(row[sizeColIdx]);

            // Parse max occupants and max vehicles
            const maxVehicles = Number(String(row[xeColIdx] || '').replace(/[^\d]/g, '')) || 2;
            const maxOccupants = Number(String(row[nguoiColIdx] || '').replace(/[^\d]/g, '')) || 2;

            // Parse room type with Vietnamese abbreviation mappings (e.g. 2n1k)
            const rawType = String(row[typeColIdx] || '').trim();
            const roomType = parseRoomType(rawType);

            // Parse status: Ở luôn / ở ngay -> available, Đang sửa -> maintenance, date/else -> rented/soon_available (Mặc định trống -> rented)
            const rawStatus = String(row[statusColIdx] || '').trim();
            const soonDate = parseSoonDate(rawStatus);
            let status = 'rented'; // Mặc định là đã cho thuê nếu để trống
            let description = '';

            if (soonDate) {
              status = 'rented'; // DB accepts rented, UI parses description [Sắp trống: ...]
              description = `[Sắp trống: ${soonDate}]`;
            } else if (rawStatus) {
              const cleanStatus = rawStatus.toLowerCase().trim();
              if (cleanStatus.includes('sửa') || cleanStatus.includes('bảo trì') || cleanStatus.includes('trì')) {
                status = 'maintenance';
              } else if (cleanStatus.includes('giữ') || cleanStatus.includes('đặt') || cleanStatus.includes('cọc') || cleanStatus.includes('reserved')) {
                status = 'reserved';
              } else if (
                cleanStatus.includes('luôn') || 
                cleanStatus.includes('ngay') || 
                cleanStatus.includes('trống') || 
                cleanStatus.includes('sẵn')
              ) {
                status = 'available';
              } else {
                status = 'rented';
              }
            }

            // Quét trong hàng có chữ máy giặt riêng để cập nhật tòa nhà
            const rowStr = row.map(v => String(v || '').toLowerCase()).join(' ');
            const hasPrivateWashing = rowStr.includes('máy giặt riêng') || 
                                     rowStr.includes('may giat rieng') || 
                                     rowStr.includes('mg riêng') || 
                                     rowStr.includes('mg rieng') || 
                                     rowStr.includes('giặt riêng') || 
                                     rowStr.includes('giat rieng');
            if (lastBuildingCode) {
              const bld = buildings.find(b => b.code === lastBuildingCode);
              if (bld) {
                if (hasPrivateWashing) {
                  bld.washing_machine_type = 'riêng';
                }

                // 1. Thang máy
                let hasElevatorVal = false;
                let elevatorColFound = false;
                for (const colIdx of elevatorColIdxs) {
                  if (colIdx !== -1 && row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== '') {
                    const rawElevator = String(row[colIdx]).trim().toLowerCase();
                    elevatorColFound = true;
                    if (rawElevator === 'y' || rawElevator === 'yes' || rawElevator.includes('có') || rawElevator === '1') {
                      hasElevatorVal = true;
                    }
                  }
                }
                if (elevatorColFound) {
                  bld.has_elevator = hasElevatorVal;
                }

                // 2. PCCC
                if (pcccColIdx !== -1 && row[pcccColIdx] !== undefined && row[pcccColIdx] !== null && String(row[pcccColIdx]).trim() !== '') {
                  const rawPccc = String(row[pcccColIdx]).trim().toLowerCase();
                  if (rawPccc === 'y' || rawPccc === 'yes' || rawPccc.includes('có') || rawPccc === '1') {
                    bld.pccc_certified = true;
                  } else if (rawPccc === 'n' || rawPccc === 'no' || rawPccc.includes('không') || rawPccc === '0') {
                    bld.pccc_certified = false;
                  }
                }

                // 3. Nuôi thú cưng (Pet)
                if (petColIdx !== -1 && row[petColIdx] !== undefined && row[petColIdx] !== null && String(row[petColIdx]).trim() !== '') {
                  const rawPet = String(row[petColIdx]).trim().toLowerCase();
                  if (rawPet === 'y' || rawPet === 'yes' || rawPet.includes('có') || rawPet === '1') {
                    bld.allow_pet = true;
                  } else if (rawPet === 'n' || rawPet === 'no' || rawPet.includes('không') || rawPet === '0') {
                    bld.allow_pet = false;
                  }
                }

                // 4. Người nước ngoài
                if (foreignersColIdx !== -1 && row[foreignersColIdx] !== undefined && row[foreignersColIdx] !== null && String(row[foreignersColIdx]).trim() !== '') {
                  const rawForeigners = String(row[foreignersColIdx]).trim().toLowerCase();
                  if (rawForeigners === 'y' || rawForeigners === 'yes' || rawForeigners.includes('có') || rawForeigners === '1') {
                    bld.allow_foreigners = true;
                  } else if (rawForeigners === 'n' || rawForeigners === 'no' || rawForeigners.includes('không') || rawForeigners === '0') {
                    bld.allow_foreigners = false;
                  }
                }

                // 5. Sạc xe điện (Phí)
                if (vinfastColIdx !== -1 && row[vinfastColIdx] !== undefined && row[vinfastColIdx] !== null && String(row[vinfastColIdx]).trim() !== '') {
                  const rawVinfast = String(row[vinfastColIdx]).trim().toLowerCase();
                  if (rawVinfast === 'n' || rawVinfast === 'no' || rawVinfast === 'không' || rawVinfast === '0') {
                    bld.allow_vinfast_electric = false;
                    bld.electric_vehicle_fee = 0;
                  } else if (rawVinfast === 'y' || rawVinfast === 'yes' || rawVinfast === 'có' || rawVinfast === '1' || rawVinfast.includes('miễn phí') || rawVinfast.includes('free')) {
                    bld.allow_vinfast_electric = true;
                    bld.electric_vehicle_fee = 0;
                  } else {
                    const parsedEVFee = parseServicePrice(row[vinfastColIdx]);
                    if (parsedEVFee > 0) {
                      bld.allow_vinfast_electric = true;
                      bld.electric_vehicle_fee = parsedEVFee;
                    } else if (rawVinfast.includes('có')) {
                      bld.allow_vinfast_electric = true;
                    }
                  }
                }

                // 6. Internet
                if (internetColIdx !== -1 && row[internetColIdx] !== undefined && row[internetColIdx] !== null && String(row[internetColIdx]).trim() !== '') {
                  const parsedInt = parseServicePrice(row[internetColIdx]);
                  if (parsedInt > 0) bld.internet_price = parsedInt;
                }

                // 7. DVC
                if (dvcColIdx !== -1 && row[dvcColIdx] !== undefined && row[dvcColIdx] !== null && String(row[dvcColIdx]).trim() !== '') {
                  const parsedDvc = parseServicePrice(row[dvcColIdx]);
                  if (parsedDvc > 0) bld.common_service_price = parsedDvc;
                }
              }
            }

            // Parse bedrooms and bathrooms based on roomType defaults, overridden by Excel column values if present
            let bedrooms = 1;
            if (roomType.includes('2N') || roomType.toLowerCase().includes('2n')) {
              bedrooms = 2;
            } else if (roomType.includes('3N') || roomType.toLowerCase().includes('3n')) {
              bedrooms = 3;
            } else if (roomType.includes('1N') || roomType.toLowerCase().includes('1n') || roomType.toLowerCase().includes('studio')) {
              bedrooms = 1;
            }

            if (bedroomColIdx !== -1 && row[bedroomColIdx] !== undefined && row[bedroomColIdx] !== null && String(row[bedroomColIdx]).trim() !== '') {
              const parsedBed = Number(String(row[bedroomColIdx]).replace(/[^\d]/g, ''));
              if (!isNaN(parsedBed) && parsedBed > 0) {
                bedrooms = parsedBed;
              }
            }

            let bathrooms = 1;
            if (roomType.toLowerCase().includes('2wc') || roomType.toLowerCase().includes('2 phòng tắm')) {
              bathrooms = 2;
            } else if (roomType.toLowerCase().includes('3wc') || roomType.toLowerCase().includes('3 phòng tắm')) {
              bathrooms = 3;
            }

            if (bathroomColIdx !== -1 && row[bathroomColIdx] !== undefined && row[bathroomColIdx] !== null && String(row[bathroomColIdx]).trim() !== '') {
              const parsedBath = Number(String(row[bathroomColIdx]).replace(/[^\d]/g, ''));
              if (!isNaN(parsedBath) && parsedBath > 0) {
                bathrooms = parsedBath;
              }
            }

            const rawImages = getCellHyperlink(wsFirst, i, imageColIdx) || (row[imageColIdx] ? String(row[imageColIdx]).trim() : '');
            const depositTerms = parseDepositTerms(row[depositColIdx]);
            const rose = roseColIdx !== -1 && row[roseColIdx] !== undefined && row[roseColIdx] !== null ? String(row[roseColIdx]).trim() : '';
            const minContractMonths = minContractColIdx !== -1 && row[minContractColIdx] !== undefined && row[minContractColIdx] !== null ? Number(String(row[minContractColIdx]).replace(/[^\d]/g, '')) : 12;
 
            let hasPrivateBalcony = false;
            if (balconyColIdx !== -1 && row[balconyColIdx] !== undefined && row[balconyColIdx] !== null && String(row[balconyColIdx]).trim() !== '') {
              const rawBalcony = String(row[balconyColIdx]).trim().toLowerCase();
              if (rawBalcony === 'y' || rawBalcony === 'yes' || rawBalcony.includes('có') || rawBalcony === '1') {
                hasPrivateBalcony = true;
              }
            }

            rooms.push({
              rowIndex: i + 1,
              building_code: lastBuildingCode,
              floor: parseFloorFromRoomCode(roomCode),
              code: roomCode,
              room_type: roomType,
              size,
              price,
              bedrooms: bedrooms,
              bathrooms: bathrooms,
              status,
              max_occupants: maxOccupants,
              max_vehicles_per_room: maxVehicles,
              min_contract_months: minContractMonths || 12,
              image_urls: rawImages,
              deposit_terms: normalizeAreaText(depositTerms),
              rose: normalizeAreaText(rose),
              description: normalizeAreaText(description),
              has_private_balcony: hasPrivateBalcony
            });
          }

        } else {
          // ==========================================
          // PARSE STANDARD 3-SHEET LAYOUT FORMAT
          // ==========================================
          
          // 1. Parse ChuNha
          const wsChuNha = workbook.Sheets['ChuNha'];
          if (wsChuNha) {
            const rows = XLSX.utils.sheet_to_json(wsChuNha, { header: 1 }) as any[][];
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length === 0 || !row[0]) continue;
              landlords.push({
                rowIndex: i + 1,
                code: String(row[0] || '').trim(),
                name: String(row[1] || '').trim(),
                phone: row[2] ? String(row[2]).trim() : '',
                email: row[3] ? String(row[3]).trim() : '',
                address: row[4] ? String(row[4]).trim() : '',
                notes: row[5] ? String(row[5]).trim() : ''
              });
            }
          }

          // 2. Parse ToaNha
          const wsToaNha = workbook.Sheets['ToaNha'];
          if (wsToaNha) {
            const rows = XLSX.utils.sheet_to_json(wsToaNha, { header: 1 }) as any[][];
            let lastLandlordId = '';
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length === 0 || !row[0]) continue;

              const rawLandlordId = row[2] ? String(row[2]).trim() : '';
              if (rawLandlordId) {
                lastLandlordId = rawLandlordId;
              }

              buildings.push({
                rowIndex: i + 1,
                code: String(row[0] || '').trim(),
                name: String(row[1] || '').trim(),
                landlord_id: lastLandlordId,
                area: String(row[3] || '').trim(),
                address: row[4] ? String(row[4]).trim() : '',
                total_floors: row[5] ? Number(row[5]) : 1,
                total_rooms: row[6] ? Number(row[6]) : 0,
                year_built: null,
                has_elevator: row[7] === 'Y' || row[7] === 'Yes' || row[7] === true,
                pccc_certified: row[8] === 'Y' || row[8] === 'Yes' || row[8] === true,
                allow_pet: row[9] === 'Y' || row[9] === 'Yes' || row[9] === true,
                allow_foreigners: row[10] === 'Y' || row[10] === 'Yes' || row[10] === true,
                allow_vinfast_electric: row[11] === 'Y' || row[11] === 'Yes' || row[11] === true,
                image_url: getCellHyperlink(wsToaNha, i, 12) || (row[12] ? String(row[12]).trim() : ''),
              });
            }
          }

          // 3. Parse Phong
          const wsPhong = workbook.Sheets['Phong'];
          if (wsPhong) {
            const rows = XLSX.utils.sheet_to_json(wsPhong, { header: 1 }) as any[][];
            let lastBuildingCode = '';
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length === 0) continue;

              const rawBuildingCode = row[0] ? String(row[0]).trim() : '';
              if (rawBuildingCode) {
                lastBuildingCode = rawBuildingCode;
              }

              const roomCode = row[2] ? String(row[2]).trim() : '';
              if (!roomCode) continue;

              const rawStatus = row[8] !== undefined && row[8] !== null ? String(row[8]).trim() : '';
              const soonDate = parseSoonDate(rawStatus);
              let status = 'rented'; // Mặc định là đã cho thuê nếu để trống
              let description = '';

              if (soonDate) {
                status = 'rented';
                description = `[Sắp trống: ${soonDate}]`;
              } else if (rawStatus) {
                const cleanStatus = rawStatus.toLowerCase();
                if (cleanStatus.includes('sửa') || cleanStatus.includes('bảo trì') || cleanStatus.includes('trì')) {
                  status = 'maintenance';
                } else if (cleanStatus.includes('reserved')) {
                  status = 'reserved';
                } else if (
                  cleanStatus.includes('luôn') || 
                  cleanStatus.includes('ngay') || 
                  cleanStatus.includes('trống') || 
                  cleanStatus.includes('sẵn')
                ) {
                  status = 'available';
                } else {
                  status = 'rented';
                }
              }

              let hasPrivateBalcony = false;
              if (row[14] !== undefined && row[14] !== null && String(row[14]).trim() !== '') {
                const rawBalcony = String(row[14]).trim().toLowerCase();
                if (rawBalcony === 'y' || rawBalcony === 'yes' || rawBalcony.includes('có') || rawBalcony === '1') {
                  hasPrivateBalcony = true;
                }
              }

              rooms.push({
                rowIndex: i + 1,
                building_code: lastBuildingCode,
                floor: row[1] ? Number(row[1]) : parseFloorFromRoomCode(roomCode),
                code: roomCode,
                room_type: row[3] ? String(row[3]).trim() : '',
                size: parseSize(row[4]),
                price: row[5] ? Number(row[5]) : 0,
                bedrooms: row[6] ? Number(row[6]) : 0,
                bathrooms: row[7] ? Number(row[7]) : 1,
                status,
                max_occupants: row[9] ? Number(row[9]) : 2,
                max_vehicles_per_room: row[10] ? Number(row[10]) : 2,
                min_contract_months: row[11] ? Number(row[11]) : 12,
                image_urls: getCellHyperlink(wsPhong, i, 12) || (row[12] ? String(row[12]).trim() : ''),
                rose: normalizeAreaText(row[13]),
                description: normalizeAreaText(description),
                has_private_balcony: hasPrivateBalcony
              });
            }
          }
        }

        // Save data to states
        setLandlordsData(landlords);
        setBuildingsData(buildings);
        setRoomsData(rooms);

        // Perform Client-side validations
        validateData(landlords, buildings, rooms);
      } catch (err: any) {
        toast.error(`Lỗi phân tích file Excel: ${err.message}`);
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  // Client-side validator
  const validateData = (landlords: any[], buildings: any[], rooms: any[]) => {
    const errors: ValidationError[] = [];
    const isSingle = landlords.length === 1 && landlords[0]?.code === 'CN-HE_THONG';

    // Map codes for quick lookup
    const landlordCodes = new Set(landlords.map(l => l.code));
    const buildingCodes = new Set(buildings.map(b => b.code));

    // Duplicate codes detection in Excel itself
    const duplicateLandlordCodes = landlords.map(l => l.code).filter((item, index, self) => self.indexOf(item) !== index);
    const duplicateBuildingCodes = buildings.map(b => b.code).filter((item, index, self) => self.indexOf(item) !== index);

    // 1. Validate Landlords
    if (!isSingle) {
      landlords.forEach((l) => {
        if (!l.code) {
          errors.push({ sheet: 'ChuNha', row: l.rowIndex, column: 'Mã chủ nhà', value: l.code, message: 'Mã chủ nhà là bắt buộc' });
        }
        if (duplicateLandlordCodes.includes(l.code)) {
          errors.push({ sheet: 'ChuNha', row: l.rowIndex, column: 'Mã chủ nhà', value: l.code, message: `Mã chủ nhà '${l.code}' bị trùng lặp trong Excel` });
        }
        if (!l.name) {
          errors.push({ sheet: 'ChuNha', row: l.rowIndex, column: 'Tên chủ nhà', value: l.name, message: 'Tên chủ nhà là bắt buộc' });
        }
        if (!l.phone) {
          errors.push({ sheet: 'ChuNha', row: l.rowIndex, column: 'Số điện thoại', value: l.phone, message: 'Số điện thoại là bắt buộc' });
        }
      });
    }

    // 2. Validate Buildings
    buildings.forEach((b) => {
      const sheetName = isSingle ? 'Bảng hàng' : 'ToaNha';
      const colName = isSingle ? 'Tòa nhà (Địa chỉ)' : 'Mã tòa nhà';

      if (!b.code) {
        errors.push({ sheet: sheetName, row: b.rowIndex, column: colName, value: b.code, message: `${colName} là bắt buộc` });
      }
      if (!isSingle && duplicateBuildingCodes.includes(b.code)) {
        errors.push({ sheet: sheetName, row: b.rowIndex, column: colName, value: b.code, message: `Mã tòa nhà '${b.code}' bị trùng lặp trong Excel` });
      }
      if (!b.name) {
        errors.push({ sheet: sheetName, row: b.rowIndex, column: isSingle ? 'Tòa nhà (Địa chỉ)' : 'Tên tòa nhà', value: b.name, message: 'Tên/Địa chỉ tòa nhà là bắt buộc' });
      }
      if (!b.area) {
        errors.push({ sheet: sheetName, row: b.rowIndex, column: isSingle ? 'Tòa nhà (Địa chỉ)' : 'Khu vực', value: b.area, message: 'Khu vực (Quận/Huyện/Tỉnh) là bắt buộc' });
      }
      if (!isSingle && b.landlord_id && !landlordCodes.has(b.landlord_id)) {
        errors.push({ 
          sheet: sheetName, 
          row: b.rowIndex, 
          column: 'Mã chủ nhà', 
          value: b.landlord_id, 
          message: `Mã chủ nhà '${b.landlord_id}' không tồn tại trong sheet ChuNha` 
        });
      }
      if (b.total_floors && isNaN(Number(b.total_floors))) {
        errors.push({ sheet: sheetName, row: b.rowIndex, column: 'Số tầng', value: b.total_floors, message: 'Số tầng phải là số hợp lệ' });
      }
    });

    // 3. Validate Rooms
    rooms.forEach((r) => {
      const sheetName = isSingle ? 'Bảng hàng' : 'Phong';
      const bldColName = isSingle ? 'Tòa nhà (Địa chỉ)' : 'Mã tòa nhà';
      const roomColName = isSingle ? 'Phòng trống' : 'Mã phòng';

      if (!r.building_code) {
        errors.push({ sheet: sheetName, row: r.rowIndex, column: bldColName, value: r.building_code, message: `${bldColName} là bắt buộc` });
      } else if (!buildingCodes.has(r.building_code)) {
        errors.push({ 
          sheet: sheetName, 
          row: r.rowIndex, 
          column: bldColName, 
          value: r.building_code, 
          message: `Tòa nhà '${r.building_code}' không hợp lệ` 
        });
      }
      if (!r.code) {
        errors.push({ sheet: sheetName, row: r.rowIndex, column: roomColName, value: r.code, message: `${roomColName} là bắt buộc` });
      }
      if (r.price && isNaN(Number(r.price))) {
        errors.push({ sheet: sheetName, row: r.rowIndex, column: isSingle ? 'Giá Phòng' : 'Giá thuê', value: r.price, message: 'Giá thuê phải là số hợp lệ' });
      }
      if (r.size && isNaN(Number(r.size))) {
        errors.push({ sheet: sheetName, row: r.rowIndex, column: 'Diện tích', value: r.size, message: 'Diện tích phải là số hợp lệ' });
      }
      const validStatuses = ['available', 'rented', 'maintenance', 'reserved'];
      if (r.status && !validStatuses.includes(r.status)) {
        errors.push({ 
          sheet: 'Phong', 
          row: r.rowIndex, 
          column: 'Trạng thái', 
          value: r.status, 
          message: `Trạng thái phải là một trong các giá trị: ${validStatuses.join(', ')}` 
        });
      }
      if (!r.rose) {
        errors.push({
          sheet: sheetName,
          row: r.rowIndex,
          column: isSingle ? 'Hoa hồng (rose) (*)' : 'Hoa hồng (rose) (*)',
          value: r.rose,
          message: 'Hoa hồng (rose) là bắt buộc và phải nhập'
        });
      }
    });

    setValidationErrors(errors);
    if (errors.length > 0) {
      toast.warning(`Tìm thấy ${errors.length} lỗi định dạng trong file Excel!`);
    } else {
      toast.success('Kiểm tra dữ liệu Excel hoàn tất! Dữ liệu hợp lệ để import.');
    }
  };

  // Import operation - chia nhỏ thành batch để tránh timeout Vercel
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');

  const handleImportExecute = async () => {
    if (validationErrors.length > 0) {
      toast.error('Vui lòng sửa các lỗi trong file Excel trước khi import!');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportStage('');

    const ROOM_BATCH_SIZE = 10; // Mỗi lần gửi 10 phòng để tránh timeout
    const totalSteps = 2 + Math.ceil(roomsData.length / ROOM_BATCH_SIZE) + 1; // landlords + buildings + room batches + sync
    let stepsDone = 0;

    const allResults = {
      landlordsImported: 0,
      buildingsImported: 0,
      roomsImported: 0,
      errors: [] as string[]
    };

    try {
      // BƯỚC 1: Import chủ nhà
      setImportStage('Đang import chủ nhà...');
      const res1 = await fetch('/api/import/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlords: landlordsData, buildings: [], rooms: [] })
      });
      if (!res1.ok) throw new Error((await res1.json()).error || 'Lỗi import chủ nhà');
      const d1 = await res1.json();
      allResults.landlordsImported += d1.results.landlordsImported;
      allResults.errors.push(...(d1.results.errors || []));
      stepsDone++;
      setImportProgress(Math.round((stepsDone / totalSteps) * 100));

      // BƯỚC 2: Import tòa nhà
      setImportStage('Đang import tòa nhà...');
      const res2 = await fetch('/api/import/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlords: [], buildings: buildingsData, rooms: [] })
      });
      if (!res2.ok) throw new Error((await res2.json()).error || 'Lỗi import tòa nhà');
      const d2 = await res2.json();
      allResults.buildingsImported += d2.results.buildingsImported;
      allResults.errors.push(...(d2.results.errors || []));
      stepsDone++;
      setImportProgress(Math.round((stepsDone / totalSteps) * 100));

      // BƯỚC 3: Import phòng theo batch
      for (let i = 0; i < roomsData.length; i += ROOM_BATCH_SIZE) {
        const batch = roomsData.slice(i, i + ROOM_BATCH_SIZE);
        const batchNum = Math.floor(i / ROOM_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(roomsData.length / ROOM_BATCH_SIZE);
        setImportStage(`Đang import phòng (${Math.min(i + ROOM_BATCH_SIZE, roomsData.length)}/${roomsData.length})...`);

        const res3 = await fetch('/api/import/sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landlords: [], buildings: [], rooms: batch })
        });
        if (!res3.ok) throw new Error((await res3.json()).error || `Lỗi import phòng batch ${batchNum}/${totalBatches}`);
        const d3 = await res3.json();
        allResults.roomsImported += d3.results.roomsImported;
        allResults.errors.push(...(d3.results.errors || []));
        stepsDone++;
        setImportProgress(Math.round((stepsDone / totalSteps) * 100));
      }

      // BƯỚC 4: Đồng bộ số phòng/tầng
      setImportStage('Đang đồng bộ số phòng, số tầng...');
      await fetch('/api/buildings/sync-counts', { method: 'POST' });
      stepsDone++;
      setImportProgress(100);

      setImportResults(allResults);
      setImported(true);
      toast.success('Nhập dữ liệu Excel thành công!');
    } catch (err: any) {
      toast.error(`Lỗi import: ${err.message}`);
    } finally {
      setImporting(false);
      setImportStage('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/realhome/buildings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nhập dữ liệu từ Excel (.xlsx)</h1>
          <p className="text-slate-500">Đồng bộ danh sách Chủ nhà, Tòa nhà và Phòng nhanh chóng bằng bảng dữ liệu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Khối tải file và template mẫu */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-bold text-slate-800">Tải File Mẫu Chuẩn Hóa</CardTitle>
              <CardDescription>Sử dụng mẫu này để nhập thông tin đúng cấu trúc hệ thống yêu cầu</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Button 
                onClick={downloadTemplate} 
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-slate-300 text-slate-800 hover:bg-blue-50 hover:text-black transition-colors"
              >
                <Download className="h-4 w-4" />
                Tải Excel Template
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-bold text-slate-800">Tải Lên Bảng Dữ Liệu</CardTitle>
              <CardDescription>Chọn file Excel (.xlsx) đã điền đầy đủ dữ liệu</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div 
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-500 hover:bg-slate-50/30 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-indigo-600 block">Chọn file Excel tải lên</span>
                <span className="text-[10px] text-slate-400 block mt-1">Hỗ trợ các định dạng .xlsx, .xls</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
              </div>

              {file && (
                <div className="p-3 bg-indigo-50/30 border border-indigo-150 rounded-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-650 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-800 block truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400 block">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  {validationErrors.length === 0 && !parsing && (
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 bg-green-50 rounded-full border border-green-200 p-0.5" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Khối kết quả Preview & Validation */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-sm h-full flex flex-col">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-bold text-slate-800">
                Xem trước & Kiểm tra dữ liệu (Preview & Validation)
              </CardTitle>
              <CardDescription>
                Hệ thống tự động kiểm tra định dạng và tính hợp lệ của dữ liệu trước khi nạp
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-between">
              {parsing ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                  <p className="text-xs font-medium">Đang giải mã và kiểm tra cấu trúc dữ liệu...</p>
                </div>
              ) : imported ? (
                <div className="space-y-6 py-8 text-center max-w-md mx-auto">
                  <div className="h-14 w-14 rounded-full bg-green-50 border border-green-200 text-green-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-800">Đồng bộ hoàn tất!</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Dữ liệu đã được nạp và lưu trữ thành công vào hệ thống. Các phòng, tòa nhà và chủ nhà mới đã sẵn sàng sử dụng.
                    </p>
                  </div>
                  {importResults && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border rounded-lg text-center text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block text-base">{importResults.landlordsImported}</span>
                        <span className="text-[10px] text-slate-400">Chủ nhà</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block text-base">{importResults.buildingsImported}</span>
                        <span className="text-[10px] text-slate-400">Tòa nhà</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block text-base">{importResults.roomsImported}</span>
                        <span className="text-[10px] text-slate-400">Phòng</span>
                      </div>
                    </div>
                  )}
                  {importResults?.errors?.length > 0 && (
                    <div className="border border-red-200 bg-red-50/50 rounded-lg p-3 text-left">
                      <span className="text-xs font-bold text-red-700 flex items-center gap-1 mb-1">
                        <ShieldAlert className="h-4 w-4" /> Có {importResults.errors.length} lỗi khi lưu vào DB:
                      </span>
                      <ul className="text-[10px] text-red-600 list-disc list-inside max-h-[100px] overflow-y-auto space-y-0.5">
                        {importResults.errors.map((err: string, idx: number) => (
                          <li key={idx} className="truncate">{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="pt-2">
                    <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
                      <Link href="/admin/realhome/buildings">Trở lại danh sách tòa nhà</Link>
                    </Button>
                  </div>
                </div>
              ) : file ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* Summary of parsed records */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border rounded-lg text-center text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{landlordsData.length}</span>
                      <span className="text-[10px] text-slate-400">Dòng chủ nhà</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">{buildingsData.length}</span>
                      <span className="text-[10px] text-slate-400">Dòng tòa nhà</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">{roomsData.length}</span>
                      <span className="text-[10px] text-slate-400">Dòng phòng</span>
                    </div>
                  </div>

                  {/* Errors display */}
                  <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto border rounded-lg bg-white">
                    {validationErrors.length > 0 ? (
                      <div className="divide-y divide-red-100">
                        {validationErrors.map((err, idx) => (
                          <div key={idx} className="p-3 hover:bg-red-50/20 flex gap-2.5 items-start">
                            <AlertTriangle className="h-4.5 w-4.5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="text-xs">
                              <span className="font-bold text-slate-800">Sheet &quot;{err.sheet}&quot; (Dòng {err.row}): </span>
                              <span className="text-slate-600">Cột &quot;{err.column}&quot; có giá trị không hợp lệ: </span>
                              <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono text-red-600">{err.value || 'Trống'}</code>
                              <p className="text-[10px] text-red-500 font-semibold mt-0.5">{err.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                        <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-2 opacity-80" />
                        <p className="text-xs font-semibold text-slate-700">Dữ liệu hoàn toàn sạch lỗi!</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Sẵn sàng để đưa vào cơ sở dữ liệu hệ thống.</p>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col gap-3 pt-3 border-t">
                    {importing && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{importStage}</span>
                          <span>{importProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${importProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-3">
                      <Button variant="ghost" onClick={() => setFile(null)} disabled={importing}>
                        Hủy bỏ
                      </Button>
                      <Button 
                        onClick={handleImportExecute} 
                        disabled={validationErrors.length > 0 || importing}
                        className="bg-slate-900 text-white hover:bg-slate-800"
                      >
                        {importing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {importStage || 'Đang import...'}
                          </>
                        ) : (
                          'Bắt đầu Import'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <FileText className="h-12 w-12 opacity-30 mb-2 text-slate-650" />
                  <p className="text-xs font-medium">Chưa có tệp tin nào được chọn</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hãy chọn hoặc kéo thả tệp Excel của bạn vào bảng tải lên ở bên trái
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
