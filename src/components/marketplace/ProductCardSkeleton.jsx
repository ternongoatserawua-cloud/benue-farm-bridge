import React from 'react';

/**
 * ProductCardSkeleton
 * Shimmering placeholder card shown while additional produce items load.
 * Matches ProductCard proportions and aesthetic.
 */
export default function ProductCardSkeleton() {
  return (
    <article className="card product-card product-card-skeleton" aria-hidden="true">
      {/* Media skeleton */}
      <div className="product-card-media skeleton-shimmer-box">
        <div className="skeleton-placeholder-badge" />
      </div>

      {/* Body skeleton */}
      <div className="product-card-body">
        {/* Meta badges */}
        <div className="product-card-meta">
          <div className="skeleton-line skeleton-meta-pill" />
          <div className="skeleton-line skeleton-meta-pill" />
        </div>

        {/* Title */}
        <div className="skeleton-line skeleton-title-primary" />
        <div className="skeleton-line skeleton-title-secondary" />

        {/* Price & Unit */}
        <div className="product-card-price-row">
          <div className="skeleton-line skeleton-price-tag" />
        </div>

        {/* Stock */}
        <div className="skeleton-line skeleton-stock-tag" />

        {/* Action Button */}
        <div className="product-card-footer">
          <div className="skeleton-line skeleton-btn" />
        </div>
      </div>
    </article>
  );
}
