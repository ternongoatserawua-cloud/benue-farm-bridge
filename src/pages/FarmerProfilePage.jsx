import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Phone,
  MessageSquare,
  Calendar,
  Package,
  Star,
  Copy,
  Check,
  Truck,
  CheckCircle2
} from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import ProductCard from '../components/marketplace/ProductCard.jsx';
import CallFarmerModal from '../components/marketplace/CallFarmerModal.jsx';
import { generateWhatsAppLink, generatePhoneLink, triggerPhoneCall } from '../utils/whatsapp.js';
import { fetchFarmerById } from '../services/farmersService.js';
import { mapToSellerUUID } from '../services/productsService.js';

export default function FarmerProfilePage({
  farmer,
  allProducts = [],
  savedProductIds = new Set(),
  onToggleSave = () => {},
  onViewProduct = () => {},
  onBack = () => {}
}) {
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [liveFarmer, setLiveFarmer] = useState(farmer);

  useEffect(() => {
    setLiveFarmer(farmer);
    if (!farmer?.id) return;
    let isMounted = true;
    fetchFarmerById(farmer.id).then(({ data }) => {
      if (isMounted && data) {
        setLiveFarmer(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [farmer?.id]);

  if (!liveFarmer) {
    return (
      <div className="container empty-state-container">
        <h2>Farmer profile not found</h2>
        <Button variant="primary" icon={ArrowLeft} onClick={onBack}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const {
    id,
    name,
    location = 'Benue State',
    lga = 'Benue',
    community = '',
    products = [],
    listingCount = 0,
    verified = true,
    phone = '08031234567',
    whatsapp = '2348031234567',
    avatar,
    coverImage,
    about,
    memberSince = '2022',
    rating = 4.9,
    dealsCompleted = 100
  } = liveFarmer;

  const whatsappUrl = generateWhatsAppLink(whatsapp || phone, null, name);
  const phoneUrl = generatePhoneLink(phone);

  // Format Nigerian phone numbers cleanly
  const formatPhoneNumber = (num) => {
    if (!num) return '';
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

  const handleCallClick = (e) => {
    if (e) e.preventDefault();
    setCallModalOpen(true);
    triggerPhoneCall(phone);
  };

  const handleCopyPhone = (e) => {
    if (e) e.stopPropagation();
    if (!phone) return;
    try {
      navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      // fallback
    }
  };

  // Active listings belonging to this farmer
  const farmerProducts = allProducts.filter((p) => {
    if (!id) return false;
    const targetUUID = mapToSellerUUID(id);
    return p.sellerId === id || (targetUUID && p.sellerId === targetUUID);
  });

  return (
    <div className="farmer-profile-root">
      {/* Back Button Bar */}
      <div className="product-details-nav-bar">
        <div className="container">
          <button
            type="button"
            onClick={onBack}
            className="btn btn-ghost btn-sm btn-back-inline"
          >
            <ArrowLeft size={16} /> Back to Directory
          </button>
        </div>
      </div>

      {/* Cover Banner */}
      <div className="farmer-profile-cover-wrap">
        <img
          src={coverImage || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'}
          alt=""
          className="farmer-cover-img"
        />
      </div>

      {/* Profile Header Card */}
      <div className="container farmer-profile-container">
        <div className="farmer-profile-card">
          <div className="farmer-profile-top-row">
            <div className="farmer-profile-avatar-large">
              {avatar && !avatarError ? (
                <img
                  src={avatar}
                  alt={name}
                  className="profile-large-img"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="profile-large-fallback">
                  {name ? name.charAt(0).toUpperCase() : 'F'}
                </div>
              )}
              {verified && (
                <div className="profile-verified-badge" title="Verified Benue Producer">
                  <ShieldCheck size={14} />
                </div>
              )}
            </div>

            <div className="farmer-profile-actions-top">
              <a
                href={phoneUrl}
                onClick={handleCallClick}
                className="btn btn-call btn-lg"
                aria-label={`Call ${name} via Phone (${phone})`}
                title={`Call Farmer (${phone})`}
              >
                <Phone size={16} />
                <span>Call Farmer</span>
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-lg"
                aria-label={`WhatsApp ${name}`}
              >
                <MessageSquare size={16} />
                <span>WhatsApp Farmer</span>
              </a>
            </div>
          </div>

          <div className="farmer-profile-details">
            <div className="farmer-name-badge-row">
              <h1 className="farmer-profile-name">{name}</h1>
              {verified && (
                <Badge variant="verified">Verified Benue Producer</Badge>
              )}
            </div>

            <div className="farmer-profile-meta-row">
              <span className="profile-meta-item">
                <MapPin size={13} /> {community ? `${community}, ` : ''}{location}{lga && location !== lga ? ` (${lga} LGA)` : ''}
              </span>
              <span className="profile-meta-item">
                <Calendar size={13} /> Member since {memberSince}
              </span>
              <span className="profile-meta-item">
                <Star size={13} className="star-rating-icon" /> {rating} ({dealsCompleted}+ inquiries)
              </span>
            </div>

            {about && (
              <p className="farmer-profile-bio">
                {about}
              </p>
            )}

            {/* Specialization Tags */}
            <div className="farmer-profile-tags">
              <span className="farmer-produce-label">Main Produce:</span>
              {products.map((item, idx) => (
                <span key={idx} className="farmer-produce-tag">
                  {item}
                </span>
              ))}
            </div>

            {/* Direct Phone Line Card / Callout */}
            <div className="farmer-direct-phone-card">
              <div className="direct-phone-left">
                <div className="direct-phone-icon-wrap">
                  <Phone size={20} />
                </div>
                <div className="direct-phone-text">
                  <span className="direct-phone-label">Direct Farm Telephone Line</span>
                  <span className="direct-phone-val">{formattedPhone}</span>
                </div>
              </div>

              <div className="direct-phone-actions">
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="btn btn-outline btn-sm"
                  title="Copy phone number"
                >
                  {copiedPhone ? (
                    <>
                      <Check size={14} color="var(--color-success)" />
                      <span className="text-success">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Number</span>
                    </>
                  )}
                </button>

                <a
                  href={phoneUrl}
                  onClick={handleCallClick}
                  className="btn btn-call btn-sm"
                  style={{ marginLeft: '10px' }}
                  aria-label={`Call ${name} directly`}
                  title={`Call ${phone}`}
                >
                  <Phone size={14} />
                  <span>Call Now</span>
                </a>
              </div>
            </div>

            {/* Direct Connection & Safety Guarantee */}
            <div className="farmer-trade-guarantee">
              <div className="guarantee-item">
                <ShieldCheck size={16} className="guarantee-icon" />
                <span><strong>Direct Farm Access:</strong> 100% direct connection to farmer. Zero intermediary commissions.</span>
              </div>
              <div className="guarantee-item">
                <Truck size={16} className="guarantee-icon" />
                <span><strong>Direct Negotiation:</strong> Agree on wholesale pricing, transport, bagging, and pickup points directly.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Listings Section */}
      <section className="section farmer-listings-section">
        <div className="container">
          <div className="section-title-wrap">
            <div>
              <span className="section-tag">Farm Catalog</span>
              <h2 className="section-heading">Active Produce Listings ({farmerProducts.length})</h2>
              <p className="section-subheading">
                All agricultural products currently available from {name}.
              </p>
            </div>
          </div>

          {farmerProducts.length > 0 ? (
            <div className="grid-products">
              {farmerProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  isSaved={savedProductIds.has(prod.id)}
                  onToggleSave={onToggleSave}
                  onViewDetails={onViewProduct}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state-card empty-state-compact">
              <Package size={36} className="empty-state-icon" />
              <h3 className="empty-state-title">No active listings currently</h3>
              <p className="empty-state-desc">
                This farmer has no published listings at this moment. You can still reach them directly via phone or WhatsApp.
              </p>
              <div className="flex gap-2 justify-center mt-3">
                <button
                  type="button"
                  onClick={handleCallClick}
                  className="btn btn-call"
                >
                  <Phone size={14} /> Call {name}
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                >
                  <MessageSquare size={14} /> WhatsApp Farmer
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Call Farmer Modal */}
      <CallFarmerModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        farmerName={name}
        phone={phone}
        whatsapp={whatsapp}
        location={location}
        lga={lga}
        product={null}
      />
    </div>
  );
}
