import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { syncGoogleDriveImagesForProperty } from '@/src/lib/services/google-drive';

export const maxDuration = 300; // Allow long execution time

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Needs service role to bypass RLS in background

export async function POST(req: Request) {
  try {
    const { company_id, landlord_id, data } = await req.json();
    
    if (!company_id || !landlord_id || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ (Thiếu company_id hoặc landlord_id)' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Group properties by Building Name + Area
    const groupedBuildings: Record<string, any[]> = {};
    const syncTasks: {roomId: string, driveLink: string, companyId: string}[] = [];
    
    let lastBuildingName = '';
    let lastArea = '';

    for (const row of data) {
      let rawBuildingName = row['Tòa nhà (Địa chỉ) (*)']?.toString();
      let rawArea = row['Khu vực(*)']?.toString();

      let buildingName = rawBuildingName ? rawBuildingName.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim() : '';
      let area = rawArea ? rawArea.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim() : '';

      if (!buildingName) {
        if (!lastBuildingName) continue;
        buildingName = lastBuildingName;
        area = lastArea;
      } else {
        lastBuildingName = buildingName;
        lastArea = area || 'Hà Nội';
      }

      area = area || 'Hà Nội';
      const key = `${buildingName}_${area}`;
      
      if (!groupedBuildings[key]) {
        groupedBuildings[key] = [];
      }
      // Add the cleaned building name to the row so we use the clean one later
      row['Tòa nhà (Địa chỉ) (*)'] = buildingName;
      row['Khu vực(*)'] = area;
      groupedBuildings[key].push(row);
    }

    let buildingsCreated = 0;
    let propertiesCreated = 0;

    for (const [key, rows] of Object.entries(groupedBuildings)) {
      const firstRow = rows[0];
      const buildingName = firstRow['Tòa nhà (Địa chỉ) (*)'].toString().trim();
      const area = firstRow['Khu vực(*)']?.toString().trim() || '';
      
      let latitude = null;
      let longitude = null;
      const coordStr = firstRow['Tọa độ (Lat, Lng)']?.toString().trim();
      if (coordStr) {
        const parts = coordStr.split(',');
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            latitude = lat;
            longitude = lng;
          }
        }
      }

      let commonServicePrice = 200000; // default
      const dvcStr = (firstRow['DVC(*)']?.toString() || firstRow['[Ghi chú] Dịch vụ theo căn (văn bản gốc)']?.toString() || '').toLowerCase();
      
      const priceMatch = dvcStr.match(/(?:dịch vụ|dvc|rác|vệ sinh).*?(\d+([.,]\d+)*)[k\s]*(?:\/|trên|1\s*)(người|ng|phòng|p)/) 
                      || dvcStr.match(/(\d+([.,]\d+)*)[k\s]*(?:\/|trên|1\s*)(người|ng|phòng|p)/);
                      
      if (priceMatch) {
          let pStr = priceMatch[1].replace(/[.,]/g, '');
          let p = parseInt(pStr, 10);
          if (p > 0) {
              if (p < 1000) p *= 1000;
              commonServicePrice = p;
          }
      }

      let allowPetText = firstRow['Nuôi Pet (Y/N)(*)']?.toString().toUpperCase() === 'Y' ? 'Có' : 'Không';
      if (dvcStr.includes('không nuôi chó') || dvcStr.includes('không chó')) {
          allowPetText = 'Mèo (Không chó)';
      } else if (dvcStr.includes('không nuôi pet') || dvcStr.includes('không pet') || dvcStr.includes('không chó mèo')) {
          allowPetText = 'Không';
      }

      // Calculate building amenities based on the rooms
      const hasElevator = rows.some(r => r['Thang máy (Y/N)(*)']?.toString().toUpperCase() === 'Y');
      const hasPccc = rows.some(r => r['PCCC (Y/N)(*)']?.toString().toUpperCase() === 'Y');
      
      // Check if building exists for this company by name
      const { data: existingBuilding } = await supabase
        .from('buildings')
        .select('id, landlord_id, code')
        .eq('name', buildingName)
        .eq('company_id', company_id)
        .single();
        
      let buildingId = existingBuilding?.id;
      let buildingCode = existingBuilding?.code;
      
      if (!buildingId) {
        // Generate a code from name abbreviation + random
        const codePrefix = buildingName.split(' ').map((w: string) => w.charAt(0)).join('').substring(0, 3).toUpperCase();
        const randomStr = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `${codePrefix}${randomStr}`;

        // Create building
        const { data: newBuilding, error: bError } = await supabase
          .from('buildings')
          .insert({
            company_id: company_id,
            code: code,
            name: buildingName,
            address: buildingName, // default address to name
            area: area,
            landlord_id: landlord_id,
            has_elevator: hasElevator,
            pccc_certified: hasPccc,
            total_rooms: rows.length,
            latitude: latitude,
            longitude: longitude,
            common_service_price: commonServicePrice,
            allow_pet: allowPetText as any
          })
          .select('id, code')
          .single();
          
        if (bError) {
          console.error('Lỗi tạo tòa nhà:', bError.message || bError);
          continue; // skip properties if building fails
        }
        buildingId = newBuilding.id;
        buildingCode = newBuilding.code;
        buildingsCreated++;
      } else {
        const updateData: any = { 
          total_rooms: rows.length,
          common_service_price: commonServicePrice,
          allow_pet: allowPetText as any
        };
        if (!existingBuilding || !existingBuilding.landlord_id || existingBuilding.landlord_id !== landlord_id) {
          updateData.landlord_id = landlord_id;
        }
        if (latitude !== null && longitude !== null) {
          updateData.latitude = latitude;
          updateData.longitude = longitude;
        }
        await supabase.from('buildings').update(updateData).eq('id', buildingId);
      }
      
      // Get existing rooms for this building to track which ones are omitted
      const { data: existingRoomsList } = await supabase
        .from('rooms')
        .select('id, code')
        .eq('building_id', buildingCode)
        .eq('company_id', company_id);
        
      const existingRooms = existingRoomsList || [];
      const processedRoomCodes = new Set<string>();

      // Now insert or update rooms
      for (const row of rows) {
        const roomNumber = row['Phòng trống (*)']?.toString().trim();
        if (!roomNumber) continue;
        
        processedRoomCodes.add(roomNumber);
        const existingRoom = existingRooms.find(r => r.code === roomNumber);
        
        const priceStr = String(row['Giá Phòng (*)'] || '0').trim();
        let price = 0;
        
        const firstPart = priceStr.split(/[-~]/)[0].trim().toLowerCase();
        const numberMatch = firstPart.match(/(\d+([.,]\d+)*)/);
        
        if (numberMatch) {
            const numStr = numberMatch[1];
            if (firstPart.includes('triệu') || firstPart.includes('tr')) {
                price = parseFloat(numStr.replace(',', '.')) * 1000000;
            } else if (firstPart.includes('k')) {
                price = parseInt(numStr.replace(/[.,]/g, ''), 10) * 1000;
            } else {
                const cleanStr = numStr.replace(/[.,]/g, '');
                price = parseInt(cleanStr, 10);
                
                if (price < 100) {
                    price = price * 1000000;
                } else if (price >= 100 && price < 100000) {
                    if (numStr.includes('.') || numStr.includes(',')) {
                        price = parseFloat(numStr.replace(',', '.')) * 1000000;
                    } else {
                        price = price * 1000;
                    }
                }
            }
        }
        
        const areaSize = parseFloat(row['Diện tích(*)']?.toString().replace(',', '.')) || 0;
        
        const rawStatus = row['Trạng thái(*)']?.toString().trim() || '';
        let status = 'rented'; // Mặc định nếu để trống là đã thuê
        let soonAvailableDate = '';
        
        const dateMatch = rawStatus.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/);
        if (dateMatch) {
          status = 'rented';
          soonAvailableDate = dateMatch[0];
        } else if (rawStatus.toLowerCase().includes('trống') || rawStatus.toLowerCase().includes('ở luôn') || rawStatus.toLowerCase().includes('luôn')) {
          status = 'available';
        }
        
        const rawRoomType = row['Loại Phòng(*)']?.toString() || 'Phòng trọ';
        const roomTypeLower = rawRoomType.toLowerCase();
        
        let bedrooms = 1;
        let maxOccupants = 2;
        let maxVehicles = 2;
        let autoNote = '';

        if (roomTypeLower.includes('3 ngủ') || roomTypeLower.includes('3n')) {
          bedrooms = 3;
          maxOccupants = 5;
          maxVehicles = 5;
        } else if (roomTypeLower.includes('2 ngủ') || roomTypeLower.includes('2n')) {
          bedrooms = 2;
          maxOccupants = 4;
          maxVehicles = 4;
          autoNote = 'Đối với các căn nhà xe chật, cần trao đổi trên nhóm.';
        } else if (roomTypeLower.includes('gác xép')) {
          bedrooms = 1;
          maxOccupants = 3;
          maxVehicles = 2;
          autoNote = 'Từ xe thứ 3 thêm 80k. Thêm người thứ 4 tăng 500k giá phòng.';
        } else if (roomTypeLower.includes('studio')) {
          bedrooms = 1;
          maxOccupants = 2;
          maxVehicles = 2;
          autoNote = 'Tối đa ở 2 người 2 xe, thêm người thứ 3 tuỳ căn.';
        } else if (roomTypeLower.includes('1n') || roomTypeLower.includes('1 ngủ')) {
          bedrooms = 1;
          maxOccupants = 2;
          maxVehicles = 2;
        }
        
        // Combine notes
        const serviceNote = row['[Ghi chú] Dịch vụ theo căn (văn bản gốc)']?.toString() || '';
        const interiorNote = row['[Ghi chú] Nội thất (nguồn)']?.toString() || '';
        const driveLink = row['Link ảnh + video(*)']?.toString() || '';
        
        const finalNotesList = [];
        if (serviceNote) finalNotesList.push(`Dịch vụ: ${serviceNote}`);
        if (interiorNote) finalNotesList.push(`Nội thất: ${interiorNote}`);
        if (driveLink) finalNotesList.push(`Link ảnh gốc: ${driveLink}`);
        if (autoNote) finalNotesList.push(`Lưu ý: ${autoNote}`);
        if (soonAvailableDate) finalNotesList.push(`[Sắp trống: ${soonAvailableDate}]`);
        const finalNotes = finalNotesList.join('\n');
        // Extract floor from room code (e.g., 602 -> 6, 1205 -> 12)
        let floor = 1;
        const floorMatch = roomNumber.match(/\d+/);
        if (floorMatch) {
            const numStr = floorMatch[0];
            if (numStr.length >= 3) {
                floor = parseInt(numStr.substring(0, numStr.length - 2), 10);
            } else if (numStr.length > 0) {
                floor = parseInt(numStr, 10);
            }
        }
        if (!floor || isNaN(floor) || floor <= 0) {
            floor = 1;
        }

        const payload = {
          company_id: company_id,
          building_id: buildingCode,
          code: roomNumber,
          floor: floor,
          price: price,
          size: areaSize,
          room_type: rawRoomType,
          status: status,
          description: finalNotes,
          landlord_id: landlord_id,
          bedrooms: bedrooms,
          bathrooms: 1,
          max_occupants: maxOccupants,
          max_vehicles_per_room: maxVehicles,
          min_contract_months: 12
        };
        
        if (existingRoom) {
          // Update existing room
          const { error: rError } = await supabase.from('rooms').update(payload).eq('id', existingRoom.id);
          if (!rError) {
            propertiesCreated++; // (Reused count for updated rooms conceptually)
            if (driveLink) {
              syncTasks.push({ roomId: existingRoom.id, driveLink, companyId: company_id });
            }
          } else {
            console.error(`Lỗi cập nhật phòng ${roomNumber}:`, rError.message || rError);
          }
        } else {
          // Insert new room
          const { data: newRoom, error: rError } = await supabase.from('rooms').insert(payload).select('id').single();
          if (!rError && newRoom) {
            propertiesCreated++;
            if (driveLink) {
              syncTasks.push({ roomId: newRoom.id, driveLink, companyId: company_id });
            }
          } else if (rError) {
            console.error(`Lỗi tạo phòng ${roomNumber}:`, rError.message || rError);
          }
        }
      }

      // Mark omitted existing rooms as rented
      const omittedRoomIds = existingRooms
        .filter(r => !processedRoomCodes.has(r.code))
        .map(r => r.id);
        
      if (omittedRoomIds.length > 0) {
        await supabase
          .from('rooms')
          .update({ status: 'rented' })
          .in('id', omittedRoomIds);
      }
    }
    
    // Chạy đồng bộ ngầm tuần tự để tránh nghẽn cổ chai (quá tải mạng/timeout)
    if (syncTasks.length > 0) {
      // Fire and forget
      (async () => {
        for (const task of syncTasks) {
          try {
            await syncGoogleDriveImagesForProperty(task.roomId, task.driveLink, task.companyId);
            // Delay 1 giây giữa mỗi phòng để giảm tải cho cả Drive và Supabase
            await new Promise(r => setTimeout(r, 1000));
          } catch (err: any) {
            console.error(`Lỗi đồng bộ ngầm ảnh cho phòng ${task.roomId}:`, err.message || err);
          }
        }
        
        // Phát tín hiệu hoàn tất qua Supabase Realtime
        const channel = supabase.channel(`import-progress-${company_id}`);
        await new Promise(resolve => {
          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.send({
                type: 'broadcast',
                event: 'sync-complete',
                payload: { message: 'Đồng bộ ảnh hoàn tất!' }
              });
              await supabase.removeChannel(channel);
              resolve(true);
            }
          });
        });
      })();
    }

    return NextResponse.json({ 
      success: true, 
      buildingsCreated, 
      propertiesCreated,
      hasSyncTasks: syncTasks.length > 0
    });
    
  } catch (error: any) {
    console.error('Import Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
