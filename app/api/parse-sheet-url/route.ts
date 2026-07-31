import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const maxDuration = 60; // Allow enough time for remote fetch

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Vui lòng cung cấp đường dẫn Google Sheet hợp lệ' }, { status: 400 });
    }

    const trimmedUrl = url.trim();

    let csvUrl = '';
    let spreadsheetId = '';
    let gid = '0';

    // Check if link is a direct published CSV link
    if (trimmedUrl.includes('/pub') && (trimmedUrl.includes('output=csv') || trimmedUrl.includes('format=csv'))) {
      csvUrl = trimmedUrl;
    } else {
      // Extract spreadsheet ID from Google Sheet URL
      const idMatch = trimmedUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!idMatch) {
        return NextResponse.json({
          error: 'Đường dẫn Google Sheet không đúng định dạng. Ví dụ hợp lệ: https://docs.google.com/spreadsheets/d/1ABC.../edit#gid=0'
        }, { status: 400 });
      }

      spreadsheetId = idMatch[1];

      // Extract gid (sheet ID) if available
      const gidMatch = trimmedUrl.match(/[?&]gid=([0-9]+)/) || trimmedUrl.match(/#gid=([0-9]+)/);
      gid = gidMatch ? gidMatch[1] : '0';

      csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    }

    // Try extracting Document Title from Google Sheet HTML page
    let docTitle = '';
    if (spreadsheetId) {
      try {
        const editRes = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${gid}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          cache: 'no-store'
        });
        if (editRes.ok) {
          const html = await editRes.text();
          const tMatch = html.match(/<title>(.*?)<\/title>/i);
          if (tMatch) {
            let titleText = tMatch[1].replace(/ - Google.*$/i, '').trim();
            // Clean common boilerplate words
            titleText = titleText
              .replace(/[-–|]\s*(DANH SÁCH PHÒNG TRỐNG|BẢNG HÀNG|BẢNG PHÒNG|THUÊ PHÒNG|BẢNG GIÁ).*$/i, '')
              .replace(/^(DANH SÁCH PHÒNG TRỐNG|BẢNG HÀNG|BẢNG PHÒNG|THUÊ PHÒNG|BẢNG GIÁ)\s*[-–|]\s*/i, '')
              .trim();
            if (titleText) {
              docTitle = titleText;
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch sheet document title:', err);
      }
    }

    // Fetch the CSV content from Google Sheets
    const response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,*/*'
      },
      redirect: 'follow',
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `Không thể kết nối đến Google Sheet (Mã lỗi: ${response.status}). Vui lòng kiểm tra lại URL.`
      }, { status: 400 });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return NextResponse.json({
        error: 'Google Sheet chưa mở quyền truy cập public. Vui lòng chọn "Chia sẻ" trên Google Sheet -> Chọn "Bất kỳ ai có đường liên kết" (Anyone with the link can view) rồi thử lại.'
      }, { status: 403 });
    }

    // Convert CSV to text explicitly with UTF-8 to preserve Vietnamese characters
    const csvText = await response.text();
    const workbook = XLSX.read(csvText, { type: 'string' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy trang tính nào trong Google Sheet này' }, { status: 400 });
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json({ error: 'Trang tính Google Sheet rỗng, không có dữ liệu' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      jsonData,
      docTitle
    });

  } catch (error: any) {
    console.error('Error parsing Google Sheet URL:', error);
    return NextResponse.json({
      error: 'Lỗi khi đọc Google Sheet: ' + (error.message || 'Lỗi không xác định')
    }, { status: 500 });
  }
}
