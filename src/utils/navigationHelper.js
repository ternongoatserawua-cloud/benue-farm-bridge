/**
 * Benue Market - Navigation and Route Persistence Helpers
 * Synchronizes application routing with window.location.hash and sessionStorage
 * to ensure seamless page refresh and back/forward browser support.
 */

const STORAGE_KEY = 'benue_market_nav_state';

const VALID_PAGES = new Set([
  'home',
  'browse',
  'product-details',
  'farmers',
  'farmer-profile',
  'sell',
  'buyer-dashboard',
  'farmer-dashboard',
  'admin',
  'saved',
  'profile',
  'about',
  'contact',
  'support',
  'reset-password',
  'terms',
  'terms-and-conditions'
]);

// Protected pages that require authenticated roles and should NEVER be auto-restored on cold visits
const PROTECTED_PAGES = new Set([
  'admin',
  'farmer-dashboard',
  'buyer-dashboard',
  'profile'
]);

/**
 * Parse current route from window.location.hash with fallback to sessionStorage.
 * Guaranteed to default to 'home' on fresh visits or when accessing the root URL.
 */
export function getInitialRoute() {
  // 1. Try URL hash first
  if (typeof window !== 'undefined' && window.location.hash) {
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    if (rawHash) {
      const [pagePart, queryPart] = rawHash.split('?');
      const page = pagePart.toLowerCase();

      if (VALID_PAGES.has(page)) {
        const params = {};
        if (queryPart) {
          const searchParams = new URLSearchParams(queryPart);
          for (const [k, v] of searchParams.entries()) {
            params[k] = v;
          }
        }
        return {
          page,
          params,
          productId: params.id || params.productId || null,
          farmerId: params.id || params.farmerId || null
        };
      }
    }
  }

  // 2. If no explicit hash was supplied (cold visit to root URL), ALWAYS default to home!
  // We do NOT fall back to sessionStorage for protected dashboard pages on root load.
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only restore benign public pages like 'browse' or 'farmers' if previously visited
        if (parsed?.page && VALID_PAGES.has(parsed.page) && !PROTECTED_PAGES.has(parsed.page)) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }

  // 3. Default to home
  return {
    page: 'home',
    params: {},
    productId: null,
    farmerId: null
  };
}

/**
 * Build URL hash string from route state
 */
export function buildRouteHash(page, params = {}, productId = null, farmerId = null) {
  if (!page || page === 'home') return '#home';

  if (page === 'product-details' && (productId || params?.id)) {
    return `#product-details?id=${encodeURIComponent(productId || params.id)}`;
  }

  if (page === 'farmer-profile' && (farmerId || params?.id)) {
    return `#farmer-profile?id=${encodeURIComponent(farmerId || params.id)}`;
  }

  if (params && Object.keys(params).length > 0) {
    const cleanParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        cleanParams.set(key, String(value));
      }
    }
    const queryString = cleanParams.toString();
    return queryString ? `#${page}?${queryString}` : `#${page}`;
  }

  return `#${page}`;
}

/**
 * Persist route state in sessionStorage
 */
export function persistRouteState(routeState) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(routeState));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Completely clear persisted route state from sessionStorage (used on sign-out)
 */
export function clearRouteState() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

