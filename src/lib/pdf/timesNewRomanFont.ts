import { Font } from '@react-pdf/renderer';

/**
 * Đăng ký font Times New Roman (Tinos - font tương thích 100% chuẩn Times New Roman hỗ trợ đầy đủ Tiếng Việt Unicode)
 * Dùng cho việc xuất hợp đồng PDF qua @react-pdf/renderer
 */
export function registerTimesNewRomanFont() {
  Font.register({
    family: 'Times New Roman',
    fonts: [
      {
        src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Regular.ttf',
        fontWeight: 'normal',
      },
      {
        src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Bold.ttf',
        fontWeight: 'bold',
      },
      {
        src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Italic.ttf',
        fontStyle: 'italic',
      },
      {
        src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-BoldItalic.ttf',
        fontWeight: 'bold',
        fontStyle: 'italic',
      },
    ],
  });
}

// Tự động kích hoạt đăng ký font khi import
registerTimesNewRomanFont();
