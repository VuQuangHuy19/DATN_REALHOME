
export function isValidCustomerName(name: string): boolean {
  if (!name) return false;

  const trimmed = name.trim();

  // Quá ngắn hoặc quá dài
  if (trimmed.length < 2 || trimmed.length > 100) return false;

  // Toàn chữ số
  if (/^\d+$/.test(trimmed)) return false;

  // Toàn ký tự đặc biệt / không có chữ cái nào
  // Yêu cầu có ít nhất 2 ký tự là chữ cái (bao gồm tiếng Việt)
  const letterMatches = trimmed.match(/[a-zA-ZàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g);
  if (!letterMatches || letterMatches.length < 2) return false;

  return true;
}
