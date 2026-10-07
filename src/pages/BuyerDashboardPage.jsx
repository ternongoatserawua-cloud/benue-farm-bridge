import React, { useState, useEffect, useRef } from 'react';
import {
  Bookmark,
  History,
  PhoneCall,
  User,
  ShoppingBag,
  MessageSquare,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  ChevronUp,
  MapPin,
  ShieldCheck,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import ProductCard from '../components/marketplace/ProductCard.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import { generateWhatsAppLink } from '../utils/whatsapp.js';
import { uploadUserAvatar } from '../services/authService.js';

const BUYER_PRESET_AVATARS = [
  { id: 'bav1', label: 'Commercial Off-taker', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
  { id: 'bav2', label: 'Wholesale Buyer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
  { id: 'bav3', label: 'Market Retailer', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80' },
  { id: 'bav4', label: 'Bulk Distributor', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80' },
  { id: 'bav5', label: 'Food Processor', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80' },
  { id: 'bav6', label: 'Household Shopper', url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80' }
];

export default function BuyerDashboardPage({
  allProducts = [],
  savedProductIds = new Set(),
  currentUser = null,
  onUpdateUserProfile = () => {},
  onToggleSave = () => {},
  onViewProduct = () => {},
  onNavigate = () => {}
}) {
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' | 'recent' | 'contacted'
  const [avatar, setAvatar] = useState(currentUser?.avatar || BUYER_PRESET_AVATARS[0].url);
  const [showEditor, setShowEditor] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const buyerAvatarInputRef = useRef(null);

  useEffect(() => {
    if (currentUser?.avatar) {
      setAvatar(currentUser.avatar);
      setAvatarImgError(false);
    }
  }, [currentUser?.avatar]);

  const handleAvatarDeviceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setAvatarError(null);

    // 1. Validate image
    const isImage = (file.type && file.type.startsWith('image/')) || (file.name && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file.name));
    if (!isImage) {
      setAvatarError('Please select a valid image file (JPG, PNG, WEBP, or GIF).');
      return;
    }

    // 2. Validate max 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setAvatarError(`Image size (${sizeMb} MB) exceeds the 5 MB limit. Please select a smaller photo.`);
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarImgError(false);

    try {
      // 3. Upload to Supabase Storage "avatars" bucket
      const publicUrl = await uploadUserAvatar(file, currentUser?.id || 'buyer');
      setAvatar(publicUrl);

      // 4. Save to profiles database table
      await onUpdateUserProfile({ avatar: publicUrl });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Buyer avatar upload failed:', err);
      setAvatarError(err.message || 'Failed to upload photo to storage.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfileCustomization = async () => {
    setSaving(true);
    setAvatarError(null);
    try {
      await onUpdateUserProfile({ avatar });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save buyer profile:', err);
      setAvatarError('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const savedProducts = allProducts.filter((p) => savedProductIds.has(p.id));

  return (
    <div className="dashboard-root">
      {/* Top Banner */}
      <section className="browse-header-banner">
        <div className="container">
          <div className="browse-header-content">
            <h1 className="browse-title">Buyer Dashboard</h1>
            <p className="browse-subtitle">
              Manage your saved Benue harvest listings, customize your buyer profile photo, and connect with direct farm producers.
            </p>
          </div>
        </div>
      </section>

      <div className="container dashboard-container">
        {/* BUYER PROFILE HEADER CARD */}
        <div className="card dashboard-card-pad mb-6" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="farmer-banner-avatar-wrap">
                {avatar && !avatarImgError ? (
                  <img
                    src={avatar}
                    alt={currentUser?.name || 'Buyer Avatar'}
                    className="farmer-banner-avatar-img"
                    style={{ width: '64px', height: '64px', border: '2px solid var(--color-primary-600)' }}
                    onError={() => setAvatarImgError(true)}
                  />
                ) : (
                  <div className="farmer-banner-avatar-fallback" style={{ width: '64px', height: '64px', fontSize: '1.4rem' }}>
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User size={28} />}
                  </div>
                )}

                {isUploadingAvatar && (
                  <div className="avatar-loading-overlay" style={{ width: '64px', height: '64px' }}>
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                )}

                <button
                  type="button"
                  className="avatar-upload-trigger-badge"
                  onClick={() => buyerAvatarInputRef.current?.click()}
                  title="Upload profile photo"
                  aria-label="Upload profile photo"
                  disabled={isUploadingAvatar}
                >
                  <Camera size={13} />
                </button>

                <input
                  ref={buyerAvatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarDeviceUpload}
                  style={{ display: 'none' }}
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 m-0">{currentUser?.name || 'Benue Produce Buyer'}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <Badge variant="verified">Verified Buyer</Badge>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {currentUser?.lga || 'Benue'}</span>
                  {currentUser?.phone && (
                    <>
                      <span>&bull;</span>
                      <span>{currentUser.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={showEditor ? ChevronUp : Camera}
              onClick={() => setShowEditor(!showEditor)}
            >
              {showEditor ? 'Close Photo Editor' : 'Edit Avatar Photo'}
            </Button>
          </div>

          {/* AVATAR PHOTO EDITOR DRAWER */}
          {showEditor && (
            <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                  <Sparkles size={16} className="text-primary" />
                  <span>Update Profile Avatar Photo</span>
                </div>
                {savedSuccess && (
                  <Badge variant="success">
                    <CheckCircle2 size={13} /> Saved &amp; Applied!
                  </Badge>
                )}
              </div>

              {avatarError && (
                <div className="alert alert-danger mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px' }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{avatarError}</span>
                </div>
              )}

              <div className="customization-section-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="customization-box">
                  <div className="device-upload-btn-wrap">
                    <label
                      className={`file-upload-custom-label ${isUploadingAvatar ? 'opacity-70 cursor-not-allowed' : ''}`}
                      htmlFor="buyer-avatar-device-input"
                    >
                      {isUploadingAvatar ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Uploading to Cloud Storage...
                        </>
                      ) : (
                        <>
                          <Upload size={14} /> Upload Device Avatar Photo (Max 5MB)
                        </>
                      )}
                    </label>
                    <input
                      id="buyer-avatar-device-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarDeviceUpload}
                      disabled={isUploadingAvatar}
                      style={{ display: 'none' }}
                    />
                  </div>

                  <span className="text-xs font-semibold text-slate-500 block mb-2">Or Choose Preset Avatar:</span>
                  <div className="presets-grid-avatars">
                    {BUYER_PRESET_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setAvatar(av.url);
                          setAvatarImgError(false);
                        }}
                        className={`preset-avatar-btn ${avatar === av.url ? 'selected' : ''}`}
                        title={av.label}
                      >
                        <img src={av.url} alt={av.label} className="preset-avatar-thumb" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={handleSaveProfileCustomization}
                  disabled={saving || isUploadingAvatar}
                >
                  {saving ? 'Saving...' : 'Save & Apply Avatar Photo'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="dashboard-tabs-bar">
          <button
            type="button"
            className={`dashboard-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <Bookmark size={15} />
            <span>Saved Produce ({savedProducts.length})</span>
          </button>
          <button
            type="button"
            className={`dashboard-tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            <History size={15} />
            <span>Recently Viewed</span>
          </button>
          <button
            type="button"
            className={`dashboard-tab-btn ${activeTab === 'contacted' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacted')}
          >
            <PhoneCall size={15} />
            <span>Contacted Farmers</span>
          </button>
        </div>

        {/* TAB 1: SAVED PRODUCE */}
        {activeTab === 'saved' && (
          <div>
            <div className="section-title-wrap dashboard-sub-title">
              <div>
                <h2 className="dashboard-heading">Bookmarked Agricultural Produce</h2>
                <p className="dashboard-subheading">
                  Easily access your shortlisted farm products for direct phone or WhatsApp connection.
                </p>
              </div>

              {savedProducts.length > 0 && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  icon={ShoppingBag}
                  onClick={() => onNavigate('browse')}
                >
                  Browse More Produce
                </Button>
              )}
            </div>

            {savedProducts.length > 0 ? (
              <div className="grid-products">
                {savedProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    isSaved={true}
                    onToggleSave={onToggleSave}
                    onViewDetails={onViewProduct}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state-card">
                <Bookmark size={40} className="empty-state-icon" />
                <h3 className="empty-state-title">No saved produce yet</h3>
                <p className="empty-state-desc">
                  When browsing produce listings, tap the heart icon to save products you are interested in for quick access later.
                </p>
                <Button
                  variant="primary"
                  icon={ShoppingBag}
                  onClick={() => onNavigate('browse')}
                >
                  Start Exploring Produce
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RECENTLY VIEWED */}
        {activeTab === 'recent' && (
          <div className="dashboard-tab-content">
            <div className="grid-products">
              {allProducts.slice(0, 5).map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  isSaved={savedProductIds.has(prod.id)}
                  onToggleSave={onToggleSave}
                  onViewDetails={onViewProduct}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CONTACTED FARMERS */}
        {activeTab === 'contacted' && (
          <div className="dashboard-tab-content">
            <div className="card dashboard-card-pad">
              <h3 className="dashboard-contact-title">
                Direct Connection History
              </h3>
              <p className="dashboard-contact-subtitle">
                Your interactions connect directly through WhatsApp and cellular phone calls.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
