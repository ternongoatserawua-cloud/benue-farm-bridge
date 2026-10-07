import React from 'react';
import {
  Sprout,
  CheckCircle2
} from 'lucide-react';
import Button from '../components/common/Button.jsx';

export default function AboutPage({ onNavigate = () => {} }) {
  return (
    <div className="about-page-root">
      {/* Banner */}
      <section className="browse-header-banner">
        <div className="container">
          <div className="browse-header-content">
            <h1 className="browse-title">About Benue Market</h1>
            <p className="browse-subtitle">
              Empowering farmers in Benue State with direct digital market access, fair farm-gate prices, and direct connection with buyers across Nigeria.
            </p>
          </div>
        </div>
      </section>

      {/* Main Narrative */}
      <section className="section">
        <div className="container">
          <div className="about-grid">
            <div className="about-text-col">
              <span className="section-tag">Our Mission</span>
              <h2 className="section-heading about-heading-pad">
                Bridging the Gap Between Benue Farmers and Nigeria's Food Supply Chain
              </h2>
              <p className="about-body-text">
                Benue State is celebrated as <em>The Food Basket of the Nation</em>, producing a massive portion of Nigeria’s yams, soybeans, rice, groundnuts, cassava, and citrus fruits. Yet, for decades, local farmers have faced post-harvest losses and predatory intermediary markups due to lack of direct market visibility.
              </p>
              <p className="about-body-text">
                <strong>Benue Market</strong> was built as a dedicated digital agricultural marketplace. We do not charge commissions or lock farmers into restrictive middleman agreements. We empower farmers to list their harvests in Nigerian Naira (₦) and communicate directly with buyers via phone and WhatsApp.
              </p>

              <div className="about-points-list">
                <div className="about-point-item">
                  <CheckCircle2 size={18} color="var(--color-primary-700)" />
                  <div>
                    <strong>Direct Connection Model:</strong> Zero checkout barrier. Buyers discover produce and connect instantly via WhatsApp or phone call.
                  </div>
                </div>
                <div className="about-point-item">
                  <CheckCircle2 size={18} color="var(--color-primary-700)" />
                  <div>
                    <strong>Authentic Localization:</strong> Built exclusively for Benue LGAs including Zaki Biam (Ukum), Gboko, Makurdi, Otukpo, and Katsina-Ala.
                  </div>
                </div>
                <div className="about-point-item">
                  <CheckCircle2 size={18} color="var(--color-primary-700)" />
                  <div>
                    <strong>Free &amp; Open Access:</strong> Local farmers can publish listings for free to get national visibility.
                  </div>
                </div>
              </div>
            </div>

            <div className="about-visual-col">
              <div className="about-stat-card card">
                <h3 className="stat-card-number-primary">
                  #1
                </h3>
                <p className="stat-card-title">
                  Yam Producer in West Africa
                </p>
                <p className="stat-card-caption">
                  Zaki Biam Yam Market moves thousands of tons of yams daily to all corners of Nigeria.
                </p>
              </div>

              <div className="about-stat-card card stat-card-spacer">
                <h3 className="stat-card-number-accent">
                  23
                </h3>
                <p className="stat-card-title">
                  Agricultural LGAs
                </p>
                <p className="stat-card-caption">
                  Rich fertile river basins, floodplains, and upland agricultural soil supporting diverse crops.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-farmer-cta">
        <div className="container">
          <div className="farmer-cta-box">
            <div className="farmer-cta-content">
              <h2 className="farmer-cta-title">Ready to Experience Benue Market?</h2>
              <p className="farmer-cta-text">
                Whether you are looking to purchase bulk tubers and grains or you are a grower wanting to reach more buyers, Benue Market is your digital hub.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="secondary" size="lg" onClick={() => onNavigate('browse')}>
                  Browse Fresh Produce
                </Button>
                <Button variant="outline" size="lg" className="farmer-cta-outline-btn" onClick={() => onNavigate('sell')}>
                  Sell Your Produce
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
