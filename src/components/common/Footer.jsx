import React from 'react';
import { MapPin, Phone, Mail, ShieldCheck, Heart, Smartphone } from 'lucide-react';

export default function Footer({ onNavigate = () => {}, onOpenInstallApp = () => {} }) {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e, pageId) => {
    e.preventDefault();
    onNavigate(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer-root">
      <div className="container">
        <div className="footer-grid">
          {/* Col 1: Brand & Identity */}
          <div className="footer-col footer-col-brand">
            <div className="footer-brand-header">
              <img src="/logo.png" alt="Benue Farm Bridge" className="footer-logo-img" />
              <div className="footer-brand-info">
                <h2 className="footer-brand-title">Benue Farm Bridge</h2>
                <p className="footer-brand-slogan">Connect. Trade. Grow.</p>
              </div>
            </div>
            <p className="footer-desc">
              Benue Farm Bridge is the premier digital agricultural connection marketplace for Benue State, Nigeria. We bridge the gap between hard-working local farmers and buyers nationwide.
            </p>
            <div className="footer-badge-wrap">
              <span className="badge badge-verified">
                <ShieldCheck size={14} /> The Food Basket of the Nation
              </span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="footer-col">
            <h3 className="footer-heading">Quick Links</h3>
            <ul className="footer-list">
              <li><a href="#home" onClick={(e) => handleLinkClick(e, 'home')}>Home</a></li>
              <li><a href="#browse" onClick={(e) => handleLinkClick(e, 'browse')}>Browse Produce</a></li>
              <li><a href="#farmers" onClick={(e) => handleLinkClick(e, 'farmers')}>Farmers Directory</a></li>
              <li><a href="#sell" onClick={(e) => handleLinkClick(e, 'sell')}>Sell Produce</a></li>
              <li><a href="#about" onClick={(e) => handleLinkClick(e, 'about')}>About Platform</a></li>
              <li><a href="#contact" onClick={(e) => handleLinkClick(e, 'contact')}>Contact &amp; FAQ</a></li>
              <li><a href="#terms" onClick={(e) => handleLinkClick(e, 'terms')}>Terms &amp; Conditions</a></li>
              <li>
                <a
                  href="#install"
                  onClick={(e) => {
                    e.preventDefault();
                    if (typeof onOpenInstallApp === 'function') onOpenInstallApp();
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary-600)', fontWeight: '600' }}
                >
                  <Smartphone size={14} /> Install Mobile App
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Popular Benue Produce */}
          <div className="footer-col">
            <h3 className="footer-heading">Popular Produce</h3>
            <ul className="footer-list">
              <li><a href="#browse" onClick={(e) => handleLinkClick(e, 'browse')}>Zaki Biam Yam</a></li>
              <li><a href="#browse" onClick={(e) => handleLinkClick(e, 'browse')}>Makurdi Rice</a></li>
              <li><a href="#browse" onClick={(e) => handleLinkClick(e, 'browse')}>Gboko Soybeans</a></li>
              <li><a href="#browse" onClick={(e) => handleLinkClick(e, 'browse')}>Katsina-Ala Groundnuts</a></li>
              <li><a href="#browse" onClick={(e) => handleLinkClick(e, 'browse')}>Buruku Cassava</a></li>
              <li><a href="#browse" onClick={(e) => handleLinkClick(e, 'browse')}>Otukpo Chili Peppers</a></li>
            </ul>
          </div>

          {/* Col 4: Regional Hub & Support */}
          <div className="footer-col">
            <h3 className="footer-heading">Regional Hubs</h3>
            <div className="footer-contact-item">
              <MapPin size={16} className="footer-contact-icon" />
              <span>Makurdi, Gboko, Otukpo &amp; Zaki Biam, Benue State, Nigeria</span>
            </div>
            <div className="footer-contact-item">
              <Phone size={16} className="footer-contact-icon" />
              <span>Support Desk: Direct Farmer Connection</span>
            </div>
            <div className="footer-contact-item">
              <Mail size={16} className="footer-contact-icon" />
              <span>contact@benuemarket.ng</span>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {currentYear} Benue Farm Bridge. All rights reserved. &bull;{' '}
            <a
              href="#terms"
              onClick={(e) => handleLinkClick(e, 'terms')}
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              Terms &amp; Conditions
            </a>
          </p>
          <div className="footer-note">
            <span>Built with pride for Benue farmers &amp; Nigerian agribusiness</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
