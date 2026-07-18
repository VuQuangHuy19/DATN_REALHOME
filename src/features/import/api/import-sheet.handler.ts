import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';
import sharp from 'sharp';
import { generateOnboardingToken } from '@/lib/auth/onboarding-token';
import { sendEmail } from '@/lib/mail';

// Helper to normalize area/size texts like "25m2" or "25 m2" to "25 m²"
function normalizeAreaText(text: string | null | undefined): string | null {
  if (!text) return null;
  return String(text).replace(/(\d+(?:[.,]\d+)?)\s*(?:m2|m\^2|m²|M2)/gi, '$1 m²');
}

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

type ProcessedMedia = {
  url: string;
  thumbnail_url: string | null;
  media_type: string;
};

// Helper to download image/video from Google Drive, create checksum & upload to Supabase Storage
async function uploadDriveFileToStorage(fileId: string): Promise<ProcessedMedia | null> {
  try {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const downloadRes = await fetch(downloadUrl);
    if (!downloadRes.ok) return null;

    const contentType = downloadRes.headers.get('content-type') || '';
    const isImageOrVideoOrStream = 
      contentType.startsWith('image/') || 
      contentType.startsWith('video/') || 
      contentType === 'application/octet-stream';

    if (!isImageOrVideoOrStream) {
      console.warn(`File ${fileId} không phải là hình ảnh/video (kiểu: ${contentType}), bỏ qua.`);
      return null;
    }

    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let bufferToUpload = buffer;
    let fileExt = 'jpg';
    let finalContentType = contentType;

    const isHeic = (buf: Buffer) => {
      if (buf.length < 12) return false;
      const brand = buf.toString('ascii', 8, 12);
      return ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand);
    };

    const isMp4OrMov = (buf: Buffer) => {
      if (buf.length < 8) return false;
      return buf.toString('ascii', 4, 8) === 'ftyp';
    };

    // 1. Check if HEIC image
    if (isHeic(buffer) || contentType === 'image/heic' || fileId.toLowerCase().endsWith('.heic')) {
      try {
        const heicConvert = require('heic-convert');
        const converted = await heicConvert({
          buffer: buffer,
          format: 'JPEG',
          quality: 0.85
        });
        bufferToUpload = Buffer.from(converted);
        finalContentType = 'image/jpeg';
        fileExt = 'jpg';
      } catch (err) {
        console.error(`Lỗi chuyển đổi HEIC cho file ${fileId}:`, err);
        finalContentType = 'image/jpeg';
        fileExt = 'jpg';
      }
    }
    // 2. Check if video
    else if (isMp4OrMov(buffer) || contentType.startsWith('video/') || fileId.toLowerCase().endsWith('.mov') || fileId.toLowerCase().endsWith('.mp4')) {
      if (fileId.toLowerCase().endsWith('.mov') || contentType.includes('quicktime')) {
        fileExt = 'mov';
        finalContentType = 'video/quicktime';
      } else {
        fileExt = 'mp4';
        finalContentType = 'video/mp4';
      }
    }
    // 3. Normal images
    else {
      if (contentType.includes('png')) {
        fileExt = 'png';
      } else if (contentType.includes('webp')) {
        fileExt = 'webp';
      } else if (contentType.includes('gif')) {
        fileExt = 'gif';
      } else {
        fileExt = 'jpg';
        finalContentType = 'image/jpeg';
      }
    }

    // Dùng nội dung file (buffer) để tạo mã MD5 thay cho việc random tên
    const hash = crypto.createHash('md5').update(bufferToUpload as any).digest('hex');
    const fileName = `${hash}.${fileExt}`;
    const filePath = `${fileName}`;
    let thumbPath: string | null = null;
    let thumbBuffer: Buffer | null = null;
    
    let isVideo = finalContentType.startsWith('video/');

    // Kiểm tra xem file này đã tồn tại trên Storage chưa
    // Thay vì download, ta thử lấy publicUrl (tuy nó luôn trả về string nhưng ta kiểm tra DB xem checksum này có ai dùng chưa)
    // Hoặc ta query list files từ storage (chậm hơn chút nhưng chính xác vật lý)
    // Để tối ưu, ta cứ upload với upsert = false, nếu trùng sẽ bắn lỗi Duplicate.
    // Lỗi Duplicate báo hiệu file ĐÃ CÓ trên bucket -> chỉ việc dùng lại URL
    let fileUploadedOk = false;
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('room_images')
      .upload(filePath, bufferToUpload, {
        contentType: finalContentType,
        upsert: false // QUAN TRỌNG: Nếu trùng file hash sẽ báo lỗi
      } as any);

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('duplicate') || uploadError.message.includes('already exists')) {
        // File đã tồn tại -> Không sao cả, dùng luôn!
        fileUploadedOk = true;
      } else {
        throw uploadError; // Lỗi thật sự
      }
    } else {
      fileUploadedOk = true;
    }

    // Xử lý tạo Thumbnail nếu là ảnh và file vừa được up mới (hoặc ta up lại cả thumb nếu muốn)
    if (!isVideo) {
      thumbPath = `${hash}-thumb.${fileExt}`;
      // Chỉ tạo thumb nếu file gốc chưa có (uploadError rỗng) HOẶC ta cứ tạo đè upsert: false
      try {
        thumbBuffer = await sharp(bufferToUpload)
          .resize(300, null, { withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        
        let thumbContentType = 'image/jpeg';
        if (fileExt === 'png') thumbContentType = 'image/png';
        else if (fileExt === 'webp') thumbContentType = 'image/webp';
        else if (fileExt === 'gif') thumbContentType = 'image/gif';

        const { error: thumbUploadError } = await supabaseAdmin.storage
          .from('room_images')
          .upload(thumbPath, thumbBuffer, {
            contentType: thumbContentType,
            upsert: false
          });
          
        if (thumbUploadError && !(thumbUploadError.message.toLowerCase().includes('duplicate') || thumbUploadError.message.includes('already exists'))) {
           console.warn(`Lỗi tạo thumbnail cho ${fileId}:`, thumbUploadError.message);
        }
      } catch (sharpErr) {
        console.warn(`Lỗi sharp resize cho ${fileId}:`, sharpErr);
        thumbPath = null;
      }
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('room_images')
      .getPublicUrl(filePath);
      
    let thumbnailPublicUrl = null;
    if (thumbPath) {
      const { data: thumbData } = supabaseAdmin.storage
        .from('room_images')
        .getPublicUrl(thumbPath);
      thumbnailPublicUrl = thumbData.publicUrl;
    }

    return {
      url: publicUrl,
      thumbnail_url: thumbnailPublicUrl,
      media_type: isVideo ? 'video' : 'image'
    };
  } catch (error) {
    console.error(`Lỗi tải ảnh/video Drive ${fileId} lên storage:`, error);
    return null;
  }
}

// Process an arbitrary link (normal direct image link, Google Drive file, or Google Drive folder)
async function processImageLink(url: string, maxImages = 10): Promise<ProcessedMedia[]> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return [];

  // Case 1: Google Drive Folder
  if (trimmedUrl.includes('drive.google.com') && trimmedUrl.includes('folders/')) {
    const fileIds = await getGoogleDriveFolderFileIds(trimmedUrl);
    const uploadedMedias: ProcessedMedia[] = [];
    const limitedFileIds = fileIds.slice(0, maxImages);
    for (const fileId of limitedFileIds) {
      const media = await uploadDriveFileToStorage(fileId);
      if (media) uploadedMedias.push(media);
    }
    return uploadedMedias;
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
      const media = await uploadDriveFileToStorage(fileId);
      if (media) return [media];
    }
  }

  // Case 3: Regular direct URL
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    let isVideo = trimmedUrl.toLowerCase().endsWith('.mp4') || trimmedUrl.toLowerCase().endsWith('.mov') || trimmedUrl.toLowerCase().endsWith('.webm');
    return [{
      url: trimmedUrl,
      thumbnail_url: null,
      media_type: isVideo ? 'video' : 'image'
    }];
  }
  return [];
}

export async function handleImportSheet(request: Request) {
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
          notes: notes ? normalizeAreaText(notes) : null,
          updated_at: new Date().toISOString()
        };

        let landlordId = existing?.id;

        if (existing) {
          const { error } = await supabaseAdmin
            .from('landlords')
            .update(payload)
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { data: newLandlord, error } = await supabaseAdmin
            .from('landlords')
            .insert({ ...payload, created_at: new Date().toISOString() })
            .select('id')
            .single();
          if (error) throw error;
          landlordId = newLandlord.id;
        }

        // Tự động tạo profile chưa kích hoạt và gửi email mời onboarding nếu có email và chưa có profile
        if (email && landlordId) {
          const trimmedEmail = String(email).trim().toLowerCase();
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, landlord_id')
            .eq('email', trimmedEmail)
            .maybeSingle();

          if (!existingProfile) {
            const profileId = crypto.randomUUID();
            const { error: profileError } = await supabaseAdmin
              .from('profiles')
              .insert({
                id: profileId,
                company_id: companyId,
                email: trimmedEmail,
                full_name: name,
                phone: phone ? String(phone) : null,
                role: 'landlord',
                is_active: false,
                landlord_id: landlordId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (!profileError) {
              const tokenPayload = generateOnboardingToken(48);
              const { error: inviteError } = await supabaseAdmin
                .from('tenant_invitations')
                .insert({
                  email: trimmedEmail,
                  company_id: companyId,
                  profile_id: profileId,
                  token_hash: tokenPayload.tokenHash,
                  expires_at: tokenPayload.expiresAt.toISOString(),
                });

              if (!inviteError) {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3050';
                const inviteLink = `${siteUrl}/onboarding?token=${tokenPayload.rawToken}`;

                try {
                  const result = await sendEmail({
                    to: trimmedEmail,
                    subject: 'Lời mời kích hoạt tài khoản Chủ nhà - RealHome Business',
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #059669; margin-bottom: 20px; text-align: center;">Chào mừng bạn đến với RealHome Business</h2>
                        <p>Xin chào <strong>${name}</strong>,</p>
                        <p>Bạn đã được thêm làm **Chủ nhà** trên hệ thống quản lý bất động sản RealHome Business từ danh sách nhập liệu.</p>
                        <p>Vui lòng click vào nút bên dưới để thiết lập mật khẩu truy cập và bắt đầu theo dõi trạng thái tòa nhà, phòng, hợp đồng và hóa đơn doanh thu của bạn. Đường liên kết này có hiệu lực trong vòng 48 giờ.</p>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${inviteLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Kích hoạt tài khoản</a>
                        </div>
                        <p style="color: #64748b; font-size: 13px;">Nếu nút trên không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt:</p>
                        <p style="color: #059669; font-size: 13px; word-break: break-all;">${inviteLink}</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Đây là email tự động, vui lòng không trả lời email này.</p>
                      </div>
                    `,
                  });
                  if (!result.success) {
                    console.error('Lỗi gửi email mời kích hoạt chủ nhà khi import:', result.error);
                  }
                } catch (emailErr) {
                  console.error('Lỗi gửi email mời kích hoạt chủ nhà khi import:', emailErr);
                }
              } else {
                console.error('Lỗi tạo invitation token khi import chủ nhà:', inviteError.message);
              }
            } else {
              console.error('Lỗi tạo profile khi import chủ nhà:', profileError.message);
            }
          } else {
            // Profile đã tồn tại, đảm bảo landlord_id được liên kết và role là landlord
            if (existingProfile.landlord_id !== landlordId) {
              const { error: updateProfileError } = await supabaseAdmin
                .from('profiles')
                .update({
                  landlord_id: landlordId,
                  role: 'landlord',
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingProfile.id);

              if (updateProfileError) {
                console.error('Lỗi cập nhật landlord_id cho profile có sẵn khi import:', updateProfileError.message);
              } else {
                console.log(`Đã cập nhật landlord_id (${landlordId}) cho profile có sẵn (${trimmedEmail})`);
              }
            }
          }
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
          allow_vinfast_electric, image_url, deposit_terms, washing_machine_type,
          electricity_price, water_price, internet_price, common_service_price,
          latitude, longitude, electric_vehicle_fee
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
        let processedThumbnailUrl = null;
        if (image_url) {
          const processedList = await processImageLink(image_url, 1);
          if (processedList.length > 0) {
            processedImageUrl = processedList[0].url;
            processedThumbnailUrl = processedList[0].thumbnail_url || processedList[0].url;
          }
        }

        const payload: any = {
          company_id: companyId,
          code,
          name,
          landlord_id: landlord_id || null,
          area,
          address: address || null,
          year_built: year_built ? Number(year_built) : null,
          has_elevator: has_elevator === true || has_elevator === 'Y' || has_elevator === 'Yes',
          pccc_certified: pccc_certified === true || pccc_certified === 'Y' || pccc_certified === 'Yes',
          allow_pet: allow_pet === true || allow_pet === 'Y' || allow_pet === 'Yes',
          allow_foreigners: allow_foreigners === true || allow_foreigners === 'Y' || allow_foreigners === 'Yes',
          allow_vinfast_electric: allow_vinfast_electric === true || allow_vinfast_electric === 'Y' || allow_vinfast_electric === 'Yes',
          image_url: processedImageUrl || '',
          thumbnail_url: processedThumbnailUrl || null,
          deposit_terms: deposit_terms ? normalizeAreaText(deposit_terms) : null,
          washing_machine_type: washing_machine_type || 'chung',
          electricity_price: electricity_price ? Number(electricity_price) : 4000,
          water_price: water_price ? Number(water_price) : 35000,
          internet_price: internet_price ? Number(internet_price) : 100000,
          common_service_price: common_service_price ? Number(common_service_price) : 200000,
          electric_vehicle_fee: electric_vehicle_fee ? Number(electric_vehicle_fee) : 0,
          latitude: latitude !== undefined ? latitude : null,
          longitude: longitude !== undefined ? longitude : null,
          updated_at: new Date().toISOString()
        };

        if (total_floors !== undefined && total_floors !== null && total_floors !== '') {
          payload.total_floors = Number(total_floors);
        }
        if (total_rooms !== undefined && total_rooms !== null && total_rooms !== '') {
          payload.total_rooms = Number(total_rooms);
        }

        if (existing) {
          const { error } = await supabaseAdmin
            .from('buildings')
            .update(payload)
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          if (payload.total_floors === undefined) payload.total_floors = 1;
          if (payload.total_rooms === undefined) payload.total_rooms = 0;
          
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
    const linkCache = new Map<string, ProcessedMedia[]>();

    // 3. IMPORT ROOMS (Phòng)
    for (const room of rooms) {
      try {
        const {
          building_code, code, floor, size, price, bedrooms, bathrooms, status,
          max_occupants, max_vehicles_per_room, min_contract_months,
          image_urls, room_type, deposit_terms, rose, description,
          has_private_balcony
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
          deposit_terms: deposit_terms ? normalizeAreaText(deposit_terms) : null,
          rose: rose ? normalizeAreaText(rose) : null,
          description: description ? normalizeAreaText(description) : null,
          has_private_balcony: has_private_balcony === true || has_private_balcony === 'Y' || has_private_balcony === 'Yes',
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
              let processedList: ProcessedMedia[] = [];
              if (linkCache.has(rawUrl)) {
                processedList = linkCache.get(rawUrl)!;
              } else {
                processedList = await processImageLink(rawUrl, 10);
                linkCache.set(rawUrl, processedList);
              }
              for (const media of processedList) {
                const { data: existingImg } = await supabaseAdmin
                  .from('room_images')
                  .select('id')
                  .eq('room_id', roomId)
                  .eq('url', media.url)
                  .maybeSingle();
  
                if (!existingImg) {
                  const { error: imgError } = await supabaseAdmin
                    .from('room_images')
                    .insert({
                      company_id: companyId,
                      room_id: roomId,
                      url: media.url,
                      thumbnail_url: media.thumbnail_url,
                      media_type: media.media_type,
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
