import React, { useState } from 'react';
import {
  Sprout,
  ShieldCheck,
  MapPin,
  Phone,
  MessageSquare,
  FileText,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { BENUE_LGAS } from '../../data/locations.js';

export default function FarmerOnboardingModal({
  isOpen = false,
  onClose = () => {},
  currentUser = null,
  onComplete = async () => {}
}) {
  const [formData, setFormData] = useState({
    farmName: currentUser?.name ? `${currentUser.name}'s Farm` : '',
    phone: currentUser?.phone || '',
    whatsapp: currentUser?.phone || '',
    lga: currentUser?.lga || 'Ukum',
    community: '',
    cropsGrown: 'Yam, Soybeans, Cassava',
    about: 'Commercial and family grower delivering fresh Benue agricultural produce.'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.farmName.trim()) {
      setError('Please provide your Farm or Agrobusiness Name.');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Please provide a valid direct phone number for buyer inquiries.');
      return;
    }

    setLoading(true);
    try {
      await onComplete({
        farmName: formData.farmName.trim(),
        name: formData.farmName.trim(),
        phone: formData.phone.trim(),
        whatsapp: (formData.whatsapp || formData.phone).trim(),
        lga: formData.lga,
        community: formData.community.trim(),
        cropsGrown: formData.cropsGrown.trim(),
        about: formData.about.trim(),
        location: 'Benue State'
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to complete farmer onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title="Create Your Benue Farmer Profile"
      maxWidth="580px"
    >
      <div className="farmer-onboarding-modal">
        {/* Value Proposition Header */}
        <div style={{
          backgroundColor: 'var(--color-primary-50, #f0fdf4)',
          border: '1px solid var(--border-brand, #bbf7d0)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#16a34a',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sprout size={20} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#166534' }}>
              Dual Role: Buyer &amp; Farmer Account
            </h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#15803d', lineHeight: '1.5' }}>
              Fill in your farm details to start listing produce. Your existing Buyer account, saved bookmarks, and order inquiries remain fully active!
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Farm Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="onboard-farmName">
              Farm or Business Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="onboard-farmName"
              type="text"
              name="farmName"
              className="form-control"
              placeholder="e.g., Ter Agro Allied & Farms"
              value={formData.farmName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Contact Numbers Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="onboard-phone">
                Phone Number <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Phone size={15} className="input-icon" />
                <input
                  id="onboard-phone"
                  type="tel"
                  name="phone"
                  className="form-control"
                  placeholder="e.g. 08123456789"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="onboard-whatsapp">
                WhatsApp Direct Number
              </label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <MessageSquare size={15} className="input-icon" />
                <input
                  id="onboard-whatsapp"
                  type="tel"
                  name="whatsapp"
                  className="form-control"
                  placeholder="e.g. 08123456789"
                  value={formData.whatsapp}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Location Details Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="onboard-lga">
                Benue LGA Location <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                id="onboard-lga"
                name="lga"
                className="form-control"
                value={formData.lga}
                onChange={handleChange}
                required
              >
                {BENUE_LGAS.map((lga) => (
                  <option key={lga.id} value={lga.name}>
                    {lga.name} ({lga.hub || 'Agricultural Hub'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="onboard-community">
                Community / Market Axis
              </label>
              <input
                id="onboard-community"
                type="text"
                name="community"
                className="form-control"
                placeholder="e.g., Zaki Biam Yam Market, Gboko Central"
                value={formData.community}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Commodities / Produce Grown */}
          <div className="form-group">
            <label className="form-label" htmlFor="onboard-crops">
              Primary Crops / Produce Grown <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="onboard-crops"
              type="text"
              name="cropsGrown"
              className="form-control"
              placeholder="e.g., White Yam, Soybeans, Cassava tubers, Rice"
              value={formData.cropsGrown}
              onChange={handleChange}
              required
            />
            <span style={{ fontSize: '11.5px', color: 'var(--color-slate-500)', marginTop: '4px', display: 'block' }}>
              Separated by commas. This helps buyers search and find your farm profile.
            </span>
          </div>

          {/* About / Bio */}
          <div className="form-group">
            <label className="form-label" htmlFor="onboard-about">
              Brief Farm Description
            </label>
            <textarea
              id="onboard-about"
              name="about"
              rows={2}
              className="form-control"
              placeholder="Describe your farming methods, wholesale supply capacity, or farm history..."
              value={formData.about}
              onChange={handleChange}
            />
          </div>

          {/* Actions Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={loading ? Loader2 : CheckCircle2}
              disabled={loading}
            >
              {loading ? 'Activating Profile...' : 'Complete & Activate Farmer Account'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
