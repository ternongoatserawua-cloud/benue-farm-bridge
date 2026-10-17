import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  Scale,
  CheckCircle2,
  AlertCircle,
  Printer,
  Search,
  ArrowLeft,
  Sprout,
  ShoppingBag,
  CreditCard,
  Truck,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  MapPin,
  Lock,
  Ban
} from 'lucide-react';
import Button from '../components/common/Button.jsx';

export default function TermsPage({ onNavigate = () => {} }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('section-1');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Terms & Conditions | Benue Farm Bridge';
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const sections = [
    {
      id: 'section-1',
      number: '1',
      title: 'Introduction & Acceptance of Terms',
      icon: Scale,
      content: (
        <>
          <p>
            Welcome to <strong>Benue Farm Bridge</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our,&rdquo; or the &ldquo;Platform&rdquo;), the premier digital agricultural connection marketplace tailored specifically for producers, farmers, agribusinesses, bulk commodity purchasers, food processors, and retail buyers across Benue State and nationwide.
          </p>
          <p>
            By accessing, browsing, registering an account, publishing produce listings, or initiating transactions on Benue Farm Bridge (accessible via our web portal, mobile PWA, or related subdomains), you (&ldquo;User,&rdquo; &ldquo;Farmer,&rdquo; &ldquo;Producer,&rdquo; or &ldquo;Buyer&rdquo;) unequivocally agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;).
          </p>
          <div className="terms-callout terms-callout-info">
            <AlertCircle size={18} className="terms-callout-icon" />
            <div>
              <strong>Binding Legal Agreement:</strong> If you do not accept and agree to all provisions within these Terms, you must immediately cease accessing the Platform and refrain from creating an account or publishing produce.
            </div>
          </div>
        </>
      )
    },
    {
      id: 'section-2',
      number: '2',
      title: 'Platform Role & Marketplace Structure',
      icon: Sprout,
      content: (
        <>
          <p>
            Benue Farm Bridge operates as an <strong>enabling agricultural technology marketplace</strong> designed to bridge the connectivity divide between verified agricultural producers in Benue State (&ldquo;The Food Basket of the Nation&rdquo;) and institutional or retail buyers across Nigeria.
          </p>
          <ul>
            <li>
              <strong>Direct Producer Connection:</strong> We empower farmers across all 23 Benue Local Government Areas (including Katsina-Ala, Ukum, Gboko, Makurdi, Otukpo, Vandeikya, Buruku, and Guma) to showcase authentic harvests directly to buyers without exploitative multiple middleman layers.
            </li>
            <li>
              <strong>Independent Parties:</strong> Farmers and Buyers operate as independent economic agents. Unless explicitly contracted through our enterprise escrow service, Benue Farm Bridge acts as the digital catalog host, communication enabler, and directory infrastructure.
            </li>
            <li>
              <strong>Good-Faith Engagement:</strong> All participants agree to trade in good faith, maintain transparency regarding produce condition, weights, packaging, and adhere to honest market practices.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'section-3',
      number: '3',
      title: 'User Registration, Accounts & Eligibility',
      icon: Lock,
      content: (
        <>
          <p>
            To list agricultural produce, manage storefront inventory, or access registered buyer tools, you must register an account on the Platform.
          </p>
          <ul>
            <li>
              <strong>Age of Majority:</strong> You must be at least 18 years of age or possess legal capacity under Nigerian law to form binding commercial contracts.
            </li>
            <li>
              <strong>Accurate Information:</strong> You agree to provide true, current, and complete information during registration, including your real legal name or registered farm business name, valid telephone number, active email, and primary Benue LGA location.
            </li>
            <li>
              <strong>Account Confidentiality:</strong> You are solely responsible for maintaining the confidentiality of your login credentials and password. Any actions executed through your authenticated profile are deemed to have been executed by you.
            </li>
            <li>
              <strong>Single Account Policy:</strong> Users may not create duplicate accounts to manipulate produce rankings, circumvent platform listing limits, or evade moderation suspensions.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'section-4',
      number: '4',
      title: 'Farmer & Producer Listing Standards',
      icon: CheckCircle2,
      content: (
        <>
          <p>
            The reputation of Benue State as Nigeria&rsquo;s agricultural heartland depends on honesty and quality. All farmers and producers publishing listings on Benue Farm Bridge strictly commit to the following standards:
          </p>
          <div className="terms-subgrid">
            <div className="terms-subcard">
              <h4>Authentic Produce Imagery</h4>
              <p>Photos uploaded must represent your actual produce or harvest lot. Misrepresenting imported or stock photography to deceive buyers regarding size or quality is strictly forbidden.</p>
            </div>
            <div className="terms-subcard">
              <h4>Accurate Weights &amp; Units</h4>
              <p>Produce specifications—including weight in kg, 100kg bags, tubers, paint buckets, or trailers—must be accurate. Intentional underweight packaging leads to immediate seller ban.</p>
            </div>
            <div className="terms-subcard">
              <h4>Real-Time Stock Availability</h4>
              <p>Producers must promptly mark listings as &ldquo;Sold Out&rdquo; when lots are exhausted to prevent buyer frustration and wasted logistics inquiries.</p>
            </div>
            <div className="terms-subcard">
              <h4>Transparent Unit Pricing</h4>
              <p>All prices must be quoted transparently in Nigerian Naira (₦). Bait-and-switch pricing (advertising a low price and demanding significantly higher upon buyer contact) is a violation.</p>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'section-5',
      number: '5',
      title: 'Buyer Rights, Obligations & Verification',
      icon: ShoppingBag,
      content: (
        <>
          <p>
            Buyers—including retail households, restaurant operators, open-market aggregators, and commercial food processors—enjoy transparent access to producers while upholding standard trade ethics:
          </p>
          <ul>
            <li>
              <strong>Produce Inspection:</strong> Buyers have the right and responsibility to inspect produce quality upon collection or waybill pickup before concluding transactions.
            </li>
            <li>
              <strong>Prompt Communication:</strong> Buyers agree to communicate respectfully with farmers, honoring agreed appointment dates and motor park waybill collections.
            </li>
            <li>
              <strong>Payment Integrity:</strong> Payments must be made via verified banking channels, platform payment integrations, or cash-on-inspection as agreed with the farmer. Issuing fake payment alerts, fraudulent transfer receipts, or reversal scams is a criminal offense referred directly to law enforcement authorities.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'section-6',
      number: '6',
      title: 'Subscriptions, Advertising Fees & Payments',
      icon: CreditCard,
      content: (
        <>
          <p>
            Benue Farm Bridge provides both free basic access and premium vendor advertising tiers (Starter Plan and Growth Plan) enabling producers to publish multi-product catalogs:
          </p>
          <ul>
            <li>
              <strong>Subscription Pricing:</strong> Plan pricing is displayed transparently in Nigerian Naira (₦) on our subscription portal. Pricing changes do not affect already active 30-day billing cycles.
            </li>
            <li>
              <strong>Paystack Payment Processing:</strong> All online subscription payments are processed securely through our authorized payment gateway partner, <strong>Paystack</strong>, supporting debit cards, bank transfers, and USSD. Benue Farm Bridge does not store raw credit card numbers.
            </li>
            <li>
              <strong>Official Electronic Receipts:</strong> Upon every successful subscription payment or renewal, an official electronic receipt is generated with a unique voucher reference, timestamp, farmer identity, and validity dates, accessible by both the subscriber and platform administrators.
            </li>
            <li>
              <strong>Subscription Expiration:</strong> Subscriptions remain active for thirty (30) calendar days from payment confirmation. When a subscription reaches expiration, vendor listings revert to free limits until renewed.
            </li>
            <li>
              <strong>Refund Policy:</strong> Because digital listing quota and promotional advertising are provisioned immediately upon transaction confirmation, subscription fees are generally non-refundable unless a verified billing duplicate occurred.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'section-7',
      number: '7',
      title: 'Logistics, Motor Park Waybills & Transit',
      icon: Truck,
      content: (
        <>
          <p>
            Much of Benue State&rsquo;s produce distribution relies on interstate transport companies, heavy haulage trucks, and motor park waybill couriers operating from major regional hubs:
          </p>
          <ul>
            <li>
              <strong>Motor Park Hubs:</strong> Key dispatch hubs include Zaki Biam International Yam Market park, Gboko Central park, Wurukum and Modern Market parks in Makurdi, and Otukpo transport terminals.
            </li>
            <li>
              <strong>Third-Party Freight:</strong> Unless specifically utilizing an official Benue Farm Bridge managed logistics partner, transport drivers and haulage syndicates operate as third-party services. Farmers and buyers must agree on waybill fees, driver contact details, and transit risk allocations prior to dispatch.
            </li>
            <li>
              <strong>Transit Perishability:</strong> Perishable commodities (such as fresh tomatoes, peppers, citrus, and leafy vegetables) must be dispatched with adequate ventilation and realistic transit windows.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'section-8',
      number: '8',
      title: 'Prohibited Produce & Zero-Tolerance Conduct',
      icon: Ban,
      content: (
        <>
          <p>
            To maintain platform integrity and public safety, the following items, products, and behaviors are strictly banned from Benue Farm Bridge:
          </p>
          <ul>
            <li>
              <strong>Banned Chemicals &amp; Unregistered Inputs:</strong> Sale of expired agrochemicals, banned persistent pesticides, or counterfeit fertilizer blends prohibited by NAFDAC and the Federal Ministry of Agriculture.
            </li>
            <li>
              <strong>Stolen or Disputed Agricultural Lots:</strong> Produce originating from land disputes, theft, banditry, or unauthorized community harvesting.
            </li>
            <li>
              <strong>Fraudulent Conduct:</strong> Presenting fake bank receipts, impersonating government agricultural extension agents, running advance-fee loan schemes, or deceptive weight tampers.
            </li>
            <li>
              <strong>Harassment &amp; Abuse:</strong> Threatening, extortionate, or abusive language directed at farmers, buyers, or customer support personnel.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'section-9',
      number: '9',
      title: 'Content Moderation & Account Suspension',
      icon: ShieldCheck,
      content: (
        <>
          <p>
            Our administration team actively reviews produce listings and community reports to ensure platform trust and safety:
          </p>
          <ul>
            <li>
              <strong>Listing Approval &amp; Rejection:</strong> We reserve the right to review, reject, or request revisions for any listing that lacks clear imagery, provides questionable contact information, or violates quality standards.
            </li>
            <li>
              <strong>60-Day Recycle Lifecycle:</strong> Removed or recycled produce items are retained in our administrative recycle storage for sixty (60) days before irreversible permanent purging, allowing restoration in cases of accidental removal.
            </li>
            <li>
              <strong>Account Suspension:</strong> Accounts implicated in fraudulent transactions, counterfeit produce listings, or repeated buyer complaints will face immediate suspension and possible reporting to security authorities.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'section-10',
      number: '10',
      title: 'Limitation of Liability & Disclaimers',
      icon: AlertCircle,
      content: (
        <>
          <p>
            The Platform and all agricultural listing content are provided on an <strong>&ldquo;as is&rdquo;</strong> and <strong>&ldquo;as available&rdquo;</strong> basis.
          </p>
          <ul>
            <li>
              <strong>Agricultural Nature:</strong> Agriculture is subject to environmental variables, including rain patterns, post-harvest perishability, and transit conditions. While we maintain rigorous verification, Benue Farm Bridge does not warrant that every produce description is free from human clerical error.
            </li>
            <li>
              <strong>Indirect Damages:</strong> To the maximum extent permitted by applicable Nigerian law, Benue Farm Bridge, its operators, affiliates, and technical partners shall not be liable for any indirect, punitive, incidental, or consequential damages resulting from off-platform agreements.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'section-11',
      number: '11',
      title: 'Dispute Resolution & Governing Law',
      icon: Scale,
      content: (
        <>
          <p>
            We promote amicable, community-centered conflict resolution grounded in the fair commercial traditions of Benue State:
          </p>
          <ul>
            <li>
              <strong>Support Desk Mediation:</strong> If a dispute arises regarding produce quality, missing waybill packages, or payment discrepancies, parties agree to first notify our Help &amp; Support Desk at <a href="#contact" onClick={(e) => { e.preventDefault(); onNavigate('contact'); }}>contact@benuemarket.ng</a> for good-faith administrative mediation.
            </li>
            <li>
              <strong>Governing Jurisdiction:</strong> These Terms and any commercial disputes arising from marketplace usage shall be governed by and construed in accordance with the <strong>Laws of Benue State and the Federal Republic of Nigeria</strong>.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'section-12',
      number: '12',
      title: 'Modifications to Terms & Inquiries',
      icon: HelpCircle,
      content: (
        <>
          <p>
            We reserve the right to revise or update these Terms periodically to reflect evolving agricultural policies, platform features, or statutory regulatory standards. Material changes will be accompanied by an updated revision date and marketplace notification banner.
          </p>
          <div className="terms-contact-card">
            <h4>Questions or Legal Inquiries?</h4>
            <p>For questions regarding these Terms, platform policies, or corporate agribusiness partnerships:</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('contact')}
              >
                Contact Legal &amp; Support Desk
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Printer}
                onClick={handlePrint}
              >
                Print Official Terms
              </Button>
            </div>
          </div>
        </>
      )
    }
  ];

  const filteredSections = searchQuery.trim()
    ? sections.filter(
        (sec) =>
          sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sec.number.includes(searchQuery)
      )
    : sections;

  return (
    <div className="terms-page-wrapper animate-fade-in">
      {/* ── Top Hero Banner ── */}
      <section className="terms-hero">
        <div className="container">
          <div className="terms-hero-content">
            <div className="terms-hero-badge">
              <ShieldCheck size={16} /> Official Benue Farm Bridge Policy &bull; Legal Document
            </div>
            <h1 className="terms-hero-title">Terms &amp; Conditions</h1>
            <p className="terms-hero-subtitle">
              Transparent, fair, and legally binding guidelines governing producers, buyers, agricultural listings, and digital transactions across Benue State and Nigeria.
            </p>
            <div className="terms-hero-meta">
              <span><strong>Version:</strong> 2.4 (Active)</span>
              <span>&bull;</span>
              <span><strong>Last Updated:</strong> October 2024</span>
              <span>&bull;</span>
              <span><strong>Governing Law:</strong> Laws of Benue State &amp; Federal Republic of Nigeria</span>
              <span>&bull;</span>
              <span><strong>Reading Time:</strong> ~8 minutes</span>
            </div>

            <div className="terms-hero-actions">
              <Button
                variant="outline"
                size="sm"
                icon={ArrowLeft}
                onClick={() => onNavigate('home')}
                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
              >
                Back to Marketplace
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Printer}
                onClick={handlePrint}
                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Summary Highlights for Farmers & Buyers ── */}
      <section className="terms-highlights-section">
        <div className="container">
          <div className="terms-highlights-grid">
            {/* Farmer Highlights */}
            <div className="terms-highlight-card farmer">
              <div className="terms-highlight-header">
                <div className="terms-highlight-icon farmer">
                  <Sprout size={22} />
                </div>
                <div>
                  <h3 className="terms-highlight-title">Summary for Farmers &amp; Producers</h3>
                  <span className="terms-highlight-sub">Core rules for listing your harvests</span>
                </div>
              </div>
              <ul className="terms-highlight-list">
                <li><CheckCircle2 size={15} color="#16a34a" /> Upload only authentic, unedited photos of your real produce lots.</li>
                <li><CheckCircle2 size={15} color="#16a34a" /> Quote transparent unit pricing in Naira (₦) with exact measurements.</li>
                <li><CheckCircle2 size={15} color="#16a34a" /> Toggle produce stock status to &ldquo;Sold Out&rdquo; immediately when lots are depleted.</li>
                <li><CheckCircle2 size={15} color="#16a34a" /> Subscription plans provide 30 days of active visibility with official vouchers.</li>
                <li><CheckCircle2 size={15} color="#16a34a" /> Maintain safety standards—no banned, expired, or adulterated chemicals.</li>
              </ul>
            </div>

            {/* Buyer Highlights */}
            <div className="terms-highlight-card buyer">
              <div className="terms-highlight-header">
                <div className="terms-highlight-icon buyer">
                  <ShoppingBag size={22} />
                </div>
                <div>
                  <h3 className="terms-highlight-title">Summary for Buyers &amp; Agribusinesses</h3>
                  <span className="terms-highlight-sub">Core rules for sourcing and ordering</span>
                </div>
              </div>
              <ul className="terms-highlight-list">
                <li><CheckCircle2 size={15} color="#2563eb" /> Inspect all produce quality thoroughly upon motor park waybill or farm pickup.</li>
                <li><CheckCircle2 size={15} color="#2563eb" /> Issue verified payments; zero tolerance for counterfeit transfer receipts.</li>
                <li><CheckCircle2 size={15} color="#2563eb" /> Coordinate waybill transit windows realistically for perishable goods.</li>
                <li><CheckCircle2 size={15} color="#2563eb" /> Report suspicious behavior or counterfeit lots directly to the Help Desk.</li>
                <li><CheckCircle2 size={15} color="#2563eb" /> Sourcing directly from verified farmers supports Benue rural communities.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Legal Text & Sidebar ── */}
      <section className="terms-main-section">
        <div className="container">
          <div className="terms-layout-grid">
            {/* Sidebar Navigation */}
            <aside className="terms-sidebar">
              <div className="terms-sidebar-inner">
                {/* Search in terms */}
                <div className="terms-search-box">
                  <Search size={16} className="terms-search-icon" />
                  <input
                    type="text"
                    placeholder="Search sections or clauses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="terms-search-input"
                  />
                </div>

                <div className="terms-toc-title">Table of Contents</div>
                <nav className="terms-toc-nav">
                  {sections.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className={`terms-toc-link ${activeSection === sec.id ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveSection(sec.id);
                        const el = document.getElementById(sec.id);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      <span className="terms-toc-num">{sec.number}.</span>
                      <span className="terms-toc-text">{sec.title}</span>
                    </a>
                  ))}
                </nav>

                <div className="terms-sidebar-card">
                  <ShieldCheck size={28} color="#16a34a" style={{ marginBottom: '8px' }} />
                  <h4>Food Basket Trust</h4>
                  <p>Benue Farm Bridge is committed to transparent, fair-trade agricultural commerce across Nigeria.</p>
                </div>
              </div>
            </aside>

            {/* Articles Content */}
            <main className="terms-articles-container" id="printable-terms-document">
              {filteredSections.map((sec) => {
                const IconComponent = sec.icon;
                return (
                  <article key={sec.id} id={sec.id} className="terms-section-card">
                    <div className="terms-section-header">
                      <div className="terms-section-num-badge">
                        <IconComponent size={18} />
                        <span>Section {sec.number}</span>
                      </div>
                      <h2 className="terms-section-title">{sec.title}</h2>
                    </div>
                    <div className="terms-section-body">
                      {sec.content}
                    </div>
                  </article>
                );
              })}

              {filteredSections.length === 0 && (
                <div className="terms-no-results">
                  <AlertCircle size={36} color="#94a3b8" />
                  <h3>No sections matched &ldquo;{searchQuery}&rdquo;</h3>
                  <p>Try searching for words like &ldquo;subscription&rdquo;, &ldquo;farmer&rdquo;, &ldquo;weights&rdquo;, or &ldquo;waybill&rdquo;.</p>
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                    Clear Search Query
                  </Button>
                </div>
              )}

              {/* Bottom Acceptance Banner */}
              <div className="terms-footer-acceptance">
                <div className="terms-acceptance-icon">
                  <CheckCircle2 size={24} color="#16a34a" />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Questions About These Terms?
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Our Help Desk is available 7 days a week to support farmers and buyers with account verification, waybill logistics, and trade inquiries.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('contact')}
                >
                  Contact Help Desk
                </Button>
              </div>
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
