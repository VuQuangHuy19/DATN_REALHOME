/**
 * Utility để định dạng và tự động nhúng Ghi chú từ hệ thống / Sheet
 * vào phần mô tả của Tòa nhà và Phòng
 */

export function formatNotesWithSystemHeader(
  baseDesc: string | null | undefined,
  notesToAdd: string | null | undefined
): string | null {
  if (!notesToAdd || !notesToAdd.trim()) {
    return baseDesc ? baseDesc.trim() : null;
  }

  const cleanNotes = notesToAdd.trim();
  const baseStr = baseDesc ? baseDesc.trim() : '';

  // Nếu trong baseStr đã chứa nội dung note chính xác thì không lặp lại
  if (baseStr && baseStr.includes(cleanNotes)) {
    return baseStr;
  }

  // Tách các mục ghi chú
  const noteLines = cleanNotes
    .split(/[\n|;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.startsWith('📌 Ghi chú từ hệ thống:'))
    .map((s) => (s.startsWith('-') ? s : `- ${s}`));

  if (noteLines.length === 0) {
    return baseStr || null;
  }

  // Lọc loại bỏ dòng nào đã tồn tại trong baseStr
  const uniqueLines = noteLines.filter(line => {
    const rawContent = line.replace(/^-\s*/, '').trim();
    return !baseStr.includes(rawContent);
  });

  if (uniqueLines.length === 0) {
    return baseStr || null;
  }

  const formattedNotesBlock = `📌 Ghi chú từ hệ thống:\n${uniqueLines.join('\n')}`;

  // Nếu baseStr đã có block header "📌 Ghi chú từ hệ thống:"
  if (baseStr.includes('📌 Ghi chú từ hệ thống:')) {
    return `${baseStr}\n${uniqueLines.join('\n')}`;
  }

  return baseStr ? `${baseStr}\n\n${formattedNotesBlock}` : formattedNotesBlock;
}
