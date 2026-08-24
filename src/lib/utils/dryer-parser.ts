export type DryerFeatureResult = {
  hasDryer: boolean;
  type: 'combo' | 'dryer' | null;
  label: string | null;
};

/**
 * Tự động phân tích & nhận diện tiện ích Máy sấy / Máy giặt tích hợp sấy từ mô tả hoặc ghi chú
 * Xử lý chính xác các trường hợp khẳng định vs phủ định ("không máy sấy", "chưa sấy"...)
 */
export function detectDryerFeature(text: string | null | undefined): DryerFeatureResult {
  if (!text) return { hasDryer: false, type: null, label: null };

  const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Kiểm tra Phủ định trước (Negative Match)
  const isNegative =
    /(khong|chua)\s+(co\s+)?(may\s+)?say/i.test(norm) ||
    /(khong|chua)\s+(giat\s+)?say/i.test(norm) ||
    /(may\s+giat|maygiat)\s+(khong)\s+say/i.test(norm) ||
    /khong\s+co\s+may\s+say/i.test(norm);

  if (isNegative) {
    return { hasDryer: false, type: null, label: null };
  }

  // 2. Kiểm tra Khẳng định (Positive Match)
  const isCombo =
    /(tich\s+hop\s+say|tich\s+hop\s+chuc\s+nang\s+say|giat\s+say|giat\s+\+\s+say|chuc\s+nang\s+say)/i.test(norm);

  const isDryer =
    /(may\s+say|may\s+say\s+rieng|co\s+may\s+say|co\s+say)/i.test(norm);

  if (isCombo) {
    return {
      hasDryer: true,
      type: 'combo',
      label: 'Máy giặt tích hợp sấy',
    };
  }

  if (isDryer) {
    return {
      hasDryer: true,
      type: 'dryer',
      label: 'Máy sấy',
    };
  }

  return { hasDryer: false, type: null, label: null };
}
