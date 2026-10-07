import React, { useState } from 'react';
import { Phone, MessageSquare, Copy, Check, ShieldCheck, MapPin } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import { generatePhoneLink, generateWhatsAppLink } from '../../utils/whatsapp.js';

export default function CallFarmerModal({
  isOpen,
  onClose,
  farmerName = 'Farmer',
  phone = '',
  whatsapp = '',
  location = 'Benue State',
  lga = '',
  product = null
}) {
  const [copied, setCopied] = useState(false);

  if (!phone) return null;

  const phoneUrl = generatePhoneLink(phone);
  const whatsappUrl = generateWhatsAppLink(whatsapp || phone, product, farmerName);

  // Format Nigerian phone numbers cleanly
  const formatPhoneNumber = (num) => {
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    if (cleaned.length === 13 && cleaned.startsWith('234')) {
      return `+234 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
    return num;
  };

  const formattedPhone = formatPhoneNumber(phone);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDirectCall = () => {
    // Native tel: link handles calling directly
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contact Farmer Directly"
      maxWidth="440px"
    >
      <div className="call-modal-content">
        {/* Farmer Identity */}
        <div className="call-modal-farmer-header">
          <div className="call-modal-avatar">
            {farmerName.charAt(0).toUpperCase()}
          </div>
          <div className="call-modal-farmer-info">
            <h3 className="call-modal-farmer-name">{farmerName}</h3>
            <div className="call-modal-location">
              <MapPin size={13} />
              <span>{lga ? `${lga}, ${location}` : location}</span>
            </div>
            <span className="badge badge-verified call-modal-verified-tag">
              <ShieldCheck size={12} /> Verified Benue Farmer
            </span>
          </div>
        </div>

        {/* Product Context Note */}
        {product && (
          <div className="call-modal-produce-note">
            <span>Inquiring for: <strong>{product.name}</strong></span>
          </div>
        )}

        {/* Display Phone Number with Copy Trigger */}
        <div className="call-modal-phone-box">
          <a
            href={phoneUrl}
            className="call-modal-phone-display"
            title={`Click to call ${formattedPhone}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span className="call-modal-phone-label">Direct Phone Line (Click to Dial):</span>
            <span className="call-modal-phone-number font-mono">{formattedPhone}</span>
          </a>
          <button
            type="button"
            className="call-modal-copy-btn"
            onClick={handleCopy}
            title="Copy phone number to clipboard"
          >
            {copied ? (
              <>
                <Check size={15} color="var(--color-success)" />
                <span className="text-success">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={15} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="call-modal-actions">
          <a
            href={phoneUrl}
            className="btn btn-call btn-lg btn-block"
            aria-label={`Call ${farmerName} at ${formattedPhone}`}
          >
            <Phone size={18} />
            <span>Call Now ({formattedPhone})</span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-lg btn-block"
          >
            <MessageSquare size={18} />
            <span>Chat on WhatsApp</span>
          </a>
        </div>

        {/* Trading Safety Guidance */}
        <div className="call-modal-safety">
          <ShieldCheck size={16} className="call-modal-safety-icon" />
          <p>
            Zero platform fees. Discuss pricing, quantity, and pickup directly. Never make advance payments before inspecting produce!!!
          </p>
        </div>
      </div>
    </Modal>
  );
}
