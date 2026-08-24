import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText, tool } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { geocodeLandmark, haversineDistanceKm } from '@/lib/geocoding';
import { getDashboardStats, getSalesDashboardStats } from '@/lib/supabase/repositories/dashboard';
import { maskHouseNumberInBuildingName } from '@/lib/utils';

export const runtime = 'nodejs';

const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
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
    let companyId = data?.companyId;
    const userRole = data?.role;
    const userId = data?.userId;
    const userLandlordId = data?.landlordId;

    // Auto-resolve companyId from profile if omitted in client payload
    if (!companyId && userId) {
      try {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('company_id')
          .eq('id', userId)
          .maybeSingle();
        if (prof?.company_id) {
          companyId = prof.company_id;
        }
      } catch (pErr) {
        console.warn('[AIChat] Failed to auto-resolve companyId:', pErr);
      }
    }

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
- Bạn có quyền truy cập TOÀN BỘ dữ liệu thuộc công ty của bạn (\`companyId\`) bao gồm: Doanh thu, Hóa đơn nợ quá hạn, Hợp đồng sắp hết hạn, Xếp hạng KPI nhân viên xuất sắc/yếu kém, Tỷ lệ lấp đầy tòa nhà & phòng, Phân tích khu vực HOT/Tiềm năng, Danh sách Lead & Lịch hẹn xem phòng (\`getCompanyBusinessOverview\`).`;
    } else if (r === 'landlord') {
      roleInstructions = `BẠN ĐANG PHỤC VỤ: CHỦ NHÀ (LANDLORD).
- Bạn CHỈ ĐƯỢC XEM báo cáo tài sản, số tiền Payout thu về, danh sách phòng, hợp đồng hết hạn và các đơn vị/công ty đã hỗ trợ đẩy phòng nhiều nhất cho các tòa nhà thuộc quyền sở hữu của chính bạn (\`getLandlordOverview\`).
- Khi chủ nhà hỏi các câu như "Hệ thống/công ty nào đẩy được nhiều phòng nhất cho mình?", hãy giải đáp chính xác dựa vào danh sách top đối tác (\`topCompanyPartners\`).
- Tuyệt đối KHÔNG tiết lộ doanh thu nền tảng hay báo cáo của công ty/chủ nhà khác.`;
    } else if (r === 'sales_agent') {
      roleInstructions = `BẠN ĐANG PHỤC VỤ: NHÂN VIÊN SALE / MÔI GIỚI (SALES AGENT).
- Bạn có đầy đủ quyền tra cứu dữ liệu công việc cá nhân của Sale này (\`getSalesKpiOverview\`):
  1. LỊCH HẸN CỦA TÔI: Tra cứu chi tiết số lịch hẹn tháng này, hôm nay, trạng thái từng lịch hẹn (Pending, Confirmed, Cancelled), tên khách hàng, phòng/tòa nhà.
  2. PHÂN LOẠI KHÁCH HÀNG (LEADS): Trả lời chính xác số lượng Khách nóng (hot), Khách tiềm năng (warm/consulting), Khách mới (new), Khách đã cọc/chốt deal.
  3. LỊCH HẸN CHỜ NHẬN NGUỒN CÔNG TY (\`findUnassignedAppointments\`): Khi Sale hỏi các câu như "Lịch hẹn nào tôi có thể nhận tại Đống Đa, Cầu Giấy?", BẮT BUỘC gọi tool \`findUnassignedAppointments\` để tìm các lịch hẹn chưa có người phụ trách (\`assigned_to\` là null) tại khu vực đó và liệt kê chi tiết (tên khách, phòng, địa chỉ, ngày giờ) để Sale biết đường nhận.
  4. KPI CÁ NHÂN & HOA HỒNG: Tra cứu doanh số chốt deal, hoa hồng tạm tính, hợp đồng sắp hết hạn cần gọi chăm sóc tái ký.
  5. BẢNG HÀNG PHÒNG TRỐNG (\`findAvailableRooms\`): Tìm phòng trống theo tiêu chí giá cả, khu vực, nuôi thú cưng.
- Tuyệt đối KHÔNG tiết lộ doanh thu tổng của công ty, hoa hồng của NVKD khác, hay báo cáo quản trị cấp cao.`;
    } else {
      roleInstructions = `BẠN ĐANG PHỤC VỤ: KHÁCH THUÊ PHÒNG (TENANT / GUEST).
- Bạn CHỈ ĐƯỢC PHÉP tìm kiếm phòng trống theo nhu cầu (\`findAvailableRooms\`).
- Tuyệt đối KHÔNG tiết lộ bất kỳ thông tin nội bộ nào như: Hoa hồng Sale, Doanh thu công ty, Thông tin hợp đồng hay Thông tin chủ nhà. Nếu khách hỏi ngoài phạm vi tìm phòng, hãy lịch sự từ chối: "Tôi là Trợ lý RealHome hỗ trợ tìm phòng trọ. Tôi chỉ có thể giúp bạn tìm kiếm các phòng phù hợp thôi nhé!".`;
    }

    const systemPrompt = `Bạn là Trợ lý AI thông minh của hệ thống RealHome - Nền tảng tìm kiếm & quản lý bất động sản hàng đầu.

${roleInstructions}

QUY TẮC CỐT LÕI (NGHIÊM NGẶT):
1. HỎI GÌ TRẢ LỜI NẤY (ĐÚNG TRỌNG TÂM):
- Trả lời trực tiếp, chính xác, súc tích đúng với câu hỏi của người dùng.
- TUYỆT ĐỐI KHÔNG tự ý viết các bài phân tích chiến lược dài dòng, KHÔNG lập các bảng chiến lược rườm rà trừ khi người dùng chủ động yêu cầu "tư vấn chiến lược" hoặc "phân tích sâu".
- Với câu chào hỏi ("Chào bạn", "Xin chào"): Đáp lại thân thiện trong 1 câu duy nhất (Ví dụ: "Xin chào! Bạn đang muốn tìm phòng ở khu vực nào hoặc cần trợ giúp gì ạ?").

2. GIỚI HẠN PHẠM VI DỰ ÁN REALHOME:
- Chỉ hỗ trợ tìm kiếm phòng trọ, căn hộ, báo cáo vận hành & quản lý bất động sản của RealHome.
- Từ chối lịch sự trong 1 câu đối với các chủ đề ngoài lề không thuộc dự án RealHome (thời tiết, lập trình, nấu ăn...): "Tôi là Trợ lý RealHome và chỉ có thể hỗ trợ các thông tin liên quan đến phòng trọ và quản lý bất động sản thôi nhé!".

3. ĐỊNH DẠNG PHẢN HỒI & BẢO MẬT ĐỊA CHỈ:
- XUỐNG DÒNG ĐỘC LẬP: Khi hiển thị danh sách phòng, BẮT BUỘC MỖI PHÒNG NẰM TRÊN MỘT DÒNG RÊNG BIỆT (dùng gạch đầu dòng '-' hoặc 📍 ở đầu mỗi dòng phòng, có ký tự xuống dòng ở cuối). TUYỆT ĐỐI KHÔNG viết nối liền nhiều phòng trên cùng một dòng.
- MÃ HÓA ĐỊA CHỈ (NẾU LÀ KHÁCH THUÊ / SALE): Đối với người dùng là Khách thuê (tenant) hoặc Sales Agent, BẮT BUỘC giữ nguyên địa chỉ/tên tòa nhà đã mã hóa số nhà/số ngách (ví dụ: 'x ngách 8x ngõ 678 đê la thành') để tránh lộ địa chỉ thực tế . Đối với Ban Quản Lý/Admin/Chủ nhà, hiển thị đầy đủ địa chỉ chính xác.
- Khi KHÔNG tìm thấy phòng phù hợp: Thông báo ngắn gọn trong 1-2 câu ("Rất tiếc, hệ thống chưa có phòng trống phù hợp tiêu chí [X] ở [Y]. Bạn có muốn mở rộng ngân sách hoặc tìm ở khu vực lân cận không?").`;

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

        const isMaskedRole = r === 'tenant' || r === 'sales_agent' || !r;

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
            building_name: isMaskedRole ? maskHouseNumberInBuildingName(r.buildings?.name || '') : (r.buildings?.name || ''),
            area: r.buildings?.area,
            address: isMaskedRole ? maskHouseNumberInBuildingName(r.buildings?.address || '') : (r.buildings?.address || ''),
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
        const stats = await getDashboardStats(companyId, undefined, 'current_month', supabaseAdmin);

        const areaList = stats.areaPerformanceList || [];

        return {
          companyId,
          totalBuildings: stats.totalBuildings,
          totalRooms: stats.totalRooms,
          availableRooms: stats.availableRooms,
          rentedRooms: stats.rentedRooms,
          occupancyRate: `${stats.occupancyRate}%`,
          companyMonthlyRevenue: stats.companyRevenue,
          grossRevenueCollected: stats.totalCollectedAmount,
          overdueInvoicesCount: stats.overdueInvoicesGrouped?.length || stats.overdueInvoices || 0,
          overdueInvoicesSummary: (stats.overdueInvoicesGrouped || []).slice(0, 5),
          expiringContractsCount: stats.expiringContractsGrouped?.length || stats.expiringContractsCount || 0,
          expiringContractsSummary: (stats.expiringContractsGrouped || []).slice(0, 5),
          topPerformingEmployees: (stats.topEmployees || []).slice(0, 5),
          hotZonesHighDemand: areaList.filter((a: any) => a.occupancyRate >= 80),
          potentialZonesNeedingSalesPush: areaList.filter((a: any) => a.occupancyRate < 80),
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
        const stats = await getDashboardStats(companyId, lId, 'current_month', supabaseAdmin);

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
          topCompanyPartners: stats.topCompanyPartners || [],
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
    // === 5. Tool Sales KPI & Work Overview ===
    const executeSalesKpiOverview = async ({ saleId: targetSaleId }: { saleId?: string } = {}) => {
      try {
        const sId = targetSaleId || userId;
        if (!sId) return { error: 'Không xác định được ID nhân viên Sale.' };

        let stats: any = { employeeKpis: {}, availableRooms: [], expiringContracts: [] };
        if (companyId) {
          try {
            stats = await getSalesDashboardStats(companyId, sId, supabaseAdmin);
          } catch (sErr) {
            console.warn('[AIChat] getSalesDashboardStats error fallback:', sErr);
          }
        }

        const now = new Date();
        const currentPeriod = now.toISOString().slice(0, 7); // 'YYYY-MM'
        const todayStr = now.toISOString().slice(0, 10);

        // Truy vấn chi tiết lịch hẹn của Sale này (bao gồm ca được phân công, ca tự tạo, hoặc ca chờ nhận)
        let apptsQuery = supabaseAdmin
          .from('appointments')
          .select('id, status, checkin_status, customer_name, customer_phone, room_title, address, date, time, created_at, assigned_to, created_by')
          .order('date', { ascending: false });

        if (companyId) apptsQuery = apptsQuery.eq('company_id', companyId);
        if (sId) {
          apptsQuery = apptsQuery.or(`assigned_to.eq.${sId},created_by.eq.${sId},assigned_to.is.null`);
        }

        let leadsQuery = supabaseAdmin
          .from('leads')
          .select('id, status, full_name, phone, created_at, source')
          .order('created_at', { ascending: false });

        if (companyId) leadsQuery = leadsQuery.eq('company_id', companyId);
        if (sId) leadsQuery = leadsQuery.or(`assigned_to.eq.${sId},assigned_to.is.null`);

        const [apptsRes, leadsRes] = await Promise.all([apptsQuery, leadsQuery]);

        const allAppts = apptsRes.data || [];
        const monthAppts = allAppts.filter((a: any) => a.date && a.date.startsWith(currentPeriod));
        const todayAppts = allAppts.filter((a: any) => a.date === todayStr);

        const apptStatusBreakdown = {
          confirmed: allAppts.filter((a: any) => ['Confirmed', 'confirmed', 'completed', 'Completed'].includes(a.status) || a.checkin_status).length,
          pending: allAppts.filter((a: any) => ['Pending', 'pending'].includes(a.status) && !a.checkin_status).length,
          cancelled: allAppts.filter((a: any) => ['Cancelled', 'cancelled'].includes(a.status)).length,
        };

        const allLeads = leadsRes.data || [];
        const leadsClassification = {
          hotLeadsCount: allLeads.filter((l: any) => ['hot', 'viewing', 'deposit_pending'].includes(l.status?.toLowerCase())).length,
          warmLeadsCount: allLeads.filter((l: any) => ['warm', 'consulting', 'contacted'].includes(l.status?.toLowerCase())).length,
          newLeadsCount: allLeads.filter((l: any) => ['new', 'unread'].includes(l.status?.toLowerCase())).length,
          closedLeadsCount: allLeads.filter((l: any) => ['deposited', 'contracted', 'converted'].includes(l.status?.toLowerCase())).length,
          totalLeads: allLeads.length,
        };

        return {
          saleId: sId,
          salesName: stats.employeeKpis?.employee_name || 'Nhân viên Sale',
          kpiTier: stats.kpiTier,
          successfulDealsThisMonth: stats.employeeKpis?.successful_deals || 0,
          revenueGeneratedThisMonth: stats.employeeKpis?.revenue_generated || 0,
          estimatedCommissionEarned: stats.employeeKpis?.commission_earned || 0,
          appointmentsSummary: {
            thisMonthTotal: monthAppts.length,
            todayTotal: todayAppts.length,
            allTimeTotal: allAppts.length,
            statusBreakdown: apptStatusBreakdown,
            recentAppointmentsList: allAppts.slice(0, 15).map((a: any) => ({
              customer: a.customer_name,
              phone: maskHouseNumberInBuildingName(a.customer_phone || ''),
              room: maskHouseNumberInBuildingName(a.room_title || a.address || ''),
              date: a.date,
              time: a.time,
              status: (a.checkin_status || a.status === 'completed') ? 'Đã Check-in (Thành công)' : a.status,
              isAssignedToMe: a.assigned_to === sId,
            })),
          },
          leadsClassification,
          expiringContractsToRenewCount: stats.expiringContracts?.length || 0,
          expiringContractsToRenew: (stats.expiringContracts || []).map((c: any) => ({
            contract_code: c.contract_code,
            tenant_name: c.party_b_name,
            phone: maskHouseNumberInBuildingName(c.party_b_phone || ''),
            end_date: c.end_date,
            building_name: maskHouseNumberInBuildingName(c.rooms?.buildings?.name || ''),
            room_code: c.rooms?.code,
          })),
          salesPushSuggestions: {
            hotAvailableRoomsToPush: (stats.availableRooms || []).slice(0, 5).map((r: any) => ({
              code: r.code,
              building: maskHouseNumberInBuildingName(r.buildings?.name || ''),
              price: r.price,
            })),
            strategyAdvice: 'Ưu tiên gọi điện chăm sóc lại các khách hàng nóng và khách thuê cũ sắp hết hạn để gia hạn hợp đồng.',
          },
        };
      } catch (err: any) {
        console.error('executeSalesKpiOverview error:', err);
        return { error: 'Lỗi tra cứu KPI Sale.' };
      }
    };

    // === 6. Tool Find Unassigned Appointments (Lịch hẹn công ty chờ Sale nhận) ===
    const executeFindUnassignedAppointments = async ({ area, date }: { area?: string; date?: string }) => {
      try {
        let query = supabaseAdmin
          .from('appointments')
          .select(`
            id, customer_name, customer_phone, room_title, address, date, time, status, lead_source, company_id, building_id, room_id,
            buildings ( name, area, address )
          `)
          .is('assigned_to', null);

        if (companyId) query = query.eq('company_id', companyId);
        if (date) query = query.eq('date', date);

        const { data: rows, error } = await query.order('date', { ascending: true }).limit(20);
        if (error) {
          console.error('executeFindUnassignedAppointments error:', error);
          return { error: 'Lỗi truy xuất lịch hẹn chưa nhận.' };
        }

        let filtered = rows || [];
        if (area && area.trim()) {
          const cleanArea = area.trim().toLowerCase();
          filtered = filtered.filter((a: any) => {
            const bArea = (a.buildings?.area || '').toLowerCase();
            const bAddr = (a.buildings?.address || '').toLowerCase();
            const apptAddr = (a.address || '').toLowerCase();
            const roomTitle = (a.room_title || '').toLowerCase();
            return bArea.includes(cleanArea) || bAddr.includes(cleanArea) || apptAddr.includes(cleanArea) || roomTitle.includes(cleanArea);
          });
        }

        return {
          totalFound: filtered.length,
          unassignedAppointments: filtered.map((a: any) => ({
            id: a.id,
            customer_name: a.customer_name,
            customer_phone: maskHouseNumberInBuildingName(a.customer_phone || ''),
            room_title: maskHouseNumberInBuildingName(a.room_title || a.buildings?.name || ''),
            area: a.buildings?.area || 'Chưa rõ',
            address: maskHouseNumberInBuildingName(a.buildings?.address || a.address || ''),
            date: a.date,
            time: a.time,
            lead_source: a.lead_source || 'company_mkt',
            action_hint: 'Sale có thể bấm "Nhận ngay" trên trang Lịch Hẹn Công Ty (/admin/customers/appointments) để nhận chăm sóc khách này.',
          })),
        };
      } catch (err: any) {
        console.error('executeFindUnassignedAppointments error:', err);
        return { error: 'Lỗi tra cứu lịch hẹn chưa nhận.' };
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
        description: 'Dành cho Nhân viên Sale: Báo cáo KPI cá nhân, doanh số chốt deal, tổng số và danh sách LỊCH HẸN THÁNG NÀY/HÔM NAY, PHÂN LOẠI KHÁCH HÀNG (khách nóng, tiềm năng, khách mới, đã cọc), hợp đồng sắp hết hạn.',
        parameters: z.object({
          saleId: z.string().optional().describe('ID nhân viên sale nếu có'),
        }),
        execute: executeSalesKpiOverview,
      }),
      findUnassignedAppointments: tool({
        description: 'Dành cho Sale / Admin: Tra cứu các LỊCH HẸN CHƯA CÓ SALE NHẬN (lịch hẹn từ Marketing/Công ty) theo khu vực (Cầu Giấy, Đống Đa...) để Sale chọn nhận chăm sóc.',
        parameters: z.object({
          area: z.string().optional().describe('Khu vực quận/huyện cần tìm lịch hẹn chưa nhận (ví dụ: Cầu Giấy, Đống Đa...)'),
          date: z.string().optional().describe('Ngày xem phòng (YYYY-MM-DD)'),
        }),
        execute: executeFindUnassignedAppointments,
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
          } else if (toolName === 'findUnassignedAppointments') {
            if (r !== 'sales_agent' && r !== 'company_admin' && r !== 'admin' && r !== 'super_admin' && r !== 'manager') {
              toolResult = { error: 'TỪ CHỐI TRUY CẬP: Bạn không có quyền tra cứu lịch hẹn công ty.' };
            } else {
              toolResult = await executeFindUnassignedAppointments(tc.args);
            }
          }

          return `[Kết quả dữ liệu hệ thống từ Tool ${toolName}]: ${JSON.stringify(toolResult)}`;
        })
      );

      const messagesWithToolResult = [
        ...messages,
        {
          role: 'user' as const,
          content: `${toolResultTexts.join('\n\n')}\n\nDựa vào dữ liệu thực tế trên, hãy trình bày danh sách phòng: BẮT BUỘC MỖI PHÒNG 1 DÒNG ĐỘC LẬP (dùng gạch đầu dòng '- ' hoặc emoji 📍 ở đầu mỗi dòng, bấm xuống dòng ở cuối mỗi phòng). Giữ nguyên địa chỉ/tên tòa nhà đã được mã hóa trong dữ liệu (ví dụ: x ngách 8x ngõ 678...). KHÔNG viết nối liền các phòng trên cùng một dòng.`,
        },
      ];

      const { result: step2 } = await withFallback(async (modelId) =>
        streamText({
          model: google(modelId),
          system: systemPrompt,
          messages: messagesWithToolResult,
          maxRetries: 0,
        })
      );

      return step2.toDataStreamResponse();
    }

    const { result: directStream } = await withFallback(async (modelId) =>
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
