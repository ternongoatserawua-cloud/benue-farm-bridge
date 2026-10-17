/**
 * Progressive Web App (PWA) Service
 * Manages service worker registration, install prompts, offline detection, and updates.
 */

let deferredPrompt = null;
let updateCallback = null;
const installListeners = new Set();
const connectionListeners = new Set();

/**
 * Check if the app is currently running in standalone (installed) mode
 */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if the client device is iOS (iPhone, iPad, iPod)
 */
export function isIOS() {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
}

/**
 * Check if the browser is Safari on iOS
 */
export function isIOSSafari() {
  if (!isIOS()) return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /safari/.test(userAgent) && !/crios|fxios|opios/.test(userAgent);
}

/**
 * Initialize PWA listeners: capture beforeinstallprompt and online/offline status
 */
export function initPWA() {
  if (typeof window === 'undefined') return;

  // Listen for native beforeinstallprompt (Android, Chrome, Edge)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar on mobile Chrome
    e.preventDefault();
    deferredPrompt = e;
    notifyInstallListeners(true);
  });

  // When app is successfully installed
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyInstallListeners(false);
    console.log('[PWA] Benue Farm Bridge was successfully installed!');
    try {
      localStorage.setItem('bfb_pwa_installed', 'true');
    } catch (_) {}
  });

  // Connection events
  window.addEventListener('online', () => notifyConnectionListeners(true));
  window.addEventListener('offline', () => notifyConnectionListeners(false));

  // Register service worker if supported
  registerServiceWorker();
}

/**
 * Register Service Worker
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Register on window load to not block initial render
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('[PWA] New version of Benue Farm Bridge is available.');
                if (typeof updateCallback === 'function') {
                  updateCallback(registration);
                }
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration failed:', error);
      });

    // Check for updates when user comes back to the tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update().catch(() => {});
        });
      }
    });
  });
}

/**
 * Trigger PWA Install Prompt
 * @returns {Promise<'accepted' | 'dismissed' | 'unsupported'>}
 */
export async function triggerInstallPrompt() {
  if (!deferredPrompt) {
    return 'unsupported';
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notifyInstallListeners(false);
    return outcome;
  } catch (err) {
    console.error('[PWA] Error triggering install prompt:', err);
    return 'dismissed';
  }
}

/**
 * Check if install prompt is currently available
 */
export function canInstall() {
  return Boolean(deferredPrompt);
}

/**
 * Subscribe to install availability changes
 */
export function onInstallAvailableChange(callback) {
  installListeners.add(callback);
  callback(Boolean(deferredPrompt));
  return () => installListeners.delete(callback);
}

function notifyInstallListeners(available) {
  installListeners.forEach((cb) => {
    try {
      cb(available);
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * Subscribe to online/offline connection status
 */
export function onConnectionChange(callback) {
  connectionListeners.add(callback);
  callback(navigator.onLine);
  return () => connectionListeners.delete(callback);
}

function notifyConnectionListeners(isOnline) {
  connectionListeners.forEach((cb) => {
    try {
      cb(isOnline);
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * Set callback when an app update is waiting
 */
export function onUpdateAvailable(callback) {
  updateCallback = callback;
}

/**
 * Tell waiting service worker to activate and reload
 */
export function applyUpdate(registration) {
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  window.location.reload();
}
