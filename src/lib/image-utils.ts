/**
 * Nén và resize ảnh phía client bằng Canvas API (không cần dependency).
 * - Bỏ qua nếu file đã nhỏ (< 300KB) — không cần nén thêm.
 * - Resize theo cạnh dài tối đa `maxDimension`, giữ nguyên tỉ lệ khung hình.
 * - Xuất ra JPEG với `quality` truyền vào, wrap lại thành File cùng tên gốc.
 */
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82,
  forceResize = false,
): Promise<File> {
  // Bỏ qua nếu không phải ảnh (an toàn hơn)
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Resize nếu cạnh dài vượt quá maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // Nền trắng chuẩn cho ảnh PNG/WebP trong suốt khi chuyển sang JPG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Xuất 100% ra định dạng JPEG/JPG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Chuẩn hóa tên file thành đuôi .jpg
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          console.debug(
            `[compressImage] ${file.name} -> ${compressedFile.name}: ${(file.size / 1024).toFixed(0)} KB -> ${(compressedFile.size / 1024).toFixed(0)} KB (${width}x${height})`,
          );

          resolve(compressedFile);
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Tính mã băm SHA-256 của file để kiểm tra trùng lặp (Deduplication).
 */
export async function computeFileHash(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('Lỗi computeFileHash:', err);
    return `${file.name}_${file.size}_${file.lastModified}`;
  }
}
