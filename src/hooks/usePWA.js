import { useState, useEffect, useCallback } from 'react';
import {
  isStandalone,
  isIOS,
  isIOSSafari,
  canInstall,
  onInstallAvailableChange,
  onConnectionChange,
  onUpdateAvailable,
  triggerInstallPrompt,
  applyUpdate
} from '../services/pwaService.js';

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(() => canInstall());
  const [isInstalled, setIsInstalled] = useState(() => isStandalone());
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isIOSDevice, setIsIOSDevice] = useState(() => isIOS());
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState(null);

  useEffect(() => {
    // Listen for installability
    const unsubInstall = onInstallAvailableChange((available) => {
      setIsInstallable(available);
      setIsInstalled(isStandalone());
    });

    // Listen for network connectivity
    const unsubConnection = onConnectionChange((online) => {
      setIsOnline(online);
    });

    // Listen for Service Worker updates
    onUpdateAvailable((reg) => {
      setUpdateRegistration(reg);
    });

    return () => {
      unsubInstall();
      unsubConnection();
    };
  }, []);

  const promptToInstall = useCallback(async () => {
    if (isIOSDevice) {
      setShowIOSPrompt(true);
      return 'ios_modal';
    }

    if (canInstall()) {
      const outcome = await triggerInstallPrompt();
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      return outcome;
    }

    // Fallback if neither applies (e.g. Chrome on iOS or desktop unsupported browser)
    setShowIOSPrompt(true);
    return 'guide_modal';
  }, [isIOSDevice]);

  const handleApplyUpdate = useCallback(() => {
    if (updateRegistration) {
      applyUpdate(updateRegistration);
    }
  }, [updateRegistration]);

  return {
    isInstallable,
    isInstalled,
    isOnline,
    isIOSDevice,
    showIOSPrompt,
    setShowIOSPrompt,
    hasUpdate: Boolean(updateRegistration),
    promptToInstall,
    applyUpdate: handleApplyUpdate
  };
}
