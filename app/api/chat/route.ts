import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText, tool } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { geocodeLandmark, haversineDistanceKm } from '@/lib/geocoding';
import { getDashboardStats, getSalesDashboardStats } from '@/lib/supabase/repositories/dashboard';

export const runtime = 'nodejs';

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-3-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
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
    const userRole = data?.role;
    const userId = data?.userId;
    const userLandlordId = data?.landlordId;

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

    // === Cấu hình System Prompt linh hoạt theo Vai Trò (Role) ===
    let roleInstructions = '';
    const r = (userRole as string) || 'tenant';

    if (r === 'super_admin') {
      roleInstructions = `BẠN ĐANG PHỤC VỤ: SUPER ADMIN HỆ THỐNG.
- Bạn có quyền tối cao truy cập toàn bộ báo cáo nền tảng, danh sách công ty, tổng phòng và doanh thu hệ thống (\`getSuperAdminSystemOverview\`).`;
    } else if (r === 'company_admin' || r === 'admin' || r === 'manager') {
      roleInstructions = `BẠN ĐANG PHỤC VỤ: BAN QUẢN LÝ / ADMIN DOANH NGHIỆP.
- Bạn có quyền xem toàn bộ báo cáo doanh thu công ty, hóa đơn nợ quá hạn, hợp đồng hết hạn, xếp hạng KPI nhân viên xuất sắc/yếu kém và gợi ý điều quân đánh thị trường (\`getCompanyBusinessOverview\`).`;
    } else if (r === 'landlord') {
      roleInstructions = `BẠN ĐANG PHỤC VỤ: CHỦ NHÀ (LANDLORD).
- Bạn CHỈ ĐƯỢC XEM báo cáo tài sản, số tiền Payout thu về và danh sách phòng thuộc quyền quản lý của bạn (\`getLandlordOverview\`).
- Tuyệt đối KHÔNG tiết lộ doanh thu nền tảng hay báo cáo của công ty/chủ nhà khác.`;
    } else if (r === 'sales_agent') {
      roleInstructions = `BẠN ĐANG PHỤC VỤ: NHÂN VIÊN SALE (SALES AGENT).
- Bạn chỉ được xem KPI cá nhân, hoa hồng tạm tính của CHÍNH BẠN (\`getSalesKpiOverview\`) và tra cứu phòng trống (\`findAvailableRooms\`).
- Tuyệt đối KHÔNG tiết lộ doanh thu tổng công ty, hoa hồng của NVKD khác, hay báo cáo quản trị cấp cao. Nếu được hỏi, hãy từ chối: "Tôi chỉ có thể hỗ trợ bạn xem KPI cá nhân và bảng hàng phòng trống thôi nhé!".`;
    } else {
      roleInstructions = `BẠN ĐANG PHỤC VỤ: KHÁCH THUÊ PHÒNG (TENANT / GUEST).
- Bạn CHỈ ĐƯỢC PHÉP tìm kiếm phòng trống theo nhu cầu (\`findAvailableRooms\`).
- Tuyệt đối KHÔNG tiết lộ bất kỳ thông tin nội bộ nào như: Hoa hồng Sale, Doanh thu công ty, Thông tin hợp đồng hay Thông tin chủ nhà. Nếu khách hỏi ngoài phạm vi tìm phòng, hãy lịch sự từ chối: "Tôi là Trợ lý RealHome hỗ trợ tìm phòng trọ. Tôi chỉ có thể giúp bạn tìm kiếm các phòng phù hợp thôi nhé!".`;
    }

    const systemPrompt = `Bạn là Trợ lý AI thông minh hệ thống RealHome - Nền tảng tìm kiếm & quản lý bất động sản hàng đầu.

${roleInstructions}

Quy tắc trình bày:
- Trình bày dạng Markdown với Bảng biểu (Table) hoặc các Gạch đầu dòng rõ ràng.
- In đậm các chỉ số quan trọng: **Doanh thu**, **Tỷ lệ lấp đầy %**, **Số tiền**, **Hoa hồng**, **Tên nhân viên**, **Khu vực HOT**.
- Khi tư vấn chiến lược hay gợi ý điều quân/thầu nhà, đưa ra lời khuyên phân tích chi tiết, mang tính cố vấn chuyên gia.`;

    // === 1. Tool findAvailableRooms ===
    const executeFindRooms = async ({
      maxPrice, minPrice, area, allowPet, landmark, radiusKm = 3, limit = 5,
    }: { maxPrice?: number; minPrice?: number; area?: string; allowPet?: boolean; landmark?: string; radiusKm?: number; limit?: number }) => {
      try {
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

        if (landmarkCoords) {
          const { lat: targetLat, lng: targetLng } = landmarkCoords;

          const removeTones = (str: string) =>
            str
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd')
              .replace(/Đ/g, 'D')
              .toLowerCase();

          const cleanLandmark = landmark ? removeTones(landmark) : '';

          const withDistance = finalRows.map((r: any) => {
            let dist: number | null = null;
            const bAddr = removeTones(r.buildings?.address || '');
            const bName = removeTones(r.buildings?.name || '');
            const bArea = removeTones(r.buildings?.area || '');

            if (cleanLandmark && (bAddr.includes(cleanLandmark) || bName.includes(cleanLandmark) || bArea.includes(cleanLandmark))) {
              dist = 0.2;
            } else if (r.buildings?.latitude && r.buildings?.longitude) {
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

    // === 2. Tool Super Admin System Overview ===
    const executeSuperAdminOverview = async () => {
      try {
        const [companiesRes, landlordsRes, buildingsRes, roomsRes, subsRes] = await Promise.all([
          supabaseAdmin.from('companies').select('id, name, status, created_at'),
          supabaseAdmin.from('landlords').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('buildings').select('id, area', { count: 'exact' }),
          supabaseAdmin.from('rooms').select('id, status', { count: 'exact' }),
          supabaseAdmin.from('subscriptions').select('id, amount, status').eq('status', 'active'),
        ]);

        const companies = companiesRes.data || [];
        const rooms = roomsRes.data || [];
        const totalRooms = roomsRes.count || rooms.length;
        const rentedRooms = rooms.filter((r: any) => r.status === 'rented').length;
        const occupancyRate = totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0;

        const subs = subsRes.data || [];
        const platformMonthlyRevenue = subs.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);

        return {
          totalCompanies: companies.length,
          activeCompanies: companies.filter((c: any) => c.status === 'active').length,
          totalLandlords: landlordsRes.count || 0,
          totalBuildings: buildingsRes.count || 0,
          totalRooms,
          rentedRooms,
          availableRooms: totalRooms - rentedRooms,
          platformOccupancyRate: `${occupancyRate}%`,
          platformMonthlyRevenue,
        };
      } catch (err: any) {
        console.error('executeSuperAdminOverview error:', err);
        return { error: 'Không thể truy xuất thông tin Super Admin.' };
      }
    };

    // === 3. Tool Company Business Overview (Admin / Manager) ===
    const executeCompanyOverview = async () => {
      try {
        if (!companyId) return { error: 'Không tìm thấy ID công ty (companyId).' };
        const stats = await getDashboardStats(companyId);

        return {
          companyId,
          totalBuildings: stats.totalBuildings,
          totalRooms: stats.totalRooms,
          availableRooms: stats.availableRooms,
          rentedRooms: stats.rentedRooms,
          occupancyRate: `${stats.occupancyRate}%`,
          companyMonthlyRevenue: stats.companyRevenue,
          grossRevenueCollected: stats.totalCollectedAmount,
          overdueInvoicesCount: stats.overdueInvoicesGrouped?.length || 0,
          overdueInvoicesSummary: (stats.overdueInvoicesGrouped || []).slice(0, 5),
          expiringContractsCount: stats.expiringContractsGrouped?.length || 0,
          expiringContractsSummary: (stats.expiringContractsGrouped || []).slice(0, 5),
          topPerformingEmployees: (stats.topEmployees || []).slice(0, 5),
          hotZonesHighDemand: (stats.areaPerformanceList || []).filter((a: any) => a.occupancyRate >= 80),
          potentialZonesNeedingSalesPush: (stats.areaPerformanceList || []).filter((a: any) => a.occupancyRate < 80),
          strategicAdvice: 'Gợi ý điều động nhân viên Sale tập trung chào phòng ở các khu vực có tỷ lệ lấp đầy < 80%, đồng thời thưởng nóng cho top nhân viên xuất sắc.',
        };
      } catch (err: any) {
        console.error('executeCompanyOverview error:', err);
        return { error: 'Lỗi tra cứu báo cáo công ty.' };
      }
    };

    // === 4. Tool Landlord Overview ===
    const executeLandlordOverview = async ({ landlordId: targetLandlordId }: { landlordId?: string } = {}) => {
      try {
        if (!companyId) return { error: 'Cần thông tin công ty để tra cứu.' };
        const lId = targetLandlordId || userLandlordId;
        const stats = await getDashboardStats(companyId, lId);

        const highDemandAreas = (stats.areaPerformanceList || [])
          .filter((a: any) => a.occupancyRate >= 85)
          .map((a: any) => `${a.area} (Tỷ lệ lấp đầy ${a.occupancyRate}%)`);

        return {
          landlordId: lId,
          totalBuildings: stats.totalBuildings,
          buildingsList: (stats.buildingsList || []).map((b: any) => ({
            name: b.name,
            area: b.area,
            totalRooms: b.totalRooms,
            rentedRooms: b.rentedRooms,
            monthlyRevenue: b.revenue,
          })),
          totalRooms: stats.totalRooms,
          rentedRooms: stats.rentedRooms,
          availableRooms: stats.availableRooms,
          occupancyRate: `${stats.occupancyRate}%`,
          landlordMonthlyPayout: stats.landlordRevenue,
          expiringContractsCount: stats.expiringContractsGrouped?.length || 0,
          expiringContractsSummary: (stats.expiringContractsGrouped || []).slice(0, 5),
          expansionOpportunities: {
            recommendedAreasToLease: highDemandAreas.length > 0 ? highDemandAreas : ['Cầu Giấy', 'Đống Đa', 'Thanh Xuân', 'Tây Hồ'],
            marketInsight: 'Các khu vực trên đang ghi nhận nhu cầu thuê cao vượt trội (>85%). Chủ nhà nên cân nhắc mở rộng thầu thêm tòa nhà tại các quận này để tối ưu lợi nhuận.',
          },
        };
      } catch (err: any) {
        console.error('executeLandlordOverview error:', err);
        return { error: 'Lỗi tra cứu báo cáo Chủ nhà.' };
      }
    };

    // === 5. Tool Sales KPI Overview ===
    const executeSalesKpiOverview = async ({ saleId: targetSaleId }: { saleId?: string } = {}) => {
      try {
        if (!companyId) return { error: 'Cần thông tin công ty để tra cứu.' };
        const sId = targetSaleId || userId;
        if (!sId) return { error: 'Không xác định được ID nhân viên Sale.' };

        const stats = await getSalesDashboardStats(companyId, sId);

        return {
          saleId: sId,
          salesName: stats.employeeKpis?.employee_name || 'Nhân viên Sale',
          kpiTier: stats.kpiTier,
          successfulDealsThisMonth: stats.employeeKpis?.successful_deals || 0,
          revenueGeneratedThisMonth: stats.employeeKpis?.revenue_generated || 0,
          estimatedCommissionEarned: stats.employeeKpis?.commission_earned || 0,
          myTotalLeads: stats.totalLeads,
          todayAppointmentsCount: stats.todayAppointments?.length || 0,
          expiringContractsToRenewCount: stats.expiringContracts?.length || 0,
          expiringContractsToRenew: (stats.expiringContracts || []).map((c: any) => ({
            contract_code: c.contract_code,
            tenant_name: c.party_b_name,
            phone: c.party_b_phone,
            end_date: c.end_date,
            building_name: c.rooms?.buildings?.name,
            room_code: c.rooms?.code,
          })),
          salesPushSuggestions: {
            hotAvailableRoomsToPush: (stats.availableRooms || []).slice(0, 5).map((r: any) => ({
              code: r.code,
              building: r.buildings?.name,
              price: r.price,
            })),
            strategyAdvice: 'Ưu tiên gọi điện chăm sóc lại các khách thuê cũ sắp hết hạn để gia hạn hợp đồng, đồng thời liên hệ ngay các Lead mới trong ngày.',
          },
        };
      } catch (err: any) {
        console.error('executeSalesKpiOverview error:', err);
        return { error: 'Lỗi tra cứu KPI Sale.' };
      }
    };

    const chatTools = {
      findAvailableRooms: tool({
        description: 'Tìm kiếm phòng trọ/căn hộ trống cho khách thuê & sale.',
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
      getSuperAdminSystemOverview: tool({
        description: 'Dành riêng cho Super Admin: Tra cứu báo cáo tổng quan toàn bộ hệ thống nền tảng RealHome.',
        parameters: z.object({}),
        execute: executeSuperAdminOverview,
      }),
      getCompanyBusinessOverview: tool({
        description: 'Dành cho Admin / Quản lý: Báo cáo tài chính công ty, doanh thu, tỷ lệ lấp đầy, hóa đơn nợ quá hạn, hợp đồng hết hạn, xếp hạng nhân viên xuất sắc/yếu kém, gợi ý phân bổ lực lượng sale.',
        parameters: z.object({}),
        execute: executeCompanyOverview,
      }),
      getLandlordOverview: tool({
        description: 'Dành cho Chủ nhà (Landlord): Báo cáo tài sản thầu/sở hữu, tỷ lệ lấp đầy %, số tiền thu về tháng này, hợp đồng sắp hết hạn, gợi ý khu vực tiềm năng để thầu thêm tòa nhà mới.',
        parameters: z.object({
          landlordId: z.string().optional().describe('ID chủ nhà nếu có'),
        }),
        execute: executeLandlordOverview,
      }),
      getSalesKpiOverview: tool({
        description: 'Dành cho Nhân viên Sale: Báo cáo KPI cá nhân, doanh số chốt deal, hoa hồng tạm tính, hợp đồng sắp hết hạn cần gọi chăm sóc tái ký, gợi ý phòng hot để đẩy hàng.',
        parameters: z.object({
          saleId: z.string().optional().describe('ID nhân viên sale nếu có'),
        }),
        execute: executeSalesKpiOverview,
      }),
    };

    const { result: step1 } = await withFallback((modelId) =>
      generateText({
        model: google(modelId),
        system: systemPrompt,
        messages,
        tools: chatTools,
        maxRetries: 0,
        maxSteps: 1,
      })
    );

    const hasToolCall = step1.finishReason === 'tool-calls' && step1.toolCalls?.length > 0;

    if (hasToolCall) {
      const toolResultTexts: string[] = await Promise.all(
        step1.toolCalls.map(async (tc: any) => {
          let toolResult: any = null;
          const toolName = tc.toolName;

          // 🛡️ BẢO VỆ PHÂN QUYỀN TRUY CẬP DỮ LIỆU TỪ SERVER-SIDE (RBAC SECURITY)
          if (toolName === 'findAvailableRooms') {
            toolResult = await executeFindRooms(tc.args);
          } else if (toolName === 'getSuperAdminSystemOverview') {
            if (r !== 'super_admin') {
              toolResult = { error: 'TỪ CHỐI TRUY CẬP: Bạn không có quyền xem thông tin toàn bộ nền tảng Super Admin.' };
            } else {
              toolResult = await executeSuperAdminOverview();
            }
          } else if (toolName === 'getCompanyBusinessOverview') {
            if (r !== 'super_admin' && r !== 'company_admin' && r !== 'admin' && r !== 'manager') {
              toolResult = { error: 'TỪ CHỐI TRUY CẬP: Bạn không có quyền truy cập báo cáo tài chính và danh sách nhân sự doanh nghiệp. Chức năng này chỉ dành cho Ban Quản Lý.' };
            } else {
              toolResult = await executeCompanyOverview();
            }
          } else if (toolName === 'getLandlordOverview') {
            if (r !== 'landlord' && r !== 'company_admin' && r !== 'admin' && r !== 'super_admin' && r !== 'manager') {
              toolResult = { error: 'TỪ CHỐI TRUY CẬP: Bạn không có quyền xem báo cáo tài sản của Chủ nhà.' };
            } else {
              toolResult = await executeLandlordOverview(tc.args);
            }
          } else if (toolName === 'getSalesKpiOverview') {
            if (r !== 'sales_agent' && r !== 'company_admin' && r !== 'admin' && r !== 'super_admin' && r !== 'manager') {
              toolResult = { error: 'TỪ CHỐI TRUY CẬP: Bạn không có quyền xem báo cáo KPI và hoa hồng Nhân viên Sale.' };
            } else {
              // Ép nhân viên Sale chỉ được xem KPI cá nhân của chính mình (chống soi hoa hồng đồng nghiệp)
              if (r === 'sales_agent') {
                tc.args.saleId = userId;
              }
              toolResult = await executeSalesKpiOverview(tc.args);
            }
          }

          return `[Kết quả dữ liệu hệ thống từ Tool ${toolName}]: ${JSON.stringify(toolResult)}`;
        })
      );

      const messagesWithToolResult = [
        ...messages,
        {
          role: 'user' as const,
          content: `${toolResultTexts.join('\n\n')}\n\nDựa vào dữ liệu trên, hãy phân tích và trình bày câu trả lời thật đẹp mắt bằng Markdown (dùng Bảng biểu, In đậm, Gạch đầu dòng). Đưa ra các gợi ý đánh giá chiến lược phù hợp với vai trò của người dùng.`,
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
