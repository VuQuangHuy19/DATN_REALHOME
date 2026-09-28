/**
 * Trả về chuỗi thời gian tương đối tiếng Việt.
 * Ví dụ: "Vừa xong", "5 phút trước", "2 ngày trước", "1 tháng trước"
 * 
 * Pure function — không có side effects, không cần useEffect.
 */
export function formatRelativeTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const past = new Date(dateStr).getTime();
  if (isNaN(past)) return null;

  const diff = Date.now() - past; // ms
  if (diff < 0) return null; // tương lai — bỏ qua

  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);
  const weeks   = Math.floor(days / 7);
  const months  = Math.floor(days / 30);

  if (diff < 60_000)    return 'Vừa xong';
  if (minutes < 60)     return `${minutes} phút trước`;
  if (hours   < 24)     return `${hours} giờ trước`;
  if (days    === 1)    return 'Hôm qua';
  if (days    < 7)      return `${days} ngày trước`;
  if (weeks   === 1)    return '1 tuần trước';
  if (weeks   < 5)      return `${weeks} tuần trước`;
  if (months  === 1)    return '1 tháng trước';
  return                 `${months} tháng trước`;
}
