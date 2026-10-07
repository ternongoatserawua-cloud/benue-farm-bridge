import React, { useState } from 'react';
import { MapPin, ShieldCheck, ArrowRight, Phone, PackageCheck } from 'lucide-react';
import Badge from '../common/Badge.jsx';
import CallFarmerModal from './CallFarmerModal.jsx';
import { generatePhoneLink, triggerPhoneCall } from '../../utils/whatsapp.js';

export default function FarmerCard({
  farmer,
  onViewProfile = () => {}
}) {
  const [avatarError, setAvatarError] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);

  if (!farmer) return null;

  const {
    id,
    name = 'Benue Agricultural Producer',
    location = 'Benue State',
    lga,
    products = [],
    listingCount = 0,
    verified = true,
    avatar,
    about,
    phone = '08031234567',
    whatsapp = '2348031234567'
  } = farmer;

  const locationDisplay = lga ? `${location}, ${lga}` : location;
  const phoneUrl = generatePhoneLink(phone);

  const handleCall = (e) => {
    e.stopPropagation();
    setCallModalOpen(true);
    triggerPhoneCall(phone);
  };

  return (
    <>
      <article className="card farmer-card">
        <div className="farmer-card-header">
          {/* Avatar */}
          <div className="farmer-avatar-wrap">
            {avatar && !avatarError ? (
              <img
                src={avatar}
                alt={name}
                className="farmer-avatar-img"
                loading="lazy"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="farmer-avatar-fallback">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            {verified && (
              <div className="farmer-verified-tick" title="Verified Benue Producer">
                <ShieldCheck size={14} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="farmer-header-info">
            <h3 className="farmer-card-name" title={name}>
              {name}
            </h3>
            <div className="farmer-location">
              <MapPin size={13} />
              <span>{locationDisplay}</span>
            </div>
            {verified && (
              <Badge variant="verified" className="farmer-badge-inline">
                Verified Producer
              </Badge>
            )}
          </div>
        </div>

        {/* Main Produce Tags */}
        <div className="farmer-card-body">
          {about && (
            <p className="farmer-about-text">
              {about}
            </p>
          )}

          <div className="farmer-produce-section">
            <span className="farmer-produce-label">Main Produce:</span>
            <div className="farmer-tags-wrap">
              {products.map((item, idx) => (
                <span key={idx} className="farmer-produce-tag">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="farmer-stats-row">
            <div className="farmer-stat">
              <PackageCheck size={16} className="farmer-stat-icon" />
              <span><strong>{listingCount}</strong> active listings</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="farmer-card-footer flex items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm flex-1"
            onClick={() => onViewProfile(farmer)}
            aria-label={`View profile for ${name}`}
          >
            <span>View Profile</span>
            <ArrowRight size={14} />
          </button>

          {phone && (
            <a
              href={phoneUrl}
              className="btn btn-call btn-sm"
              style={{ marginLeft: '10px' }}
              onClick={handleCall}
              title={`Call ${name} (${phone})`}
              aria-label={`Call ${name} via Phone`}
            >
              <Phone size={14} />
              <span className="hide-mobile">Call</span>
            </a>
          )}
        </div>
      </article>

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
    </>
  );
}
