/**
 * Phone Masker Utility (Anti-Bypass Protection)
 * Formats phone numbers for privacy & security (e.g., 0977123456 -> 0977***456)
 */

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.trim().replace(/[^\d+]/g, '');

  if (cleaned.length < 6) return cleaned;

  // Format: 0977***456
  const prefix = cleaned.substring(0, 4);
  const suffix = cleaned.substring(cleaned.length - 3);

  return `${prefix}***${suffix}`;
}

/**
 * Builds data payload for notifications tailored to recipient role
 */
export function buildNotificationDataPayload(options: {
  customerName?: string;
  customerPhone?: string;
  roomTitle?: string;
  roomAddress?: string;
  saleName?: string;
  salePhone?: string;
  appointmentTime?: string;
  appointmentId?: string;
  recipientRole?: 'landlord' | 'sale' | 'customer' | 'admin';
}) {
  const {
    customerName,
    customerPhone,
    roomTitle,
    roomAddress,
    saleName,
    salePhone,
    appointmentTime,
    appointmentId,
    recipientRole,
  } = options;

  const isLandlord = recipientRole === 'landlord';

  return {
    customerName: customerName || 'Khách hàng',
    // Landlord sees MASKED customer phone!
    customerPhoneMasked: isLandlord ? maskPhoneNumber(customerPhone) : customerPhone,
    customerPhoneFull: isLandlord ? undefined : customerPhone,

    roomCode: roomTitle || '',
    roomAddress: roomAddress || '',

    saleName: saleName || '',
    // Landlord sees UNMASKED sale phone!
    salePhoneFull: salePhone || '',

    appointmentTime: appointmentTime || '',
    appointmentId: appointmentId || '',
  };
}
