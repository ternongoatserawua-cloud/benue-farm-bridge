import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Sparkles,
  Eye,
  AlertCircle,
  Upload,
  CheckCircle2,
  Lock,
  ShoppingBag,
  Sprout,
  ArrowRight,
  ShieldCheck,
  MapPin,
  MessageSquare,
  Phone,
  Layers,
  X
} from 'lucide-react';
import ProductCard from '../components/marketplace/ProductCard.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import { BENUE_LGAS } from '../data/locations.js';
import { CATEGORIES } from '../data/categories.js';
import { uploadProduceImage } from '../services/productsService.js';
import ImageUploadPicker from '../components/common/ImageUploadPicker.jsx';
import { compressImage } from '../utils/imageCompressor.js';
import { formatNaira } from '../utils/formatters.js';
import { isSubscriptionActive, computeSubscriptionStatus, getSubscriptionPlans, daysUntilExpiry } from '../services/subscriptionService.js';

// Preset sample agricultural images for fast demo creation
const SAMPLE_IMAGES = [
  { label: 'Yams', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Soybeans/Grains', url: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=800&q=80' },
  { label: 'Rice', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80' },
  { label: 'Peppers/Veg', url: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Groundnuts', url: 'https://images.unsplash.com/photo-1567892308967-5f7823528b1e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Citrus/Fruits', url: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=800&q=80' },
  { label: 'Livestock/Goat', url: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=800&q=80' }
];

// Alphabetically sorted selling units with 'other' as the last option
export const SELLING_UNITS = [
  { value: '50kg', label: '50kg' },
  { value: '100kg', label: '100kg' },
  { value: 'bag', label: 'Bag' },
  { value: 'basin', label: 'Basin' },
  { value: 'basket', label: 'Basket' },
  { value: 'bird', label: 'Bird' },
  { value: 'bowl', label: 'Bowl' },
  { value: 'bunch', label: 'Bunch' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'crate', label: 'Crate' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'gram(g)', label: 'Gram (g)' },
  { value: 'head', label: 'Head' },
  { value: 'heap', label: 'Heap' },
  { value: 'kilogram(kg)', label: 'Kilogram (kg)' },
  { value: 'liter(L)', label: 'Liter (L)' },
  { value: 'load', label: 'Load' },
  { value: 'milliLiter', label: 'MilliLiter (mL)' },
  { value: 'mudu', label: 'Mudu' },
  { value: 'pair', label: 'Pair' },
  { value: 'piece', label: 'Piece' },
  { value: 'set', label: 'Set' },
  { value: 'tonne(t)', label: 'Tonne (t)' },
  { value: 'truckload', label: 'Truckload' },
  { value: 'tuber', label: 'tuber' },
  { value: 'other', label: 'Other' }
];

export default function SellProducePage({
  currentUser = null,
  currentSubscription = null,
  onPublishProduct = () => {},
  onNavigate = () => {},
  onOpenAuth = () => {},
  onUpgradeToSeller = () => {},
  onOpenFarmerOnboarding = () => {},
  onOpenSubscription = () => {}
}) {
  const getValidPhone = (val) => {
    if (!val || typeof val !== 'string' || val.includes('@')) return '';
    return val;
  };

  const initialPhone = getValidPhone(currentUser?.phone);
  const initialWhatsapp = initialPhone
    ? (initialPhone.startsWith('234') ? initialPhone : `234${initialPhone.replace(/^0+/, '')}`)
    : '';

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    unit: '',
    customUnit: '',
    quantity: '',
    minimumOrder: '',
    lga: currentUser?.lga || 'Ukum',
    location: '',
    seller: '',
    phone: initialPhone,
    whatsapp: initialWhatsapp,
    image: '',
    description: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Interactive Live Preview State
  const [previewTab, setPreviewTab] = useState('card'); // 'card' | 'details'
  const [previewActiveImgIndex, setPreviewActiveImgIndex] = useState(0);
  const [mobilePreviewModalOpen, setMobilePreviewModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const validPhone = getValidPhone(currentUser.phone);
      setFormData((prev) => {
        const cleanPrevPhone = getValidPhone(prev.phone);
        const cleanPrevWhatsapp = getValidPhone(prev.whatsapp);
        return {
          ...prev,
          phone: validPhone || cleanPrevPhone,
          lga: currentUser.lga || prev.lga,
          whatsapp: validPhone
            ? (validPhone.startsWith('234') ? validPhone : `234${validPhone.replace(/^0+/, '')}`)
            : cleanPrevWhatsapp
        };
      });
    }
  }, [currentUser]);

  // Check role authorization
  const isFarmer = currentUser && (currentUser.role === 'seller' || currentUser.role === 'farmer');
  const isBuyer = currentUser && currentUser.role === 'buyer';

  // State 1: Unauthenticated User Gate
  if (!currentUser) {
    return (
      <div className="sell-page-root">
        <section className="browse-header-banner">
          <div className="container">
            <div className="browse-header-content">
              <span className="badge badge-accent">
                <Lock size={14} /> Farmer Authentication Required
              </span>
              <h1 className="browse-title">List Your Agricultural Produce</h1>
              <p className="browse-subtitle">
                Only registered farmers and agricultural producers in Benue State can list harvests. Vendors and buyers can browse all listings and contact farmers directly.
              </p>
            </div>
          </div>
        </section>

        <div className="container section" style={{ paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', boxSizing: 'border-box' }}>
          <div className="card" style={{
            maxWidth: '560px',
            width: '100%',
            boxSizing: 'border-box',
            margin: '0 auto',
            padding: '32px 18px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-50)',
              color: 'var(--color-primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              border: '1px solid var(--border-brand)'
            }}>
              <Sprout size={32} />
            </div>

            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              fontWeight: '800',
              color: 'var(--color-slate-900)',
              marginBottom: '10px'
            }}>
              Farmer Sign In or Registration Required
            </h2>

            <p style={{
              fontSize: '0.925rem',
              color: 'var(--color-slate-600)',
              lineHeight: '1.6',
              marginBottom: '28px'
            }}>
              Are you an agricultural producer in Benue State? Create a free Farmer account to publish your yams, grains, fruits, vegetables, or livestock and connect directly with buyers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                icon={Sprout}
                onClick={() => onOpenAuth('register', 'seller')}
              >
                Register as a Benue Farmer
              </Button>

              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                onClick={() => onOpenAuth('login')}
              >
                Farmer Sign In
              </Button>

              <button
                type="button"
                className="btn btn-ghost btn-sm mt-2"
                onClick={() => onNavigate('browse')}
              >
                <ShoppingBag size={15} /> Continue as Vendor / Browse Market
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State 2b: Farmer with NO active subscription — show paywall
  const subStatus = computeSubscriptionStatus(currentSubscription);
  const subActive = isSubscriptionActive(currentSubscription);
  const plans = getSubscriptionPlans();

  if (isFarmer && !subActive) {
    return (
      <div className="sell-page-root">
        <section className="browse-header-banner">
          <div className="container">
            <div className="browse-header-content">
              <span className="badge badge-accent">
                <Lock size={14} /> Subscription Required
              </span>
              <h1 className="browse-title">List Your Agricultural Produce</h1>
              <p className="browse-subtitle">
                A monthly subscription is required to publish and advertise produce listings on Benue Market.
              </p>
            </div>
          </div>
        </section>

        <div className="container section" style={{ paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', boxSizing: 'border-box' }}>
          {/* Expired banner */}
          {subStatus === 'expired' && (
            <div style={{
              maxWidth: '640px', margin: '0 auto 20px',
              padding: '14px 18px', borderRadius: '12px',
              background: '#fef2f2', border: '1.5px solid #fecaca',
              display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '13.5px', color: '#991b1b', fontWeight: '600'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              Your subscription has expired. Your products are currently hidden from buyers. Renew to restore visibility.
            </div>
          )}

          {/* Plan cards */}
          <div style={{ maxWidth: '640px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '16px', marginBottom: '20px' }}>
            {plans.map(plan => (
              <div
                key={plan.id}
                style={{
                  borderRadius: '16px', overflow: 'hidden',
                  border: '2px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
              >
                <div style={{
                  background: plan.id === 'growth' ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'linear-gradient(135deg,#16a34a,#15803d)',
                  padding: '20px'
                }}>
                  <div style={{ color: '#fff' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>{plan.name} Plan</div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', fontFamily: 'var(--font-display)' }}>
                      {formatNaira(plan.price)}<span style={{ fontSize: '13px', fontWeight: '500', opacity: 0.8 }}>/month</span>
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>Up to {plan.maxProducts} product listings</div>
                  </div>
                </div>
                <div style={{ padding: '16px 20px', background: '#fff' }}>
                  <ul style={{ listStyle: 'none', margin: '0 0 14px', padding: 0 }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#475569', marginBottom: '6px' }}>
                        <CheckCircle2 size={13} style={{ flexShrink: 0, marginTop: '2px', color: plan.id === 'growth' ? '#7c3aed' : '#16a34a' }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant="primary" fullWidth onClick={() => onOpenSubscription(plan)} icon={ShieldCheck}>
                    {subStatus === 'expired' ? 'Renew Subscription' : 'Subscribe Now'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-slate-400)', maxWidth: '400px', margin: '0 auto' }}>
            Payments secured by Paystack · Instant activation after payment
          </p>
        </div>
      </div>
    );
  }

  // State 2: Buyer — Seller Onboarding Prompt
  if (isBuyer) {
    return (
      <div className="sell-page-root">
        <section className="browse-header-banner">
          <div className="container">
            <div className="browse-header-content">
              <span className="badge badge-accent">
                <Sprout size={14} /> Seller Onboarding
              </span>
              <h1 className="browse-title">Become a Seller on Benue Farm Bridge</h1>
              <p className="browse-subtitle">
                You're currently using a Buyer account. Activate your Farmer/Seller profile to start listing and selling your agricultural produce.
              </p>
            </div>
          </div>
        </section>

        <div className="container section" style={{ paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', boxSizing: 'border-box' }}>
          <div className="card" style={{
            maxWidth: '580px',
            width: '100%',
            boxSizing: 'border-box',
            margin: '0 auto',
            padding: '32px 18px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-50)',
              color: 'var(--color-primary-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              border: '1px solid var(--border-brand)'
            }}>
              <Sprout size={30} />
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              backgroundColor: 'var(--color-slate-100)',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--color-slate-700)',
              marginBottom: '12px'
            }}>
              Signed In as Buyer ({currentUser.name})
            </div>

            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.35rem',
              fontWeight: '800',
              color: 'var(--color-slate-900)',
              marginBottom: '10px'
            }}>
              Ready to Sell Your Farm Produce?
            </h2>

            <p style={{
              fontSize: '0.925rem',
              color: 'var(--color-slate-600)',
              lineHeight: '1.6',
              marginBottom: '20px'
            }}>
              To sell your farm produce on <strong>Benue Farm Bridge</strong>, you need to activate a Farmer/Seller profile. Your existing Buyer capabilities (browsing, bookmarks, contacting farmers) will be preserved.
            </p>

            <div style={{
              backgroundColor: 'var(--color-primary-50, #f0fdf4)',
              border: '1px solid var(--border-brand, #bbf7d0)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              textAlign: 'left',
              marginBottom: '24px',
              fontSize: '13px',
              color: 'var(--color-slate-700)'
            }}>
              <div style={{ fontWeight: '700', color: 'var(--color-primary-900)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="var(--color-primary-700)" /> As a Farmer/Seller, you can:
              </div>
              <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                <li>List and manage your agricultural produce</li>
                <li>Receive direct buyer inquiries via Phone &amp; WhatsApp</li>
                <li>Access the Farmer Dashboard with listings analytics</li>
                <li>Continue browsing and bookmarking as a buyer</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                icon={Sprout}
                onClick={() => {
                  if (typeof onOpenFarmerOnboarding === 'function') {
                    onOpenFarmerOnboarding();
                  } else {
                    onUpgradeToSeller();
                  }
                }}
              >
                Fill Farmer Profile &amp; Become a Seller
              </Button>

              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                icon={ShoppingBag}
                onClick={() => onNavigate('browse')}
              >
                Continue Browsing as Buyer
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Farmer / Producer Authorized Form
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSelectSampleImg = (url) => {
    setSelectedFile(null);
    setFormData((prev) => ({ ...prev, image: url }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Auto-compress image to minimum capacity
      const compResult = await compressImage(file, 'produce');
      const optimizedUrl = compResult?.dataUrl || URL.createObjectURL(file);
      const optimizedFile = compResult?.file || file;

      setFormData((prev) => ({ ...prev, image: optimizedUrl }));
      setSelectedFile(optimizedFile);

      // If user is authenticated, upload to Supabase Storage in background
      if (currentUser?.id) {
        setUploadingImage(true);
        const publicUrl = await uploadProduceImage(optimizedFile, currentUser.id);
        setUploadingImage(false);
        if (publicUrl) {
          setFormData((prev) => ({ ...prev, image: publicUrl }));
        }
      }
    } catch (err) {
      console.warn('Image auto-compression error in SellProducePage:', err);
      const localUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, image: localUrl }));
      setSelectedFile(file);
    }
  };

  // Check if all form inputs including 1 product photo are filled
  const effectiveUnit = formData.unit === 'other'
    ? (formData.customUnit ? String(formData.customUnit).trim() : '')
    : (formData.unit ? String(formData.unit).trim() : '');

  const isFormValid =
    Boolean(formData.name && String(formData.name).trim() !== '') &&
    Boolean(formData.category && String(formData.category).trim() !== '') &&
    Boolean(effectiveUnit !== '') &&
    Boolean(formData.price !== '' && formData.price !== null && Number(formData.price) > 0) &&
    Boolean(formData.quantity !== '' && formData.quantity !== null && Number(formData.quantity) > 0) &&
    Boolean(formData.minimumOrder !== '' && formData.minimumOrder !== null && Number(formData.minimumOrder) > 0) &&
    Boolean(formData.lga && String(formData.lga).trim() !== '') &&
    Boolean(formData.location && String(formData.location).trim() !== '') &&
    Boolean(formData.description && String(formData.description).trim() !== '') &&
    Boolean(formData.seller && String(formData.seller).trim() !== '') &&
    Boolean(formData.phone && String(formData.phone).trim() !== '') &&
    Boolean(formData.whatsapp && String(formData.whatsapp).trim() !== '') &&
    Boolean(formData.image && String(formData.image).trim() !== '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setErrorMsg('Please complete all required fields and upload 1 product photo before publishing.');
      return;
    }

    setLoading(true);

    const img = formData.image.trim() || SAMPLE_IMAGES[0].url;

    const unitToPublish = formData.unit === 'other'
      ? (formData.customUnit?.trim() || 'Other')
      : (formData.unit ? formData.unit.trim() : 'bag');

    const newProduct = {
      name: formData.name.trim(),
      category: formData.category,
      price: Number(formData.price),
      unit: unitToPublish,
      quantity: Number(formData.quantity || 1),
      minimumOrder: Number(formData.minimumOrder || 1),
      location: formData.location.trim() || `${formData.lga}, Benue`,
      lga: formData.lga,
      seller: formData.seller.trim() || currentUser?.name || 'Benue Farmer',
      sellerId: currentUser?.id || '',
      sellerAvatar: currentUser?.avatar || null,
      sellerCover: currentUser?.coverImage || null,
      phone: formData.phone.trim(),
      whatsapp: formData.whatsapp.trim() || formData.phone.trim(),
      image: img,
      images: [img],
      available: true,
      description: formData.description.trim() || 'Fresh agricultural produce from Benue State.'
    };

    await onPublishProduct(newProduct);
    setLoading(false);
  };

  const previewUnit = formData.unit === 'other'
    ? (formData.customUnit?.trim() || 'Other')
    : (formData.unit || 'bag');

  const previewProduct = {
    id: 'preview-temp',
    name: formData.name || 'Your Produce Name',
    category: formData.category || 'tubers',
    price: Number(formData.price) || 0,
    unit: previewUnit,
    quantity: Number(formData.quantity) || 1,
    minimumOrder: Number(formData.minimumOrder) || 1,
    location: formData.location || `${formData.lga || 'Benue'}, Benue`,
    lga: formData.lga || 'Ukum',
    seller: formData.seller || 'Your Farm Name',
    image: formData.image || '',
    images: formData.image ? [formData.image] : [],
    available: true,
    phone: formData.phone || '+234 902 264 2177',
    whatsapp: formData.whatsapp || '+234 902 264 2177',
    description: formData.description || 'Crop description, quality specs, harvest details, and packaging info will appear here.'
  };

  return (
    <div className="sell-page-root">
      {/* Header Banner */}
      <section className="browse-header-banner">
        <div className="container">
          <div className="browse-header-content">
            <span className="badge badge-accent">
              <Sparkles size={14} /> Verified Benue Farmer Listing
            </span>
            <h1 className="browse-title">List Your Agricultural Produce</h1>
            <p className="browse-subtitle">
              Connect directly with buyers across Benue State and nationwide. Fill out the form below to publish your harvest in minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Main Form + Live Preview Grid */}
      <div className="container sell-content-layout">
        <div className="sell-grid-layout">
          {/* Left Column: Form */}
          <div className="sell-form-card">
            <h2 className="sell-form-title">Produce Listing Details</h2>
            <p className="sell-form-subtitle">
              Enter clear information so buyers can understand your crop quantity, location, and price. All fields are required.
            </p>

            {errorMsg && (
              <div className="toast-item toast-error form-alert-box">
                <div className="toast-content">
                  <AlertCircle size={18} className="toast-icon-error" />
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <fieldset disabled={loading} style={{ border: 'none', padding: 0, margin: 0, minInlineSize: 0 }}>
                {/* Product Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="name">
                    Produce Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    disabled={loading}
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Fresh Zaki Biam Yam, Cleaned Soybeans, Makurdi Rice"
                    className="form-input"
                  />
                </div>

                {/* Category & Unit in 2-column */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="category">
                      Agricultural Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      required
                      disabled={loading}
                      value={formData.category}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="" disabled hidden>
                        -- Select Agricultural Category --
                      </option>
                      {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                        <option key={cat.id} value={cat.id} title={`Category: ${cat.name} (${cat.id})`}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="unit">
                      Selling Unit *
                    </label>
                    <select
                      id="unit"
                      name="unit"
                      required
                      disabled={loading}
                      value={formData.unit}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="" disabled hidden>
                        -- Select Selling Unit --
                      </option>
                      {SELLING_UNITS.map((u) => (
                        <option key={u.value} value={u.value} title={`Selling Unit: ${u.label} (${u.value})`}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.unit === 'other' && (
                    <div className="form-group animate-fade-in">
                      <label className="form-label" htmlFor="customUnit">
                        Specify Custom Unit *
                      </label>
                      <input
                        id="customUnit"
                        name="customUnit"
                        type="text"
                        required
                        disabled={loading}
                        value={formData.customUnit || ''}
                        onChange={handleChange}
                        placeholder="e.g. 50kg sac, heap, measure"
                        className="form-input"
                      />
                    </div>
                  )}
                </div>

                {/* Price & Quantity in 2-column */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="price">
                      Price in Naira (₦) per unit *
                    </label>
                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="1"
                      required
                      disabled={loading}
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="e.g. 2500"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="quantity">
                      Quantity Available *
                    </label>
                    <input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="1"
                      required
                      disabled={loading}
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="e.g. 500"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Minimum Order & LGA */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="minimumOrder">
                      Minimum Order Quantity *
                    </label>
                    <input
                      id="minimumOrder"
                      name="minimumOrder"
                      type="number"
                      min="1"
                      required
                      disabled={loading}
                      value={formData.minimumOrder}
                      onChange={handleChange}
                      placeholder="e.g. 5"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="lga">
                      Benue State LGA *
                    </label>
                    <select
                      id="lga"
                      name="lga"
                      required
                      disabled={loading}
                      value={formData.lga}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="" disabled hidden>
                        -- Select Benue State LGA --
                      </option>
                      {BENUE_LGAS.filter(l => l.id !== 'all').map((lga) => (
                        <option key={lga.id} value={lga.name} title={`LGA: ${lga.name} (${lga.id})`}>
                          {lga.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location Community */}
                <div className="form-group">
                  <label className="form-label" htmlFor="location">
                    Community / Farm / Market Axis *
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    required
                    disabled={loading}
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. International Yam Market, Zaki Biam"
                    className="form-input"
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label" htmlFor="description">
                    Harvest Description &amp; Quality *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    required
                    disabled={loading}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe crop freshness, grade, moisture, harvest date, and packaging details..."
                    className="form-textarea"
                  />
                </div>

                {/* Farmer Contact Info */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="seller">
                      Farmer / Farm Name *
                    </label>
                    <input
                      id="seller"
                      name="seller"
                      type="text"
                      required
                      disabled={loading}
                      value={formData.seller}
                      onChange={handleChange}
                      placeholder="e.g. Ter Farms & Agro Allied"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="phone">
                      Phone Number (Direct Calls) *
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="tel"
                      required
                      disabled={loading}
                      value={formData.phone}
                      onChange={(e) => {
                        const numericVal = e.target.value.replace(/\D/g, '');
                        setFormData((prev) => ({ ...prev, phone: numericVal }));
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="+234 902 264 2177"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* WhatsApp Number */}
                <div className="form-group">
                  <label className="form-label" htmlFor="whatsapp">
                    WhatsApp Number (For Direct WhatsApp Chat) *
                  </label>
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel"
                    required
                    disabled={loading}
                    value={formData.whatsapp}
                    onChange={(e) => {
                      const numericVal = e.target.value.replace(/\D/g, '');
                      setFormData((prev) => ({ ...prev, whatsapp: numericVal }));
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="+234 902 264 2177"
                    className="form-input"
                  />
                </div>

                {/* Single Produce Photo Upload */}
                <ImageUploadPicker
                  value={formData.image}
                  onChange={(imgUrl) => {
                    setFormData((prev) => ({
                      ...prev,
                      image: imgUrl || ''
                    }));
                    if (errorMsg) setErrorMsg('');
                  }}
                  userId={currentUser?.id}
                  label="Produce Image (1 Photo Only)"
                  disabled={loading}
                />

                {/* Mobile Quick Preview Trigger Button */}
                <div className="mobile-only" style={{ marginBottom: '16px' }}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setMobilePreviewModalOpen(true)}
                    className="btn btn-outline btn-block"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderColor: 'var(--color-primary-700)', color: 'var(--color-primary-800)', fontWeight: '700' }}
                  >
                    <Eye size={18} />
                    <span>📱 Tap to Preview How Listing Appears</span>
                  </button>
                </div>

                {/* Submit Button */}
                <div className="sell-submit-wrap">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    disabled={!isFormValid || loading}
                    icon={PlusCircle}
                  >
                    {loading ? 'Publishing Produce Listing...' : 'Publish Produce Listing'}
                  </Button>

                  {!isFormValid ? (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--color-slate-500)',
                      textAlign: 'center',
                      marginTop: '8px'
                    }}>
                      * Complete all required fields above and upload 1 produce photo to publish
                    </p>
                  ) : (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--color-primary-700)',
                      textAlign: 'center',
                      marginTop: '8px',
                      fontWeight: '500'
                    }}>
                      ✓ Your produce listing will be immediately published and live on the marketplace storefront
                    </p>
                  )}
                </div>
              </fieldset>
            </form>
          </div>

          {/* Right Column: Live Sticky Responsive Preview */}
          <div className="sell-preview-column">
            <div className="sell-preview-sticky">
              <div className="preview-header flex items-center justify-between" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={18} color="var(--color-primary-700)" />
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Live Listing Preview</h3>
                </div>
                <Badge variant="accent">Realtime</Badge>
              </div>

              <p className="preview-caption" style={{ fontSize: '12px', color: 'var(--color-slate-600)', marginBottom: '14px' }}>
                Switch modes below to see how your harvest appears on marketplace cards vs. details page.
              </p>

              {/* Live Preview Mode Switcher */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4px',
                backgroundColor: 'var(--color-slate-100)',
                padding: '3px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px'
              }}>
                <button
                  type="button"
                  onClick={() => setPreviewTab('card')}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: previewTab === 'card' ? '700' : '600',
                    backgroundColor: previewTab === 'card' ? '#ffffff' : 'transparent',
                    color: previewTab === 'card' ? 'var(--color-primary-800)' : 'var(--color-slate-700)',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <Layers size={13} />
                  <span>Card View</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('details')}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: previewTab === 'details' ? '700' : '600',
                    backgroundColor: previewTab === 'details' ? '#ffffff' : 'transparent',
                    color: previewTab === 'details' ? 'var(--color-primary-800)' : 'var(--color-slate-700)',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <Eye size={13} />
                  <span>Details View</span>
                </button>
              </div>

              {/* Preview Content */}
              {previewTab === 'card' ? (
                <div className="preview-card-wrap">
                  <ProductCard
                    product={previewProduct}
                    isSaved={false}
                    onToggleSave={() => {}}
                    onViewDetails={() => setPreviewTab('details')}
                  />
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-slate-500)' }}>
                      📷 Live Preview on Marketplace Produce Cards
                    </span>
                  </div>
                </div>
              ) : (
                /* Details View Preview Frame */
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {/* Main Gallery Image */}
                  <div style={{
                    position: 'relative',
                    height: '180px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    backgroundColor: 'var(--color-slate-100)',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed var(--border-default)'
                  }}>
                    {previewProduct.image ? (
                      <img
                        src={previewProduct.image}
                        alt="Details Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--color-slate-500)', padding: '12px' }}>
                        <Upload size={28} style={{ margin: '0 auto 6px auto', opacity: 0.6 }} />
                        <div style={{ fontSize: '12px', fontWeight: '700' }}>No Produce Photo Uploaded</div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>Upload 1 photo to preview</div>
                      </div>
                    )}
                  </div>

                  {/* Produce Details Summary */}
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--color-slate-900)', margin: '0 0 4px 0' }}>
                    {previewProduct.name}
                  </h4>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-primary-800)', marginBottom: '6px' }}>
                    {formatNaira(previewProduct.price)} <span style={{ fontSize: '12px', color: 'var(--color-slate-600)', fontWeight: 'normal' }}>/ {previewProduct.unit}</span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-slate-600)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
                    <MapPin size={12} /> {previewProduct.location}
                  </div>

                  <p style={{ fontSize: '11px', color: 'var(--color-slate-600)', lineHeight: '1.5', margin: '0 0 12px 0', borderTop: '1px solid var(--border-default)', paddingTop: '8px' }}>
                    {previewProduct.description}
                  </p>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" className="btn btn-whatsapp btn-sm flex-1">
                      <MessageSquare size={13} /> WhatsApp
                    </button>
                    <button type="button" className="btn btn-call btn-sm flex-1">
                      <Phone size={13} /> Call Farmer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Preview Modal Overlay */}
      {mobilePreviewModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '20px',
            position: 'relative'
          }}>
            <button
              type="button"
              onClick={() => setMobilePreviewModalOpen(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: 'var(--color-slate-100)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '4px' }}>
              📱 Mobile Live Preview
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-slate-600)', marginBottom: '14px' }}>
              See how your product will look to buyers on mobile devices.
            </p>

            {/* Mobile Mode Switcher */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              backgroundColor: 'var(--color-slate-100)',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '14px'
            }}>
              <button
                type="button"
                onClick={() => setPreviewTab('card')}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: previewTab === 'card' ? '700' : '600',
                  backgroundColor: previewTab === 'card' ? '#ffffff' : 'transparent',
                  color: previewTab === 'card' ? 'var(--color-primary-800)' : 'var(--color-slate-700)',
                  borderRadius: '4px',
                  border: 'none'
                }}
              >
                Card View
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('details')}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: previewTab === 'details' ? '700' : '600',
                  backgroundColor: previewTab === 'details' ? '#ffffff' : 'transparent',
                  color: previewTab === 'details' ? 'var(--color-primary-800)' : 'var(--color-slate-700)',
                  borderRadius: '4px',
                  border: 'none'
                }}
              >
                Details View
              </button>
            </div>

            {previewTab === 'card' ? (
              <ProductCard
                product={previewProduct}
                isSaved={false}
                onToggleSave={() => {}}
                onViewDetails={() => setPreviewTab('details')}
              />
            ) : (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '14px'
              }}>
                <div style={{
                  position: 'relative',
                  height: '180px',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--color-slate-100)',
                  marginBottom: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed var(--border-default)'
                }}>
                  {previewProduct.image ? (
                    <img
                      src={previewProduct.image}
                      alt="Details Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--color-slate-500)', padding: '12px' }}>
                      <Upload size={28} style={{ margin: '0 auto 6px auto', opacity: 0.6 }} />
                      <div style={{ fontSize: '12px', fontWeight: '700' }}>No Produce Photo Uploaded</div>
                      <div style={{ fontSize: '11px', opacity: 0.8 }}>Upload 1 photo to preview</div>
                    </div>
                  )}
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--color-slate-900)', margin: '0 0 4px 0' }}>
                  {previewProduct.name}
                </h4>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-primary-800)', marginBottom: '6px' }}>
                  {formatNaira(previewProduct.price)} <span style={{ fontSize: '12px', color: 'var(--color-slate-600)', fontWeight: 'normal' }}>/ {previewProduct.unit}</span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-slate-600)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
                  <MapPin size={12} /> {previewProduct.location}
                </div>

                <p style={{ fontSize: '11px', color: 'var(--color-slate-600)', lineHeight: '1.5', margin: '0 0 12px 0', borderTop: '1px solid var(--border-default)', paddingTop: '8px' }}>
                  {previewProduct.description}
                </p>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="btn btn-whatsapp btn-sm flex-1">
                    <MessageSquare size={13} /> WhatsApp
                  </button>
                  <button type="button" className="btn btn-call btn-sm flex-1">
                    <Phone size={13} /> Call Farmer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
