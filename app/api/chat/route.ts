import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText, tool } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { geocodeLandmark, haversineDistanceKm } from '@/src/lib/geocoding';

export const runtime = 'nodejs';

// Danh sách Model dự phòng theo thứ tự ưu tiên (Text-out models có quota)
const CANDIDATE_MODELS = [
  'gemini-3.5-flash',      // Ưu tiên 1: 5 RPM, 20 RPD
  'gemini-3.5-flash-lite', // Ưu tiên 2: 15 RPM, 500 RPD ← Fallback tốt nhất!
  'gemini-3-flash',        // Ưu tiên 3: 5 RPM, 20 RPD
  'gemini-3.6-flash',      // Ưu tiên 4: 5 RPM, 20 RPD
];

// Helper: thử gọi một hàm qua lần lượt các model, trả về kết quả + model đã dùng
async function withFallback<T>(
  fn: (modelId: string) => Promise<T>
): Promise<{ result: T; modelId: string }> {
  let lastError: any;
  for (const modelId of CANDIDATE_MODELS) {
    try {
      const result = await fn(modelId);
      return { result, modelId };
    } catch (err: any) {
      console.warn(
        `[AI Chat] Model ${modelId} failed (${err?.message?.slice(0, 80)}...). Trying next...`
      );
      lastError = err;
    }
  }
  throw lastError || new Error('Tất cả các Model AI dự phòng đều gặp sự cố.');
}

export async function POST(req: Request) {
  try {
    const { messages, data } = await req.json();
    const companyId = data?.companyId;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GOOGLE_GENERATIVE_AI_API_KEY hoặc GEMINI_API_KEY trên Vercel' },
        { status: 500 }
      );
    }

    const google = createGoogleGenerativeAI({
      apiKey,
    });

    const systemPrompt = `Bạn là Trợ lý AI hệ thống RealHome - Nền tảng tìm kiếm & quản lý bất động sản.

1. PHẠM VI TRẢ LỜI: Chỉ trả lời về phòng trọ, căn hộ, giá thuê, vị trí, tiện ích, quy định. Nếu hỏi ngoài lề, từ chối: "Tôi là AI hệ thống RealHome, bạn vui lòng hỏi những AI khác nhé".
2. QUY TẮC BẮT BUỘC DÙNG TOOL: LUÔN gọi findAvailableRooms trước khi trả lời về phòng/vị trí. Tuyệt đối không tự bịa thông tin.
   - Nếu tìm quanh địa danh/trường học/bệnh viện: truyền vào \`landmark\`, bán kính km vào \`radiusKm\`.
   - Nếu tìm theo quận/phường/địa chỉ: truyền vào \`area\`.
3. QUY TẮC ĐỊNH DẠNG (BẮT BUỘC TUÂN THỦ TỪNG DÒNG):
   - MỖI PHÒNG TRÌNH BÀY DẠNG GẠCH ĐẦU DÒNG (-):
     - [Xem chi tiết **Phòng {Mã phòng}**]({detail_link}) — **Giá: {Giá}đ/tháng** | **{Tên tòa nhà}** ({Khu vực}) - **Cách {Địa danh} {Số km}**
   - BẮT BUỘC tạo đường link Markdown có thể bấm được từ trường \`detail_link\` trong kết quả tool dạng \`[Xem chi tiết **Phòng {code}**]({detail_link})\`.
   - IN ĐẬM **Số phòng** (ví dụ **Phòng 201**), **Tên tòa nhà**, **Giá thuê**, **Khoảng cách km**, và **Lưu ý**.
   - Đưa ra lời nhắn **💡 Lưu ý:** Bạn vui lòng bấm vào link phòng tương ứng để xem hình ảnh và đặt lịch hẹn nhé!`;

    // === Hàm thực thi tool findAvailableRooms ===
    const executeFindRooms = async ({
      maxPrice, minPrice, area, allowPet, landmark, radiusKm = 3, limit = 5,
    }: { maxPrice?: number; minPrice?: number; area?: string; allowPet?: boolean; landmark?: string; radiusKm?: number; limit?: number }) => {
      try {
        // 1. Geocode địa danh nếu có
        let landmarkCoords = null;
        if (landmark && landmark.trim()) {
          landmarkCoords = await geocodeLandmark(landmark);
        }

        let query = supabaseAdmin
          .from('rooms')
          .select(`
            id, code, price, size, room_type, status, bedrooms, description, building_id,
            buildings!inner ( id, name, area, address, allow_pet, latitude, longitude )
          `)
          .eq('status', 'available');

        if (companyId) query = query.eq('company_id', companyId);
        if (maxPrice) query = query.lte('price', maxPrice);
        if (minPrice) query = query.gte('price', minPrice);

        if (area && area.trim()) {
          const cleanArea = area.trim();
          const pattern = `%${cleanArea}%`;
          query = query.or(
            `name.ilike.${pattern},address.ilike.${pattern},area.ilike.${pattern}`,
            { referencedTable: 'buildings' }
          );
        }

        if (allowPet) {
          query = query.in('buildings.allow_pet', ['yes', 'small_only']);
        }

        const { data: rows, error } = await query.limit(100);
        if (error) {
          console.error('Database query error:', error);
          return { error: 'Không thể truy xuất dữ liệu phòng.' };
        }

        let finalRows = rows || [];

        // 2. Lọc theo bán kính Haversine nếu có landmark
        if (landmarkCoords) {
          const { lat: targetLat, lng: targetLng } = landmarkCoords;

          for (const r of finalRows) {
            if ((!r.buildings?.latitude || !r.buildings?.longitude) && r.buildings?.address) {
              const bCoords = await geocodeLandmark(r.buildings.address);
              if (bCoords) {
                r.buildings.latitude = bCoords.lat;
                r.buildings.longitude = bCoords.lng;
              }
            }
          }

          const withDistance = finalRows.map((r: any) => {
            let dist: number | null = null;
            if (r.buildings?.latitude && r.buildings?.longitude) {
              dist = haversineDistanceKm(
                targetLat,
                targetLng,
                r.buildings.latitude,
                r.buildings.longitude
              );
            }
            return { ...r, distance_km: dist };
          });

          const matchedByRadius = withDistance.filter(
            (r: any) => r.distance_km !== null && r.distance_km <= radiusKm
          );

          if (matchedByRadius.length > 0) {
            matchedByRadius.sort((a: any, b: any) => (a.distance_km || 0) - (b.distance_km || 0));
            finalRows = matchedByRadius;
          } else {
            withDistance.sort((a: any, b: any) => {
              if (a.distance_km === null) return 1;
              if (b.distance_km === null) return -1;
              return a.distance_km - b.distance_km;
            });
            finalRows = withDistance;
          }
        } else if (area && area.trim() && finalRows.length === 0) {
          let fallbackQuery = supabaseAdmin
            .from('rooms')
            .select(`
              id, code, price, size, room_type, status, bedrooms, description, building_id,
              buildings!inner ( id, name, area, address, allow_pet, latitude, longitude )
            `)
            .eq('status', 'available')
            .limit(200);

          if (companyId) fallbackQuery = fallbackQuery.eq('company_id', companyId);
          if (maxPrice) fallbackQuery = fallbackQuery.lte('price', maxPrice);
          if (minPrice) fallbackQuery = fallbackQuery.gte('price', minPrice);

          const { data: fallbackData } = await fallbackQuery;
          if (fallbackData && fallbackData.length > 0) {
            const removeVietnameseTones = (str: string) =>
              str
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D')
                .toLowerCase();

            const searchNorm = removeVietnameseTones(area);
            finalRows = fallbackData.filter((r: any) => {
              const bName = removeVietnameseTones(r.buildings?.name || '');
              const bAddr = removeVietnameseTones(r.buildings?.address || '');
              const bArea = removeVietnameseTones(r.buildings?.area || '');
              return bName.includes(searchNorm) || bAddr.includes(searchNorm) || bArea.includes(searchNorm);
            });
          }
        }

        return {
          totalFound: finalRows.length,
          landmarkSearch: landmarkCoords ? {
            landmark,
            radiusKm,
            resolvedLocation: landmarkCoords.displayName,
          } : null,
          rooms: finalRows.slice(0, limit).map((r: any) => ({
            id: r.id,
            code: r.code,
            price: r.price,
            size: r.size,
            room_type: r.room_type,
            building_name: r.buildings?.name,
            area: r.buildings?.area,
            address: r.buildings?.address,
            distance_from_landmark: r.distance_km !== undefined && r.distance_km !== null ? `${r.distance_km} km` : undefined,
            allow_pet: (r.buildings?.allow_pet === 'yes' || r.buildings?.allow_pet === 'small_only') ? 'Có' : 'Không',
            detail_link: `/customer/properties/rooms/${r.id}`,
          })),
        };
      } catch (err: any) {
        console.error('executeFindRooms error:', err);
        return { error: 'Lỗi trong quá trình tìm kiếm phòng.' };
      }
    };

    const chatTools = {
      findAvailableRooms: tool({
        description: 'Tìm kiếm phòng trọ/căn hộ trống. PHẢI gọi tool này trước khi trả lời. Nếu tìm quanh địa danh/trường học/bệnh viện, truyền tên vào landmark và bán kính vào radiusKm.',
        parameters: z.object({
          maxPrice: z.number().optional().describe('Giá tối đa (VND)'),
          minPrice: z.number().optional().describe('Giá tối thiểu (VND)'),
          area: z.string().optional().describe('Tên khu vực, quận huyện (ví dụ: Cầu Giấy, Đống Đa...)'),
          landmark: z.string().optional().describe('Địa danh/trường học/bệnh viện (ví dụ: ĐH Ngoại Thương, Bệnh viện Bạch Mai)'),
          radiusKm: z.number().optional().describe('Bán kính km (mặc định 3)'),
          allowPet: z.boolean().optional().describe('True nếu cho nuôi thú cưng'),
          limit: z.number().optional().describe('Số phòng tối đa (mặc định 5)'),
        }),
        execute: executeFindRooms,
      }),
    };

    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 1: Dùng generateText phát hiện tool call
    // ═══════════════════════════════════════════════════════════════
    const { result: step1, modelId: usedModel } = await withFallback((modelId) =>
      generateText({
        model: google(modelId),
        system: systemPrompt,
        messages,
        tools: chatTools,
        maxRetries: 0,
        maxSteps: 1,
      })
    );

    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 2: Nếu có tool call, thực thi tool và stream câu trả lời cuối
    // ═══════════════════════════════════════════════════════════════
    const hasToolCall = step1.finishReason === 'tool-calls' && step1.toolCalls?.length > 0;

    if (hasToolCall) {
      const toolResultTexts: string[] = await Promise.all(
        step1.toolCalls.map(async (tc: any) => {
          const toolResult = await executeFindRooms(tc.args);
          return `[Kết quả tìm kiếm phòng]: ${JSON.stringify(toolResult)}`;
        })
      );

      const messagesWithToolResult = [
        ...messages,
        {
          role: 'user' as const,
          content: `${toolResultTexts.join('\n\n')}\n\nDựa vào dữ liệu trên, hãy trả lời từng phòng dạng gạch đầu dòng (-). BẮT BUỘC dùng đúng đường link Markdown [Xem chi tiết **Phòng {code}**]({detail_link}) từ trường detail_link. BẮT BUỘC in đậm **Phòng {code}**, **Tên tòa nhà**, **Giá thuê**, **Khoảng cách km** (nếu có), và **Lưu ý**.`,
        },
      ];

      const { result: step2 } = await withFallback((modelId) =>
        streamText({
          model: google(modelId),
          system: systemPrompt,
          messages: messagesWithToolResult,
          maxRetries: 0,
        })
      );

      return step2.toDataStreamResponse();
    }

    const { result: directStream } = await withFallback((modelId) =>
      streamText({
        model: google(modelId),
        system: systemPrompt,
        messages,
        maxRetries: 0,
      })
    );

    return directStream.toDataStreamResponse();
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
