import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Helper to extract Google Drive Folder file IDs from public shared links
async function getGoogleDriveFolderFileIds(folderUrl: string): Promise<string[]> {
  try {
    let folderId = '';
    if (folderUrl.includes('folders/')) {
      folderId = folderUrl.split('folders/')[1]?.split('?')[0]?.split('/')[0];
    } else if (folderUrl.includes('id=')) {
      folderId = folderUrl.split('id=')[1]?.split('&')[0];
    }

    if (!folderId) return [];

    const res = await fetch(`https://drive.google.com/drive/folders/${folderId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Match file IDs from WIZ global data in double quotes (excluding the folderId itself)
    const fileIdRegex = /"(1[a-zA-Z0-9_-]{32})"/g;
    const matches = new Set<string>();
    let match;
    while ((match = fileIdRegex.exec(html)) !== null) {
      const fileId = match[1];
      if (fileId !== folderId) {
        matches.add(fileId);
      }
    }
    return Array.from(matches);
  } catch (error) {
    console.error('Lỗi phân tích thư mục Google Drive:', error);
    return [];
  }
}

// Helper to download image from Google Drive and upload to Supabase Storage
async function uploadDriveFileToStorage(fileId: string): Promise<string | null> {
  try {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const downloadRes = await fetch(downloadUrl);
    if (!downloadRes.ok) return null;

    const contentType = downloadRes.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.warn(`File ${fileId} không phải là hình ảnh (kiểu: ${contentType}), bỏ qua.`);
      return null;
    }

    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let fileExt = 'jpg';
    if (contentType.includes('png')) fileExt = 'png';
    if (contentType.includes('webp')) fileExt = 'webp';
    if (contentType.includes('gif')) fileExt = 'gif';

    const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('room_images')
      .upload(filePath, buffer, {
        contentType,
        duplex: 'half'
      } as any);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('room_images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error(`Lỗi tải ảnh Drive ${fileId} lên storage:`, error);
    return null;
  }
}

// Process an arbitrary link (normal direct image link, Google Drive file, or Google Drive folder)
async function processImageLink(url: string, maxImages = 10): Promise<string[]> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return [];

  // Case 1: Google Drive Folder
  if (trimmedUrl.includes('drive.google.com') && trimmedUrl.includes('folders/')) {
    const fileIds = await getGoogleDriveFolderFileIds(trimmedUrl);
    const uploadedUrls: string[] = [];
    const limitedFileIds = fileIds.slice(0, maxImages);
    for (const fileId of limitedFileIds) {
      const publicUrl = await uploadDriveFileToStorage(fileId);
      if (publicUrl) uploadedUrls.push(publicUrl);
    }
    return uploadedUrls;
  }

  // Case 2: Google Drive Single File Link
  if (trimmedUrl.includes('drive.google.com') && (trimmedUrl.includes('/file/d/') || trimmedUrl.includes('id='))) {
    let fileId = '';
    if (trimmedUrl.includes('/file/d/')) {
      fileId = trimmedUrl.split('/file/d/')[1]?.split('/')[0]?.split('?')[0];
    } else if (trimmedUrl.includes('id=')) {
      fileId = trimmedUrl.split('id=')[1]?.split('&')[0];
    }
    if (fileId) {
      const publicUrl = await uploadDriveFileToStorage(fileId);
      if (publicUrl) return [publicUrl];
    }
  }

  // Case 3: Regular direct URL
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return [trimmedUrl];
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager']);
    if (isApiError(auth)) return auth;

    const companyId = auth.profile.company_id;
    if (!companyId) {
      return NextResponse.json({ error: 'Tài khoản chưa thuộc công ty nào' }, { status: 400 });
    }

    const { landlords = [], buildings = [], rooms = [] } = await request.json();

    const results = {
      landlordsImported: 0,
      buildingsImported: 0,
      roomsImported: 0,
      errors: [] as string[]
    };

    // 1. IMPORT LANDLORDS (Chủ nhà)
    for (const landlord of landlords) {
      try {
        const { code, name, phone, email, address, notes } = landlord;
        if (!code || !name) {
          results.errors.push(`Chủ nhà lỗi: Thiếu thông tin bắt buộc (mã hoặc tên)`);
          continue;
        }

        // Kiểm tra xem đã có chủ nhà này chưa
        const { data: existing } = await supabaseAdmin
          .from('landlords')
          .select('id')
          .eq('company_id', companyId)
          .eq('code', code)
          .maybeSingle();

        const payload = {
          company_id: companyId,
          code,
          name,
          phone: phone ? String(phone) : null,
          email: email || null,
          address: address || null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        };

        if (existing) {
          const { error } = await supabaseAdmin
            .from('landlords')
            .update(payload)
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin
            .from('landlords')
            .insert({ ...payload, created_at: new Date().toISOString() });
          if (error) throw error;
        }
        results.landlordsImported++;
      } catch (err: any) {
        results.errors.push(`Chủ nhà ${landlord.name || landlord.code}: ${err.message}`);
      }
    }

    // 2. IMPORT BUILDINGS (Tòa nhà)
    for (const building of buildings) {
      try {
        const {
          code, name, landlord_id, area, address, total_floors, total_rooms,
          year_built, has_elevator, pccc_certified, allow_pet, allow_foreigners,
          allow_vinfast_electric, image_url, deposit_terms, washing_machine_type
        } = building;

        if (!code || !name || !area) {
          results.errors.push(`Tòa nhà lỗi: Thiếu thông tin bắt buộc (mã, tên hoặc khu vực)`);
          continue;
        }

        // Kiểm tra xem đã có tòa nhà này chưa
        const { data: existing } = await supabaseAdmin
          .from('buildings')
          .select('id')
          .eq('company_id', companyId)
          .eq('code', code)
          .maybeSingle();

        let processedImageUrl = image_url || null;
        if (image_url) {
          const processedList = await processImageLink(image_url, 1);
          if (processedList.length > 0) {
            processedImageUrl = processedList[0];
          }
        }

        const payload = {
          company_id: companyId,
          code,
          name,
          landlord_id: landlord_id || null,
          area,
          address: address || null,
          total_floors: total_floors ? Number(total_floors) : 1,
          total_rooms: total_rooms ? Number(total_rooms) : 0,
          year_built: year_built ? Number(year_built) : null,
          has_elevator: has_elevator === true || has_elevator === 'Y' || has_elevator === 'Yes',
          pccc_certified: pccc_certified === true || pccc_certified === 'Y' || pccc_certified === 'Yes',
          allow_pet: allow_pet === true || allow_pet === 'Y' || allow_pet === 'Yes',
          allow_foreigners: allow_foreigners === true || allow_foreigners === 'Y' || allow_foreigners === 'Yes',
          allow_vinfast_electric: allow_vinfast_electric === true || allow_vinfast_electric === 'Y' || allow_vinfast_electric === 'Yes',
          image_url: processedImageUrl,
          deposit_terms: deposit_terms || null,
          washing_machine_type: washing_machine_type || 'chung',
          updated_at: new Date().toISOString()
        };

        if (existing) {
          const { error } = await supabaseAdmin
            .from('buildings')
            .update(payload)
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin
            .from('buildings')
            .insert({ ...payload, created_at: new Date().toISOString() });
          if (error) throw error;
        }
        results.buildingsImported++;
      } catch (err: any) {
        results.errors.push(`Tòa nhà ${building.name || building.code}: ${err.message}`);
      }
    }

    // Cache to prevent downloading and uploading same Google Drive folders/files multiple times
    const linkCache = new Map<string, string[]>();

    // 3. IMPORT ROOMS (Phòng)
    for (const room of rooms) {
      try {
        const {
          building_code, code, floor, size, price, bedrooms, bathrooms, status,
          max_occupants, max_vehicles_per_room, min_contract_months,
          image_urls, room_type, deposit_terms, rose, description
        } = room;

        if (!building_code || !code) {
          results.errors.push(`Phòng lỗi: Thiếu mã tòa nhà hoặc mã phòng`);
          continue;
        }

        // Kiểm tra xem đã có phòng này thuộc tòa nhà này chưa
        const { data: existing } = await supabaseAdmin
          .from('rooms')
          .select('id')
          .eq('company_id', companyId)
          .eq('building_id', building_code) // building_id hiện tại lưu code của building
          .eq('code', code)
          .maybeSingle();

        // Lấy thông tin landlord_id của tòa nhà để điền vào phòng cho đồng bộ
        const { data: bld } = await supabaseAdmin
          .from('buildings')
          .select('landlord_id')
          .eq('company_id', companyId)
          .eq('code', building_code)
          .maybeSingle();

        const payload = {
          company_id: companyId,
          building_id: building_code, // building_id hiện tại lưu code của building
          code,
          floor: floor ? Number(floor) : 1,
          room_type: room_type || null,
          size: size ? Number(size) : null,
          price: price ? Number(price) : 0,
          bedrooms: bedrooms ? Number(bedrooms) : 0,
          bathrooms: bathrooms ? Number(bathrooms) : 1,
          status: status || 'available',
          max_occupants: max_occupants ? Number(max_occupants) : 2,
          max_vehicles_per_room: max_vehicles_per_room ? Number(max_vehicles_per_room) : 2,
          min_contract_months: min_contract_months ? Number(min_contract_months) : 12,
          landlord_id: bld?.landlord_id || null,
          deposit_terms: deposit_terms || null,
          rose: rose || null,
          description: description || null,
          updated_at: new Date().toISOString()
        };

        let roomId = existing?.id;
        if (roomId) {
          const { error } = await supabaseAdmin
            .from('rooms')
            .update(payload)
            .eq('id', roomId);
          if (error) throw error;
        } else {
          const { data: newRoom, error } = await supabaseAdmin
            .from('rooms')
            .insert({ ...payload, created_at: new Date().toISOString() })
            .select('id')
            .single();
          if (error) throw error;
          roomId = newRoom.id;
        }

        // Kiểm tra xem phòng đã có ảnh trong DB chưa để tránh tải lại
        let hasImages = false;
        if (existing?.id) {
          const { count, error: countErr } = await supabaseAdmin
            .from('room_images')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', existing.id);
          if (!countErr && count && count > 0) {
            hasImages = true;
          }
        }

        // Import room images from links (Chỉ chạy khi phòng chưa có ảnh)
        if (!hasImages && image_urls && roomId) {
          const urlList = String(image_urls).split(',').map((u) => u.trim()).filter(Boolean);
          let imgIndex = 0;
          for (const rawUrl of urlList) {
            let processedList: string[] = [];
            if (linkCache.has(rawUrl)) {
              processedList = linkCache.get(rawUrl)!;
            } else {
              processedList = await processImageLink(rawUrl, 10);
              linkCache.set(rawUrl, processedList);
            }
            for (const finalUrl of processedList) {
              const { data: existingImg } = await supabaseAdmin
                .from('room_images')
                .select('id')
                .eq('room_id', roomId)
                .eq('url', finalUrl)
                .maybeSingle();

              if (!existingImg) {
                const { error: imgError } = await supabaseAdmin
                  .from('room_images')
                  .insert({
                    company_id: companyId,
                    room_id: roomId,
                    url: finalUrl,
                    is_thumbnail: imgIndex === 0, // Đặt ảnh đầu tiên làm ảnh đại diện
                    priority: imgIndex,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                if (imgError) {
                  console.error(`Lỗi chèn ảnh phòng ${code}:`, imgError.message);
                }
              }
              imgIndex++;
            }
          }
        }

        results.roomsImported++;
      } catch (err: any) {
        results.errors.push(`Phòng ${room.code} (Tòa ${room.building_code}): ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Lỗi khi import dữ liệu sheet:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
