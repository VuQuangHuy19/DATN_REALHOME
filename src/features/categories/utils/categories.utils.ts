export const formatVNDNumber = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(numStr));
};

export const parseVNDNumber = (formattedStr: string | number | null | undefined): number | null => {
  if (formattedStr === null || formattedStr === undefined || formattedStr === '') return null;
  const clean = String(formattedStr).replace(/\D/g, '');
  return clean ? Number(clean) : null;
};

export const formatShortMoney = (num: number): string => {
  if (!num || num <= 0) return '0';
  if (num >= 1000000000) {
    const bill = num / 1000000000;
    return `${Number.isInteger(bill) ? bill : bill.toFixed(1)} tỷ`;
  }
  if (num >= 1000000) {
    const mill = num / 1000000;
    return `${Number.isInteger(mill) ? mill : mill.toFixed(1)} triệu`;
  }
  if (num >= 1000) {
    const k = num / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(0)}k`;
  }
  return `${num}đ`;
};

export const generatePriceLabel = (
  minStr: string | number | null | undefined,
  maxStr: string | number | null | undefined
): string => {
  const minNum = parseVNDNumber(minStr);
  const maxNum = parseVNDNumber(maxStr);

  if ((minNum === null || minNum === 0) && maxNum && maxNum > 0) {
    return `Dưới ${formatShortMoney(maxNum)}`;
  }
  if (minNum && minNum > 0 && (maxNum === null || maxNum === 0)) {
    return `Trên ${formatShortMoney(minNum)}`;
  }
  if (minNum && minNum > 0 && maxNum && maxNum > 0) {
    const minFormatted = formatShortMoney(minNum);
    const maxFormatted = formatShortMoney(maxNum);
    if (minFormatted.endsWith(' triệu') && maxFormatted.endsWith(' triệu')) {
      const minVal = minFormatted.replace(' triệu', '');
      return `${minVal} - ${maxFormatted}`;
    }
    return `${minFormatted} - ${maxFormatted}`;
  }
  return '';
};
