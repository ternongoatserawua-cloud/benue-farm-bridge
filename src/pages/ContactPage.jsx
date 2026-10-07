import React, { useState } from 'react';
import {
  Phone,
  MapPin,
  MessageSquare,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import Button from '../components/common/Button.jsx';

const FAQS = [
  {
    q: 'How do I purchase produce on Benue Market?',
    a: 'Simply browse our listings, click on the produce that interests you, and tap "WhatsApp Farmer" or "Call Farmer" to communicate directly with the seller. There is no shopping cart or checkout fee.'
  },
  {
    q: 'Is listing produce free for Benue farmers?',
    a: 'Yes! Farmers can create listings for free. You can add produce photos, state your price in Naira (₦), choose your LGA, and provide your direct phone and WhatsApp contacts.'
  },
  {
    q: 'How do payments and delivery work?',
    a: 'Because Benue Market is a connection marketplace, buyers and sellers agree directly on payment terms (e.g. payment upon inspection/pickup, bank transfer) and delivery/waybill logistics.'
  },
  {
    q: 'Which locations in Benue State are supported?',
    a: 'All 23 LGAs of Benue State are supported, with major trading hubs including Zaki Biam (Ukum), Makurdi, Gboko, Otukpo, Katsina-Ala, Vandeikya, and Buruku.'
  }
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.message) return;
    setSubmitted(true);
  };

  return (
    <div className="contact-page-root">
      {/* Banner */}
      <section className="browse-header-banner">
        <div className="container">
          <div className="browse-header-content">
            <span className="badge badge-accent">
              <MessageSquare size={14} /> Direct Support
            </span>
            <h1 className="browse-title">Contact &amp; FAQ</h1>
            <p className="browse-subtitle">
              Have questions about buying or selling agricultural produce in Benue State? We are here to help.
            </p>
          </div>
        </div>
      </section>

      <div className="container contact-container-layout">
        <div className="contact-grid">
          {/* Left Column: Form */}
          <div className="card contact-form-card">
            <h2 className="contact-card-title">
              Send Us a Message
            </h2>
            <p className="contact-card-subtitle">
              Our support team will respond to your inquiry within 24 hours.
            </p>

            {submitted ? (
              <div className="contact-success-box">
                <CheckCircle2 size={40} color="var(--color-primary-700)" />
                <h3 className="contact-success-title">
                  Thank you, {formData.name}!
                </h3>
                <p className="contact-success-msg">
                  Your message has been received. Our team will reach out to you shortly.
                </p>
                <Button
                  variant="outline-primary"
                  className="btn-success-reset"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
                  }}
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-name">Full Name *</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Terseer Aondo"
                    className="form-input"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-email">Email Address</label>
                    <input
                      id="contact-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. terseer@example.com"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-phone">Phone Number</label>
                    <input
                      id="contact-phone"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="Enter phone number (numbers only, e.g. 08031234567)"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-subject">Inquiry Type</label>
                  <select
                    id="contact-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="form-select"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Farmer Support">Farmer Listing Assistance</option>
                    <option value="Buyer Support">Bulk Produce Sourcing</option>
                    <option value="Partnership">Agricultural Cooperative Partnership</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-msg">Message *</label>
                  <textarea
                    id="contact-msg"
                    rows="4"
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="How can we assist you with Benue Market?"
                    className="form-textarea"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={Send}
                >
                  Send Message
                </Button>
              </form>
            )}
          </div>

          {/* Right Column: Regional Hubs & Info */}
          <div className="contact-info-col">
            <div className="card contact-hubs-card">
              <h3 className="contact-hubs-title">
                Benue Regional Operations Hubs
              </h3>

              <div className="contact-hubs-list">
                <div className="footer-contact-item">
                  <MapPin size={16} color="var(--color-primary-700)" />
                  <div>
                    <strong className="contact-hub-name">Makurdi (HQ):</strong>
                    <p className="contact-hub-desc">North Bank River Basin Axis, Makurdi, Benue State</p>
                  </div>
                </div>

                <div className="footer-contact-item">
                  <MapPin size={16} color="var(--color-primary-700)" />
                  <div>
                    <strong className="contact-hub-name">Zaki Biam Hub:</strong>
                    <p className="contact-hub-desc">International Yam Market Axis, Ukum LGA</p>
                  </div>
                </div>

                <div className="footer-contact-item">
                  <MapPin size={16} color="var(--color-primary-700)" />
                  <div>
                    <strong className="contact-hub-name">Gboko Hub:</strong>
                    <p className="contact-hub-desc">Grain &amp; Oilseed Center, Gboko Central</p>
                  </div>
                </div>

                <div className="footer-contact-item">
                  <Phone size={16} color="var(--color-accent-600)" />
                  <div>
                    <strong className="contact-hub-name">Direct Hotline:</strong>
                    <p className="contact-hub-desc">+234 803 000 1234 / +234 814 000 5678</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Accordion */}
            <div className="card contact-faq-card">
              <div className="contact-faq-header">
                <HelpCircle size={18} color="var(--color-primary-700)" />
                <h3 className="contact-faq-title">
                  Frequently Asked Questions
                </h3>
              </div>

              <div className="faq-accordion-list">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className="faq-item">
                      <button
                        type="button"
                        className="faq-question-btn"
                        onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                        aria-expanded={isOpen}
                      >
                        <span>{faq.q}</span>
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                      {isOpen && (
                        <div className="faq-answer-body">
                          <p>{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
