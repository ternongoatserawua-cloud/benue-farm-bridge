import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  X,
  Scale,
  Sprout,
  ShoppingBag,
  CreditCard,
  Truck,
  ExternalLink,
  Printer
} from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function TermsModal({
  isOpen,
  onClose = () => {},
  onAccept = () => {},
  onOpenFullPage = () => {}
}) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'full'

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terms and Conditions of Service"
      maxWidth="680px"
    >
      <div className="terms-modal-container">
        {/* Sub-header badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #bbf7d0',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#166534', fontWeight: '700' }}>
            <ShieldCheck size={16} color="#16a34a" />
            Official Benue Farm Bridge Policy &bull; Version 2.4
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Last Updated: Oct 2024
          </span>
        </div>

        {/* View Switcher: Quick Summary vs Full Clauses */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'summary' ? '#16a34a' : 'transparent',
              color: activeTab === 'summary' ? '#ffffff' : '#64748b',
              fontWeight: '700',
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            Key Highlights &amp; Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('full')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'full' ? '#16a34a' : 'transparent',
              color: activeTab === 'full' ? '#ffffff' : '#64748b',
              fontWeight: '700',
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            Full Agreement Clauses
          </button>
        </div>

        {/* Scrollable Document Body */}
        <div style={{
          maxHeight: '380px',
          overflowY: 'auto',
          padding: '12px 14px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#334155',
          marginBottom: '18px'
        }}>
          {activeTab === 'summary' ? (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Scale size={16} color="#16a34a" /> 1. Overview &amp; Marketplace Role
                </h4>
                <p style={{ margin: 0 }}>
                  Benue Farm Bridge connects verified agricultural producers across all 23 LGAs of Benue State directly with buyers. We are an enabling marketplace connecting farmers and buyers in good faith.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sprout size={16} color="#16a34a" /> 2. Farmer &amp; Producer Commitments
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Post only authentic photos of real harvest lots (no stock photos or deceptive representations).</li>
                  <li>Provide accurate weights (100kg bags, tubers, paint buckets) and transparent pricing in Naira (₦).</li>
                  <li>Promptly update stock status to &ldquo;Sold Out&rdquo; when lots are exhausted.</li>
                  <li>Zero tolerance for counterfeit chemicals, expired pesticides, or banned agricultural inputs.</li>
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={16} color="#2563eb" /> 3. Buyer Commitments
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Inspect produce quality upon motor park waybill arrival or farm pickup.</li>
                  <li>Issue verified payments; zero tolerance for counterfeit transfer receipts or reversal scams.</li>
                  <li>Honor agreed collection dates and motor park schedules.</li>
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={16} color="#7c3aed" /> 4. Subscriptions &amp; Financial Audits
                </h4>
                <p style={{ margin: 0 }}>
                  Subscriptions (Starter, Growth) provide 30 calendar days of advertising visibility. Payments are processed securely via Paystack with official electronic receipts and remaining-day expiration tracking.
                </p>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={16} color="#d97706" /> 5. Waybills &amp; Governing Law
                </h4>
                <p style={{ margin: 0 }}>
                  Produce transit is governed by motor park waybill conventions (Zaki Biam, Gboko, Makurdi, Otukpo). All marketplace interactions are governed under the Laws of Benue State and the Federal Republic of Nigeria.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h4 style={{ margin: '0 0 6px', color: '#0f172a' }}>1. Acceptance of Terms</h4>
              <p>By creating an account or using Benue Farm Bridge, you agree to comply with all rules and statutory regulations of Benue State and Nigeria.</p>

              <h4 style={{ margin: '14px 0 6px', color: '#0f172a' }}>2. User Eligibility &amp; Accounts</h4>
              <p>You must be at least 18 years old. You agree to provide your real name, valid telephone contact, and primary Benue LGA location.</p>

              <h4 style={{ margin: '14px 0 6px', color: '#0f172a' }}>3. Quality &amp; Produce Authenticity</h4>
              <p>Produce photos must represent real harvest lots. Deceptive weight descriptions or fake pricing will lead to immediate account suspension.</p>

              <h4 style={{ margin: '14px 0 6px', color: '#0f172a' }}>4. Subscriptions &amp; Receipts</h4>
              <p>Plan pricing is in Nigerian Naira. Subscriptions run for 30 calendar days with automated remaining-day tracking and verified audit receipts.</p>

              <h4 style={{ margin: '14px 0 6px', color: '#0f172a' }}>5. Zero Tolerance for Fraud</h4>
              <p>Fake bank payment receipts, fraudulent chargebacks, counterfeit seeds, or extortion will be reported to law enforcement authorities immediately.</p>

              <h4 style={{ margin: '14px 0 6px', color: '#0f172a' }}>6. Dispute Resolution</h4>
              <p>Disputes must first be submitted to the Benue Farm Bridge Support Desk for administrative mediation before any formal litigation.</p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (typeof onOpenFullPage === 'function') {
                onOpenFullPage();
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary-700)',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'underline'
            }}
          >
            <ExternalLink size={13} /> Open Full Dedicated Page View
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={() => {
                onAccept();
                onClose();
              }}
            >
              I Understand &amp; Agree
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
