import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

export const runtime = 'nodejs';

const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không thể tải ảnh từ URL: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType.includes('png') ? 'image/png' : 'image/jpeg',
  };
}

export async function POST(req: Request) {
  try {
    const { imageUrl, frontCardUrl, backCardUrl } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GOOGLE_GENERATIVE_AI_API_KEY hoặc GEMINI_API_KEY trên server' },
        { status: 500 }
      );
    }

    const targetUrls: string[] = [];
    if (frontCardUrl) targetUrls.push(frontCardUrl);
    if (backCardUrl) targetUrls.push(backCardUrl);
    if (!frontCardUrl && !backCardUrl && imageUrl) targetUrls.push(imageUrl);

    if (targetUrls.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp URL ảnh CCCD để tự động quét' },
        { status: 400 }
      );
    }

    // Fetch images to buffers
    const imageParts = await Promise.all(
      targetUrls.map(async (url) => {
        const { buffer, mimeType } = await fetchImageBuffer(url);
        return {
          type: 'image' as const,
          image: buffer,
          mimeType,
        };
      })
    );

    const google = createGoogleGenerativeAI({ apiKey });

    const systemPrompt = `Bạn là hệ thống AI quét mã OCR thẻ Căn cước công dân (CCCD / CMND) Việt Nam chính xác tuyệt đối.
Nhiệm vụ của bạn là đọc các ảnh CCCD được cung cấp (gồm mặt trước và/hoặc mặt sau) và trích xuất các thông tin cá nhân.

Vui lòng trả về ĐÚNG DẠNG JSON duy nhất (KHÔNG dùng thẻ markdown, KHÔNG kèm lời văn giải thích):
{
  "fullName": "HỌ VÀ TÊN VIẾT IN HOA (Ví dụ: NGUYỄN VĂN A)",
  "idCardNumber": "Số CCCD 12 chữ số (Ví dụ: 001092000123)",
  "idCardIssueDate": "Ngày cấp định dạng YYYY-MM-DD (Ví dụ: 2021-05-20)",
  "idCardIssuePlace": "Nơi cấp (Ví dụ: Cục Cảnh sát QLHC về trật tự xã hội)"
}

Quy tắc:
1. "fullName": Chữ in hoa không dấu hoặc có dấu đầy đủ theo đúng hình ảnh.
2. "idCardNumber": Chỉ chứa 12 chữ số liên tục.
3. "idCardIssueDate": Chuyển đổi ngày/tháng/năm trên mặt sau/trước về YYYY-MM-DD. Nếu không rõ năm thì để "".
4. "idCardIssuePlace": Thông thường nằm ở mặt sau CCCD (VD: Cục Cảnh sát QLHC về trật tự xã hội).
5. Nếu không tìm thấy trường nào, hãy để giá trị là "".`;

    let extractedText = '';
    let lastError: any = null;

    for (const modelId of CANDIDATE_MODELS) {
      try {
        const response = await generateText({
          model: google(modelId),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: systemPrompt },
                ...imageParts,
              ],
            },
          ],
          maxRetries: 0,
        });

        extractedText = response.text.trim();
        if (extractedText) break;
      } catch (err: any) {
        console.warn(`[KYC OCR] Model ${modelId} failed:`, err?.message);
        lastError = err;
      }
    }

    if (!extractedText) {
      throw lastError || new Error('Không thể nhận diện hình ảnh CCCD.');
    }

    // Clean JSON response (remove potential markdown wrappers)
    const cleanJsonStr = extractedText
      .replace(/^```(json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsedData = JSON.parse(cleanJsonStr);

    return NextResponse.json({
      success: true,
      data: {
        fullName: parsedData.fullName || '',
        idCardNumber: parsedData.idCardNumber || '',
        idCardIssueDate: parsedData.idCardIssueDate || '',
        idCardIssuePlace: parsedData.idCardIssuePlace || '',
      },
    });
  } catch (error: any) {
    console.error('[KYC OCR API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý AI quét ảnh CCCD' },
      { status: 500 }
    );
  }
}
