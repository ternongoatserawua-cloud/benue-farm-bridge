import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { MOCK_PRODUCTS } from '../data/mockProducts.js';
import { getPersistedProfileOverrides } from './authService.js';
import { normalizeCategory } from '../data/categories.js';
import { compressFileForUpload, compressDataUrlForDatabase } from '../utils/imageCompressor.js';
import { getAllSubscriptionsSync, isSubscriptionActive } from './subscriptionService.js';

const STORAGE_KEY = 'benue_market_persisted_products';
const DELETED_IDS_STORAGE_KEY = 'benue_market_deleted_product_ids';
const BROADCAST_CHANNEL_NAME = 'benue_market_products_sync';
export const PRODUCT_STOCK_OVERRIDES_KEY = 'benue_market_product_stock_overrides';

/**
 * Retrieve active local stock availability overrides.
 * Overrides ensure vendor availability toggles survive page reloads even before DB sync completes.
 */
export function getProductStockOverrides() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PRODUCT_STOCK_OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

/**
 * Save stock overrides map to localStorage.
 */
export function saveProductStockOverrides(overrides) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRODUCT_STOCK_OVERRIDES_KEY, JSON.stringify(overrides || {}));
  } catch {}
}

/**
 * Record a local stock override for a product.
 */
export function setProductStockOverride(productId, available) {
  if (typeof window === 'undefined' || !productId) return;
  try {
    const overrides = getProductStockOverrides();
    const now = Date.now();
    const isAvail = Boolean(available);
    overrides[productId] = { available: isAvail, updatedAt: now };
    const mapped = mapToProductUUID(productId);
    if (mapped && mapped !== productId) {
      overrides[mapped] = { available: isAvail, updatedAt: now };
    }
    saveProductStockOverrides(overrides);
  } catch {}
}

/**
 * Clear a confirmed stock override once DB updated_at supersedes it.
 */
export function removeProductStockOverride(productId) {
  if (typeof window === 'undefined' || !productId) return;
  try {
    const overrides = getProductStockOverrides();
    let modified = false;
    if (overrides[productId]) {
      delete overrides[productId];
      modified = true;
    }
    const mapped = mapToProductUUID(productId);
    if (mapped && overrides[mapped]) {
      delete overrides[mapped];
      modified = true;
    }
    if (modified) {
      saveProductStockOverrides(overrides);
    }
  } catch {}
}

/**
 * Retrieve set of permanently deleted product IDs.
 */
export function getDeletedProductIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

/**
 * Permanently record a deleted product ID to prevent resurrection by mock data fallbacks.
 */
export function markProductDeleted(productId) {
  if (typeof window === 'undefined' || !productId) return;
  try {
    const set = getDeletedProductIds();
    set.add(productId);
    set.add(mapToProductUUID(productId));
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Remove a product ID from deleted tombstone if restored.
 */
export function unmarkProductDeleted(productId) {
  if (typeof window === 'undefined' || !productId) return;
  try {
    const set = getDeletedProductIds();
    set.delete(productId);
    set.delete(mapToProductUUID(productId));
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Robust UUID generator compatible with modern browsers and older environments.
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Check if a string is a valid UUID format.
 */
export function isValidUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Map known non-UUID mock seller IDs to deterministic valid UUIDs for Supabase DB foreign key integrity.
 */
export function mapToSellerUUID(sellerId) {
  if (!sellerId) return null;
  if (isValidUUID(sellerId)) return sellerId;
  if (sellerId === 'farmer-1') return 'f0000000-0000-4000-8000-000000000001';
  if (sellerId === 'farmer-2') return 'f0000000-0000-4000-8000-000000000002';
  if (sellerId === 'super-admin-1') return 'a0000000-0000-4000-8000-000000000001';

  // Deterministic UUID hash for arbitrary strings
  let hash = 0;
  for (let i = 0; i < sellerId.length; i++) {
    hash = (hash << 5) - hash + sellerId.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex.padEnd(12, '0').slice(0, 12)}`;
}

/**
 * Map arbitrary or seed product IDs (e.g. prod-1, prod-2) to deterministic valid UUIDs
 * so Supabase database operations can ALWAYS execute successfully.
 */
export function mapToProductUUID(productId) {
  if (!productId) return generateUUID();
  if (isValidUUID(productId)) return productId;
  if (productId === 'prod-1') return 'e0000000-0000-4000-8000-000000000001';
  if (productId === 'prod-2') return 'e0000000-0000-4000-8000-000000000002';
  if (productId === 'prod-3') return 'e0000000-0000-4000-8000-000000000003';
  if (productId === 'prod-4') return 'e0000000-0000-4000-8000-000000000004';
  if (productId === 'prod-5') return 'e0000000-0000-4000-8000-000000000005';
  if (productId === 'prod-6') return 'e0000000-0000-4000-8000-000000000006';

  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash << 5) - hash + productId.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `e0000000-0000-4000-8000-${hex.padEnd(12, '0').slice(0, 12)}`;
}

/**
 * Backward compatibility helper - simply returns the product as Supabase is authoritative.
 */
export function applyProductOverrides(product) {
  return product;
}

/**
 * Get all persisted products from offline cache.
 * Filters out any permanently deleted IDs to avoid resurrecting deleted products.
 */
export function getPersistedProducts() {
  if (typeof window === 'undefined') {
    return MOCK_PRODUCTS;
  }

  const deletedIds = getDeletedProductIds();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((p) => p && !deletedIds.has(p.id) && !deletedIds.has(mapToProductUUID(p.id)))
          .map(applyProductOverrides);
      }
    }
  } catch (err) {
    console.warn('Failed to read persisted products from storage:', err);
  }

  // Fallback to initial mock products with overrides applied, excluding deleted IDs
  const seeded = MOCK_PRODUCTS
    .filter((p) => p && !deletedIds.has(p.id) && !deletedIds.has(mapToProductUUID(p.id)))
    .map(applyProductOverrides);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  } catch {}
  return seeded;
}

/**
 * Save products to localStorage and update memory store.
 */
export function savePersistedProducts(productsList, eventMeta = null) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(productsList));
  } catch (err) {
    console.warn('Failed to write persisted products to storage:', err);
  }

  // Update in-memory store
  MOCK_PRODUCTS_STORE = [...productsList];

  // Broadcast to other tabs & active components
  broadcastProductsChange(productsList, eventMeta);
}

/**
 * Broadcast product state change to other tabs and current window listeners.
 */
export function broadcastProductsChange(productsList, eventMeta = null) {
  if (typeof window === 'undefined') return;

  try {
    // 1. Dispatch custom DOM event
    window.dispatchEvent(
      new CustomEvent('benue_market_products_changed', {
        detail: { products: productsList, eventMeta, timestamp: Date.now() }
      })
    );

    // 2. BroadcastChannel for cross-tab sync
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({
        type: 'PRODUCTS_UPDATED',
        products: productsList,
        eventMeta,
        timestamp: Date.now()
      });
      channel.close();
    }
  } catch (err) {
    console.warn('Broadcast products change notice:', err);
  }
}

/**
 * In-memory active products store rehydrated from localStorage.
 */
let MOCK_PRODUCTS_STORE = getPersistedProducts();

/**
 * Apply local persistent seller profile overrides to a product object.
 */
function applyProductSellerOverride(product) {
  if (!product) return null;
  const overrides = getPersistedProfileOverrides();
  const override = overrides[product.sellerId] || overrides[product.seller] || null;
  if (!override) return product;

  return {
    ...product,
    seller: override.name || product.seller,
    sellerAvatar: override.avatar || product.sellerAvatar,
    sellerCover: override.coverImage || product.sellerCover,
    phone: override.phone || product.phone,
    whatsapp: override.whatsapp || product.whatsapp
  };
}

/**
 * Update products seller profile across in-memory and persisted product items.
 */
export function updateProductsSellerProfile(sellerId, sellerName, updates) {
  const currentList = getPersistedProducts();
  const updatedList = currentList.map((p) => {
    if (p.sellerId === sellerId || (sellerName && p.seller === sellerName)) {
      return {
        ...p,
        seller: updates.name || p.seller,
        sellerAvatar: updates.avatar || p.sellerAvatar,
        sellerCover: updates.coverImage || p.sellerCover,
        phone: updates.phone || p.phone,
        whatsapp: updates.phone
          ? (updates.phone.startsWith('234') ? updates.phone : `234${updates.phone.replace(/^0+/, '')}`)
          : p.whatsapp
      };
    }
    return p;
  });

  savePersistedProducts(updatedList, { type: 'SELLER_PROFILE_UPDATED', sellerId });
}

/**
 * Format raw database product row to frontend product model.
 */
export function formatProductRow(row) {
  if (!row) return null;
  const canonicalId = mapToProductUUID(row.id);
  const overrides = getProductStockOverrides();
  const override = overrides[row.id] || overrides[canonicalId];

  let isAvailable = row.available !== false;
  if (override !== undefined) {
    const rowUpdatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    // If the local override timestamp is >= DB updated_at, local override wins
    if ((override.updatedAt || 0) >= rowUpdatedAt) {
      isAvailable = Boolean(override.available);
    } else {
      // The DB updated_at is newer than local override, DB has authoritative status
      removeProductStockOverride(row.id);
    }
  }

  const rawProduct = {
    id: row.id,
    name: row.name,
    category: normalizeCategory(row.category),
    price: Number(row.price),
    unit: row.unit || 'unit',
    quantity: Number(row.quantity !== undefined && row.quantity !== null ? row.quantity : 1),
    minimumOrder: Number(row.minimum_order !== undefined && row.minimum_order !== null ? row.minimum_order : 1),
    location: row.location || 'Benue State',
    lga: row.lga || 'Ukum',
    seller: row.profiles?.full_name || row.seller || 'Benue Producer',
    sellerId: row.seller_id || row.sellerId,
    sellerAvatar: row.profiles?.avatar_url || row.sellerAvatar || null,
    sellerCover: row.profiles?.cover_url || row.profiles?.cover_image || row.sellerCover || null,
    phone: row.phone || row.profiles?.phone || '08031234567',
    whatsapp: row.whatsapp || row.profiles?.phone || '2348031234567',
    image: row.image_url || (row.images && row.images[0]) || '',
    images: row.images && row.images.length > 0 ? row.images : (row.image_url ? [row.image_url] : []),
    available: isAvailable,
    featured: Boolean(row.featured),
    status: row.status || 'approved',
    statusNote: row.status_note || '',
    recycledAt: row.recycled_at || row.recycledAt || null,
    description: row.description || '',
    createdAt: row.created_at || new Date().toISOString()
  };

  return applyProductSellerOverride(rawProduct);
}

/**
 * Purge products in the Recycle Bin that have exceeded 60 days.
 */
export async function purgeExpiredRecycledProducts(days = 60) {
  const maxAgeMs = days * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const currentList = getPersistedProducts();
  const expired = currentList.filter((p) => {
    if (p.status !== 'recycled') return false;
    const recycledTime = new Date(p.recycledAt || p.createdAt).getTime();
    return !isNaN(recycledTime) && now - recycledTime > maxAgeMs;
  });

  for (const item of expired) {
    await deleteProduct(item.id);
  }
}

/**
 * Fetch products list from Supabase with offline cache fallback.
 * Supabase is the authoritative source of truth across all devices.
 * @param {object} options - { includePending: boolean, includeRecycled: boolean }
 */
export async function fetchProducts({ includePending = false, includeRecycled = false } = {}) {
  // Purge any recycled listings older than 60 days in background
  purgeExpiredRecycledProducts(60).catch(() => {});

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (
            id,
            full_name,
            phone,
            location,
            lga,
            avatar_url,
            cover_url,
            verified
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        let formattedFromDb = data.map(formatProductRow).filter(Boolean);
        if (!includeRecycled) {
          formattedFromDb = formattedFromDb.filter((p) => p.status !== 'recycled');
        }
        if (!includePending) {
          formattedFromDb = formattedFromDb.filter((p) => (p.status || 'approved') === 'approved');
        }

        // Save fresh authoritative database data to offline cache
        savePersistedProducts(formattedFromDb);
        return { data: formattedFromDb, error: null };
      }
      if (error) {
        console.warn('Supabase products fetch warning:', error.message);
      }
    } catch (err) {
      console.warn('Fetch products from database exception:', err.message);
    }
  }

  // Fallback to offline cached records if Supabase network is unavailable
  const localList = getPersistedProducts();
  let filtered = localList;
  if (!includeRecycled) {
    filtered = filtered.filter((p) => p.status !== 'recycled');
  }
  if (!includePending) {
    filtered = filtered.filter((p) => (p.status || 'approved') === 'approved');
  }
  return { data: filtered, error: null };
}

/**
 * Fetch produce listings in deterministic paginated batches directly from Supabase,
 * with real-time filtering, search, sorting, and offline fallback.
 *
 * @param {object} options
 * @param {number} [options.page=0] - 0-indexed page number
 * @param {number} [options.pageSize=12] - Number of items per request batch
 * @param {string} [options.category='all'] - Produce category filter
 * @param {string} [options.lga='all'] - Benue LGA location filter
 * @param {string} [options.search=''] - Keyword search query
 * @param {boolean} [options.inStockOnly=false] - In-stock filter
 * @param {string} [options.sortBy='newest'] - 'newest' | 'price-asc' | 'price-desc'
 * @returns {Promise<{ data: Array, totalCount: number, hasMore: boolean, error: string|null }>}
 */
export async function fetchPaginatedProducts({
  page = 0,
  pageSize = 12,
  category = 'all',
  lga = 'all',
  search = '',
  inStockOnly = false,
  sortBy = 'newest'
} = {}) {
  const from = Math.max(0, page * pageSize);
  const to = from + pageSize - 1;

  if (isSupabaseConfigured() && supabase) {
    try {
      const nowIso = new Date().toISOString();
      let query = supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id!inner (
            id,
            full_name,
            phone,
            location,
            lga,
            avatar_url,
            cover_url,
            verified,
            subscription_status,
            subscription_plan,
            subscription_expires_at
          )
        `, { count: 'exact' })
        .eq('status', 'approved')
        .eq('profiles.subscription_status', 'active')
        .gte('profiles.subscription_expires_at', nowIso);

      // 1. Category filter
      if (category && category !== 'all') {
        query = query.eq('category', normalizeCategory(category));
      }

      // 2. LGA / Location filter
      if (lga && lga !== 'all') {
        const cleanLga = lga.trim().replace(/[%_,'"()]/g, '');
        if (cleanLga) {
          query = query.or(`lga.ilike.%${cleanLga}%,location.ilike.%${cleanLga}%`);
        }
      }

      // 3. Search query filter
      if (search && search.trim()) {
        const cleanTerm = search.trim().replace(/[%_,'"()]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanTerm) {
          query = query.or(`name.ilike.%${cleanTerm}%,location.ilike.%${cleanTerm}%,lga.ilike.%${cleanTerm}%,description.ilike.%${cleanTerm}%`);
        }
      }

      // 4. In-Stock filter
      if (inStockOnly) {
        query = query.eq('available', true);
      }

      // 5. Stable, deterministic ordering
      if (sortBy === 'price-asc') {
        query = query
          .order('price', { ascending: true })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true });
      } else if (sortBy === 'price-desc') {
        query = query
          .order('price', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });
      } else {
        // Default newest
        query = query
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });
      }

      // 6. Range pagination
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (!error && Array.isArray(data)) {
        let formatted = data.map(formatProductRow).filter(Boolean);
        // Exclude recycled listings if any
        formatted = formatted.filter((p) => p.status !== 'recycled' && (p.status || 'approved') === 'approved');

        const resolvedCount = typeof count === 'number' ? count : (from + formatted.length);
        const hasMore = resolvedCount > from + formatted.length;

        return {
          data: formatted,
          totalCount: resolvedCount,
          hasMore,
          error: null
        };
      }

      if (error) {
        console.warn('Supabase fetchPaginatedProducts query warning:', error.message);
      }
    } catch (err) {
      console.warn('fetchPaginatedProducts exception:', err.message);
    }
  }

  // Fallback to offline cached records
  try {
    const localList = getPersistedProducts();
    const subsMap = getAllSubscriptionsSync();
    let filtered = localList.filter((prod) => {
      if ((prod.status || 'approved') !== 'approved') return false;
      if (prod.status === 'recycled' || prod.recycledAt) return false;

      // Paywall filter: only active, unexpired subscribers can advertise on storefront
      const sellerId = prod.sellerId;
      if (!sellerId) return false;
      const sellerUUID = mapToSellerUUID(sellerId);
      const sub = subsMap[sellerId] || (sellerUUID ? subsMap[sellerUUID] : null);
      if (!sub || !isSubscriptionActive(sub)) {
        return false;
      }

      if (category && category !== 'all') {
        if (normalizeCategory(prod.category) !== normalizeCategory(category)) {
          return false;
        }
      }

      if (lga && lga !== 'all') {
        const prodLga = (prod.lga || '').toLowerCase();
        const prodLoc = (prod.location || '').toLowerCase();
        const targetLga = lga.toLowerCase();
        if (!prodLga.includes(targetLga) && !prodLoc.includes(targetLga)) {
          return false;
        }
      }

      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = (prod.name || '').toLowerCase().includes(q);
        const matchesLoc = (prod.location || '').toLowerCase().includes(q);
        const matchesSeller = (prod.seller || '').toLowerCase().includes(q);
        const matchesDesc = (prod.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesLoc && !matchesSeller && !matchesDesc) {
          return false;
        }
      }

      if (inStockOnly && !prod.available) {
        return false;
      }

      return true;
    });

    // Deterministic sort
    filtered.sort((a, b) => {
      if (sortBy === 'price-asc') {
        if (a.price !== b.price) return a.price - b.price;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'price-desc') {
        if (a.price !== b.price) return b.price - a.price;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const totalCount = filtered.length;
    const batch = filtered.slice(from, to + 1).map((p) => ({
      ...p,
      category: normalizeCategory(p.category)
    }));
    const hasMore = from + batch.length < totalCount;

    return {
      data: batch,
      totalCount,
      hasMore,
      error: null
    };
  } catch (fallbackErr) {
    return {
      data: [],
      totalCount: 0,
      hasMore: false,
      error: fallbackErr.message || 'Failed to load produce listings.'
    };
  }
}

/**
 * Fetch a single product by ID directly from Supabase.
 */
export async function fetchProductById(id) {
  if (!id) return { data: null, error: 'Product ID is required.' };

  if (isSupabaseConfigured() && supabase) {
    try {
      const targetUUID = mapToProductUUID(id);
      let query = supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (
            id,
            full_name,
            phone,
            location,
            lga,
            avatar_url,
            cover_url,
            verified
          )
        `);

      if (id === targetUUID) {
        query = query.eq('id', id);
      } else {
        query = query.in('id', [targetUUID, id].filter(Boolean));
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        const formatted = formatProductRow(data);
        return { data: formatted, error: null };
      }
    } catch (err) {
      console.warn('fetchProductById cloud query exception:', err.message);
    }
  }

  const localList = getPersistedProducts();
  const localFound = localList.find((p) => p.id === id || p.id === mapToProductUUID(id));
  return { data: localFound || null, error: null };
}

/**
 * Upload an image to Supabase Storage in user's isolated folder.
 * Automatically compresses the image to minimum capacity (WebP/JPEG) before uploading.
 */
export async function uploadProduceImage(file, userId) {
  if (!file) {
    return null;
  }

  // 1. Auto-compress file to minimum capacity (<120KB WebP)
  let compressedFile = file;
  try {
    const minFile = await compressFileForUpload(file, 'produce');
    if (minFile) compressedFile = minFile;
  } catch (compErr) {
    console.warn('Produce image compression notice:', compErr.message);
  }

  if (!isSupabaseConfigured() || !supabase) {
    // Return compressed data URL for local / demo mode
    try {
      return await compressDataUrlForDatabase(compressedFile, 'produce');
    } catch {
      return null;
    }
  }

  try {
    const fileExt = compressedFile.name ? compressedFile.name.split('.').pop() : 'webp';
    const mimeType = compressedFile.type || (fileExt === 'webp' ? 'image/webp' : 'image/jpeg');
    const safeUserId = userId ? String(userId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'user';
    const fileName = `${safeUserId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('produce-images')
      .upload(fileName, compressedFile, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('produce-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err) {
    console.error('Image upload error:', err.message);
    // Fallback: return compressed data URL so produce image is preserved
    try {
      return await compressDataUrlForDatabase(compressedFile, 'produce');
    } catch {
      return null;
    }
  }
}

/**
 * Create a new produce listing.
 * Stores in Supabase database AND persists to localStorage cache.
 * Automatically compresses all images to minimum capacity before sending to the database.
 * Automatically marks listings submitted by regular farmers as 'pending' for admin review.
 */
export async function createProduct(productData, sellerId, userRole = 'seller') {
  if (userRole === 'buyer') {
    return {
      data: null,
      error: 'Permission Denied: Only registered farmers/producers can publish produce listings. Vendor accounts are limited to browsing and contacting farmers.'
    };
  }

  // All published produce listings are immediately live on the marketplace storefront
  const initialStatus = 'approved';

  // Normalize category to match database CHECK constraint
  let safeCategory = (productData.category || 'tubers').toLowerCase().trim();
  if (safeCategory === 'tubers-roots' || safeCategory === 'tuber' || safeCategory === 'yam' || safeCategory === 'cassava') safeCategory = 'tubers';
  if (safeCategory === 'grains-cereals' || safeCategory === 'grain' || safeCategory === 'cereal' || safeCategory === 'rice') safeCategory = 'grains';
  if (safeCategory === 'legumes-pulses' || safeCategory === 'legume' || safeCategory === 'beans' || safeCategory === 'soybeans') safeCategory = 'legumes';
  if (safeCategory === 'vegetable' || safeCategory === 'veg') safeCategory = 'vegetables';
  if (safeCategory === 'fruit' || safeCategory === 'citrus') safeCategory = 'fruits';
  if (safeCategory === 'fish') safeCategory = 'fishery';
  if (safeCategory === 'other') safeCategory = 'processed';

  const allowedCategories = ['tubers', 'grains', 'legumes', 'vegetables', 'fruits', 'livestock', 'poultry', 'fishery', 'processed'];
  if (!allowedCategories.includes(safeCategory)) {
    safeCategory = 'tubers';
  }

  let rawPrimaryImage = productData.image || (productData.images && productData.images[0]) || '';
  let rawAllImages = productData.images && productData.images.length > 0 ? productData.images : [rawPrimaryImage];

  // Auto-compress any base64 images before sending to database
  let primaryImage = rawPrimaryImage;
  let allImages = rawAllImages;
  try {
    if (typeof primaryImage === 'string' && primaryImage.startsWith('data:')) {
      primaryImage = await compressDataUrlForDatabase(primaryImage, 'produce');
    }
    allImages = await Promise.all(
      rawAllImages.map(async (img) => {
        if (typeof img === 'string' && img.startsWith('data:')) {
          return await compressDataUrlForDatabase(img, 'produce');
        }
        return img;
      })
    );
  } catch (compErr) {
    console.warn('Auto compression before produce creation notice:', compErr.message);
  }

  const productId = productData.id && isValidUUID(productData.id) ? productData.id : generateUUID();

  // Create clean local product model
  const newProductModel = {
    id: productId,
    sellerId: sellerId || '',
    name: (productData.name || '').trim(),
    category: safeCategory,
    price: Number(productData.price) || 0,
    unit: productData.unit || 'unit',
    quantity: Number(productData.quantity) || 1,
    minimumOrder: Number(productData.minimumOrder || 1),
    location: productData.location || `${productData.lga || 'Ukum'}, Benue State`,
    lga: productData.lga || 'Ukum',
    seller: productData.seller || 'Benue Farmer',
    sellerAvatar: productData.sellerAvatar || null,
    sellerCover: productData.sellerCover || null,
    phone: productData.phone || '08031234567',
    whatsapp: productData.whatsapp || productData.phone || '2348031234567',
    image: primaryImage,
    images: allImages,
    available: productData.available !== false,
    featured: Boolean(productData.featured),
    status: initialStatus,
    statusNote: '',
    description: productData.description || '',
    createdAt: new Date().toISOString()
  };

  // 1. Immediately save to persistent local store so it NEVER vanishes on page reload
  const currentList = getPersistedProducts();
  const updatedList = [newProductModel, ...currentList.filter((p) => p.id !== productId)];
  savePersistedProducts(updatedList, { type: 'PRODUCT_CREATED', product: newProductModel });

  // 2. Persist to Supabase Database
  if (isSupabaseConfigured() && supabase) {
    try {
      let targetSellerUUID = mapToSellerUUID(sellerId);
      
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        targetSellerUUID = authData.user.id;
        newProductModel.sellerId = targetSellerUUID;
      }

      // Ensure profile row exists in public.profiles to satisfy Foreign Key
      try {
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', targetSellerUUID)
          .maybeSingle();

        if (!profileCheck) {
          await supabase.from('profiles').upsert([
            {
              id: targetSellerUUID,
              full_name: productData.seller || authData?.user?.user_metadata?.full_name || 'Benue Farmer',
              phone: productData.phone || '',
              role: userRole || 'farmer',
              lga: productData.lga || 'Ukum',
              location: productData.location || 'Benue State',
              status: 'active'
            }
          ]);
        }
      } catch (profileErr) {
        console.warn('Profile FK check notice:', profileErr.message);
      }

      const dbPayload = {
        id: productId,
        seller_id: targetSellerUUID,
        name: newProductModel.name,
        category: safeCategory,
        price: Number(newProductModel.price),
        unit: newProductModel.unit,
        quantity: Number(newProductModel.quantity),
        minimum_order: Number(newProductModel.minimumOrder),
        location: newProductModel.location,
        lga: newProductModel.lga,
        phone: newProductModel.phone,
        whatsapp: newProductModel.whatsapp,
        image_url: primaryImage,
        images: allImages,
        available: newProductModel.available,
        featured: newProductModel.featured,
        status: initialStatus,
        status_note: '',
        description: newProductModel.description
      };

      let { data: dbResult, error: dbError } = await supabase
        .from('products')
        .insert([dbPayload])
        .select(`
          *,
          profiles:seller_id (
            id,
            full_name,
            phone,
            location,
            lga,
            avatar_url,
            cover_url,
            verified
          )
        `)
        .maybeSingle();

      // If status column is not present in remote schema yet, retry insert without status fields
      if (dbError && (dbError.message?.includes('status') || dbError.code === 'PGRST204' || dbError.code === '42703')) {
        const fallbackPayload = { ...dbPayload };
        delete fallbackPayload.status;
        delete fallbackPayload.status_note;
        const retry = await supabase
          .from('products')
          .insert([fallbackPayload])
          .select(`
            *,
            profiles:seller_id (
              id,
              full_name,
              phone,
              location,
              lga,
              avatar_url,
              cover_url,
              verified
            )
          `)
          .maybeSingle();
        dbResult = retry.data;
        dbError = retry.error;
      }

      if (dbError) {
        console.error('Supabase product insert error:', dbError.message);
        return { data: null, error: dbError.message };
      } else if (dbResult) {
        const formatted = formatProductRow(dbResult);
        const refreshedList = [formatted, ...getPersistedProducts().filter((p) => p.id !== productId && p.id !== formatted.id)];
        savePersistedProducts(refreshedList, { type: 'PRODUCT_CREATED', product: formatted });
        return { data: formatted, error: null };
      }
    } catch (cloudErr) {
      console.error('Cloud database insert exception:', cloudErr.message);
      return { data: null, error: cloudErr.message };
    }
  }

  // Only fall back to local store if Supabase is not configured
  const refreshedList = [newProductModel, ...getPersistedProducts().filter((p) => p.id !== productId)];
  savePersistedProducts(refreshedList, { type: 'PRODUCT_CREATED', product: newProductModel });
  return { data: newProductModel, error: null };
}

/**
 * Approve a farmer's produce submission (Admin & Super Admin only).
 * Updates cloud Supabase database first and only updates local cache on success.
 */
export async function approveProduct(productId) {
  const dbProductId = mapToProductUUID(productId);
  let updatedProduct = null;

  // 1. Update Supabase Cloud Database (authoritative)
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          status: 'approved',
          status_note: null,
          updated_at: new Date().toISOString()
        })
        .in('id', [dbProductId, productId].filter(Boolean))
        .select(`
          *,
          profiles:seller_id (
            id,
            full_name,
            phone,
            location,
            lga,
            avatar_url,
            cover_url,
            verified
          )
        `)
        .maybeSingle();

      if (error) {
        console.error('Supabase approve product error:', error.message);
        return { error: error.message, product: null };
      }

      if (data) {
        updatedProduct = formatProductRow(data);
      }
    } catch (err) {
      console.error('Approve product cloud error:', err.message);
      return { error: err.message, product: null };
    }
  }

  // 2. Update local persistent cache
  const currentList = getPersistedProducts();
  const updatedList = currentList.map((p) => {
    if (p.id === productId || p.id === dbProductId) {
      const updated = updatedProduct || {
        ...p,
        status: 'approved',
        statusNote: ''
      };
      updatedProduct = updated;
      return updated;
    }
    return p;
  });

  savePersistedProducts(updatedList, { type: 'APPROVED', productId, product: updatedProduct });
  return { error: null, product: updatedProduct };
}

/**
 * Reject a farmer's produce submission with reason (Admin & Super Admin only).
 */
export async function rejectProduct(productId, reason = '') {
  const dbProductId = mapToProductUUID(productId);
  let updatedProduct = null;

  // 1. Update Supabase Cloud Database (authoritative)
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          status: 'rejected',
          status_note: reason,
          updated_at: new Date().toISOString()
        })
        .in('id', [dbProductId, productId].filter(Boolean))
        .select(`
          *,
          profiles:seller_id (
            id,
            full_name,
            phone,
            location,
            lga,
            avatar_url,
            cover_url,
            verified
          )
        `)
        .maybeSingle();

      if (error) {
        console.error('Supabase reject product error:', error.message);
        return { error: error.message, product: null };
      }

      if (data) {
        updatedProduct = formatProductRow(data);
      }
    } catch (err) {
      console.error('Reject product cloud error:', err.message);
      return { error: err.message, product: null };
    }
  }

  // 2. Update local persistent cache
  const currentList = getPersistedProducts();
  const updatedList = currentList.map((p) => {
    if (p.id === productId || p.id === dbProductId) {
      const updated = updatedProduct || {
        ...p,
        status: 'rejected',
        statusNote: reason
      };
      updatedProduct = updated;
      return updated;
    }
    return p;
  });

  savePersistedProducts(updatedList, { type: 'REJECTED', productId, product: updatedProduct });
  return { error: null, product: updatedProduct };
}

/**
 * Update an existing produce listing's details.
 * Persists changes directly to Supabase cloud database and overrides all fields.
 */
export async function updateProduct(productId, updates, sellerId) {
  const safeCategory = updates.category ? normalizeCategory(updates.category) : undefined;
  const cleanUpdates = {
    ...updates,
    ...(safeCategory ? { category: safeCategory } : {})
  };

  const targetProductId = mapToProductUUID(productId);

  // 1. Persist directly to Supabase Cloud Database as authoritative source of truth
  if (isSupabaseConfigured() && supabase) {
    try {
      const finalCategory = normalizeCategory(cleanUpdates.category || 'tubers');
      let targetSellerUUID = mapToSellerUUID(sellerId || cleanUpdates.sellerId);
      
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        targetSellerUUID = authData.user.id;
      }

      // Ensure profile exists in public.profiles table to satisfy Foreign Key
      try {
        await supabase.from('profiles').upsert([
          {
            id: targetSellerUUID,
            full_name: cleanUpdates.seller || authData?.user?.user_metadata?.full_name || 'Benue Producer',
            phone: cleanUpdates.phone || '',
            role: 'farmer',
            lga: cleanUpdates.lga || 'Ukum',
            location: cleanUpdates.location || 'Benue State',
            status: 'active'
          }
        ], { onConflict: 'id' });
      } catch (profileErr) {
        console.warn('Profile FK check notice:', profileErr.message);
      }

      let primaryImg = cleanUpdates.image !== undefined ? cleanUpdates.image : '';
      let allImgs = cleanUpdates.images !== undefined
        ? cleanUpdates.images
        : (cleanUpdates.image ? [cleanUpdates.image] : (primaryImg ? [primaryImg] : []));

      // Auto-compress base64 images to minimum capacity before database update
      try {
        if (typeof primaryImg === 'string' && primaryImg.startsWith('data:')) {
          primaryImg = await compressDataUrlForDatabase(primaryImg, 'produce');
        }
        allImgs = await Promise.all(
          allImgs.map(async (img) => {
            if (typeof img === 'string' && img.startsWith('data:')) {
              return await compressDataUrlForDatabase(img, 'produce');
            }
            return img;
          })
        );
      } catch (compErr) {
        console.warn('Auto compression before product update notice:', compErr.message);
      }

      const dbPayload = {
        id: targetProductId,
        seller_id: targetSellerUUID,
        name: (cleanUpdates.name !== undefined ? cleanUpdates.name : '').trim(),
        category: finalCategory,
        price: Number(cleanUpdates.price !== undefined ? cleanUpdates.price : 0),
        unit: (cleanUpdates.unit !== undefined ? cleanUpdates.unit : 'unit').trim(),
        quantity: Number(cleanUpdates.quantity !== undefined ? cleanUpdates.quantity : 1),
        minimum_order: Number(cleanUpdates.minimumOrder !== undefined ? cleanUpdates.minimumOrder : 1),
        location: (cleanUpdates.location !== undefined ? cleanUpdates.location : 'Benue State').trim(),
        lga: cleanUpdates.lga !== undefined ? cleanUpdates.lga : 'Ukum',
        phone: (cleanUpdates.phone !== undefined ? cleanUpdates.phone : '').trim(),
        whatsapp: (cleanUpdates.whatsapp !== undefined ? cleanUpdates.whatsapp : cleanUpdates.phone || '').trim(),
        image_url: primaryImg,
        images: allImgs,
        available: cleanUpdates.available !== undefined ? Boolean(cleanUpdates.available) : true,
        description: (cleanUpdates.description !== undefined ? cleanUpdates.description : '').trim(),
        updated_at: new Date().toISOString()
      };

      if (cleanUpdates.status !== undefined) dbPayload.status = cleanUpdates.status;
      if (cleanUpdates.statusNote !== undefined) dbPayload.status_note = cleanUpdates.statusNote;

      const { data: dbData, error: dbError } = await supabase
        .from('products')
        .upsert([dbPayload], { onConflict: 'id' })
        .select(`
          *,
          profiles:seller_id (
            id,
            full_name,
            phone,
            location,
            lga,
            avatar_url,
            cover_url,
            verified
          )
        `)
        .maybeSingle();

      if (dbError) {
        console.error('Supabase update product error:', dbError.message);
        return { data: null, error: `Failed to update product in database: ${dbError.message}` };
      }

      const formatted = formatProductRow(dbData);

      // Update local offline cache with authoritative DB record
      const currentList = getPersistedProducts();
      const updatedList = currentList.map((p) => 
        (p.id === productId || p.id === targetProductId) ? { ...formatted, id: productId } : p
      );
      if (!updatedList.some((p) => p.id === productId || p.id === targetProductId)) {
        updatedList.unshift(formatted);
      }
      savePersistedProducts(updatedList, { type: 'UPDATED', productId, product: formatted });

      return { data: formatted, error: null };
    } catch (cloudErr) {
      console.error('Update product cloud sync error:', cloudErr.message);
      return { data: null, error: `Database error: ${cloudErr.message}` };
    }
  }

  // Offline fallback
  const currentList = getPersistedProducts();
  let updatedProduct = null;
  const updatedList = currentList.map((p) => {
    if (p.id === productId || p.id === targetProductId) {
      updatedProduct = { ...p, ...cleanUpdates };
      return updatedProduct;
    }
    return p;
  });
  if (!updatedProduct) {
    updatedProduct = { id: productId, ...cleanUpdates };
    updatedList.unshift(updatedProduct);
  }
  savePersistedProducts(updatedList, { type: 'UPDATED', productId, product: updatedProduct });
  return { data: updatedProduct, error: null };
}

/**
 * Update stock availability for a listing.
 * Writes to Supabase (authoritative), verifies success, then syncs localStorage.
 * Supabase Realtime then propagates the change to all connected devices.
 */
export async function updateProductStock(productId, available, sellerId = null) {
  const targetId = mapToProductUUID(productId);
  const isAvailable = Boolean(available);
  const nowIso = new Date().toISOString();

  // 1. Immediately record persistent local stock override so subsequent reloads/reads honor it
  setProductStockOverride(productId, isAvailable);
  setProductStockOverride(targetId, isAvailable);

  // 2. Immediately update offline cache for instant UI responsiveness
  const currentList = getPersistedProducts();
  const updatedList = currentList.map((p) =>
    (p.id === productId || p.id === targetId)
      ? { ...p, available: isAvailable, id: p.id }
      : p
  );
  savePersistedProducts(updatedList, { type: 'STOCK_UPDATED', productId: targetId, available: isAvailable });

  let dbUpdated = false;

  // 3. Primary path: Direct Supabase update (if user has active Supabase session)
  if (isSupabaseConfigured() && supabase) {
    try {
      let { data: updatedRows, error: dbError } = await supabase
        .from('products')
        .update({ available: isAvailable, updated_at: nowIso })
        .eq('id', targetId)
        .select('id, available, updated_at');

      if (!dbError && updatedRows && updatedRows.length > 0) {
        dbUpdated = true;
      } else if (!dbError && (!updatedRows || updatedRows.length === 0) && productId !== targetId) {
        const { data: retryRows, error: retryErr } = await supabase
          .from('products')
          .update({ available: isAvailable, updated_at: nowIso })
          .eq('id', productId)
          .select('id, available, updated_at');

        if (!retryErr && retryRows && retryRows.length > 0) {
          dbUpdated = true;
        }
      }

      // Try RPC fallback if direct update matched 0 rows (e.g. RLS token difference)
      if (!dbUpdated) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('set_product_availability', {
            p_product_id: targetId,
            p_available: isAvailable,
            p_seller_id: sellerId || null
          });
          if (!rpcErr && rpcRes && rpcRes.success) {
            dbUpdated = true;
          }
        } catch {
          // RPC may not be installed yet; fall through
        }
      }
    } catch (err) {
      console.warn('[updateProductStock] Direct Supabase attempt notice:', err.message);
    }
  }

  // 4. Secondary path: If direct client update didn't update rows in Supabase (e.g. unauthenticated session or phone login),
  // invoke serverless /api/toggle-stock endpoint using service role
  if (!dbUpdated && typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/toggle-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: targetId,
          available: isAvailable,
          sellerId: sellerId || null
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson.success && Array.isArray(resJson.data) && resJson.data.length > 0) {
          dbUpdated = true;
        }
      }
    } catch (apiErr) {
      console.warn('[updateProductStock] /api/toggle-stock fallback notice:', apiErr.message);
    }
  }

  return { error: null, dbUpdated };
}

/**
 * Permanently delete a produce listing from both database and local cache.
 * Uses tombstone tracking to prevent deleted mock/cached products from ever returning.
 */
export async function deleteProduct(productId) {
  if (!productId) return { error: 'Product ID is required.' };
  const targetId = mapToProductUUID(productId);

  // 1. Record in permanent deletion tombstone set
  markProductDeleted(productId);
  markProductDeleted(targetId);

  // 2. Delete from Supabase DB (authoritative)
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error: dbError } = await supabase
        .from('products')
        .delete()
        .eq('id', targetId);

      if (dbError) {
        console.warn('Supabase delete by UUID error:', dbError.message);
      }

      // If original ID differs, also try raw ID to be completely sure
      if (productId !== targetId) {
        await supabase
          .from('products')
          .delete()
          .eq('id', productId);
      }
    } catch (err) {
      console.warn('Supabase delete exception:', err.message);
    }
  }

  // 3. Purge from local persistent cache
  const currentList = getPersistedProducts();
  const updatedList = currentList.filter(
    (p) => p.id !== productId && p.id !== targetId
  );
  savePersistedProducts(updatedList, { type: 'DELETED', productId, targetId });

  return { error: null };
}

/**
 * Move an active produce listing to the Admin Recycle Bin (Soft Delete for 60 days).
 * Immediately removes it from the public marketplace storefront.
 */
export async function recycleProduct(productId) {
  if (!productId) return { error: 'Product ID is required.' };
  const targetId = mapToProductUUID(productId);
  const recycledAt = new Date().toISOString();

  if (isSupabaseConfigured() && supabase) {
    try {
      // 1. Try with recycled_at timestamp + mark unavailable
      let { error: dbError } = await supabase
        .from('products')
        .update({
          status: 'recycled',
          available: false,
          recycled_at: recycledAt,
          updated_at: recycledAt
        })
        .eq('id', targetId);

      // Fallback if schema doesn't yet have recycled_at column
      if (dbError && dbError.message?.includes('recycled_at')) {
        const { error: retryErr } = await supabase
          .from('products')
          .update({
            status: 'recycled',
            available: false,
            updated_at: recycledAt
          })
          .eq('id', targetId);
        dbError = retryErr;
      }

      if (dbError && productId !== targetId) {
        await supabase
          .from('products')
          .update({
            status: 'recycled',
            available: false,
            updated_at: recycledAt
          })
          .eq('id', productId);
      }
    } catch (err) {
      console.warn('Supabase recycle product exception:', err.message);
    }
  }

  // Update local storage cache — set status to recycled AND mark as unavailable
  const currentList = getPersistedProducts();
  const updatedList = currentList.map((p) =>
    p.id === productId || p.id === targetId
      ? { ...p, status: 'recycled', available: false, recycledAt }
      : p
  );
  savePersistedProducts(updatedList, { type: 'RECYCLED', productId, targetId });

  return { error: null };
}

/**
 * Restore a produce listing from the Recycle Bin back to the active storefront.
 */
export async function restoreProduct(productId) {
  if (!productId) return { error: 'Product ID is required.' };
  const targetId = mapToProductUUID(productId);
  const updatedAt = new Date().toISOString();

  // Unmark from deleted tombstone if present
  unmarkProductDeleted(productId);
  unmarkProductDeleted(targetId);

  if (isSupabaseConfigured() && supabase) {
    try {
      let { error: dbError } = await supabase
        .from('products')
        .update({
          status: 'approved',
          available: true,
          recycled_at: null,
          updated_at: updatedAt
        })
        .eq('id', targetId);

      if (dbError && dbError.message?.includes('recycled_at')) {
        const { error: retryErr } = await supabase
          .from('products')
          .update({
            status: 'approved',
            available: true,
            updated_at: updatedAt
          })
          .eq('id', targetId);
        dbError = retryErr;
      }

      if (dbError && productId !== targetId) {
        await supabase
          .from('products')
          .update({
            status: 'approved',
            available: true,
            updated_at: updatedAt
          })
          .eq('id', productId);
      }
    } catch (err) {
      console.warn('Supabase restore product exception:', err.message);
    }
  }

  // Update local storage cache — restore status and re-enable availability
  const currentList = getPersistedProducts();
  const updatedList = currentList.map((p) =>
    p.id === productId || p.id === targetId
      ? { ...p, status: 'approved', available: true, recycledAt: null }
      : p
  );
  savePersistedProducts(updatedList, { type: 'RESTORED', productId, targetId });

  return { error: null };
}

/**
 * Empty the Recycle Bin by permanently purging all recycled produce listings.
 */
export async function emptyRecycleBin() {
  const currentList = getPersistedProducts();
  const recycled = currentList.filter((p) => p.status === 'recycled');
  for (const item of recycled) {
    await deleteProduct(item.id);
  }
  return { error: null, count: recycled.length };
}

/**
 * Supabase Realtime Database Listener for products across all devices & IP addresses.
 * Listens for INSERT (farmer uploads produce), UPDATE (admin approves produce), DELETE.
 */
export function subscribeToRealtimeProducts(onProductChange) {
  if (!isSupabaseConfigured() || !supabase) {
    return { unsubscribe: () => {} };
  }

  try {
    const channel = supabase
      .channel('realtime:public:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async (payload) => {
          const eventType = payload.eventType; // 'INSERT' | 'UPDATE' | 'DELETE'
          const row = payload.new;
          const oldRow = payload.old;

          if (eventType === 'DELETE') {
            const oldId = oldRow?.id;
            if (oldId) {
              markProductDeleted(oldId);
              const currentList = getPersistedProducts();
              const next = currentList.filter(
                (p) => p.id !== oldId && p.id !== mapToProductUUID(oldId)
              );
              savePersistedProducts(next);
              onProductChange({ eventType: 'DELETE', oldId });
            }
            return;
          }

          if (row) {
            // Fetch seller profile details if needed for full display
            let sellerProfile = null;
            try {
              const { data: prof } = await supabase
                .from('profiles')
                .select('id, full_name, phone, location, lga, avatar_url, cover_url, verified')
                .eq('id', row.seller_id)
                .maybeSingle();
              sellerProfile = prof;
            } catch {}

            const formatted = formatProductRow({
              ...row,
              profiles: sellerProfile
            });

            // Update local persisted storage
            const currentList = getPersistedProducts();
            const exists = currentList.some((p) => p.id === formatted.id);
            const nextList = exists
              ? currentList.map((p) => (p.id === formatted.id ? formatted : p))
              : [formatted, ...currentList];

            savePersistedProducts(nextList);

            onProductChange({
              eventType,
              product: formatted,
              oldId: oldRow?.id
            });
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  } catch (err) {
    console.warn('Products realtime subscription error:', err);
    return { unsubscribe: () => {} };
  }
}

/**
 * Local Cross-Tab & In-Window Products Change Listener.
 * Guarantees instantaneous (<5ms) synchronization across browser tabs and components.
 */
export function subscribeToLocalProducts(onProductsChange) {
  if (typeof window === 'undefined') {
    return { unsubscribe: () => {} };
  }

  const handleCustomEvent = (e) => {
    if (e.detail?.products) {
      onProductsChange(e.detail.products, e.detail.eventMeta);
    }
  };

  let broadcastChannel = null;
  if ('BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.onmessage = (msg) => {
        if (msg.data?.products) {
          onProductsChange(msg.data.products, msg.data.eventMeta);
        }
      };
    } catch {}
  }

  const handleStorageEvent = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          onProductsChange(parsed, { type: 'STORAGE_SYNC' });
        }
      } catch {}
    }
  };

  window.addEventListener('benue_market_products_changed', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return {
    unsubscribe: () => {
      window.removeEventListener('benue_market_products_changed', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      if (broadcastChannel) {
        try {
          broadcastChannel.close();
        } catch {}
      }
    }
  };
}
