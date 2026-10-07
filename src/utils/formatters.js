/**
 * Currency & Text Formatters for Benue Market
 */

/**
 * Format a number into Nigerian Naira (₦) currency string
 * e.g., 2500 -> "₦2,500"
 */
export function formatNaira(amount) {
  if (amount === undefined || amount === null || amount === '' || isNaN(amount)) {
    return '₦0';
  }
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return '₦0';
  
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(num).replace('NGN', '₦').trim();
}

/**
 * Format quantity with its unit
 * e.g., (500, "tuber") -> "500 tubers available"
 */
export function formatQuantity(quantity, unit = 'unit') {
  if (!quantity && quantity !== 0) return 'In stock';
  const num = typeof quantity === 'number' ? quantity : Number(quantity) || 0;
  const safeUnit = (unit || 'unit').trim();
  const pluralUnit = num === 1 ? safeUnit : (safeUnit.endsWith('s') ? safeUnit : `${safeUnit}s`);
  return `${num.toLocaleString()} ${pluralUnit} available`;
}
