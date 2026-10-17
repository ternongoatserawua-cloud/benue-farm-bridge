import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  MapPin,
  MessageSquare,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Search,
  X,
  Copy,
  Check,
  ExternalLink,
  Sprout,
  ShoppingBag,
  Truck,
  CreditCard,
  Building2,
  FileQuestion,
  User,
  Mail,
  ArrowRight,
  Headphones,
  Sparkles
} from 'lucide-react';
import Button from '../components/common/Button.jsx';
import { submitSupportTicket, getTicketSubmissionCooldown } from '../services/supportService.js';

// ── Multi-Topic FAQ Database ────────────────────────────────────────────────
const FAQS = [
  {
    id: 'f1',
    category: 'buyers',
    q: 'How do I purchase produce directly on Benue Farm Bridge?',
    a: 'Simply browse our listings on the marketplace, click on the produce that fits your requirements, and tap "WhatsApp Farmer" or "Call Farmer". You connect directly with the authentic Benue grower or producer with zero intermediary commissions or middleman markups.'
  },
  {
    id: 'f2',
    category: 'farmers',
    q: 'How do monthly seller subscriptions work for farmers?',
    a: 'Farmers can subscribe to monthly advertising plans (Starter at ₦2,000/month for up to 3 listings, or Growth at ₦5,000/month for up to 10 listings). Your listings are verified by our operations team and published instantly to buyers nationwide.'
  },
  {
    id: 'f3',
    category: 'logistics',
    q: 'How does nationwide waybill and haulage from Benue motor parks work?',
    a: 'Benue Market connects buyers directly with farmers who drop produce at reputable interstate motor parks (e.g., Zaki Biam Yam Park, Makurdi North Bank Park, Gboko Central Park). Drivers provide waybill tickets with vehicle number plates, and buyers inspect upon arrival in destination cities.'
  },
  {
    id: 'f4',
    category: 'safety',
    q: 'What safety steps should I follow when trading with new farmers?',
    a: '1) Verify the farmer’s profile badge on our Farmers Directory. 2) Request a live video call or fresh photo proof of the harvest. 3) For large bulk orders, arrange produce inspection at the farm or motor park before releasing final balance payment.'
  },
  {
    id: 'f5',
    category: 'farmers',
    q: 'What happens when my advertising subscription expires?',
    a: 'When your 30-day subscription expires, your products are temporarily paused from public storefront visibility to protect market freshness. You can renew at any time from your Farmer Dashboard or this Support page with one click to restore instant visibility.'
  },
  {
    id: 'f6',
    category: 'logistics',
    q: 'Can Benue Farm Bridge coordinate bulk trailer haulage for cooperatives?',
    a: 'Yes! Our Regional Operations Centers in Makurdi, Zaki Biam, and Gboko work closely with the National Union of Road Transport Workers (NURTW) and heavy haulage syndicates to arrange 30-tonne trailer transit for yams, grains, and rice to Lagos, Port Harcourt, Kano, and Abuja.'
  },
  {
    id: 'f7',
    category: 'buyers',
    q: 'Which Local Government Areas (LGAs) in Benue State are covered?',
    a: 'All 23 Benue State LGAs are covered. Major hubs include Ukum (Zaki Biam Yam Market), Makurdi (River Basin Rice & Fish), Gboko (Soybeans & Grains), Katsina-Ala (Tubers & Fruit), Otukpo (Cassava & Palm), and Vandeikya (Citrus & Fruits).'
  },
  {
    id: 'f8',
    category: 'safety',
    q: 'How do I report a suspicious listing or dispute a transaction?',
    a: 'Use our dedicated "Report Suspicious Listing" option on this page, or chat directly with our Rapid Response Team on WhatsApp at +234 802 798 5404. We investigate disputes within 2 hours and suspend offending accounts immediately.'
  }
];

// ── Regional Physical Operations Hubs ───────────────────────────────────────
const REGIONAL_HUBS = [
  {
    id: 'makurdi',
    name: 'Makurdi Central Operations HQ',
    lga: 'Makurdi LGA',
    address: 'North Bank River Basin Axis, Old Bridge Road, Makurdi, Benue State',
    phone: '+234 803 000 1234',
    lead: 'Terkura Shima (Operations Director)',
    hours: 'Mon – Sat: 7:30 AM – 6:30 PM WAT',
    specialty: 'Statewide Coordination, Rice & River Produce'
  },
  {
    id: 'zakibiam',
    name: 'Zaki Biam Yam Exchange Desk',
    lga: 'Ukum LGA',
    address: 'International Yam Market Axis, Katsina-Ala/Zaki Biam Express, Ukum',
    phone: '+234 814 000 5678',
    lead: 'Iorwuese Kpum (Tuber Logistics Lead)',
    hours: 'Mon – Sat: 6:00 AM – 7:00 PM WAT',
    specialty: 'Bulk Yam Tubers, Waybill Loading, Truck Weighing'
  },
  {
    id: 'gboko',
    name: 'Gboko Grains & Oilseeds Hub',
    lga: 'Gboko LGA',
    address: 'Central Grain Depot, Mkar Road Junction, Gboko Central',
    phone: '+234 802 000 9012',
    lead: 'Aemberga Tor (Grain Desk Coordinator)',
    hours: 'Mon – Sat: 7:00 AM – 6:30 PM WAT',
    specialty: 'Soybeans, Maize, Sorghum & Groundnuts'
  },
  {
    id: 'otukpo',
    name: 'Otukpo Southern Agro-Corridor',
    lga: 'Otukpo LGA',
    address: 'Enugu Road Commercial Depot, Otukpo Urban',
    phone: '+234 815 000 3456',
    lead: 'Ochekwu Sunday (Southern Desk)',
    hours: 'Mon – Sat: 7:30 AM – 6:00 PM WAT',
    specialty: 'Cassava Derivatives, Palm Oil, Citrus'
  }
];

// ── Inquiry Topics ──────────────────────────────────────────────────────────
const INQUIRY_TOPICS = [
  { id: 'farmer_listing', label: 'Farmer Listing & Setup', icon: Sprout, role: 'farmer' },
  { id: 'buyer_sourcing', label: 'Bulk Produce Sourcing', icon: ShoppingBag, role: 'buyer' },
  { id: 'logistics_waybill', label: 'Waybill & Transport Assistance', icon: Truck, role: 'all' },
  { id: 'account_security', label: 'Account Access & Security', icon: ShieldCheck, role: 'all' },
  { id: 'billing_paystack', label: 'Subscription & Paystack Billing', icon: CreditCard, role: 'farmer' },
  { id: 'fraud_report', label: 'Report Suspicious Activity', icon: AlertTriangle, role: 'all' },
  { id: 'cooperative', label: 'Cooperative / Wholesale Partnership', icon: Building2, role: 'all' },
  { id: 'general', label: 'General Help & Questions', icon: FileQuestion, role: 'all' }
];

const TICKETS_STORAGE_KEY = 'benue_market_support_tickets';

export default function ContactPage({
  currentUser = null,
  onNavigate = () => {},
  onOpenAuth = () => {},
  pageParams = {}
}) {
  // Ticket Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    userRole: 'buyer',
    topic: 'farmer_listing',
    priority: 'normal',
    referenceId: '',
    message: ''
  });

  const [lockoutAlertVisible, setLockoutAlertVisible] = useState(false);

  // Track submission & Ticket Ref
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Rate Limiting Cooldown State: 30 min after 1st ticket, 24 hr after 2nd ticket
  const [cooldownStatus, setCooldownStatus] = useState(() =>
    getTicketSubmissionCooldown({
      email: currentUser?.email,
      phone: currentUser?.phone,
      userId: currentUser?.id
    })
  );

  // Sync cooldown whenever user contact info changes
  useEffect(() => {
    const status = getTicketSubmissionCooldown({
      email: formData.email,
      phone: formData.phone,
      userId: currentUser?.id
    });
    setCooldownStatus(status);
  }, [formData.email, formData.phone, currentUser]);

  // Live countdown timer when ticket cooldown is active
  useEffect(() => {
    let timer = null;
    if (cooldownStatus.isCooldownActive) {
      timer = setInterval(() => {
        const fresh = getTicketSubmissionCooldown({
          email: formData.email,
          phone: formData.phone,
          userId: currentUser?.id
        });
        setCooldownStatus(fresh);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldownStatus.isCooldownActive, formData.email, formData.phone, currentUser]);

  // Tickets History
  const [myTickets, setMyTickets] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // FAQ Search & Filter State
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState('all');
  const [openFaqId, setOpenFaqId] = useState('f1');

  // Hydrate user info if logged in
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.name || prev.name,
        email: currentUser.email || prev.email,
        phone: currentUser.phone ? String(currentUser.phone).replace(/\D/g, '') : prev.phone,
        userRole: currentUser.role === 'seller' || currentUser.role === 'farmer' || currentUser.role === 'buyer/farmer'
          ? 'farmer'
          : (currentUser.role || 'buyer')
      }));
    }
  }, [currentUser]);

  // Hydrate from pageParams (e.g. redirected from 3-attempt account lockout)
  useEffect(() => {
    if (pageParams?.reason === 'account_lockout' || pageParams?.topic === 'account_security') {
      setLockoutAlertVisible(true);
      setFormData(prev => ({
        ...prev,
        topic: 'account_security',
        priority: 'urgent',
        email: pageParams.email || prev.email,
        message: prev.message || (pageParams.email
          ? `Hello Support, my account (${pageParams.email}) was temporarily locked after incorrect login attempts. Please assist in verifying my account and restoring access.`
          : 'Hello Support, my account was temporarily locked after incorrect login attempts. Please assist in verifying my account and restoring access.')
      }));
    }
  }, [pageParams]);

  // Load previous support tickets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TICKETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMyTickets(parsed);
        }
      }
    } catch {}
  }, []);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return FAQS.filter(f => {
      const matchesCategory = faqCategory === 'all' || f.category === faqCategory;
      const matchesSearch = !faqSearch.trim() ||
        f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
        f.a.toLowerCase().includes(faqSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [faqCategory, faqSearch]);

  // Form submit handler
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const freshCooldown = getTicketSubmissionCooldown({
      email: formData.email,
      phone: formData.phone,
      userId: currentUser?.id
    });

    if (freshCooldown.isCooldownActive) {
      setCooldownStatus(freshCooldown);
      setSubmitError(freshCooldown.reason);
      return;
    }

    if (!formData.name.trim() || !formData.message.trim()) return;

    setIsSubmitting(true);

    try {
      const createdTicket = await submitSupportTicket({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        userRole: formData.userRole,
        topic: formData.topic,
        priority: formData.priority,
        referenceId: formData.referenceId.trim(),
        message: formData.message.trim(),
        userId: currentUser?.id
      });

      setMyTickets(prev => [createdTicket, ...prev.filter(t => t.ticketId !== createdTicket.ticketId)].slice(0, 10));
      setSubmittedTicket(createdTicket);

      // Immediately activate cooldown status for next ticket
      const nextCooldown = getTicketSubmissionCooldown({
        email: formData.email,
        phone: formData.phone,
        userId: currentUser?.id
      });
      setCooldownStatus(nextCooldown);
    } catch (err) {
      console.warn('Error submitting support ticket:', err);
      setSubmitError(err.message || 'Unable to submit ticket at this time. Please try again.');
      if (err.cooldown) {
        setCooldownStatus(err.cooldown);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTicketId = () => {
    if (!submittedTicket?.ticketId) return;
    navigator.clipboard.writeText(submittedTicket.ticketId);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  // WhatsApp quick-direct URL generator
  const getWhatsAppHelpLink = (topic = 'general', customMsg = '') => {
    const topicObj = INQUIRY_TOPICS.find(t => t.id === topic);
    const topicLabel = topicObj ? topicObj.label : 'General Inquiry';
    const text = encodeURIComponent(
      `Hello Benue Farm Bridge Support Desk,\n\nI need assistance regarding: *${topicLabel}*.\n\n${customMsg || 'Kindly connect me with an operations coordinator.'}\n\nUser: ${formData.name || currentUser?.name || 'Benue Market User'}`
    );
    return `https://wa.me/2348027985404?text=${text}`;
  };

  return (
    <div className="support-page-root">
      {/* ── Page Header Banner ── */}
      <section className="browse-header-banner">
        <div className="container">
          <div className="browse-header-content">
            <div className="support-status-pill">
              <span className="support-status-dot" />
              <span>Support Desk Live · Operating Hours: Mon – Sat 7:00 AM – 7:30 PM WAT</span>
            </div>

            <h1 className="browse-title">Benue Farm Bridge Support Center</h1>
            <p className="browse-subtitle">
              Direct assistance for agricultural producers, wholesale buyers, haulage logistics, and subscriptions across all 23 LGAs of Benue State.
            </p>
          </div>
        </div>
      </section>

      <div className="container">
        {/* ── Lockout Assistance Banner (Rendered when routed from Auth Lockout) ── */}
        {lockoutAlertVisible && (
          <div
            className="contact-lockout-notice animate-scale-in"
            role="alert"
            style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1.5px solid #f59e0b',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  border: '2px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#b45309',
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 3px', fontSize: '15px', fontWeight: '800', color: '#92400e' }}>
                  Account Access Assistance Notice
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#78350f', lineHeight: '1.4' }}>
                  You were directed here after multiple login attempts. You can submit this pre-filled priority ticket, or reset your password directly to restore instant access.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (typeof onOpenAuth === 'function') onOpenAuth('forgot');
                }}
                style={{ backgroundColor: '#ffffff', borderColor: '#d97706', color: '#b45309', fontWeight: '700' }}
              >
                Reset Password Directly
              </Button>
              <button
                type="button"
                onClick={() => setLockoutAlertVisible(false)}
                aria-label="Dismiss notice"
                style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── 4 Quick Contact Channels (Hero Grid) ── */}
        <section className="support-channels-grid" aria-label="Support Channels">
          {/* Channel 1: WhatsApp Live Support */}
          <a
            href={getWhatsAppHelpLink(formData.topic)}
            target="_blank"
            rel="noopener noreferrer"
            className="support-channel-card"
            style={{
              '--channel-accent': '#16a34a',
              '--channel-bg': 'rgba(22, 163, 74, 0.1)',
              '--channel-color': '#16a34a'
            }}
          >
            <div className="support-channel-icon-wrap">
              <MessageSquare size={22} />
            </div>
            <h3 className="support-channel-title">WhatsApp Live Chat</h3>
            <p className="support-channel-desc">
              Connect directly with our support team on WhatsApp. Rapid responses within 10 minutes.
            </p>
            <span className="support-channel-action">
              Chat on WhatsApp <ArrowRight size={14} />
            </span>
          </a>

          {/* Channel 2: Phone Hotline */}
          <a
            href="tel:+2348027985404"
            className="support-channel-card"
            style={{
              '--channel-accent': '#d97706',
              '--channel-bg': 'rgba(217, 119, 6, 0.1)',
              '--channel-color': '#d97706'
            }}
          >
            <div className="support-channel-icon-wrap">
              <Phone size={22} />
            </div>
            <h3 className="support-channel-title">Direct Phone Hotline</h3>
            <p className="support-channel-desc">
              Call our Makurdi Central Call Desk directly for urgent trading or haulage support.
            </p>
            <span className="support-channel-action">
              +2348027985404 <ArrowRight size={14} />
            </span>
          </a>

          {/* Channel 3: Email Desk */}
          <a
            href="mailto:support@benuemarket.ng?subject=Benue%20Farm%20Bridge%20Inquiry"
            className="support-channel-card"
            style={{
              '--channel-accent': '#2563eb',
              '--channel-bg': 'rgba(37, 99, 235, 0.1)',
              '--channel-color': '#2563eb'
            }}
          >
            <div className="support-channel-icon-wrap">
              <Mail size={22} />
            </div>
            <h3 className="support-channel-title">Official Email Desk</h3>
            <p className="support-channel-desc">
              For partnership proposals, billing questions, and cooperative procurement agreements.
            </p>
            <span className="support-channel-action">
              support@benuemarket.ng <ArrowRight size={14} />
            </span>
          </a>

          {/* Channel 4: Regional Hubs */}
          <a
            href="#regional-hubs"
            className="support-channel-card"
            style={{
              '--channel-accent': '#7c3aed',
              '--channel-bg': 'rgba(124, 58, 237, 0.1)',
              '--channel-color': '#7c3aed'
            }}
          >
            <div className="support-channel-icon-wrap">
              <MapPin size={22} />
            </div>
            <h3 className="support-channel-title">4 Field Hubs in Benue</h3>
            <p className="support-channel-desc">
              Walk-in offices in Makurdi, Zaki Biam Yam Market, Gboko, and Otukpo commercial centers.
            </p>
            <span className="support-channel-action">
              View Regional Hubs <ArrowRight size={14} />
            </span>
          </a>
        </section>

        {/* ── Main Two-Column Layout (Form vs Hubs & Guidelines) ── */}
        <div className="support-main-layout">
          {/* Left Column: Interactive Support Ticket Form */}
          <section className="support-form-card" aria-label="Support Ticket Request">
            <div className="support-section-header">
              <span className="badge badge-accent" style={{ marginBottom: '8px' }}>
                <Headphones size={13} /> Support Ticket Request
              </span>
              <h2 className="support-form-title">Send a Message to Our Support Team</h2>
              <p className="support-form-subtitle">
                Fill out the details below. Our field coordinators and technical team review tickets promptly and follow up via WhatsApp, Phone, or Email.
              </p>
            </div>

            {submittedTicket ? (
              <div className="support-success-card">
                <div className="support-success-icon-wrap">
                  <CheckCircle2 size={36} color="#15803d" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                  Support Ticket Received!
                </h3>
                <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '420px', margin: '0 auto', lineHeight: '1.6' }}>
                  Thank you, <strong>{submittedTicket.name}</strong>. Your inquiry has been routed to our regional desk.
                </p>

                <div className="support-ticket-ref-badge">
                  <span>Ticket Ref:</span>
                  <strong style={{ color: '#0f172a' }}>{submittedTicket.ticketId}</strong>
                  <button
                    type="button"
                    onClick={handleCopyTicketId}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', color: '#16a34a', padding: 0 }}
                    title="Copy Ticket ID"
                  >
                    {copyFeedback ? <Check size={16} color="#15803d" /> : <Copy size={16} />}
                  </button>
                </div>

                {cooldownStatus.isCooldownActive && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '8px 14px',
                    borderRadius: '8px', fontSize: '13px', color: '#92400e', margin: '0 auto 16px', fontWeight: 600
                  }}>
                    <Clock size={16} color="#d97706" />
                    <span>
                      Next ticket submission unlocks in <strong>{cooldownStatus.formattedCountdown}</strong>
                      {cooldownStatus.cooldownType === 'FIRST_TICKET' ? ' (30m cooldown)' : ' (24h cooldown)'}.
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={getWhatsAppHelpLink(submittedTicket.topic, `Ticket ID: ${submittedTicket.ticketId}\nMessage: ${submittedTicket.message}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <MessageSquare size={16} /> Follow Up on WhatsApp Now
                  </a>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmittedTicket(null);
                      setFormData(prev => ({ ...prev, message: '', referenceId: '' }));
                    }}
                  >
                    {cooldownStatus.isCooldownActive
                      ? 'Back to Ticket Form'
                      : 'Submit Another Request'}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket}>
                {/* Rate Limiting Cooldown Banner (30 min after 1st ticket, 24 hr after 2nd ticket) */}
                {cooldownStatus.isCooldownActive && (
                  <div className="support-cooldown-card animate-scale-in" role="alert" style={{
                    backgroundColor: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: '12px',
                    padding: '16px 18px',
                    marginBottom: '20px',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: '#d97706'
                      }}>
                        <Clock size={22} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#92400e' }}>
                            {cooldownStatus.cooldownType === 'FIRST_TICKET'
                              ? 'Ticket Cooldown Active (30 Minutes)'
                              : 'Daily Ticket Limit Reached (24 Hours)'}
                          </h4>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            backgroundColor: '#fde68a', color: '#78350f', padding: '4px 10px',
                            borderRadius: '20px', fontSize: '13px', fontWeight: 800, fontFamily: 'monospace'
                          }}>
                            <Clock size={13} /> {cooldownStatus.formattedCountdown}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#78350f', lineHeight: '1.55' }}>
                          {cooldownStatus.cooldownType === 'FIRST_TICKET'
                            ? 'You recently submitted a ticket. To ensure our operations team can process your inquiry properly, you can submit your second ticket in '
                            : 'You have submitted 2 support tickets in this cycle. To protect desk availability, you can submit another ticket in '}
                          <strong>{cooldownStatus.formattedCountdown}</strong>.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                          <a
                            href={getWhatsAppHelpLink(formData.topic)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#16a34a', color: '#ffffff', textDecoration: 'none',
                              display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700,
                              padding: '6px 12px', borderRadius: '6px'
                            }}
                          >
                            <MessageSquare size={14} /> Urgent? Chat WhatsApp
                          </a>
                          <a
                            href="tel:+2348027985404"
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#ffffff', color: '#92400e', border: '1px solid #fcd34d',
                              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
                              fontSize: '12px', fontWeight: 700, padding: '6px 12px', borderRadius: '6px'
                            }}
                          >
                            <Phone size={14} /> Call Hotline
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Error Alert */}
                {submitError && (
                  <div className="animate-scale-in" style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '12px 14px', marginBottom: '18px',
                    backgroundColor: '#fee2e2', border: '1px solid #fecaca',
                    borderRadius: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 600
                  }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>{submitError}</div>
                  </div>
                )}

                {/* 1. Inquiry Topic Selector */}
                <div style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                    1. Select Inquiry Topic *
                  </label>
                  <div className="support-category-grid">
                    {INQUIRY_TOPICS.map((topic) => {
                      const Icon = topic.icon;
                      const isSelected = formData.topic === topic.id;
                      return (
                        <button
                          key={topic.id}
                          type="button"
                          className={`support-category-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, topic: topic.id })}
                        >
                          <Icon size={16} />
                          <span>{topic.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. User Info Inputs */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="sup-name">Your Full Name *</label>
                    <input
                      id="sup-name"
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Terver Orngu"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="sup-phone">WhatsApp / Phone Number *</label>
                    <input
                      id="sup-phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      className="form-input"
                      placeholder="e.g. 08031234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="sup-email">Email Address (Optional)</label>
                    <input
                      id="sup-email"
                      type="email"
                      className="form-input"
                      placeholder="e.g. terver@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="sup-role">I Am A:</label>
                    <select
                      id="sup-role"
                      className="form-select"
                      value={formData.userRole}
                      onChange={(e) => setFormData({ ...formData, userRole: e.target.value })}
                    >
                      <option value="buyer">Produce Buyer / Trader</option>
                      <option value="farmer">Benue Farmer / Producer</option>
                      <option value="cooperative">Agricultural Cooperative</option>
                      <option value="logistics">Haulage / Driver</option>
                      <option value="other">Other Inquiry</option>
                    </select>
                  </div>
                </div>

                {/* Priority Selector */}
                <div className="support-priority-wrap">
                  <span className="support-priority-label">Inquiry Urgency:</span>
                  <button
                    type="button"
                    className={`support-priority-pill ${formData.priority === 'normal' ? 'active normal' : ''}`}
                    onClick={() => setFormData({ ...formData, priority: 'normal' })}
                  >
                    Normal (Standard)
                  </button>
                  <button
                    type="button"
                    className={`support-priority-pill ${formData.priority === 'high' ? 'active high' : ''}`}
                    onClick={() => setFormData({ ...formData, priority: 'high' })}
                  >
                    High Priority
                  </button>
                  <button
                    type="button"
                    className={`support-priority-pill ${formData.priority === 'urgent' ? 'active urgent' : ''}`}
                    onClick={() => setFormData({ ...formData, priority: 'urgent' })}
                  >
                    🚨 Urgent (Produce In Transit)
                  </button>
                </div>

                {/* Optional Produce or Listing Ref */}
                <div className="form-group">
                  <label className="form-label" htmlFor="sup-ref">Produce Name or Listing ID (Optional)</label>
                  <input
                    id="sup-ref"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Zaki Biam Yam Tubers, Rice Bag, or seller name"
                    value={formData.referenceId}
                    onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                  />
                </div>

                {/* Detailed Message */}
                <div className="form-group">
                  <label className="form-label" htmlFor="sup-msg">Detailed Message *</label>
                  <textarea
                    id="sup-msg"
                    rows="4"
                    required
                    className="form-textarea"
                    placeholder="Please describe how we can assist you. Include any relevant details regarding produce location, order volume, or questions."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                {/* Submit CTA */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={isSubmitting || cooldownStatus.isCooldownActive}
                    icon={cooldownStatus.isCooldownActive ? Clock : Send}
                  >
                    {isSubmitting
                      ? 'Routing to Desk…'
                      : cooldownStatus.isCooldownActive
                        ? `Next Ticket Available in ${cooldownStatus.formattedCountdown}`
                        : 'Submit Support Ticket'}
                  </Button>
                </div>
              </form>
            )}

            {/* My Previous Inquiries Tracker (collapsible) */}
            {myTickets.length > 0 && (
              <div className="support-tickets-history">
                <button
                  type="button"
                  className="support-history-toggle"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <span>
                    📋 My Recent Inquiries ({myTickets.length})
                  </span>
                  {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showHistory && (
                  <div className="support-history-list">
                    {myTickets.map((t, idx) => (
                      <div key={idx} className="support-history-item">
                        <div className="support-history-meta">
                          <span className="support-history-ref">{t.ticketId}</span>
                          <span className="support-history-cat">
                            {INQUIRY_TOPICS.find(top => top.id === t.topic)?.label || t.topic} · {new Date(t.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="support-history-badge">
                          {t.status || 'Received'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Right Column: Benue Regional Operations Hubs & Safety Guide */}
          <div className="support-hubs-container" id="regional-hubs">
            {/* Safe Trading Advisory */}
            <div className="support-safety-box">
              <h3 className="support-safety-title">
                <ShieldCheck size={18} /> Safe Trading &amp; Produce Verification Rules
              </h3>
              <ul className="support-safety-list">
                <li className="support-safety-item">
                  <CheckCircle2 size={15} />
                  <span>
                    <strong>Inspect Before Final Balance:</strong> Always verify harvest condition or arrange video confirmation prior to complete payment.
                  </span>
                </li>
                <li className="support-safety-item">
                  <CheckCircle2 size={15} />
                  <span>
                    <strong>Recognized Interstate Parks:</strong> Use official motor park syndicates (Zaki Biam, Makurdi North Bank) for trackable waybill receipts.
                  </span>
                </li>
                <li className="support-safety-item">
                  <CheckCircle2 size={15} />
                  <span>
                    <strong>Direct Farm-Gate Transparency:</strong> Benue Farm Bridge never requests third-party commission fees from buyers or farmers.
                  </span>
                </li>
              </ul>
            </div>

            {/* Regional Hubs Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'var(--font-display)' }}>
                  Benue Operations Desks
                </h3>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 700 }}>
                  4 Active Field Centers
                </span>
              </div>

              {REGIONAL_HUBS.map((hub) => (
                <div key={hub.id} className="support-hub-card">
                  <div className="support-hub-header">
                    <h4 className="support-hub-title">
                      <MapPin size={16} color="var(--color-primary-700)" />
                      {hub.name}
                    </h4>
                    <span className="support-hub-badge">{hub.lga}</span>
                  </div>

                  <div className="support-hub-item">
                    <MapPin size={14} />
                    <span>{hub.address}</span>
                  </div>

                  <div className="support-hub-item">
                    <Phone size={14} />
                    <span>
                      Direct Line: <a href={`tel:${hub.phone.replace(/\s+/g, '')}`} style={{ color: 'var(--color-primary-800)', fontWeight: 700, textDecoration: 'none' }}>{hub.phone}</a>
                    </span>
                  </div>

                  <div className="support-hub-item">
                    <User size={14} />
                    <span>Lead: <strong>{hub.lead}</strong></span>
                  </div>

                  <div className="support-hub-item">
                    <Clock size={14} />
                    <span>{hub.hours}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Searchable & Categorized FAQ Section ── */}
        <section className="support-faq-wrapper" aria-label="Frequently Asked Questions">
          <div className="support-faq-head">
            <span className="badge badge-accent" style={{ marginBottom: '8px' }}>
              <HelpCircle size={13} /> Self-Service Knowledge Base
            </span>
            <h2 className="support-faq-title">Frequently Asked Questions</h2>
            <p className="support-faq-subtitle">
              Quick answers about trading, direct connections, produce waybills, subscriptions, and agricultural safety across Benue State.
            </p>
          </div>

          {/* FAQ Search Bar */}
          <div className="support-search-bar">
            <Search size={18} className="support-search-icon" />
            <input
              type="text"
              className="support-search-input"
              placeholder="Search questions (e.g. waybill, yam pricing, subscription, inspection)..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
            />
            {faqSearch && (
              <button
                type="button"
                className="support-search-clear"
                onClick={() => setFaqSearch('')}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="support-faq-pills">
            {[
              { id: 'all', label: 'All Questions' },
              { id: 'buyers', label: 'For Buyers' },
              { id: 'farmers', label: 'For Farmers & Producers' },
              { id: 'logistics', label: 'Waybill & Transport' },
              { id: 'safety', label: 'Safety & Payments' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`support-faq-pill ${faqCategory === cat.id ? 'active' : ''}`}
                onClick={() => setFaqCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ Accordion List */}
          <div className="support-faq-list">
            {filteredFaqs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                <FileQuestion size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                  No matching questions found
                </p>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Try a different search keyword or send your question using the support ticket form above.
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className={`support-faq-card ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="support-faq-btn"
                      onClick={() => setOpenFaqId(isOpen ? '' : faq.id)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {isOpen && (
                      <div className="support-faq-answer">
                        <p>{faq.a}</p>
                        {faq.category === 'logistics' && (
                          <div className="support-faq-tip">
                            <Sparkles size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>
                              <strong>Pro-Tip for Interstate Buyers:</strong> Always request driver's phone number and weighbridge receipt before the vehicle departs the Benue terminal.
                            </span>
                          </div>
                        )}
                        {faq.category === 'farmers' && (
                          <div className="support-faq-tip">
                            <Sparkles size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>
                              <strong>Listing Tip:</strong> Clear daylight photos of your yams, rice sacks, or soya beans increase buyer contact rates by over 300%.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export { ContactPage as ContactSupportPage };
