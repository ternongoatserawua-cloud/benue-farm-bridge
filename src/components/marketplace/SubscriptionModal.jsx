import React, { useState, useEffect } from 'react';
import {
  Zap,
  Crown,
  CheckCircle2,
  X,
  CreditCard,
  Shield,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Package,
  Lock,
  ChevronRight
} from 'lucide-react';
import {
  getSubscriptionPlans,
  activateSubscription,
  verifyAndProcessPayment,
  initPaystackPayment,
  generatePaymentRef,
  daysUntilExpiry,
  computeSubscriptionStatus,
  isSubscriptionActive,
  fetchPaymentConfig
} from '../../services/subscriptionService.js';
import { formatNaira } from '../../utils/formatters.js';

export default function SubscriptionModal({
  isOpen,
  onClose,
  currentUser,
  currentSubscription = null,
  initialPlan = null,
  onSubscribed = () => {}
}) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [step, setStep] = useState('plans'); // 'plans' | 'paying' | 'verifying' | 'success' | 'demo'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paidRef, setPaidRef] = useState('');
  const [paystackKey, setPaystackKey] = useState(
    import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_54288d5abe4013f2e4c7693007543d8d36c1ee5b'
  );

  useEffect(() => {
    if (isOpen) {
      setPlans(getSubscriptionPlans());
      setStep('plans');
      setError('');
      setSelectedPlan(initialPlan || null);

      // Dynamically fetch freshest payment credentials from backend
      fetchPaymentConfig().then((cfg) => {
        if (cfg?.publicKey) {
          setPaystackKey(cfg.publicKey);
        }
      });
    }
  }, [isOpen, initialPlan]);

  if (!isOpen) return null;

  const isRenewal = isSubscriptionActive(currentSubscription);
  const subStatus = computeSubscriptionStatus(currentSubscription);
  const daysLeft = daysUntilExpiry(currentSubscription);
  const currentPlanId = currentSubscription?.planId;

  // Check if Paystack public key is configured
  const effectiveKey = paystackKey || import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY || '';
  const isRealKey = Boolean(
    effectiveKey &&
    !effectiveKey.includes('xxxxx') &&
    !effectiveKey.includes('placeholder') &&
    !effectiveKey.includes('your_paystack') &&
    (effectiveKey.startsWith('pk_live_') || effectiveKey.startsWith('pk_test_'))
  );

  // ── Payment via Paystack ──────────────────────────────────────────────────
  const handlePay = async (plan) => {
    setLoading(true);
    setError('');

    const email = currentUser?.email || 'vendor@benuemarket.ng';
    const ref = generatePaymentRef(currentUser?.id);
    const amountKobo = plan.price * 100; // Paystack uses kobo

    // Ensure we have the freshest key
    let keyToUse = effectiveKey;
    if (!isRealKey) {
      const freshCfg = await fetchPaymentConfig();
      if (freshCfg?.publicKey && (freshCfg.publicKey.startsWith('pk_test_') || freshCfg.publicKey.startsWith('pk_live_'))) {
        keyToUse = freshCfg.publicKey;
        setPaystackKey(freshCfg.publicKey);
      }
    }

    const keyIsValid = Boolean(
      keyToUse &&
      !keyToUse.includes('placeholder') &&
      !keyToUse.includes('your_paystack') &&
      (keyToUse.startsWith('pk_live_') || keyToUse.startsWith('pk_test_'))
    );

    if (keyIsValid) {
      setStep('paying');
      setSelectedPlan(plan);
      const result = await initPaystackPayment({
        key: keyToUse,
        email,
        amount: amountKobo,
        ref,
        metadata: {
          custom_fields: [
            { display_name: 'Vendor', variable_name: 'vendor_id', value: currentUser?.id },
            { display_name: 'Plan', variable_name: 'plan_id', value: plan.id }
          ]
        },
        onSuccess: async (reference) => {
          setStep('verifying');
          setLoading(true);
          const verifyResult = await verifyAndProcessPayment({
            reference,
            planId: plan.id,
            vendorId: currentUser?.id,
            isRenewal
          });

          if (verifyResult.error) {
            setError(`Verification error: ${verifyResult.error}`);
            setStep('plans');
            setLoading(false);
            return;
          }

          setPaidRef(reference);
          setStep('success');
          setLoading(false);
          onSubscribed({ planId: plan.id, reference });
        },
        onClose: () => {
          setStep('plans');
          setLoading(false);
        }
      });

      if (!result.success && result.error) {
        setError(result.error);
        setStep('plans');
        setLoading(false);
      }
    } else {
      // Demo / Test mode — prompt user for test activation
      setStep('demo');
      setSelectedPlan(plan);
      setLoading(false);
    }
  };


  // ── Demo-mode activation ──────────────────────────────────────────────────
  const handleDemoActivate = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError('');

    const demoRef = `BFB-DEMO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const verifyResult = await verifyAndProcessPayment({
      reference: demoRef,
      planId: selectedPlan.id,
      vendorId: currentUser?.id,
      isRenewal
    });

    if (verifyResult.error) {
      setError(verifyResult.error);
      setLoading(false);
      return;
    }

    setPaidRef(demoRef);
    setStep('success');
    setLoading(false);
    onSubscribed({ planId: selectedPlan.id, reference: demoRef });
  };

  const PLAN_ICONS = { starter: Zap, growth: Crown };
  const PLAN_GRADIENTS = {
    starter: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    growth: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
  };
  const PLAN_LIGHT = { starter: '#f0fdf4', growth: '#f5f3ff' };
  const PLAN_BORDER = { starter: '#bbf7d0', growth: '#ddd6fe' };

  return (
    /* ── Backdrop ── */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', overflowY: 'auto'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: '780px',
          background: '#fff', borderRadius: '20px',
          boxShadow: '0 25px 80px rgba(15,23,42,0.22)',
          overflow: 'hidden', position: 'relative',
          animation: 'subscriptionModalIn 0.35s cubic-bezier(0.16,1,0.3,1)'
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#1a3a2a 100%)',
          padding: '28px 32px 24px', position: 'relative', overflow: 'hidden'
        }}>
          {/* Decorative circles */}
          <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'140px', height:'140px', borderRadius:'50%', background:'rgba(22,163,74,0.15)' }} />
          <div style={{ position:'absolute', bottom:'-20px', left:'-20px', width:'100px', height:'100px', borderRadius:'50%', background:'rgba(124,58,237,0.12)' }} />

          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px' }}>
              <div style={{
                width:'40px', height:'40px', borderRadius:'10px',
                background:'linear-gradient(135deg,#16a34a,#15803d)',
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                <Sparkles size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin:0, color:'#fff', fontSize:'1.4rem', fontWeight:'800', fontFamily:'var(--font-display)' }}>
                  {step === 'success' ? 'Subscription Activated! 🎉' :
                   step === 'demo'    ? 'Confirm Plan Selection' :
                   isRenewal         ? 'Renew Your Subscription' :
                                       'Advertise on Benue Market'}
                </h2>
                <p style={{ margin:0, color:'rgba(255,255,255,0.65)', fontSize:'13px' }}>
                  {step === 'success' ? 'Your products are now visible on the marketplace' :
                   'Choose a plan to make your products visible to thousands of buyers'}
                </p>
              </div>
            </div>

            {/* Expiry alert banner */}
            {(subStatus === 'expiring_soon' || subStatus === 'expired') && step === 'plans' && (
              <div style={{
                marginTop:'16px', padding:'10px 14px', borderRadius:'8px',
                background: subStatus === 'expired' ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.18)',
                border: `1px solid ${subStatus === 'expired' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
                display:'flex', alignItems:'center', gap:'8px',
                color: subStatus === 'expired' ? '#fca5a5' : '#fde68a', fontSize:'13px', fontWeight:'600'
              }}>
                <AlertCircle size={15} style={{flexShrink:0}} />
                {subStatus === 'expired'
                  ? 'Your subscription has expired — your products are now hidden from the public storefront.'
                  : `⚠️ Your subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now to avoid interruption.`}
              </div>
            )}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position:'absolute', top:'16px', right:'16px',
              background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'8px',
              width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', cursor:'pointer', transition:'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding:'28px 32px' }}>

          {/* ── SUCCESS STATE ── */}
          {step === 'success' && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{
                width:'72px', height:'72px', borderRadius:'50%',
                background:'linear-gradient(135deg,#d1fae5,#a7f3d0)',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 20px'
              }}>
                <CheckCircle2 size={36} color="#059669" />
              </div>
              <h3 style={{ margin:'0 0 10px', fontSize:'1.3rem', fontWeight:'800', color:'#0f172a' }}>
                You're Live on Benue Market!
              </h3>
              <p style={{ margin:'0 0 20px', fontSize:'14px', color:'#64748b', lineHeight:'1.6' }}>
                Your subscription is now active. Your approved products are visible to buyers across Benue State and beyond.
              </p>
              {paidRef && (
                <div style={{
                  padding:'10px 16px', borderRadius:'8px', background:'#f8fafc',
                  border:'1px solid #e2e8f0', fontSize:'12px', color:'#64748b',
                  marginBottom:'20px', fontFamily:'monospace'
                }}>
                  Transaction Ref: <strong style={{color:'#0f172a'}}>{paidRef}</strong>
                </div>
              )}
              <button
                onClick={onClose}
                style={{
                  background:'linear-gradient(135deg,#16a34a,#15803d)',
                  color:'#fff', border:'none', borderRadius:'10px',
                  padding:'12px 32px', fontSize:'15px', fontWeight:'700',
                  cursor:'pointer', fontFamily:'var(--font-display)'
                }}
              >
                Go to My Dashboard
              </button>
            </div>
          )}

          {/* ── VERIFYING STATE ── */}
          {step === 'verifying' && (
            <div style={{ textAlign:'center', padding:'36px 16px' }}>
              <div style={{
                width:'68px', height:'68px', borderRadius:'50%',
                background:'linear-gradient(135deg,#e0e7ff,#c7d2fe)',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 20px',
                boxShadow:'0 10px 25px rgba(99,102,241,0.2)'
              }}>
                <Loader2 size={34} color="#4f46e5" className="animate-spin" />
              </div>
              <h3 style={{ margin:'0 0 8px', fontSize:'1.3rem', fontWeight:'800', color:'#0f172a' }}>
                Securing & Verifying Transaction
              </h3>
              <p style={{ margin:'0 0 20px', fontSize:'14px', color:'#64748b', maxWidth:'420px', marginInline:'auto' }}>
                Communicating with Paystack gateway and recording verified transaction to database...
              </p>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'8px',
                padding:'8px 16px', borderRadius:'20px', background:'#f8fafc',
                border:'1px solid #e2e8f0', fontSize:'12px', color:'#64748b'
              }}>
                <Shield size={14} color="#16a34a" /> 256-Bit SSL Encrypted Verification
              </div>
            </div>
          )}

          {/* ── DEMO CONFIRMATION STATE ── */}
          {step === 'demo' && selectedPlan && (
            <div style={{ maxWidth:'480px', margin:'0 auto', textAlign:'center' }}>
              <div style={{
                padding:'20px', borderRadius:'14px', marginBottom:'20px',
                background: PLAN_LIGHT[selectedPlan.id],
                border:`2px solid ${PLAN_BORDER[selectedPlan.id]}`
              }}>
                <div style={{
                  width:'52px', height:'52px', borderRadius:'12px',
                  background: PLAN_GRADIENTS[selectedPlan.id],
                  display:'flex', alignItems:'center', justifyContent:'center',
                  margin:'0 auto 12px'
                }}>
                  {React.createElement(PLAN_ICONS[selectedPlan.id] || Zap, { size:24, color:'#fff' })}
                </div>
                <h3 style={{ margin:'0 0 4px', fontSize:'1.1rem', fontWeight:'800', color:'#0f172a' }}>
                  {selectedPlan.name} Plan
                </h3>
                <p style={{ margin:0, fontSize:'13px', color:'#64748b' }}>
                  {formatNaira(selectedPlan.price)}/month · Up to {selectedPlan.maxProducts} products
                </p>
              </div>

              <div style={{
                padding:'14px 16px', borderRadius:'10px', marginBottom:'20px',
                background:'#fffbeb', border:'1px solid #fef3c7',
                fontSize:'13px', color:'#92400e', textAlign:'left', lineHeight:'1.5'
              }}>
                <div style={{ fontWeight:'700', marginBottom:'4px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <AlertCircle size={15} /> Paystack Setup Notice
                </div>
                Placeholders have been set in your <code>.env</code> file. To process real credit/debit card, bank transfer, and USSD payments, add your live or test keys (<code>VITE_PAYSTACK_PUBLIC_KEY</code> & <code>PAYSTACK_SECRET_KEY</code>). You can proceed below to test full subscription activation in sandbox mode.
              </div>

              {error && (
                <div style={{
                  padding:'10px 14px', borderRadius:'8px', marginBottom:'14px',
                  background:'#fee2e2', color:'#b91c1c',
                  display:'flex', alignItems:'center', gap:'8px', fontSize:'13px'
                }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div style={{ display:'flex', gap:'10px' }}>
                <button
                  onClick={() => { setStep('plans'); setSelectedPlan(null); }}
                  style={{
                    flex:1, padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0',
                    background:'#fff', color:'#64748b', fontSize:'14px', fontWeight:'600',
                    cursor:'pointer'
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleDemoActivate}
                  disabled={loading}
                  style={{
                    flex:2, padding:'12px', borderRadius:'10px', border:'none',
                    background: PLAN_GRADIENTS[selectedPlan.id],
                    color:'#fff', fontSize:'14px', fontWeight:'700',
                    cursor:loading?'not-allowed':'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                  }}
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Activating…</> : 'Activate Subscription (Sandbox)'}
                </button>
              </div>
            </div>
          )}

          {/* ── PLAN SELECTION STATE ── */}
          {(step === 'plans' || step === 'paying') && (
            <>
              {/* Paystack status pill */}
              <div style={{
                marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'8px 14px', borderRadius:'10px',
                background: isRealKey ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${isRealKey ? '#bbf7d0' : '#e2e8f0'}`
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color: isRealKey ? '#15803d' : '#64748b', fontWeight:'600' }}>
                  <Shield size={14} color={isRealKey ? '#16a34a' : '#94a3b8'} />
                  {isRealKey ? 'Paystack Gateway Active (Live/Test Mode)' : 'Sandbox Mode (Paystack Keys Pending in .env)'}
                </div>
                <span style={{
                  fontSize:'11px', padding:'2px 8px', borderRadius:'12px', fontWeight:'700',
                  background: isRealKey ? '#dcfce7' : '#e2e8f0',
                  color: isRealKey ? '#166534' : '#475569'
                }}>
                  {isRealKey ? 'Paystack Verified' : 'Placeholder Ready'}
                </span>
              </div>

              {error && (
                <div style={{
                  padding:'10px 14px', borderRadius:'8px', marginBottom:'16px',
                  background:'#fee2e2', color:'#b91c1c',
                  display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', fontWeight:'600'
                }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}


              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'16px', marginBottom:'24px' }}>
                {plans.map((plan) => {
                  const PlanIcon = PLAN_ICONS[plan.id] || Zap;
                  const isCurrentPlan = currentPlanId === plan.id && isSubscriptionActive(currentSubscription);
                  return (
                    <div
                      key={plan.id}
                      style={{
                        border: `2px solid ${isCurrentPlan ? plan.color : '#e2e8f0'}`,
                        borderRadius:'16px', overflow:'hidden',
                        transition:'transform 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: isCurrentPlan ? `0 0 0 2px ${plan.color}30` : '0 1px 3px rgba(0,0,0,0.06)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = `0 10px 30px ${plan.color}22`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = isCurrentPlan ? `0 0 0 2px ${plan.color}30` : '0 1px 3px rgba(0,0,0,0.06)';
                      }}
                    >
                      {/* Plan header */}
                      <div style={{ background: PLAN_GRADIENTS[plan.id], padding:'20px' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                          <div style={{
                            width:'40px', height:'40px', borderRadius:'10px',
                            background:'rgba(255,255,255,0.2)',
                            display:'flex', alignItems:'center', justifyContent:'center'
                          }}>
                            <PlanIcon size={20} color="#fff" />
                          </div>
                          {plan.badge && (
                            <span style={{
                              padding:'3px 10px', borderRadius:'20px',
                              background:'rgba(255,255,255,0.25)',
                              color:'#fff', fontSize:'11px', fontWeight:'700'
                            }}>
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <div style={{ color:'#fff' }}>
                          <div style={{ fontSize:'1.05rem', fontWeight:'800', fontFamily:'var(--font-display)', marginBottom:'2px' }}>
                            {plan.name} Plan
                          </div>
                          <div style={{ fontSize:'1.8rem', fontWeight:'900', fontFamily:'var(--font-display)' }}>
                            {formatNaira(plan.price)}
                            <span style={{ fontSize:'13px', fontWeight:'500', opacity:0.8 }}>/month</span>
                          </div>
                          <div style={{ fontSize:'12px', opacity:0.85, marginTop:'4px', display:'flex', alignItems:'center', gap:'5px' }}>
                            <Package size={12} /> Up to {plan.maxProducts} product listings
                          </div>
                        </div>
                      </div>

                      {/* Features */}
                      <div style={{ padding:'16px 20px', background:'#fff' }}>
                        <ul style={{ listStyle:'none', margin:'0 0 16px', padding:0, display:'flex', flexDirection:'column', gap:'8px' }}>
                          {plan.features.map((feat, i) => (
                            <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'13px', color:'#475569' }}>
                              <CheckCircle2 size={14} style={{ flexShrink:0, marginTop:'2px', color: plan.color }} />
                              {feat}
                            </li>
                          ))}
                        </ul>

                        {isCurrentPlan ? (
                          <div style={{
                            padding:'10px', borderRadius:'8px',
                            background: PLAN_LIGHT[plan.id],
                            border:`1px solid ${PLAN_BORDER[plan.id]}`,
                            textAlign:'center', fontSize:'13px', fontWeight:'700', color: plan.color
                          }}>
                            ✓ Current Plan — {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePay(plan)}
                            disabled={loading || step === 'paying'}
                            style={{
                              width:'100%', padding:'11px', borderRadius:'10px', border:'none',
                              background: PLAN_GRADIENTS[plan.id],
                              color:'#fff', fontSize:'14px', fontWeight:'700',
                              cursor: (loading || step === 'paying') ? 'not-allowed' : 'pointer',
                              display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                              transition:'opacity 0.15s', opacity: (loading || step === 'paying') ? 0.7 : 1
                            }}
                          >
                            {loading && selectedPlan?.id === plan.id
                              ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
                              : <><CreditCard size={15} /> {isRenewal && currentPlanId === plan.id ? 'Renew Plan' : isRenewal ? 'Switch & Renew' : 'Subscribe Now'} <ChevronRight size={14} /></>
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Security note */}
              <div style={{
                display:'flex', alignItems:'center', gap:'8px', justifyContent:'center',
                color:'#94a3b8', fontSize:'12px'
              }}>
                <Shield size={13} />
                Payments secured by Paystack · SSL Encrypted · Instant Activation
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes subscriptionModalIn {
          from { opacity:0; transform:scale(0.94) translateY(16px); }
          to   { opacity:1; transform:scale(1)    translateY(0); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
