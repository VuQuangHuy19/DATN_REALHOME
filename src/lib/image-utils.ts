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
  // Bỏ qua nếu file đã nhỏ — không cần nén thêm (trừ khi ép buộc resize cho thumbnail)
  const SKIP_THRESHOLD = 300 * 1024; // 300 KB
  if (!forceResize && file.size < SKIP_THRESHOLD) return file;

  // Bỏ qua nếu không phải ảnh (an toàn hơn)
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve, reject) => {
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
        // Không lấy được context — trả về file gốc
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Xuất ra blob JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Chỉ dùng bản nén nếu thực sự nhỏ hơn bản gốc (trừ khi ép buộc resize)
          if (!forceResize && blob.size >= file.size) {
            resolve(file);
            return;
          }

          // Giữ tên file gốc, đổi extension thành .jpg
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          console.debug(
            `[compressImage] ${file.name}: ${(file.size / 1024).toFixed(0)} KB → ${(compressedFile.size / 1024).toFixed(0)} KB (${width}×${height})`,
          );

          resolve(compressedFile);
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Lỗi decode — trả về file gốc, không block upload
      resolve(file);
    };

    img.src = objectUrl;
  });
}
