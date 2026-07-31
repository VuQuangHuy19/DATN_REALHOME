import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { maskHouseNumberInBuildingName } from '@/lib/utils';
import { extractGoogleSheetId, ParsedBuilding } from '@/src/features/import/services/googleSheetAiParser';
import { syncGoogleDriveImagesForProperty, syncGoogleDriveImagesForBuilding } from '@/src/lib/services/google-drive';
import { parseRoomType } from '@/src/lib/constants/roomTypes';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Chuyển chuỗi về dạng chuẩn không ký tự đặc biệt để so sánh trùng lặp
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// So sánh 2 tên hoặc địa chỉ tòa nhà (Yêu cầu chính xác 100%)
function isMatchingBuilding(bName1: string, bName2: string): boolean {
  const n1 = normalizeString(bName1);
  const n2 = normalizeString(bName2);
  if (!n1 || !n2) return false;
  return n1 === n2;
}

// Chuẩn hóa mã phòng (P.201 -> 201, p201 -> 201, 201.0 -> 201)
function normalizeRoomCode(code: string): string {
  if (!code) return '';
  let clean = code.trim().toLowerCase().replace(/^p\.?/i, '').trim();
  clean = clean.replace(/\.0+$/, '');
  return clean;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { company_id, landlord_id, sheet_url, buildings } = body as {
      company_id?: string;
      landlord_id?: string;
      sheet_url: string;
      buildings: ParsedBuilding[];
    };

    if (!sheet_url || !buildings || !Array.isArray(buildings)) {
      return NextResponse.json({ error: 'Dữ liệu xác nhận không hợp lệ.' }, { status: 400 });
    }

    const sheetId = extractGoogleSheetId(sheet_url) || 'unknown_sheet';

    // Lấy toàn bộ danh sách tòa nhà hiện có của công ty để CHECK TRÙNG LẶP
    let buildingQuery = supabaseAdmin
      .from('buildings')
      .select('id, code, name, address, area, landlord_id');

    if (company_id) {
      buildingQuery = buildingQuery.eq('company_id', company_id);
    }
    const { data: existingBuildingsList } = await buildingQuery;
    const dbBuildings = existingBuildingsList || [];

    let totalBuildingsCreated = 0;
    let totalRoomsCreated = 0;
    let totalRoomsUpdated = 0;
    let totalRoomsMarkedRented = 0;
    const syncBuildingDriveTasks: { buildingId: string; driveUrl: string; companyId?: string }[] = [];
    const syncDriveTasks: { roomId: string; driveUrl: string; companyId?: string }[] = [];

    for (const bData of buildings) {
      if (!bData.name) continue;

      const buildingName = bData.name.trim();
      const area = bData.area || 'Đống Đa';
      const address = bData.address || buildingName;

      // 1. CHÉC TRÙNG TÒA NHÀ HỆ THỐNG (Phân biệt theo Chủ nhà và Địa chỉ chuẩn)
      const existingBuilding = dbBuildings.find((b: any) => {
        // Nếu import cho một chủ nhà cụ thể, KHÔNG ghép trùng vào tòa nhà của chủ nhà khác!
        if (landlord_id && b.landlord_id && b.landlord_id !== landlord_id) {
          return false;
        }
        return isMatchingBuilding(b.name, buildingName) || isMatchingBuilding(b.address || '', address);
      });

      let buildingId = existingBuilding?.id;
      let buildingCode = existingBuilding?.code;

      if (!buildingId) {
        // Tạo mã tòa nhà ngẫu nhiên nếu là tòa mới
        const prefix =
          buildingName
            .split(' ')
            .map((w) => w.charAt(0))
            .join('')
            .substring(0, 3)
            .toUpperCase() || 'BLD';
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        buildingCode = `${prefix}${rand}`;

        let buildingDesc = bData.general_notes || null;
        if (bData.drive_media_url) {
          buildingDesc = buildingDesc ? `${buildingDesc}\nLink ảnh: ${bData.drive_media_url}` : `Link ảnh: ${bData.drive_media_url}`;
        }

        const { data: newBuilding, error: bErr } = await supabaseAdmin
          .from('buildings')
          .insert({
            company_id: company_id || null,
            landlord_id: landlord_id || null,
            code: buildingCode,
            name: buildingName,
            address: address,
            area: area,
            description: buildingDesc,
            total_rooms: bData.rooms.length,
            external_sync_id: sheet_url,
            has_elevator: true,
            pccc_certified: true,
            allow_pet: 'Không',
            electricity_price: 4000,
            water_price: 35000,
            internet_price: 100000,
            common_service_price: 200000,
            deposit_terms: 'đóng 1 cọc 1',
          })
          .select('id, code')
          .single();

        if (bErr || !newBuilding) {
          console.error('[Commit Route] Lỗi tạo tòa nhà mới:', bErr);
          continue;
        }

        buildingId = newBuilding.id;
        buildingCode = newBuilding.code;
        totalBuildingsCreated++;
      } else {
        // Cập nhật tòa nhà sẵn có (Không bao giờ ghi đè landlord_id của chủ nhà khác)
        await supabaseAdmin
          .from('buildings')
          .update({
            total_rooms: bData.rooms.length,
            description: bData.general_notes || undefined,
            external_sync_id: sheet_url,
            landlord_id: existingBuilding.landlord_id || landlord_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', buildingId);
      }

      // Link Drive ảnh chung cấp Tòa nhà
      if (buildingId && bData.drive_media_url) {
        syncBuildingDriveTasks.push({
          buildingId: buildingId,
          driveUrl: bData.drive_media_url,
          companyId: company_id
        });
      }

      // Lấy toàn bộ danh sách phòng hiện tại của Tòa nhà này để CHECK TRÙNG PHÒNG
      let existingRoomsQuery = supabaseAdmin
        .from('rooms')
        .select('id, code')
        .or(`building_id.eq.${buildingCode},building_id.eq.${buildingId}`);

      if (company_id) {
        existingRoomsQuery = existingRoomsQuery.eq('company_id', company_id);
      }

      const { data: dbRoomsList } = await existingRoomsQuery;
      const dbRooms = dbRoomsList || [];

      // 2. XỬ LÝ VÀ CHÉC TRÙNG PHÒNG
      const processedRoomCodes = new Set<string>();

      for (const rData of bData.rooms) {
        if (!rData.code) continue;

        let rawCode = String(rData.code).trim().replace(/\.0+$/, '');
        const normCode = normalizeRoomCode(rawCode);
        const price = typeof rData.price === 'number' ? rData.price : 0;
        const floor = rData.floor || 1;
        const roomType = parseRoomType(rData.room_type);
        const status = rData.status || 'available';

        // Theo dõi các mã phòng đã xử lý (để sau đó tìm phòng bị thiếu)
        processedRoomCodes.add(normCode);

        // Tìm phòng đã tồn tại trùng mã phòng (Chuẩn hóa cả đuôi .0 của Excel)
        const existingRoom = dbRooms.find((r: any) => normalizeRoomCode(r.code) === normCode);

        const roomDriveMediaUrl = rData.drive_media_url || null; // Chỉ lấy link riêng của phòng
        let roomDesc = rData.description || bData.general_notes || null;
        if (roomDriveMediaUrl) {
          roomDesc = roomDesc ? `${roomDesc}\nLink ảnh: ${roomDriveMediaUrl}` : `Link ảnh: ${roomDriveMediaUrl}`;
        }

        const roomPayload: any = {
          company_id: company_id || null,
          landlord_id: landlord_id || existingBuilding?.landlord_id || null,
          building_id: buildingCode,
          code: rawCode,
          floor: floor,
          price: price,
          size: rData.size || 25,
          room_type: roomType,
          status: status,
          available_date: rData.available_date || null,
          bedrooms: rData.bedrooms || 1,
          bathrooms: rData.bathrooms || 1,
          max_occupants: 2,
          max_vehicles_per_room: 2,
          deposit_terms: 'đóng 1 cọc 1',
          min_contract_months: 6,
          description: roomDesc,
          external_sync_id: `${sheet_url}#${rawCode}`,
          updated_at: new Date().toISOString(),
        };

        let targetRoomId = existingRoom?.id;

        if (existingRoom) {
          // CẬP NHẬT PHÒNG ĐÃ CÓ (KHÔNG BỊ TẠO TRÙNG)
          await supabaseAdmin.from('rooms').update(roomPayload).eq('id', existingRoom.id);
          totalRoomsUpdated++;
        } else {
          // THÊM MỚI PHÒNG
          const { data: newRoom, error: rErr } = await supabaseAdmin
            .from('rooms')
            .insert(roomPayload)
            .select('id')
            .single();

          if (!rErr && newRoom) {
            targetRoomId = newRoom.id;
            totalRoomsCreated++;
          }
        }

        // Chỉ thêm task sync ảnh phòng nếu phòng có link Drive riêng biệt
        if (targetRoomId && roomDriveMediaUrl) {
          syncDriveTasks.push({
            roomId: targetRoomId,
            driveUrl: roomDriveMediaUrl,
            companyId: company_id,
          });
        }
      }

      // 3. AUTO-MARK PHÒNG BIẾN MẤT KHỎI SHEET → "ĐÃ THUÊ"
      if (existingBuilding && bData.rooms.length > 0 && dbRooms.length > 0) {
        const missingRooms = dbRooms.filter(
          (r: any) => !processedRoomCodes.has(normalizeRoomCode(r.code))
        );

        if (missingRooms.length > 0) {
          console.log(`[Commit Route] ${missingRooms.length} phòng không còn trong Sheet của tòa "${buildingName}" → tự động đánh dấu "Đã thuê"`);
          for (const missingRoom of missingRooms) {
            await supabaseAdmin
              .from('rooms')
              .update({
                status: 'rented',
                available_date: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', missingRoom.id);
            totalRoomsMarkedRented++;
          }
        }
      }
    }

    // 4. GHI NHẬN VÀO BẢNG ĐỒNG BỘ LANDLORD_SHEET_SYNCS
    await supabaseAdmin.from('landlord_sheet_syncs').upsert(
      {
        company_id: company_id || null,
        landlord_id: landlord_id || null,
        sheet_url: sheet_url,
        sheet_id: sheetId,
        last_synced_at: new Date().toISOString(),
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sheet_id' }
    );

    // 5. CHẠY TIẾN TRÌNH NỀN TẢI ẢNH TỪ GOOGLE DRIVE (Không block response)
    if (syncBuildingDriveTasks.length > 0 || syncDriveTasks.length > 0) {
      (async () => {
        // Sync ảnh cấp Tòa nhà
        for (const bTask of syncBuildingDriveTasks) {
          try {
            await syncGoogleDriveImagesForBuilding(bTask.buildingId, bTask.driveUrl, bTask.companyId);
            await new Promise((r) => setTimeout(r, 500));
          } catch (err: any) {
            console.error(`[Building Drive Sync Error for building ${bTask.buildingId}]:`, err?.message);
          }
        }

        // Sync ảnh cấp Phòng
        for (const task of syncDriveTasks) {
          try {
            await syncGoogleDriveImagesForProperty(task.roomId, task.driveUrl, task.companyId);
            await new Promise((r) => setTimeout(r, 800));
          } catch (err: any) {
            console.error(`[Drive Sync Background Error for room ${task.roomId}]:`, err?.message);
          }
        }
      })();
    }

    return NextResponse.json({
      success: true,
      totalBuildings: totalBuildingsCreated,
      totalRoomsCreated,
      totalRoomsUpdated,
      totalRoomsMarkedRented,
      totalRooms: totalRoomsCreated + totalRoomsUpdated,
      hasDriveSyncTasks: syncBuildingDriveTasks.length > 0 || syncDriveTasks.length > 0,
    });
  } catch (error: any) {
    console.error('[Commit Route Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Không thể lưu dữ liệu đồng bộ.' },
      { status: 500 }
    );
  }
}
