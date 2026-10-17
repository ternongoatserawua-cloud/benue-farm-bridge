import React from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA.js';

export default function PWAUpdateToast() {
  const { hasUpdate, applyUpdate } = usePWA();
  const [dismissed, setDismissed] = React.useState(false);

  if (!hasUpdate || dismissed) return null;

  return (
    <div className="pwa-update-toast" role="alert">
      <div className="pwa-update-toast-content">
        <div className="pwa-update-icon-wrap">
          <Sparkles size={18} />
        </div>
        <div className="pwa-update-text">
          <strong>Update Available</strong>
          <span>A fresh version of Benue Farm Bridge is ready.</span>
        </div>
        <button
          type="button"
          className="pwa-update-btn"
          onClick={applyUpdate}
        >
          <RefreshCw size={14} />
          <span>Update Now</span>
        </button>
        <button
          type="button"
          className="pwa-update-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss update notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
