import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle, Zap } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA.js';

const DISMISS_KEY = 'bfb_pwa_install_dismissed_until';
const SNOOZE_HOURS = 24;

export default function PWAInstallBanner({ forceOpen = false, onClose = null }) {
  const {
    isInstalled,
    isInstallable,
    isIOSDevice,
    showIOSPrompt,
    setShowIOSPrompt,
    promptToInstall
  } = usePWA();

  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (forceOpen) {
      setDismissed(false);
      return;
    }

    if (isInstalled) {
      setDismissed(true);
      return;
    }

    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
        setDismissed(true);
        return;
      }
    } catch (_) {}

    // Show banner after brief delay so initial load is smooth
    const timer = setTimeout(() => {
      setDismissed(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [forceOpen, isInstalled]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      const snoozeUntil = Date.now() + SNOOZE_HOURS * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(snoozeUntil));
    } catch (_) {}
    if (onClose) onClose();
  };

  const handleInstallClick = async () => {
    if (isIOSDevice) {
      setShowIOSPrompt(true);
      return;
    }

    const outcome = await promptToInstall();
    if (outcome === 'accepted') {
      setDismissed(true);
    }
  };

  const isVisible = !dismissed && !isInstalled && (isInstallable || isIOSDevice || forceOpen);

  return (
    <>
      {/* Floating PWA Install Banner */}
      {isVisible && (
        <aside
          className="pwa-install-banner"
          role="region"
          aria-label="Install Benue Farm Bridge App"
        >
          <div className="pwa-banner-card">
            <button
              type="button"
              className="pwa-banner-close"
              onClick={handleDismiss}
              aria-label="Dismiss app install banner"
            >
              <X size={16} />
            </button>

            <div className="pwa-banner-body">
              <div className="pwa-banner-icon-wrap">
                <img
                  src="/pwa-icon.svg"
                  alt="Benue Farm Bridge App Icon"
                  className="pwa-banner-img"
                  onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                />
              </div>

              <div className="pwa-banner-text">
                <div className="pwa-badge-row">
                  <span className="pwa-pill">Fast Mobile App</span>
                  <span className="pwa-pill-sub">Offline Ready</span>
                </div>
                <h4 className="pwa-banner-title">Install Benue Farm Bridge</h4>
                <p className="pwa-banner-desc">
                  Enjoy 1-tap home screen access, faster browsing, and offline marketplace access.
                </p>
              </div>
            </div>

            <div className="pwa-banner-actions">
              <button
                type="button"
                className="pwa-btn-secondary"
                onClick={handleDismiss}
              >
                Later
              </button>
              <button
                type="button"
                className="pwa-btn-primary"
                onClick={handleInstallClick}
              >
                <Download size={16} />
                <span>Install App</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* iOS Safari 'Add to Home Screen' Step-by-Step Guidance Modal */}
      {showIOSPrompt && (
        <div
          className="pwa-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          onClick={() => setShowIOSPrompt(false)}
        >
          <div
            className="pwa-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pwa-modal-header">
              <div className="pwa-modal-header-icon">
                <Smartphone size={24} className="text-emerald-500" />
              </div>
              <div className="pwa-modal-header-text">
                <h3 id="ios-install-title">Install on your iPhone / iPad</h3>
                <p>Add Benue Farm Bridge to your home screen for the full app experience</p>
              </div>
              <button
                type="button"
                className="pwa-modal-close"
                onClick={() => setShowIOSPrompt(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="pwa-ios-steps">
              <div className="pwa-ios-step">
                <div className="pwa-step-number">1</div>
                <div className="pwa-step-info">
                  <p className="pwa-step-text">
                    Tap the <strong>Share</strong> button at the bottom of Safari
                  </p>
                  <div className="pwa-step-icon-badge">
                    <Share size={20} />
                    <span>Share Icon</span>
                  </div>
                </div>
              </div>

              <div className="pwa-ios-step">
                <div className="pwa-step-number">2</div>
                <div className="pwa-step-info">
                  <p className="pwa-step-text">
                    Scroll down and select <strong>Add to Home Screen</strong>
                  </p>
                  <div className="pwa-step-icon-badge">
                    <PlusSquare size={20} />
                    <span>Add to Home Screen</span>
                  </div>
                </div>
              </div>

              <div className="pwa-ios-step">
                <div className="pwa-step-number">3</div>
                <div className="pwa-step-info">
                  <p className="pwa-step-text">
                    Tap <strong>Add</strong> in the top-right corner. You're done!
                  </p>
                  <div className="pwa-step-icon-badge highlight">
                    <CheckCircle size={20} />
                    <span>Instant Launch</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pwa-modal-footer">
              <button
                type="button"
                className="pwa-modal-done-btn"
                onClick={() => setShowIOSPrompt(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
