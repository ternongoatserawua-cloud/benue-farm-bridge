import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import ProductCard from '../components/marketplace/ProductCard.jsx';
import CallFarmerModal from '../components/marketplace/CallFarmerModal.jsx';
import { formatNaira, formatQuantity } from '../utils/formatters.js';
import { generateWhatsAppLink, generatePhoneLink, triggerPhoneCall } from '../utils/whatsapp.js';
import { fetchProductById } from '../services/productsService.js';

export default function ProductDetailsPage({
  product,
  allProducts = [],
  savedProductIds = new Set(),
  onToggleSave = () => {},
  onViewProduct = () => {},
  onViewFarmer = () => {},
  onBack = () => {}
}) {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [liveProduct, setLiveProduct] = useState(product);

  useEffect(() => {
    setLiveProduct(product);
    if (!product?.id) return;
    let isMounted = true;
    fetchProductById(product.id).then(({ data }) => {
      if (isMounted && data) {
        setLiveProduct(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  if (!liveProduct) {
    return (
      <div className="container empty-state-container">
        <h2>Product not found</h2>
        <Button variant="primary" icon={ArrowLeft} onClick={onBack}>
          Back to Browse
        </Button>
      </div>
    );
  }

  const {
    id,
    name,
    category,
    price = 0,
    unit = 'unit',
    quantity = 0,
    minimumOrder = 1,
    location = 'Benue State',
    lga = 'Benue',
    seller = 'Benue Farmer',
    sellerId,
    phone = '08031234567',
    whatsapp = '2348031234567',
    images = [],
    available = true,
    description = ''
  } = liveProduct;

  const [callModalOpen, setCallModalOpen] = useState(false);

  const isSaved = savedProductIds.has(id);
  const galleryImages = images.length > 0 ? images : [product.image || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80'];
  const activeImage = galleryImages[selectedImgIndex] || galleryImages[0];

  const whatsappUrl = generateWhatsAppLink(whatsapp, product, seller);
  const phoneUrl = generatePhoneLink(phone);

  const handleCallClick = (e) => {
    if (e) e.preventDefault();
    setCallModalOpen(true);
    triggerPhoneCall(phone);
  };

  const handleFarmerProfileClick = (e) => {
    if (e) e.stopPropagation();
    const targetFarmer = {
      id: sellerId || '',
      name: seller || 'Benue Farmer',
      lga: lga || 'Benue',
      location: location || 'Benue State',
      phone: phone || '08031234567',
      whatsapp: whatsapp || '2348031234567',
      avatar: product.sellerAvatar || product.avatar || null,
      coverImage: product.sellerCover || product.coverImage || null
    };
    onViewFarmer(targetFarmer);
  };

  // More products from the same seller or same category
  const relatedProducts = allProducts.filter(
    (p) => p.id !== id && (p.sellerId === sellerId || p.category === category)
  ).slice(0, 5);

  return (
    <div className="product-details-root">
      {/* Breadcrumb / Back Bar */}
      <div className="product-details-nav-bar">
        <div className="container flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="btn btn-ghost btn-sm btn-back-inline"
          >
            <ArrowLeft size={16} /> Back to Browse
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleSave(product)}
              className="btn btn-outline btn-sm"
              aria-label={isSaved ? 'Remove from saved' : 'Save produce'}
            >
              <Heart
                size={16}
                fill={isSaved ? '#b91c1c' : 'none'}
                stroke={isSaved ? '#b91c1c' : 'currentColor'}
              />
              <span>{isSaved ? 'Saved' : 'Save Produce'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Details Section */}
      <section className="section product-details-section">
        <div className="container">

          <div className="product-details-grid">
            {/* Left: Image Gallery */}
            <div className="product-gallery-column">
              <div className="main-gallery-image-wrap">
                <img
                  src={activeImage}
                  alt={name}
                  className="main-gallery-img"
                />
                <div className="gallery-badge-wrap">
                  {available ? (
                    <Badge variant="success">In Stock</Badge>
                  ) : (
                    <Badge variant="danger">Out of Stock</Badge>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {galleryImages.length > 1 && (
                <div className="gallery-thumbnails-row">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImgIndex(idx)}
                      className={`gallery-thumb-btn ${selectedImgIndex === idx ? 'active' : ''}`}
                      aria-label={`View image thumbnail ${idx + 1}`}
                    >
                      <img src={img} alt="" className="gallery-thumb-img" />
                    </button>
                  ))}
                </div>
              )}

              {/* Benue Origin Verification Callout */}
              <div className="benue-origin-callout">
                <div className="origin-callout-header">
                  <ShieldCheck size={16} /> Verified Benue Harvest Origin
                </div>
                <p className="origin-callout-desc">
                  This agricultural listing is located in <strong>{location}, {lga} LGA</strong>. Sourced directly from local farmers with direct communication.
                </p>
              </div>
            </div>

            {/* Right: Product Specifications & Direct Contact Box */}
            <div className="product-info-column">
              <div className="product-info-header">
                <div className="product-badges-row">
                  <Badge variant="category">{category.toUpperCase()}</Badge>
                  <span className="badge badge-location">
                    <MapPin size={12} /> {location}, {lga} LGA
                  </span>
                </div>

                <h1 className="product-detail-title">{name}</h1>

                {/* Price Display */}
                <div className="product-detail-price-box">
                  <div className="price-tag-large">
                    {formatNaira(price)}
                    <span className="price-unit-large">
                      / {unit}
                    </span>
                  </div>
                  <span className="price-tag-caption">
                    Farm-Gate / Direct Wholesale Price
                  </span>
                </div>
              </div>

              {/* Availability & Minimum Order Matrix */}
              <div className="product-matrix-grid">
                <div className="matrix-item">
                  <span className="matrix-label">Quantity Available</span>
                  <span className="matrix-val">{quantity.toLocaleString()} {unit}s</span>
                </div>
                <div className="matrix-item">
                  <span className="matrix-label">Minimum Order</span>
                  <span className="matrix-val">{minimumOrder} {unit}s</span>
                </div>
                <div className="matrix-item">
                  <span className="matrix-label">Location (LGA)</span>
                  <span className="matrix-val">{lga}</span>
                </div>
                <div className="matrix-item">
                  <span className="matrix-label">Status</span>
                  <span className={`matrix-val ${available ? 'text-success' : 'text-danger'}`}>
                    {available ? 'Available Now' : 'Sold Out'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="product-desc-box">
                <h3 className="product-desc-heading">Harvest &amp; Produce Details</h3>
                <p className="product-desc-text">
                  {description}
                </p>
              </div>

              {/* DIRECT CONTACT CONVERSION CARD */}
              <div className="seller-contact-card">
                <div
                  className="seller-contact-header seller-avatar-clickable"
                  onClick={handleFarmerProfileClick}
                  title={`Click to view ${seller}'s full farmer profile`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFarmerProfileClick(e); }}
                >
                  <div className="seller-avatar-wrap-interactive">
                    {product.sellerAvatar || product.avatar ? (
                      <img
                        src={product.sellerAvatar || product.avatar}
                        alt={seller}
                        className="seller-avatar-img-badge"
                      />
                    ) : (
                      <div className="seller-avatar-badge">
                        {seller.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="seller-card-name flex items-center gap-1">
                      <span>{seller}</span>
                      <ExternalLink size={14} className="text-primary seller-name-ext-icon" />
                    </h3>
                    <div className="seller-verification-tag">
                      <ShieldCheck size={14} /> Verified Benue Farmer &bull; <span className="underline font-semibold text-primary">View Profile</span>
                    </div>
                  </div>
                </div>

                <p className="seller-contact-prompt">
                  Contact this farmer directly to discuss quantity, negotiate wholesale delivery, or arrange farm pickup.
                </p>

                {/* Primary CTA Buttons: WhatsApp, Call, & Bookmark */}
                <div className="seller-action-buttons">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-lg btn-block"
                  >
                    <MessageSquare size={16} />
                    <span>WhatsApp Farmer</span>
                  </a>

                  <a
                    href={phoneUrl}
                    onClick={handleCallClick}
                    className="btn btn-call btn-lg btn-block"
                    aria-label={`Call ${seller} (${phone})`}
                    title={`Call Farmer (${phone})`}
                  >
                    <Phone size={18} />
                    <span>Call Farmer</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onToggleSave(liveProduct)}
                    className={`btn ${savedProductIds.has(liveProduct.id) ? 'btn-primary' : 'btn-outline'} btn-lg btn-block`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                    title={savedProductIds.has(liveProduct.id) ? 'Remove from saved bookmarks' : 'Save to bookmarks'}
                  >
                    <Heart
                      size={18}
                      fill={savedProductIds.has(liveProduct.id) ? 'currentColor' : 'none'}
                      color={savedProductIds.has(liveProduct.id) ? '#ffffff' : 'var(--color-primary-600)'}
                    />
                    <span>{savedProductIds.has(liveProduct.id) ? 'Saved in Bookmarks' : 'Bookmark Produce'}</span>
                  </button>
                </div>

                <div className="seller-guarantee-note">
                  <CheckCircle2 size={14} /> Zero commission. Direct farmer-to-buyer transaction.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Produce from same Seller / Category */}
      {relatedProducts.length > 0 && (
        <section className="section related-products-section">
          <div className="container">
            <div className="section-title-wrap">
              <div>
                <span className="section-tag">More Produce</span>
                <h2 className="section-heading">Similar Agricultural Listings</h2>
              </div>
            </div>

            <div className="grid-products">
              {relatedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isSaved={savedProductIds.has(p.id)}
                  onToggleSave={onToggleSave}
                  onViewDetails={onViewProduct}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Direct Call & Contact Modal */}
      <CallFarmerModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        farmerName={seller}
        phone={phone}
        whatsapp={whatsapp}
        location={location}
        lga={lga}
        product={product}
      />
    </div>
  );
}
