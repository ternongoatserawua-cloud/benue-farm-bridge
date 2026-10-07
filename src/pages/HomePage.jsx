import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Phone,
  MessageSquare,
  Users,
  TrendingUp,
  MapPin,
  CheckCircle2,
  PlusCircle,
  ShoppingBag,
  Sprout
} from 'lucide-react';
import SearchBar from '../components/marketplace/SearchBar.jsx';
import CategoryPills from '../components/marketplace/CategoryPills.jsx';
import ProductCard from '../components/marketplace/ProductCard.jsx';
import FarmerCard from '../components/marketplace/FarmerCard.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';

import { CATEGORIES, normalizeCategory } from '../data/categories.js';
import { BENUE_LGAS } from '../data/locations.js';

export default function HomePage({
  products = [],
  farmers = [],
  savedProductIds = new Set(),
  onToggleSave = () => {},
  onViewProduct = () => {},
  onViewFarmer = () => {},
  onNavigate = () => {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleSearchSubmit = (query) => {
    onNavigate('browse', { search: query, category: selectedCategory });
  };

  // Filter products for the featured section (strictly approved items only)
  const featuredProducts = products.filter((p) => {
    if ((p.status || 'approved') !== 'approved') return false;
    if (selectedCategory === 'all') return true;
    return normalizeCategory(p.category) === normalizeCategory(selectedCategory);
  }).slice(0, 6);

  return (
    <div className="home-page-root">
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <h1 className="hero-title">
                Buy &amp; Sell Agricultural Produce Across Benue
              </h1>
              <p className="hero-subtitle">
                Find fresh produce directly from farmers across Benue State or connect with buyers looking for what you produce. Zero middleman fees. Direct phone &amp; WhatsApp connection.
              </p>

              {/* Main Search Bar */}
              <div className="hero-search-wrap">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={handleSearchSubmit}
                  placeholder="Search for yam, rice, soybeans, cassava, peppers..."
                />
              </div>

              {/* Quick Action Buttons */}
              <div className="hero-actions">
                <Button
                  variant="secondary"
                  size="lg"
                  icon={ShoppingBag}
                  className="hero-btn-primary"
                  onClick={() => onNavigate('browse')}
                >
                  Browse Produce
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  icon={PlusCircle}
                  className="hero-btn-outline"
                  onClick={() => onNavigate('sell')}
                >
                  Sell Your Produce
                </Button>
              </div>
            </div>

            <div className="hero-visual desktop-only">
              <div className="hero-card-stack">
                <div className="hero-stat-bubble hero-stat-1">
                  <ShieldCheck size={20} className="stat-bubble-icon" />
                  <div>
                    <strong>100% Direct</strong>
                    <span>Farmer Contact</span>
                  </div>
                </div>
                <img
                  src="/hero-banner.jpg"
                  alt="Benue State Agricultural Harvest and Produce Market"
                  className="hero-main-img"
                />
                <div className="hero-stat-bubble hero-stat-2">
                  <MapPin size={20} className="stat-bubble-icon-gold" />
                  <div>
                    <strong>Benue State</strong>
                    <span>23 Agricultural LGAs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR CATEGORIES */}
      <section className="section-categories">
        <div className="container">
          <div className="section-title-wrap">
            <div>
              <span className="section-tag">Produce Categories</span>
              <h2 className="section-heading">Explore By Category</h2>
              <p className="section-subheading">
                Browse Benue’s richest agricultural produce grouped for easy wholesale and retail discovery.
              </p>
            </div>
            <Button
              variant="outline-primary"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => onNavigate('browse')}
            >
              View All Categories
            </Button>
          </div>

          <CategoryPills
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => setSelectedCategory(catId)}
          />
        </div>
      </section>

      {/* 3. FEATURED FRESH PRODUCE */}
      <section className="section section-featured">
        <div className="container">
          <div className="section-title-wrap">
            <div>
              <span className="section-tag">Fresh Harvest</span>
              <h2 className="section-heading">Featured Produce from Benue</h2>
              <p className="section-subheading">
                Verified farm listings with authentic pricing in Nigerian Naira (₦).
              </p>
            </div>
            <Button
              variant="outline-primary"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => onNavigate('browse')}
            >
              Browse All Listings ({products.length})
            </Button>
          </div>

          <div className="grid-products">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSaved={savedProductIds.has(product.id)}
                onToggleSave={onToggleSave}
                onViewDetails={onViewProduct}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="section section-how-it-works">
        <div className="container">
          <div className="text-center-heading">
            <h2 className="section-heading">How Benue Farm Bridge Works</h2>
            <p className="section-subheading">
              We connect agricultural producers and buyers directly without complicated checkout systems or broker fees.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3 className="step-title">Discover Produce</h3>
              <p className="step-desc">
                Browse tubers, grains, legumes, and livestock filtered by real Benue LGAs and prices in Naira (₦).
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <h3 className="step-title">Contact Farmer Directly</h3>
              <p className="step-desc">
                Tap once to WhatsApp or call the verified farmer directly with pre-filled produce inquiry details.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <h3 className="step-title">Transact Directly</h3>
              <p className="step-desc">
                Agree on quantity, inspection, payment, and pickup/waybill directly with the farmer. Zero commission!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VERIFIED FARMERS HIGHLIGHT */}
      <section className="section section-farmers-preview">
        <div className="container">
          <div className="section-title-wrap">
            <div>
              <span className="section-tag">Local Farmers</span>
              <h2 className="section-heading">Meet Verified Benue Producers</h2>
              <p className="section-subheading">
                Connect with reputable commercial and cooperative farmers across Zaki Biam, Gboko, Makurdi, and Otukpo.
              </p>
            </div>
            <Button
              variant="outline-primary"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => onNavigate('farmers')}
            >
              View Farmers Directory
            </Button>
          </div>

          <div className="grid-farmers">
            {farmers.slice(0, 5).map((farmer) => (
              <FarmerCard
                key={farmer.id}
                farmer={farmer}
                onViewProfile={onViewFarmer}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 6. TRUST & BENEFITS */}
      <section className="section section-trust">
        <div className="container">
          <div className="trust-banner">
            <div className="trust-col">
              <ShieldCheck size={36} className="trust-icon" />
              <h3>Verified Benue Origins</h3>
              <p>Authentic produce sourced straight from farm gates and major commodity markets across Benue State.</p>
            </div>
            <div className="trust-col">
              <Phone size={36} className="trust-icon" />
              <h3>Direct Seller Connection</h3>
              <p>No intermediaries or added checkout markups. Speak directly to the people who grew the crop.</p>
            </div>
            <div className="trust-col">
              <TrendingUp size={36} className="trust-icon" />
              <h3>Fair Wholesale Prices</h3>
              <p>Competitive farm-gate prices in Nigerian Naira (₦) for domestic buyers, retailers, and exporters.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FARMER CTA BANNER */}
      <section className="section-farmer-cta">
        <div className="container">
          <div className="farmer-cta-box">
            <div className="farmer-cta-content">
              <span className="badge badge-accent">Join 500+ Benue Farmers</span>
              <h2 className="farmer-cta-title">
                Are You a Farmer or an Agro-Merchant in Benue State?
              </h2>
              <p className="farmer-cta-text">
                List your yam, rice, soybeans, livestock, or vegetables on Benue Farm Bridge for free. Reach buyers across Abuja, Lagos, Kano, and nationwide in minutes.
              </p>
              <div className="farmer-cta-actions">
                <Button
                  variant="secondary"
                  size="md"
                  icon={PlusCircle}
                  onClick={() => onNavigate('sell')}
                >
                  List Produce for Free
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="farmer-cta-outline-btn"
                  onClick={() => onNavigate('about')}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
