/**
 * WhatsApp & Phone deep link helper for Benue Market
 */

/**
 * Generate a pre-filled WhatsApp direct chat link
 * @param {string} phone - Raw or international phone number (e.g., "08031234567" or "2348031234567")
 * @param {object} product - Optional produce item details to pre-fill inquiry
 * @param {string} sellerName - Optional farmer name
 * @returns {string} https://wa.me link with encoded inquiry
 */
export function generateWhatsAppLink(phone, product = null, sellerName = '') {
  if (!phone) return '#';
  
  // Clean phone number into international format (Nigeria prefix: 234)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '234' + cleanPhone.slice(1);
  }
  if (!cleanPhone.startsWith('234')) {
    cleanPhone = '234' + cleanPhone;
  }

  let message = `Hello${sellerName ? ' ' + sellerName : ''}, I am contacting you from Benue Market platform.`;
  if (product) {
    message += ` I am interested in purchasing "${product.name}" listed at ₦${product.price?.toLocaleString()} / ${product.unit}. Is this produce still available?`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate a clean direct dial telephone link (RFC 3966 compliant)
 * @param {string} phone
 * @returns {string} tel:... link
 */
export function generatePhoneLink(phone) {
  if (!phone) return '#';
  const cleanPhone = String(phone).replace(/[^0-9+]/g, '');
  if (!cleanPhone) return '#';
  return `tel:${cleanPhone}`;
}

/**
 * Programmatically open a tel: link reliably across all desktop and mobile browsers
 * @param {string} phone
 */
export function triggerPhoneCall(phone) {
  const link = generatePhoneLink(phone);
  if (!link || link === '#') return;

  try {
    const a = document.createElement('a');
    a.href = link;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.location.href = link;
  }
}

