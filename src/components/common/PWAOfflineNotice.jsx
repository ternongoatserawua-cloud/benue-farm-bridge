import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA.js';

export default function PWAOfflineNotice() {
  const { isOnline } = usePWA();
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestored(false);
    } else if (wasOffline) {
      // Transition from offline to online
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div className="pwa-offline-bar" role="status" aria-live="polite">
        <div className="pwa-offline-bar-inner">
          <WifiOff size={16} className="pwa-offline-icon" />
          <span>You are offline. Showing cached products and saved bookmarks.</span>
        </div>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="pwa-online-bar" role="status" aria-live="polite">
        <div className="pwa-online-bar-inner">
          <Wifi size={16} className="pwa-online-icon" />
          <span>Internet restored. Marketplace synced.</span>
        </div>
      </div>
    );
  }

  return null;
}
