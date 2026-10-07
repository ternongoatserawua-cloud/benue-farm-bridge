import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  Eye,
  MessageSquare,
  PlusCircle,
  Pencil,
  Trash2,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Upload,
  Image as ImageIcon,
  User,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  Loader2,
  ShieldAlert,
  Info,
  Lock,
  RefreshCw,
  Bookmark,
  ShoppingBag
} from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Modal from '../components/common/Modal.jsx';
import EditProductModal from '../components/marketplace/EditProductModal.jsx';
import ProductCard from '../components/marketplace/ProductCard.jsx';
import { formatNaira } from '../utils/formatters.js';
import { uploadUserAvatar, uploadProfileAsset } from '../services/authService.js';
import { compressImage } from '../utils/imageCompressor.js';
import {
  computeSubscriptionStatus,
  daysUntilExpiry,
  getProductLimit,
  isSubscriptionActive,
  getSubscriptionPlans
} from '../services/subscriptionService.js';

const PRESET_AVATARS = [
  { id: 'av1', label: 'Commercial Grower', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
  { id: 'av2', label: 'Agro Producer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
  { id: 'av3', label: 'Cooperative Leader', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80' },
  { id: 'av4', label: 'Tuber Specialist', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80' },
  { id: 'av5', label: 'Women Co-op Producer', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80' },
  { id: 'av6', label: 'Fresh Veg Grower', url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80' }
];

const PRESET_COVERS = [
  { id: 'cov1', label: 'Zaki Biam Yam Field', url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80' },
  { id: 'cov2', label: 'River Benue Rice Basin', url: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80' },
  { id: 'cov3', label: 'Gboko Soybeans & Grains', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80' },
  { id: 'cov4', label: 'Katsina-Ala Tuber Harvest', url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22510?auto=format&fit=crop&w=1200&q=80' },
  { id: 'cov5', label: 'Vandeikya Citrus Orchards', url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1200&q=80' }
];

export default function FarmerDashboardPage({
  farmerProducts = [],
  allProducts = [],
  savedProductIds = new Set(),
  onToggleSave = () => {},
  currentUserId = null,
  currentUser = null,
  currentSubscription = null,
  onUpdateFarmerProfile = () => {},
  onToggleStock = () => {},
  onDeleteProduct = () => {},
  onUpdateProduct = () => {},
  onNavigate = () => {},
  onViewProduct = () => {},
  onOpenSubscription = () => {}
}) {
  const [dashboardTab, setDashboardTab] = useState('listings'); // 'listings' | 'saved'
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteModalProduct, setDeleteModalProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected' | 'instock' | 'outofstock'

  // Farmer confirm-deletion modal for admin-recycled products
  const [confirmDeleteRecycledProduct, setConfirmDeleteRecycledProduct] = useState(null);
  const [isDeletingRecycled, setIsDeletingRecycled] = useState(false);
  
  // Farmer Avatar & Cover Customization State
  const [avatar, setAvatar] = useState(currentUser?.avatar || PRESET_AVATARS[0].url);
  const [coverImage, setCoverImage] = useState(currentUser?.coverImage || PRESET_COVERS[0].url);
  const [showEditor, setShowEditor] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const avatarInputRef = useRef(null);

  // Separate active products from recycled products
  const activeProducts = farmerProducts.filter((p) => p.status !== 'recycled');
  const recycledProducts = farmerProducts.filter((p) => p.status === 'recycled');
  const savedProducts = allProducts.filter((p) => savedProductIds.has(p.id));

  // ── Subscription helpers ──────────────────────────────────────────────────
  const subStatus = computeSubscriptionStatus(currentSubscription);
  const subActive = isSubscriptionActive(currentSubscription);
  const subDaysLeft = daysUntilExpiry(currentSubscription);
  const subLimit = getProductLimit(currentSubscription);
  const plans = getSubscriptionPlans();
  const activePlan = plans.find(p => p.id === currentSubscription?.planId);

  // Sync state whenever currentUser updates or rehydrates
  useEffect(() => {
    if (currentUser?.avatar) {
      setAvatar(currentUser.avatar);
      setAvatarImgError(false);
    }
    if (currentUser?.coverImage) {
      setCoverImage(currentUser.coverImage);
    }
  }, [currentUser?.avatar, currentUser?.coverImage]);

  // Handle avatar image selection, validation, storage upload and database persistence
  const handleAvatarDeviceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be chosen again if needed
    e.target.value = '';
    setAvatarError(null);

    // 1. Validate image type
    const isImage = (file.type && file.type.startsWith('image/')) || (file.name && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file.name));
    if (!isImage) {
      setAvatarError('Please select a valid image file (JPG, PNG, WEBP, or GIF).');
      return;
    }

    // 2. Validate file size (max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setAvatarError(`Image size (${sizeMb} MB) exceeds the 5 MB limit. Please select a smaller photo.`);
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarImgError(false);

    try {
      // 3. Upload to Supabase Storage "avatars" bucket under {user_id}/profile.{ext}
      const targetUserId = currentUser?.id || currentUserId || 'farmer';
      const publicUrl = await uploadUserAvatar(file, targetUserId);

      // 4. Update local state immediately
      setAvatar(publicUrl);

      // 5. Persist avatar_url to farmer profile in Supabase database
      await onUpdateFarmerProfile({ avatar: publicUrl });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setAvatarError(err.message || 'Failed to upload photo to storage. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverDeviceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compResult = await compressImage(file, 'cover');
      if (compResult?.dataUrl) {
        setCoverImage(compResult.dataUrl);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setCoverImage(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfileCustomization = async () => {
    setSaving(true);
    setAvatarError(null);
    try {
      await onUpdateFarmerProfile({ avatar, coverImage });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save farmer profile:', err);
      setAvatarError('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  // Handle farmer confirming permanent deletion of an admin-recycled product
  const handleConfirmRecycledDeletion = async () => {
    if (!confirmDeleteRecycledProduct) return;
    setIsDeletingRecycled(true);
    try {
      await onDeleteProduct(confirmDeleteRecycledProduct.id);
      setConfirmDeleteRecycledProduct(null);
    } finally {
      setIsDeletingRecycled(false);
    }
  };

  return (
    <div className="dashboard-root">
      {/* Top Banner */}
      <section className="browse-header-banner">
        <div className="container">
          <div className="browse-header-content">
            {recycledProducts.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="badge badge-danger">
                  <AlertTriangle size={12} /> {recycledProducts.length} Listing{recycledProducts.length !== 1 ? 's' : ''} Removed by Admin
                </span>
              </div>
            )}
            <h1 className="browse-title">Farmer Dashboard</h1>
            <p className="browse-subtitle">
              Manage your published Benue agricultural listings, edit harvest prices &amp; quantities, monitor buyer inquiries, and publish new harvests.
            </p>
          </div>
        </div>
      </section>

      <div className="container dashboard-container">
        {/* FARMER PROFILE & COVER BACKGROUND BANNER CARD */}
        <div className="farmer-banner-preview-card">
          <img
            src={coverImage}
            alt="Cover background"
            className="farmer-banner-cover-bg"
          />
          <div className="farmer-banner-content-overlay">
            <div className="farmer-banner-profile-info">
              {/* Avatar Wrap with Camera Upload Trigger & Loading Overlay */}
              <div className="farmer-banner-avatar-wrap">
                {avatar && !avatarImgError ? (
                  <img
                    src={avatar}
                    alt={currentUser?.name || 'Farmer Avatar'}
                    className="farmer-banner-avatar-img"
                    onError={() => setAvatarImgError(true)}
                  />
                ) : (
                  <div className="farmer-banner-avatar-fallback">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User size={36} />}
                  </div>
                )}

                {isUploadingAvatar && (
                  <div className="avatar-loading-overlay">
                    <Loader2 size={22} className="animate-spin" />
                    <span style={{ fontSize: '9px', marginTop: '2px', fontWeight: 600 }}>Saving...</span>
                  </div>
                )}

                <button
                  type="button"
                  className="avatar-upload-trigger-badge"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Upload/Change profile photo"
                  aria-label="Upload/Change profile photo"
                  disabled={isUploadingAvatar}
                >
                  <Camera size={14} />
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarDeviceUpload}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="farmer-banner-text-details">
                <h2 className="farmer-banner-title">{currentUser?.name || 'Ter Farms & Agro Allied'}</h2>
                <div className="farmer-banner-subtitle">
                  <Badge variant="verified">Verified Producer</Badge>
                  <span className="farmer-banner-dot">&bull;</span>
                  <span className="farmer-banner-lga"><MapPin size={13} style={{ flexShrink: 0 }} /> <span>{currentUser?.lga || 'Ukum'}, Benue</span></span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={showEditor ? ChevronUp : Camera}
              onClick={() => setShowEditor(!showEditor)}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--color-slate-900)', border: 'none' }}
            >
              {showEditor ? 'Close Customizer' : 'Edit Avatar & Cover Photo'}
            </Button>
          </div>
        </div>

        {/* PROFILE PHOTO & COVER BACKGROUND CUSTOMIZER PANEL */}
        {showEditor && (
          <div className="farmer-editor-panel">
            <div className="farmer-editor-title-row">
              <div className="farmer-editor-heading">
                <Sparkles size={18} className="text-primary" />
                <span>Customize Profile Avatar &amp; Cover Background Photo</span>
              </div>
              {savedSuccess && (
                <Badge variant="success">
                  <CheckCircle2 size={13} /> Saved &amp; Applied!
                </Badge>
              )}
            </div>

            {avatarError && (
              <div className="alert alert-danger mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{avatarError}</span>
              </div>
            )}

            <div className="customization-section-grid">
              {/* Box 1: Farmer Avatar Customization */}
              <div className="customization-box">
                <div className="customization-box-title">
                  <User size={16} /> Farmer Avatar Photo
                </div>
                
                {/* Device Upload Option */}
                <div className="device-upload-btn-wrap">
                  <label
                    className={`file-upload-custom-label ${isUploadingAvatar ? 'opacity-70 cursor-not-allowed' : ''}`}
                    htmlFor="avatar-device-input"
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
                    id="avatar-device-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarDeviceUpload}
                    disabled={isUploadingAvatar}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Preset Avatars */}
                <span className="text-xs font-semibold text-slate-500 block mb-2">Or Choose Preset Avatar:</span>
                <div className="presets-grid-avatars">
                  {PRESET_AVATARS.map((av) => (
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

              {/* Box 2: Cover Background Photo Customization */}
              <div className="customization-box">
                <div className="customization-box-title">
                  <ImageIcon size={16} /> Cover Background Photo
                </div>

                {/* Device Upload Option */}
                <div className="device-upload-btn-wrap">
                  <label className="file-upload-custom-label" htmlFor="cover-device-input" style={{ backgroundColor: 'var(--color-slate-800)' }}>
                    <Upload size={14} /> Upload Device Cover Background
                  </label>
                  <input
                    id="cover-device-input"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverDeviceUpload}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Preset Covers */}
                <span className="text-xs font-semibold text-slate-500 block mb-2">Or Choose Preset Landscape Cover:</span>
                <div className="presets-grid-covers">
                  {PRESET_COVERS.map((cov) => (
                    <button
                      key={cov.id}
                      type="button"
                      onClick={() => setCoverImage(cov.url)}
                      className={`preset-cover-btn ${coverImage === cov.url ? 'selected' : ''}`}
                      title={cov.label}
                    >
                      <img src={cov.url} alt={cov.label} className="preset-cover-thumb" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save & Apply Action */}
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="primary"
                icon={CheckCircle2}
                onClick={handleSaveProfileCustomization}
                disabled={saving || isUploadingAvatar}
              >
                {saving ? 'Saving & Applying Changes...' : 'Save & Apply Profile & Cover Changes'}
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUBSCRIPTION STATUS BANNER                                        */}
        {/* ================================================================= */}

        {/* ── No subscription — urgent paywall prompt ── */}
        {subStatus === 'none' && (
          <div style={{
            background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#1a3a2a 100%)',
            borderRadius: '16px', padding: '28px', marginBottom: '28px',
            display: 'flex', alignItems: 'center', gap: '24px',
            flexWrap: 'wrap', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'120px', height:'120px', borderRadius:'50%', background:'rgba(22,163,74,0.15)' }} />
            <div style={{ position:'absolute', bottom:'-20px', left:'30%', width:'80px', height:'80px', borderRadius:'50%', background:'rgba(124,58,237,0.12)' }} />
            <div style={{
              width:'56px', height:'56px', borderRadius:'14px', flexShrink:0,
              background:'linear-gradient(135deg,#16a34a,#15803d)',
              display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1
            }}>
              <Lock size={26} color="#fff" />
            </div>
            <div style={{ flex:1, minWidth:'200px', position:'relative', zIndex:1 }}>
              <h3 style={{ margin:'0 0 6px', color:'#fff', fontSize:'1.15rem', fontWeight:'800', fontFamily:'var(--font-display)' }}>
                Subscribe to Advertise on Benue Market
              </h3>
              <p style={{ margin:0, color:'rgba(255,255,255,0.72)', fontSize:'13.5px', lineHeight:'1.55' }}>
                Choose a monthly plan to make your products visible to thousands of buyers across Benue State and beyond. Starting from just <strong style={{color:'#86efac'}}>₦2,000/month</strong>.
              </p>
            </div>
            <button
              onClick={onOpenSubscription}
              style={{
                padding:'12px 24px', borderRadius:'10px', border:'none',
                background:'linear-gradient(135deg,#16a34a,#15803d)',
                color:'#fff', fontSize:'14px', fontWeight:'700',
                cursor:'pointer', flexShrink:0, position:'relative', zIndex:1,
                display:'flex', alignItems:'center', gap:'8px',
                boxShadow:'0 4px 16px rgba(22,163,74,0.4)',
                transition:'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(22,163,74,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(22,163,74,0.4)'; }}
            >
              <Sparkles size={16} /> View Subscription Plans
            </button>
          </div>
        )}

        {/* ── Subscription expired ── */}
        {subStatus === 'expired' && (
          <div style={{
            background:'linear-gradient(135deg,#fef2f2,#fff1f2)',
            border:'1.5px solid #fecaca', borderRadius:'14px',
            padding:'20px 24px', marginBottom:'28px',
            display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap'
          }}>
            <div style={{
              width:'46px', height:'46px', borderRadius:'12px', flexShrink:0,
              background:'linear-gradient(135deg,#dc2626,#b91c1c)',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <AlertTriangle size={22} color="#fff" />
            </div>
            <div style={{ flex:1, minWidth:'200px' }}>
              <h3 style={{ margin:'0 0 4px', color:'#991b1b', fontSize:'1rem', fontWeight:'800' }}>
                Subscription Expired — Products Now Hidden
              </h3>
              <p style={{ margin:0, color:'#b91c1c', fontSize:'13px', lineHeight:'1.5' }}>
                Your <strong>{activePlan?.name || 'subscription'}</strong> plan has expired. All your products are currently hidden from the public storefront. Renew to restore visibility instantly.
              </p>
            </div>
            <button
              onClick={onOpenSubscription}
              style={{
                padding:'10px 20px', borderRadius:'10px', border:'none',
                background:'linear-gradient(135deg,#dc2626,#b91c1c)',
                color:'#fff', fontSize:'13.5px', fontWeight:'700',
                cursor:'pointer', flexShrink:0,
                display:'flex', alignItems:'center', gap:'6px'
              }}
            >
              <RefreshCw size={14} /> Renew Subscription
            </button>
          </div>
        )}

        {/* ── Expiring soon (within 3 days) ── */}
        {subStatus === 'expiring_soon' && (
          <div style={{
            background:'linear-gradient(135deg,#fffbeb,#fef9ee)',
            border:'1.5px solid #fde68a', borderRadius:'14px',
            padding:'20px 24px', marginBottom:'28px',
            display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap'
          }}>
            <div style={{
              width:'46px', height:'46px', borderRadius:'12px', flexShrink:0,
              background:'linear-gradient(135deg,#d97706,#b45309)',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <Clock size={22} color="#fff" />
            </div>
            <div style={{ flex:1, minWidth:'200px' }}>
              <h3 style={{ margin:'0 0 4px', color:'#92400e', fontSize:'1rem', fontWeight:'800' }}>
                ⚠️ Subscription Expiring in {subDaysLeft} Day{subDaysLeft !== 1 ? 's' : ''}
              </h3>
              <p style={{ margin:0, color:'#b45309', fontSize:'13px', lineHeight:'1.5' }}>
                Your <strong>{activePlan?.name || 'subscription'}</strong> plan expires soon. Renew now to ensure your products remain visible without interruption.
              </p>
            </div>
            <button
              onClick={onOpenSubscription}
              style={{
                padding:'10px 20px', borderRadius:'10px', border:'none',
                background:'linear-gradient(135deg,#d97706,#b45309)',
                color:'#fff', fontSize:'13.5px', fontWeight:'700',
                cursor:'pointer', flexShrink:0,
                display:'flex', alignItems:'center', gap:'6px'
              }}
            >
              <RefreshCw size={14} /> Renew Now
            </button>
          </div>
        )}

        {/* ── Active subscription status card ── */}
        {subActive && (
          <div style={{
            background:'linear-gradient(135deg,#f0fdf4,#ecfdf5)',
            border:'1.5px solid #bbf7d0', borderRadius:'14px',
            padding:'16px 20px', marginBottom:'28px',
            display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap'
          }}>
            <div style={{
              width:'40px', height:'40px', borderRadius:'10px', flexShrink:0,
              background:'linear-gradient(135deg,#16a34a,#15803d)',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div style={{ flex:1, minWidth:'200px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px', flexWrap:'wrap' }}>
                <span style={{ fontWeight:'800', color:'#166534', fontSize:'14px' }}>
                  {activePlan?.name || 'Active'} Plan — Active
                </span>
                <span style={{
                  padding:'2px 8px', borderRadius:'20px',
                  background:'#16a34a', color:'#fff', fontSize:'11px', fontWeight:'700'
                }}>
                  ✓ SUBSCRIBED
                </span>
              </div>
              <p style={{ margin:0, color:'#15803d', fontSize:'12.5px' }}>
                Up to <strong>{subLimit}</strong> product listings · Expires in <strong>{subDaysLeft} day{subDaysLeft !== 1 ? 's' : ''}</strong>
                &nbsp;·&nbsp;
                <button
                  onClick={onOpenSubscription}
                  style={{ background:'none', border:'none', color:'#15803d', fontWeight:'700', cursor:'pointer', fontSize:'12.5px', textDecoration:'underline', padding:0 }}
                >
                  Renew / Upgrade
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ADMIN REMOVAL NOTICES — Products moved to Recycle Bin by Admin */}
        {/* ================================================================= */}
        {recycledProducts.length > 0 && (
          <div className="farmer-recycled-section" style={{ marginBottom: '32px' }}>
            {/* Alert Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '16px 20px',
                marginBottom: '20px',
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: 'var(--radius-lg, 12px)',
                animation: 'fadeIn 0.3s ease'
              }}
            >
              <ShieldAlert size={26} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700', color: '#991b1b' }}>
                  Admin Removal Notice — {recycledProducts.length} Listing{recycledProducts.length !== 1 ? 's' : ''} Moved to Bin
                </h3>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#7f1d1d', lineHeight: '1.5' }}>
                  A marketplace administrator has moved the following produce listing{recycledProducts.length !== 1 ? 's' : ''} to the Recycle Bin.
                  {recycledProducts.length !== 1 ? ' These listings are' : ' This listing is'} no longer visible on the public storefront.
                  Please review and <strong>confirm deletion</strong> to permanently remove {recycledProducts.length !== 1 ? 'them' : 'it'} from the marketplace,
                  or contact the admin team if you believe this was done in error.
                </p>
              </div>
            </div>

            {/* Recycled Product Cards */}
            <div className="farmer-listings-list">
              {recycledProducts.map((prod) => {
                const recycledDate = prod.recycledAt ? new Date(prod.recycledAt) : null;
                const daysAgo = recycledDate
                  ? Math.max(0, Math.floor((Date.now() - recycledDate.getTime()) / (1000 * 60 * 60 * 24)))
                  : null;
                const daysRemaining = daysAgo !== null ? Math.max(0, 60 - daysAgo) : null;

                return (
                  <div
                    key={prod.id}
                    className="farmer-listing-row card"
                    style={{
                      borderLeft: '4px solid #dc2626',
                      opacity: 0.92,
                      backgroundColor: '#fefefe'
                    }}
                  >
                    <div className="listing-row-media">
                      <img
                        src={prod.image || (prod.images && prod.images[0])}
                        alt={prod.name}
                        className="listing-row-img"
                        style={{ filter: 'grayscale(0.4)' }}
                      />
                    </div>

                    <div className="listing-row-info">
                      <div className="flex items-center gap-2 listing-badge-row flex-wrap">
                        <Badge variant="category">{prod.category}</Badge>
                        <Badge variant="danger">
                          <Trash2 size={11} /> Removed by Admin
                        </Badge>
                        {daysRemaining !== null && (
                          <Badge variant={daysRemaining <= 7 ? 'danger' : 'warning'}>
                            <Clock size={11} /> {daysRemaining === 0 ? 'Auto-deletes today' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until auto-delete`}
                          </Badge>
                        )}
                      </div>
                      <h3 className="listing-row-title">{prod.name}</h3>
                      <p className="listing-row-meta">
                        <span className="price-tag">
                          {formatNaira(prod.price)} / {prod.unit}
                        </span>
                        <span> &bull; </span>
                        <span>{prod.quantity} {prod.unit}s</span>
                        <span> &bull; </span>
                        <span>{prod.lga || prod.location}</span>
                      </p>
                      {recycledDate && (
                        <p style={{ fontSize: '12px', color: 'var(--color-slate-500)', marginTop: '4px' }}>
                          <Clock size={11} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                          Moved to bin: {recycledDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {daysAgo !== null && ` (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`}
                        </p>
                      )}
                    </div>

                    <div className="listing-row-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Trash2}
                        onClick={() => setConfirmDeleteRecycledProduct(prod)}
                        style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                      >
                        Confirm Deletion
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metric Cards Row */}
        <div className="dashboard-metrics-grid">
          <div className="metric-card" onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer' }}>
            <div className="metric-icon-wrap" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)', border: '1px solid var(--border-brand)' }}>
              <Package size={20} />
            </div>
            <div>
              <span className="metric-label">Active Listings</span>
              <h3 className="metric-val">{activeProducts.length}</h3>
            </div>
          </div>

          <div className="metric-card" onClick={() => setStatusFilter('instock')} style={{ cursor: 'pointer' }}>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="metric-label">In Stock &amp; Live</span>
              <h3 className="metric-val">{activeProducts.filter(p => p.available !== false).length}</h3>
            </div>
          </div>

          <div className="metric-card" onClick={() => setStatusFilter('outofstock')} style={{ cursor: 'pointer' }}>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
              <Package size={20} />
            </div>
            <div>
              <span className="metric-label">Out of Stock</span>
              <h3 className="metric-val text-muted">{activeProducts.filter(p => p.available === false).length}</h3>
            </div>
          </div>

          {recycledProducts.length > 0 && (
            <div className="metric-card" style={{ cursor: 'default', borderColor: '#fecaca' }}>
              <div className="metric-icon-wrap" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                <Trash2 size={20} />
              </div>
              <div>
                <span className="metric-label">Removed by Admin</span>
                <h3 className="metric-val text-danger">{recycledProducts.length}</h3>
              </div>
            </div>
          )}

          <div
            className="metric-card"
            onClick={() => setDashboardTab(dashboardTab === 'saved' ? 'listings' : 'saved')}
            style={{
              cursor: 'pointer',
              border: dashboardTab === 'saved' ? '2px solid var(--color-primary-600)' : '1px solid var(--border-default)',
              backgroundColor: dashboardTab === 'saved' ? 'var(--color-primary-50, #f0fdf4)' : undefined
            }}
          >
            <div className="metric-icon-wrap" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
              <Bookmark size={20} />
            </div>
            <div>
              <span className="metric-label">Bookmarked Produce</span>
              <h3 className="metric-val">{savedProducts.length}</h3>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-default, #e2e8f0)',
          paddingBottom: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            className={`btn ${dashboardTab === 'listings' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setDashboardTab('listings')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Package size={15} /> My Farm Listings ({activeProducts.length})
          </button>
          <button
            type="button"
            className={`btn ${dashboardTab === 'saved' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setDashboardTab('saved')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Bookmark size={15} /> Bookmarked Produce ({savedProducts.length})
          </button>
        </div>

        {dashboardTab === 'saved' ? (
          <div className="farmer-saved-section animate-fade-in">
            <div className="section-title-wrap dashboard-sub-title">
              <div>
                <h2 className="dashboard-heading">Bookmarked Produce Listings</h2>
                <p className="dashboard-subheading">
                  All your saved Benue harvests and commodity listings. You can view specifications, contact sellers directly, or remove bookmarks at any time.
                </p>
              </div>
              <Button
                variant="outline"
                icon={ShoppingBag}
                onClick={() => onNavigate('browse')}
              >
                Browse More Produce
              </Button>
            </div>

            {savedProducts.length > 0 ? (
              <div className="grid-products" style={{ marginTop: '16px' }}>
                {savedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSaved={true}
                    onToggleSave={onToggleSave}
                    onViewDetails={onViewProduct}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state-card" style={{ marginTop: '16px' }}>
                <Bookmark size={40} className="empty-state-icon" style={{ color: 'var(--color-slate-400)' }} />
                <h3 className="empty-state-title">No Bookmarked Produce Yet</h3>
                <p className="empty-state-desc">
                  Browse fresh Benue harvests on the marketplace storefront and tap the heart icon to save listings here for quick access.
                </p>
                <Button
                  variant="primary"
                  icon={ShoppingBag}
                  onClick={() => onNavigate('browse')}
                >
                  Explore Marketplace
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Listings Header */}
            <div className="section-title-wrap dashboard-sub-title">
              <div>
                <h2 className="dashboard-heading">Your Agricultural Listings</h2>
                <p className="dashboard-subheading">
                  Manage your published Benue agricultural listings, edit harvest prices &amp; quantities, toggle stock availability, and publish new harvests.
                </p>
              </div>

              <Button
                variant="primary"
                icon={PlusCircle}
                onClick={() => onNavigate('sell')}
              >
                Add New Produce Listing
              </Button>
            </div>

        {/* Filter Pills for Status Tracking */}
        <div className="admin-filters-row flex items-center justify-between" style={{ marginBottom: '16px' }}>
          <div className="admin-filter-pills">
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Listings ({activeProducts.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'instock' ? 'active' : ''}`}
              onClick={() => setStatusFilter('instock')}
            >
              <CheckCircle2 size={14} /> In Stock ({activeProducts.filter(p => p.available !== false).length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'outofstock' ? 'active' : ''}`}
              onClick={() => setStatusFilter('outofstock')}
            >
              Out of Stock ({activeProducts.filter(p => p.available === false).length})
            </button>
            {activeProducts.some(p => p.status === 'pending') && (
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                <Clock size={14} /> Pending Review ({activeProducts.filter(p => p.status === 'pending').length})
              </button>
            )}
            {activeProducts.some(p => p.status === 'rejected') && (
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'rejected' ? 'active' : ''}`}
                onClick={() => setStatusFilter('rejected')}
              >
                <XCircle size={14} /> Rejected ({activeProducts.filter(p => p.status === 'rejected').length})
              </button>
            )}
          </div>
        </div>

        {/* Listings Table / Cards */}
        {activeProducts.filter(p => {
          if (statusFilter === 'all') return true;
          if (statusFilter === 'instock') return p.available !== false;
          if (statusFilter === 'outofstock') return p.available === false;
          return (p.status || 'approved') === statusFilter;
        }).length > 0 ? (
          <div className="farmer-listings-table-wrap">
            <div className="farmer-listings-list">
              {activeProducts
                .filter(p => {
                  if (statusFilter === 'all') return true;
                  if (statusFilter === 'instock') return p.available !== false;
                  if (statusFilter === 'outofstock') return p.available === false;
                  return (p.status || 'approved') === statusFilter;
                })
                .map((prod) => (
                <div key={prod.id} className="farmer-listing-row card">
                  <div className="listing-row-media">
                    <img
                      src={prod.image || (prod.images && prod.images[0])}
                      alt={prod.name}
                      className="listing-row-img"
                    />
                  </div>

                  <div className="listing-row-info">
                    <div className="flex items-center gap-2 listing-badge-row flex-wrap">
                      <Badge variant="category">{prod.category}</Badge>
                      
                      {/* Approval Status Badge */}
                      {prod.status === 'pending' && (
                        <Badge variant="warning" title="Marketplace admins are reviewing your harvest details">
                          <Clock size={11} /> Pending Admin Review
                        </Badge>
                      )}
                      {(prod.status === 'approved' || !prod.status) && (
                        <Badge variant="success">
                          <CheckCircle2 size={11} /> Approved &amp; Live
                        </Badge>
                      )}
                      {prod.status === 'rejected' && (
                        <Badge variant="danger" title={prod.statusNote || 'Listing was not approved'}>
                          <XCircle size={11} /> Rejected
                        </Badge>
                      )}

                      {prod.available ? (
                        <Badge variant="success">In Stock</Badge>
                      ) : (
                        <Badge variant="danger">Sold Out</Badge>
                      )}
                    </div>
                    <h3 className="listing-row-title">{prod.name}</h3>
                    
                    {prod.status === 'rejected' && prod.statusNote && (
                      <div className="farmer-rejection-alert">
                        <AlertTriangle size={13} className="text-danger" />
                        <span>Admin feedback: <strong>{prod.statusNote}</strong></span>
                      </div>
                    )}

                    <p className="listing-row-meta">
                      <span className="price-tag">
                        {formatNaira(prod.price)} / {prod.unit}
                      </span>
                      <span> &bull; </span>
                      <span>{prod.quantity} {prod.unit}s available</span>
                      <span> &bull; </span>
                      <span>{prod.lga || prod.location}</span>
                    </p>
                  </div>

                  <div className="listing-row-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Pencil}
                      onClick={() => setEditingProduct(prod)}
                      title="Edit produce details"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewProduct(prod)}
                    >
                      View Live
                    </Button>
                    <Button
                      variant={prod.available ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => onToggleStock(prod.id)}
                    >
                      {prod.available ? 'Mark Sold' : 'Mark Available'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDeleteModalProduct(prod)}
                      className="btn btn-ghost btn-sm btn-delete-row"
                      title="Permanently delete listing"
                      aria-label={`Delete ${prod.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state-card">
            <Package size={40} className="empty-state-icon" />
            <h3 className="empty-state-title">
              {statusFilter === 'pending'
                ? 'No listings pending review'
                : statusFilter === 'approved'
                ? 'No active approved listings'
                : statusFilter === 'rejected'
                ? 'No rejected listings'
                : 'No listings published yet'}
            </h3>
            <p className="empty-state-desc">
              {statusFilter === 'pending'
                ? 'All your submitted produce listings have been processed by the Admin team.'
                : statusFilter === 'approved'
                ? 'Submit a harvest to have it reviewed and approved for the marketplace storefront.'
                : 'List your harvest of Yam, Rice, Soybeans, or Livestock to start connecting with buyers nationwide.'}
            </p>
            <Button
              variant="primary"
              icon={PlusCircle}
              onClick={() => onNavigate('sell')}
            >
              List Produce Now
            </Button>
          </div>
        )}
          </div>
        )}
      </div>

      {/* Edit Produce Modal */}
      {editingProduct && (
        <EditProductModal
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          product={editingProduct}
          currentUserId={currentUserId}
          onSave={onUpdateProduct}
        />
      )}

      {/* Permanent Deletion Confirmation Modal (Farmer self-delete) */}
      {deleteModalProduct && (
        <Modal
          isOpen={Boolean(deleteModalProduct)}
          onClose={() => {
            if (!isDeleting) setDeleteModalProduct(null);
          }}
          title="Permanently Delete Produce Listing"
        >
          <div style={{ padding: '4px 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                marginBottom: '18px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md, 8px)',
                color: '#991b1b'
              }}
            >
              <AlertTriangle size={22} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '3px' }}>
                  Permanent Action Warning
                </strong>
                <span style={{ fontSize: '13px', lineHeight: '1.45', color: '#7f1d1d' }}>
                  Are you sure you want to permanently delete <strong>&ldquo;{deleteModalProduct.name}&rdquo;</strong>?
                  This will immediately remove the listing from both your dashboard and the public marketplace storefront across all devices. This action cannot be undone.
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-muted, #f8fafc)',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                marginBottom: '20px'
              }}
            >
              <img
                src={deleteModalProduct.image || (deleteModalProduct.images && deleteModalProduct.images[0]) || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=120&q=80'}
                alt={deleteModalProduct.name}
                style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px' }}
              />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: '700', color: 'var(--color-slate-900)' }}>
                  {deleteModalProduct.name}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-slate-600)' }}>
                  {formatNaira(deleteModalProduct.price)} / {deleteModalProduct.unit} &bull; {deleteModalProduct.lga || deleteModalProduct.location}
                </p>
              </div>
            </div>

            <div className="modal-actions flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteModalProduct(null)}
                disabled={isDeleting}
              >
                Cancel, Keep Produce
              </Button>
              <Button
                variant="primary"
                icon={isDeleting ? Loader2 : Trash2}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteProduct(deleteModalProduct.id);
                    setDeleteModalProduct(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Farmer Confirm Deletion of Admin-Recycled Product Modal */}
      {confirmDeleteRecycledProduct && (
        <Modal
          isOpen={Boolean(confirmDeleteRecycledProduct)}
          onClose={() => {
            if (!isDeletingRecycled) setConfirmDeleteRecycledProduct(null);
          }}
          title="Confirm Product Deletion"
          maxWidth="500px"
        >
          <div style={{ padding: '4px 0' }}>
            {/* Admin context info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md, 8px)',
                color: '#991b1b'
              }}
            >
              <ShieldAlert size={22} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Admin Removal — Confirm Permanent Deletion
                </strong>
                <span style={{ fontSize: '13px', lineHeight: '1.5', color: '#7f1d1d' }}>
                  A marketplace administrator has removed <strong>&ldquo;{confirmDeleteRecycledProduct.name}&rdquo;</strong> from
                  the public storefront. By confirming deletion, this produce listing will be <strong>permanently removed</strong> from
                  the marketplace database, your dashboard, and all buyer-facing pages. This cannot be undone.
                </span>
              </div>
            </div>

            {/* Product preview card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-muted, #f8fafc)',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                marginBottom: '16px'
              }}
            >
              <img
                src={confirmDeleteRecycledProduct.image || (confirmDeleteRecycledProduct.images && confirmDeleteRecycledProduct.images[0]) || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=120&q=80'}
                alt={confirmDeleteRecycledProduct.name}
                style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', filter: 'grayscale(0.3)' }}
              />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: '700', color: 'var(--color-slate-900)' }}>
                  {confirmDeleteRecycledProduct.name}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-slate-600)' }}>
                  {formatNaira(confirmDeleteRecycledProduct.price)} / {confirmDeleteRecycledProduct.unit} &bull; {confirmDeleteRecycledProduct.lga || confirmDeleteRecycledProduct.location}
                </p>
              </div>
            </div>

            {/* Info note */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 14px',
                marginBottom: '20px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-md, 8px)',
                color: '#1e40af',
                fontSize: '12.5px',
                lineHeight: '1.45'
              }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                If you believe this removal was done in error, please contact the admin team before confirming. You can also
                choose to republish a new listing from the <strong>Sell Produce</strong> page.
              </span>
            </div>

            <div className="modal-actions-footer flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteRecycledProduct(null)}
                disabled={isDeletingRecycled}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={isDeletingRecycled ? Loader2 : Trash2}
                onClick={handleConfirmRecycledDeletion}
                disabled={isDeletingRecycled}
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              >
                {isDeletingRecycled ? 'Deleting Permanently...' : 'Yes, Confirm Deletion'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

