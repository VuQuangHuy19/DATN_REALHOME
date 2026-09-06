/**
 * Utility chuyển đổi các thông báo lỗi tiếng Anh, lỗi mạng và lỗi hệ thống sang tiếng Việt thân thiện.
 */
export function translateErrorMessage(error: any): string {
  if (!error) return 'Có lỗi không xác định xảy ra. Vui lòng thử lại.';

  let msg = '';
  if (typeof error === 'string') {
    msg = error;
  } else if (error instanceof Error) {
    msg = error.message;
  } else if (typeof error === 'object') {
    msg = error.error || error.message || JSON.stringify(error);
  }

  const str = String(msg).trim();
  const lower = str.toLowerCase();

  // 1. Lỗi kết nối mạng (Fetch failure)
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('fetch failed') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('err_connection')
  ) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng của bạn.';
  }

  // 2. Lỗi đăng nhập & xác thực
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid email or password') ||
    lower.includes('invalid password') ||
    lower.includes('invalid_grant')
  ) {
    return 'Tên đăng nhập, email/SĐT hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
  }

  if (lower.includes('user not found') || lower.includes('user_not_found') || lower.includes('account not found')) {
    return 'Tài khoản không tồn tại trên hệ thống.';
  }

  if (
    lower.includes('unauthorized') ||
    lower.includes('jwt expired') ||
    lower.includes('token expired') ||
    lower.includes('session expired') ||
    lower.includes('expired-unauthorized') ||
    lower === 'unauthorized'
  ) {
    return 'Phiên đăng nhập của bạn đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.';
  }

  if (lower.includes('idle') || lower === 'expired-idle') {
    return 'Phiên đăng nhập đã hết hạn do bạn không thao tác trong 60 phút. Vui lòng đăng nhập lại.';
  }

  if (lower.includes('user is disabled') || lower.includes('user_disabled')) {
    return 'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.';
  }

  // 3. Lỗi giới hạn tần suất (Rate limiting)
  if (lower.includes('too many requests') || lower.includes('rate limit') || lower.includes('429')) {
    return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi ít phút rồi thử lại.';
  }

  // 4. Lỗi máy chủ
  if (lower.includes('internal server error') || lower.includes('500') || lower.includes('server error')) {
    return 'Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.';
  }

  // 5. Nếu thông báo đã có tiếng Việt (chứa ký tự tiếng Việt có dấu)
  if (/[àáảãạăắằẳẵặâấầnẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(str)) {
    return str;
  }

  return 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại.';
}
