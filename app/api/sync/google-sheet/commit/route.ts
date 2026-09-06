import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { maskHouseNumberInBuildingName, formatStandardBuildingAddress, normalizeStringForMatching, isMatchingBuilding } from '@/lib/utils';
import { extractGoogleSheetId, ParsedBuilding, detectHanoiDistrict } from '@/features/import/services/googleSheetAiParser';
import { syncGoogleDriveImagesForProperty, syncGoogleDriveImagesForBuilding } from '@/lib/services/google-drive';
import { parseRoomType } from '@/lib/constants/roomTypes';
import { detectDryerFeature } from '@/lib/utils/dryer-parser';
import { formatNotesWithSystemHeader } from '@/lib/utils/note-formatter';

export const runtime = 'nodejs';
export const maxDuration = 300;


// Chuẩn hóa mã phòng (P.201 -> 201, p201 -> 201, phòng 201 -> 201, 201.0 -> 201)
function normalizeRoomCode(code: string): string {
  if (!code) return '';
  let clean = code.trim().toLowerCase()
    .replace(/^p\.?/i, '')
    .replace(/^phòng\s*/i, '')
    .replace(/\.0+$/, '')
    .trim();
  return clean;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { company_id, landlord_id, sheet_url, buildings } = body as {
      company_id?: string;
      landlord_id?: string;
      sheet_url: string;
      buildings: (ParsedBuilding & { target_building_id?: string })[];
    };

    if (!sheet_url || !buildings || !Array.isArray(buildings)) {
      return NextResponse.json({ error: 'Dữ liệu xác nhận không hợp lệ.' }, { status: 400 });
    }

    const sheetId = extractGoogleSheetId(sheet_url) || 'unknown_sheet';

    // Lấy toàn bộ danh sách tòa nhà hiện có của công ty để CHECK TRÙNG LẶP
    let buildingQuery = supabaseAdmin
      .from('buildings')
      .select('id, code, name, address, area, landlord_id, image_url, description, external_sync_id');

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

    const matchedDbBuildingIds = new Set<string>();

    // Lấy toàn bộ danh sách chủ nhà để map (ID / Code) -> Code chính xác (TH01, TH02...) và UUID chính xác
    const { data: allLandlords } = await supabaseAdmin.from('landlords').select('id, code');
    const landlordKeyToCodeMap = new Map<string, string>();
    const landlordKeyToUuidMap = new Map<string, string>();
    (allLandlords || []).forEach((l: any) => {
      if (l.id) {
        landlordKeyToUuidMap.set(l.id.toLowerCase(), l.id);
        if (l.code) {
          landlordKeyToCodeMap.set(l.code.toLowerCase(), l.code);
          landlordKeyToCodeMap.set(l.id.toLowerCase(), l.code);
          landlordKeyToUuidMap.set(l.code.toLowerCase(), l.id);
        }
      }
    });

    const resolveLandlordId = (rawId: string | null | undefined): string | null => {
      if (!rawId) return null;
      const clean = String(rawId).trim().toLowerCase();
      return landlordKeyToCodeMap.get(clean) || rawId;
    };

    const resolveLandlordUuid = (rawId: string | null | undefined): string | null => {
      if (!rawId) return null;
      const clean = String(rawId).trim().toLowerCase();
      return landlordKeyToUuidMap.get(clean) || (clean.length === 36 ? rawId : null);
    };

    const cleanPhoneNumber = (phoneStr: string | null | undefined): string | null => {
      if (!phoneStr) return null;
      let clean = String(phoneStr).replace(/[^\d]/g, '');
      if (!clean) return null;
      while (clean.startsWith('00')) {
        clean = clean.slice(1);
      }
      if (clean.length === 9 && !clean.startsWith('0')) {
        clean = '0' + clean;
      }
      return clean;
    };

    // Trích xuất Code và ID của chủ nhà (nếu có landlord_id) để khớp tòa nhà chính xác
    const validLandlordKeys = new Set<string>();
    let resolvedLandlordCode: string | null = resolveLandlordId(landlord_id);
    let resolvedLandlordUuid: string | null = resolveLandlordUuid(landlord_id);
    if (landlord_id) {
      const cleanLId = String(landlord_id).trim().toLowerCase();
      validLandlordKeys.add(cleanLId);
      if (resolvedLandlordCode) validLandlordKeys.add(resolvedLandlordCode.toLowerCase());
      if (resolvedLandlordUuid) validLandlordKeys.add(resolvedLandlordUuid.toLowerCase());
      (allLandlords || []).forEach((l: any) => {
        if (
          (l.id && l.id.toLowerCase() === cleanLId) ||
          (l.code && l.code.toLowerCase() === cleanLId) ||
          (resolvedLandlordCode && l.code && l.code.toLowerCase() === resolvedLandlordCode.toLowerCase()) ||
          (resolvedLandlordUuid && l.id && l.id.toLowerCase() === resolvedLandlordUuid.toLowerCase())
        ) {
          if (l.id) validLandlordKeys.add(l.id.toLowerCase());
          if (l.code) validLandlordKeys.add(l.code.toLowerCase());
        }
      });
    }

    for (const bData of buildings) {
      if (!bData.name) continue;

      const buildingName = formatStandardBuildingAddress(bData.name.trim());
      const area = detectHanoiDistrict(buildingName, bData.area);
      const address = formatStandardBuildingAddress(bData.address || buildingName);

      // 1. CHÉC TRÙNG TÒA NHÀ HỆ THỐNG (Ưu tiên target_building_id từ Preview, external_sync_id, hoặc so khớp địa chỉ)
      let existingBuilding = null;
      if (bData.target_building_id) {
        existingBuilding = dbBuildings.find((b: any) => b.id === bData.target_building_id);
      }
      if (!existingBuilding && sheet_url) {
        existingBuilding = dbBuildings.find((b: any) => b.external_sync_id === sheet_url);
      }
      if (!existingBuilding) {
        existingBuilding = dbBuildings.find((b: any) => {
          const nameOrAddressMatches = isMatchingBuilding(b.name, buildingName) || isMatchingBuilding(b.address || '', address);
          if (!nameOrAddressMatches) return false;

          if (landlord_id && b.landlord_id) {
            const bLClean = String(b.landlord_id).trim().toLowerCase();
            const bResolved = resolveLandlordId(b.landlord_id)?.toLowerCase();
            const matchesLandlord = validLandlordKeys.has(bLClean) || (bResolved && validLandlordKeys.has(bResolved));
            if (!matchesLandlord) {
              // Tên / Địa chỉ trùng hệt 100% trong cùng công ty -> Gộp luôn để tránh nhân đôi
              const normBName = normalizeStringForMatching(b.name);
              const normBAddr = normalizeStringForMatching(b.address || '');
              const normCurName = normalizeStringForMatching(buildingName);
              const normCurAddr = normalizeStringForMatching(address);
              if (normBName === normCurName || (normBAddr && normCurAddr && normBAddr === normCurAddr)) {
                return true;
              }
              return false;
            }
          }
          return true;
        });
      }

      let buildingId = existingBuilding?.id;
      let buildingCode = existingBuilding?.code;
      if (existingBuilding?.id) {
        matchedDbBuildingIds.add(existingBuilding.id);
      }

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

        let buildingDesc = formatNotesWithSystemHeader(null, bData.general_notes);
        if (bData.drive_media_url) {
          buildingDesc = buildingDesc ? `${buildingDesc}\nLink ảnh: ${bData.drive_media_url}` : `Link ảnh: ${bData.drive_media_url}`;
        }

        const bNotesCombined = [bData.general_notes, ...bData.rooms.map(r => r.description)].filter(Boolean).join(' | ');
        const detectedDryer = detectDryerFeature(bNotesCombined);
        const dryerTypeVal = detectedDryer.hasDryer ? (detectedDryer.label || 'có máy sấy') : undefined;

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
            ...(dryerTypeVal ? { dryer_type: dryerTypeVal } : {}),
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
        if (newBuilding.id) {
          matchedDbBuildingIds.add(newBuilding.id);
          dbBuildings.push({
            id: newBuilding.id,
            code: newBuilding.code,
            name: buildingName,
            address: address,
            landlord_id: landlord_id || null,
            external_sync_id: sheet_url,
          });
        }
      } else {
        const targetBuildingLandlordId =
          resolveLandlordId(existingBuilding.landlord_id) ||
          resolveLandlordId(landlord_id) ||
          null;

        const bNotesCombined = [bData.general_notes, ...bData.rooms.map(r => r.description)].filter(Boolean).join(' | ');
        const detectedDryer = detectDryerFeature(bNotesCombined);
        const dryerTypeVal = detectedDryer.hasDryer ? (detectedDryer.label || 'có máy sấy') : undefined;
        const updatedBuildingDesc = formatNotesWithSystemHeader(existingBuilding.description, bData.general_notes);

        // Cập nhật tòa nhà sẵn có (Không bao giờ ghi đè landlord_id của chủ nhà khác)
        await supabaseAdmin
          .from('buildings')
          .update({
            name: buildingName,
            address: address,
            area: area,
            total_rooms: bData.rooms.length,
            description: updatedBuildingDesc || undefined,
            external_sync_id: sheet_url,
            landlord_id: targetBuildingLandlordId,
            ...(dryerTypeVal ? { dryer_type: dryerTypeVal } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', buildingId);
      }

      // 1.5 TỰ ĐỘNG TẠO / LIÊN KẾT NGƯỜI QUẢN LÝ TÒA (Số dẫn)
      // Format manager_raw: "Bảo Chấn|0934686094;Trung Kiên|0967691507"
      // - Mỗi người cách nhau bằng ";"
      // - Tên và SĐT cách nhau bằng "|"
      // - landlord_id = chủ nhà đang chọn khi import (TH03) → Manager thuộc giám sát của TH03
      if (buildingId && (bData as any).manager_raw) {
        const managerRawStr: string = (bData as any).manager_raw || '';
        const managerEntries = managerRawStr.split(';').map((s: string) => s.trim()).filter(Boolean);
        
        const newManagerIds: string[] = [];
        
        for (const entry of managerEntries) {
          const [mName, mPhoneRaw] = entry.split('|');
          const name = (mName || '').trim();
          const phone = cleanPhoneNumber(mPhoneRaw) || '';
          
          if (!name || name.length < 2) continue;

          // Nếu SĐT trùng với SĐT của Chủ nhà (Bảo Chấn) -> Bỏ qua không tạo Quản lý cho chính Chủ nhà
          if (landlord_id && phone) {
            const { data: targetL } = await supabaseAdmin
              .from('landlords')
              .select('phone')
              .or(`id.eq.${landlord_id},code.eq.${landlord_id}`)
              .maybeSingle();
            const lPhone = cleanPhoneNumber(targetL?.phone);
            if (lPhone && phone === lPhone) {
              console.log(`[Import] SĐT ${phone} trùng với Chủ nhà ${landlord_id} -> Bỏ qua tạo Manager cho Chủ nhà.`);
              continue;
            }
          }
          
          let actualName = name;
          let existingMgr: any = null;

          if (phone && phone.length >= 8) {
            // Tra cứu manager theo SĐT trước để lấy định danh đã có (Ví dụ: 0967691507 -> Trung Kiên)
            const { data: byPhone } = await supabaseAdmin
              .from('managers')
              .select('id, landlord_id, phone, name')
              .eq('company_id', company_id || '')
              .eq('phone', phone)
              .maybeSingle();

            if (byPhone) {
              existingMgr = byPhone;
              actualName = byPhone.name;
            } else {
              // Tìm theo tên
              const { data: byName } = await supabaseAdmin
                .from('managers')
                .select('id, landlord_id, phone, name')
                .eq('company_id', company_id || '')
                .ilike('name', name)
                .maybeSingle();
              existingMgr = byName;

              // Tra cứu thêm bảng profiles nếu tên bị lệch (ví dụ "Bảo Chấn" gán nhầm cho SĐT của Trung Kiên)
              const { data: prof } = await supabaseAdmin
                .from('profiles')
                .select('full_name')
                .eq('company_id', company_id || '')
                .eq('phone', phone)
                .maybeSingle();
              if (prof?.full_name) {
                actualName = prof.full_name;
              }
            }
          } else {
            const { data: byName } = await supabaseAdmin
              .from('managers')
              .select('id, landlord_id, phone, name')
              .eq('company_id', company_id || '')
              .ilike('name', name)
              .maybeSingle();
            existingMgr = byName;
          }
          
          let mId = existingMgr?.id;
          const targetLandlordIdVal = resolvedLandlordUuid || (landlord_id && landlord_id.length === 36 ? landlord_id : null);

          if (!mId) {
            const mCode = `MGR-${actualName.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${(phone || '0000').slice(-4)}`;
            const { data: newMgr, error: mErr } = await supabaseAdmin
              .from('managers')
              .insert({
                company_id: company_id || null,
                name: actualName,
                phone: phone || null,
                manager_type: 'individual',
                landlord_id: targetLandlordIdVal,
                code: mCode,
              })
              .select('id')
              .single();
            
            if (!mErr && newMgr) {
              mId = newMgr.id;
              console.log(`[Import] Tạo Quản lý tòa: "${actualName}" (${phone}) → giám sát bởi landlord UUID ${targetLandlordIdVal}`);
            } else {
              console.warn(`[Import] Không thể tạo quản lý "${actualName}":`, mErr?.message);
            }
          } else {
            // Manager đã có - nếu chưa có landlord_id hoặc phone bị trùng 00 thì cập nhật
            if ((!existingMgr.landlord_id && targetLandlordIdVal) || (phone && existingMgr.phone !== phone)) {
              await supabaseAdmin
                .from('managers')
                .update({ 
                  ...(targetLandlordIdVal ? { landlord_id: targetLandlordIdVal } : {}),
                  phone: phone || existingMgr.phone || null 
                })
                .eq('id', existingMgr.id);
            }
          }
          
          if (mId) newManagerIds.push(mId);
        }
        
        // Gán manager_ids vào bảng buildings (nếu building hỗ trợ cột manager_ids)
        if (newManagerIds.length > 0) {
          await supabaseAdmin
            .from('buildings')
            .update({ manager_ids: newManagerIds, updated_at: new Date().toISOString() })
            .eq('id', buildingId);
          
          console.log(`[Import] Tòa "${buildingName}" → ${newManagerIds.length} quản lý: [${managerEntries.map(e => e.split('|')[0]).join(', ')}]`);
        }
      }

      // Link Drive ảnh chung cấp Tòa nhà (fallback sang link Drive của phòng nếu tòa nhà chưa có)

      let buildingDriveUrl: string | null = bData.drive_media_url || null;
      if (!buildingDriveUrl && bData.rooms && bData.rooms.length > 0) {
        const roomWithDrive = bData.rooms.find((r) => r.drive_media_url);
        if (roomWithDrive && roomWithDrive.drive_media_url) {
          buildingDriveUrl = roomWithDrive.drive_media_url;
        }
      }

      if (buildingId && buildingDriveUrl) {
        // Bỏ qua sync Drive ảnh tòa nhà nếu đã có ảnh (image_url) từ lần trước
        const buildingAlreadyHasImage = !!(existingBuilding?.image_url);
        if (!buildingAlreadyHasImage) {
          syncBuildingDriveTasks.push({
            buildingId: buildingId,
            driveUrl: buildingDriveUrl,
            companyId: company_id
          });
        } else {
          console.log(`[Commit Route] Bỏ qua sync Drive ảnh tòa nhà ${buildingName} - đã có ảnh từ lần trước.`);
        }
      }

      // Lấy toàn bộ danh sách phòng hiện tại của Tòa nhà này để CHECK TRÙNG PHÒNG
      const validBuildingUuids = Array.from(
        new Set([buildingId, existingBuilding?.id].filter(Boolean) as string[])
      );
      let existingRoomsQuery = supabaseAdmin
        .from('rooms')
        .select('id, code, description, status, price, size, room_type, landlord_id')
        .in('building_id', validBuildingUuids);

      if (company_id) {
        existingRoomsQuery = existingRoomsQuery.eq('company_id', company_id);
      }

      const { data: dbRoomsList, error: dbRoomsErr } = await existingRoomsQuery;
      if (dbRoomsErr) {
        console.error('[Commit Route] Lỗi truy vấn danh sách phòng hiện tại:', dbRoomsErr);
      }
      const dbRooms = dbRoomsList || [];

      // Lấy tập hợp các room_id đã có ảnh (để biết phòng nào chưa có ảnh khi gắn ảnh chung)
      const allRoomIds = dbRooms.map((r: any) => r.id).filter(Boolean);
      const roomsWithImages = new Set<string>();
      if (allRoomIds.length > 0) {
        const { data: existingImgs } = await supabaseAdmin
          .from('room_images')
          .select('room_id')
          .in('room_id', allRoomIds);
        (existingImgs || []).forEach((img: any) => roomsWithImages.add(img.room_id));
      }

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
        let baseRoomDesc = rData.description || null;
        if (roomDriveMediaUrl) {
          baseRoomDesc = baseRoomDesc ? `${baseRoomDesc}\nLink ảnh: ${roomDriveMediaUrl}` : `Link ảnh: ${roomDriveMediaUrl}`;
        }

        // Kiểm tra xem available_date có phải là ngày tương lai hay không (không lưu ngày trong quá khứ)
        const todayStr = new Date().toISOString().split('T')[0];
        let validAvailableDate: string | null = null;
        if (rData.available_date && rData.available_date > todayStr) {
          validAvailableDate = rData.available_date;
        }

        // Nhúng marker [Sắp trống: YYYY-MM-DD] vào description để getRoomDisplayStatus nhận diện
        if (validAvailableDate && status === 'rented') {
          const cleanDesc = (baseRoomDesc || '').replace(/\s*\[Sắp trống:\s*\d{4}-\d{2}-\d{2}\]/g, '').trim();
          baseRoomDesc = cleanDesc ? `${cleanDesc} [Sắp trống: ${validAvailableDate}]` : `[Sắp trống: ${validAvailableDate}]`;
        } else if (baseRoomDesc) {
          // Xóa marker cũ nếu không có ngày sắp trống ở tương lai
          baseRoomDesc = baseRoomDesc.replace(/\s*\[Sắp trống:\s*\d{4}-\d{2}-\d{2}\]/g, '').trim() || null;
        }

        // Đồng bộ & nhúng Ghi chú chung của tòa nhà (general_notes) vào từng phòng
        const finalPrice = price > 0 ? price : (existingRoom?.price || 0);
        const initialDesc = baseRoomDesc || existingRoom?.description || null;
        const finalDesc = formatNotesWithSystemHeader(initialDesc, bData.general_notes);

        const targetRoomLandlordId =
          resolveLandlordId(existingRoom?.landlord_id) ||
          resolveLandlordId(existingBuilding?.landlord_id) ||
          resolveLandlordId(landlord_id) ||
          null;

        const roomPayload: any = {
          company_id: company_id || null,
          landlord_id: targetRoomLandlordId,
          building_id: buildingId || existingBuilding?.id,
          code: rawCode,
          floor: floor,
          price: finalPrice,
          size: rData.size || existingRoom?.size || 25,
          room_type: roomType || existingRoom?.room_type || 'Studio',
          status: status,
          bedrooms: rData.bedrooms || 1,
          bathrooms: rData.bathrooms || 1,
          max_occupants: 2,
          max_vehicles_per_room: 2,
          deposit_terms: 'đóng 1 cọc 1',
          min_contract_months: 6,
          description: finalDesc,
          external_sync_id: `${sheet_url}#${rawCode}`,
          updated_at: new Date().toISOString(),
        };

        let targetRoomId = existingRoom?.id;

        if (existingRoom) {
          // CẬP NHẬT PHÒNG ĐÃ CÓ (KHÔNG BỊ TẠO TRÙNG)
          const { error: uErr } = await supabaseAdmin.from('rooms').update(roomPayload).eq('id', existingRoom.id);
          if (uErr) {
            console.error(`[Commit Route] Lỗi cập nhật phòng ${rawCode} (${existingRoom.id}):`, uErr.message);
          } else {
            totalRoomsUpdated++;
          }
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
          } else if (rErr) {
            console.error(`[Commit Route] Lỗi thêm mới phòng ${rawCode}:`, rErr.message);
          }
        }

        // Thêm task sync ảnh cho phòng:
        // - Ưu tiên: phòng có link Drive riêng biệt chưa được import
        // - Fallback: phòng chưa có ảnh nào + tòa nhà có link Drive chung → gắn ảnh tòa nhà vào phòng
        if (targetRoomId) {
          if (roomDriveMediaUrl) {
            // Phòng có link Drive riêng: kiểm tra đã sync chưa
            const existingDesc = existingRoom?.description || '';
            const alreadySynced = existingDesc.includes(roomDriveMediaUrl);
            if (!alreadySynced) {
              syncDriveTasks.push({
                roomId: targetRoomId,
                driveUrl: roomDriveMediaUrl,
                companyId: company_id,
              });
            } else {
              console.log(`[Commit Route] Bỏ qua sync Drive cho phòng ${rawCode} - link đã import trước đó: ${roomDriveMediaUrl}`);
            }
          } else if (buildingDriveUrl && !roomsWithImages.has(targetRoomId)) {
            // Phòng không có link Drive riêng, chưa có ảnh nào, nhưng tòa nhà có link Drive chung
            // → Gắn ảnh tòa nhà vào phòng này (ảnh dùng chung)
            console.log(`[Commit Route] Phòng ${rawCode} chưa có ảnh → dùng ảnh chung tòa nhà: ${buildingDriveUrl}`);
            syncDriveTasks.push({
              roomId: targetRoomId,
              driveUrl: buildingDriveUrl,
              companyId: company_id,
            });
            // Đánh dấu phòng mới này đã được lên kế hoạch sync để tránh duplicate
            roomsWithImages.add(targetRoomId);
          }
        }
      }

      // 3. AUTO-MARK PHÒNG BIẾN MẤT KHỎI SHEET → "ĐÃ THUÊ"
      if (existingBuilding && dbRooms.length > 0) {
        const missingRooms = dbRooms.filter(
          (r: any) => !processedRoomCodes.has(normalizeRoomCode(r.code))
        );

        if (missingRooms.length > 0) {
          console.log(`[Commit Route] ${missingRooms.length} phòng không còn trong Sheet của tòa "${buildingName}" → tự động đánh dấu "Đã thuê"`);
          for (const missingRoom of missingRooms) {
            const cleanDesc = (missingRoom.description || '')
              .replace(/\s*\[Sắp trống:\s*[^\]]+\]/g, '')
              .trim() || null;

            await supabaseAdmin
              .from('rooms')
              .update({
                status: 'rented',
                description: cleanDesc,
                updated_at: new Date().toISOString(),
              })
              .eq('id', missingRoom.id);
            totalRoomsMarkedRented++;
          }
        }
      }
    }

    // 3.5 AUTO-MARK TẤT CẢ PHÒNG CỦA TÒA NHÀ KHÔNG CÓ TRONG SHEET (0 PHÒNG TRỐNG TRÊN SHEET) → "ĐÃ THUÊ"
    const unmatchedBuildings = dbBuildings.filter((b: any) => {
      if (matchedDbBuildingIds.has(b.id)) return false;
      if (landlord_id && b.landlord_id && validLandlordKeys.has(b.landlord_id)) return true;
      if (sheet_url && b.external_sync_id === sheet_url) return true;
      return false;
    });

    for (const uBld of unmatchedBuildings) {
      const { data: uRooms } = await supabaseAdmin
        .from('rooms')
        .select('id, code, status, description')
        .eq('building_id', uBld.id)
        .neq('status', 'rented');

      if (uRooms && uRooms.length > 0) {
        console.log(`[Commit Route] Tòa nhà "${uBld.name}" (${uBld.id}) không có phòng trống nào trên Sheet → tự động đánh dấu ${uRooms.length} phòng là "Đã thuê"`);
        for (const room of uRooms) {
          const cleanDesc = (room.description || '')
            .replace(/\s*\[Sắp trống:\s*[^\]]+\]/g, '')
            .trim() || null;

          await supabaseAdmin
            .from('rooms')
            .update({
              status: 'rented',
              description: cleanDesc,
              updated_at: new Date().toISOString(),
            })
            .eq('id', room.id);
          totalRoomsMarkedRented++;
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
    const totalDriveTasks = syncBuildingDriveTasks.length + syncDriveTasks.length;
    let syncJobId: string | null = null;

    if (totalDriveTasks > 0) {
      // Tạo job record trong DB để tracking tiến độ thực tế
      const { data: newJob } = await supabaseAdmin
        .from('drive_sync_jobs')
        .insert({
          company_id: company_id || null,
          status: 'syncing',
          total_tasks: totalDriveTasks,
          completed_tasks: 0,
        })
        .select('id')
        .single();

      syncJobId = newJob?.id || null;

      const jobId = syncJobId;
      (async () => {
        let completedCount = 0;

        const markProgress = async () => {
          completedCount++;
          if (jobId) {
            await supabaseAdmin
              .from('drive_sync_jobs')
              .update({ completed_tasks: completedCount })
              .eq('id', jobId);
          }
        };

        // Sync ảnh cấp Tòa nhà
        for (const bTask of syncBuildingDriveTasks) {
          try {
            await syncGoogleDriveImagesForBuilding(bTask.buildingId, bTask.driveUrl, bTask.companyId);
            await markProgress();
            await new Promise((r) => setTimeout(r, 500));
          } catch (err: any) {
            console.error(`[Building Drive Sync Error for building ${bTask.buildingId}]:`, err?.message);
            await markProgress();
          }
        }

        // Sync ảnh cấp Phòng
        for (const task of syncDriveTasks) {
          try {
            await syncGoogleDriveImagesForProperty(task.roomId, task.driveUrl, task.companyId);
            await markProgress();
            await new Promise((r) => setTimeout(r, 800));
          } catch (err: any) {
            console.error(`[Drive Sync Background Error for room ${task.roomId}]:`, err?.message);
            await markProgress();
          }
        }

        // Đánh dấu job hoàn tất
        if (jobId) {
          await supabaseAdmin
            .from('drive_sync_jobs')
            .update({
              status: 'done',
              completed_tasks: totalDriveTasks,
              finished_at: new Date().toISOString(),
            })
            .eq('id', jobId);
        }

        // Broadcast Supabase Realtime để client nhận biết sync xong
        if (company_id) {
          await supabaseAdmin
            .channel(`import-progress-${company_id}`)
            .send({
              type: 'broadcast',
              event: 'sync-complete',
              payload: { message: `Đã tải xong ${totalDriveTasks} ảnh/video từ Google Drive!` },
            });
        }

        console.log(`[Drive Sync] Job ${jobId} hoàn tất - ${totalDriveTasks} tasks.`);
      })();
    }

    return NextResponse.json({
      success: true,
      totalBuildings: totalBuildingsCreated,
      totalRoomsCreated,
      totalRoomsUpdated,
      totalRoomsMarkedRented,
      totalRooms: totalRoomsCreated + totalRoomsUpdated,
      hasDriveSyncTasks: totalDriveTasks > 0,
      syncJobId,
    });
  } catch (error: any) {
    console.error('[Commit Route Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Không thể lưu dữ liệu đồng bộ.' },
      { status: 500 }
    );
  }
}
