import React, { useState } from 'react';
import { Heart, MapPin, User, ArrowRight, ImageOff } from 'lucide-react';
import { formatNaira, formatQuantity } from '../../utils/formatters.js';

export default function ProductCard({
  product,
  isSaved = false,
  onToggleSave = () => {},
  onViewDetails = () => {}
}) {
  const [imgError, setImgError] = useState(false);
  const [isPopping, setIsPopping] = useState(false);

  if (!product) return null;

  const {
    id,
    name = 'Agricultural Produce',
    price = 0,
    unit = 'unit',
    quantity,
    location = 'Benue State',
    lga,
    seller = 'Benue Farmer',
    image,
    images,
    available = true
  } = product;

  const displayImage = image || (images && images.length > 0 ? images[0] : null);
  const locationDisplay = lga ? `${location}, ${lga}` : location;

  const handleSaveClick = (e) => {
    e.stopPropagation();
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 500);
    onToggleSave(product);
  };

  return (
    <article className="card product-card">
      {/* Image Container */}
      <div className="product-card-media">
        {displayImage && !imgError ? (
          <img
            src={displayImage}
            alt={name}
            className="product-card-img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-card-img-placeholder">
            <ImageOff size={32} />
            <span>Benue Produce</span>
          </div>
        )}

        {/* Availability Badge */}
        <div className="product-card-badge-top">
          {available ? (
            <span className="badge badge-success">In Stock</span>
          ) : (
            <span className="badge badge-danger">Out of Stock</span>
          )}
        </div>

        {/* Save / Favorite Action Button */}
        <button
          type="button"
          onClick={handleSaveClick}
          className={`product-save-btn ${isSaved ? 'saved' : ''} ${isPopping ? 'animate-heart-pop' : ''}`}
          aria-label={isSaved ? `Remove ${name} from saved items` : `Save ${name}`}
          title={isSaved ? 'Saved' : 'Save produce'}
        >
          <Heart size={18} fill={isSaved ? '#ef4444' : 'none'} stroke={isSaved ? '#ef4444' : '#475569'} />
        </button>
      </div>

      {/* Content Container */}
      <div className="product-card-body">
        {/* Location & Seller tag */}
        <div className="product-card-meta">
          <span className="product-meta-location" title={`LGA / Location: ${locationDisplay}`}>
            <MapPin size={13} style={{ flexShrink: 0 }} /> <span>{locationDisplay}</span>
          </span>
          <span className="product-meta-seller" title={`Farmer / Seller: ${seller}`}>
            <User size={13} style={{ flexShrink: 0 }} /> <span>{seller}</span>
          </span>
        </div>

        {/* Title */}
        <h3 className="product-card-title" title={name}>
          {name}
        </h3>

        {/* Price & Unit */}
        <div className="product-card-price-row">
          <div className="product-card-price">
            <span className="price-tag">{formatNaira(price)}</span>
            <span className="price-unit">/ {unit}</span>
          </div>
        </div>

        {/* Quantity Available */}
        <div className="product-card-stock">
          {formatQuantity(quantity, unit)}
        </div>

        {/* Card Action Button */}
        <div className="product-card-footer">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm flex-1 w-full"
            onClick={() => onViewDetails(product)}
            aria-label={`View details for ${name}`}
          >
            <span>View Details</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
