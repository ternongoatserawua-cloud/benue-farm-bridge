import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const LOCAL_STORAGE_KEY = 'benue_market_saved_ids';

/**
 * Get locally stored saved IDs.
 */
function getLocalSavedIds() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save locally.
 */
function setLocalSavedIds(ids) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore
  }
}

/**
 * Fetch saved product IDs for the user.
 */
export async function fetchSavedProductIds(userId) {
  if (!isSupabaseConfigured() || !supabase || !userId) {
    return new Set(getLocalSavedIds());
  }

  try {
    const { data, error } = await supabase
      .from('saved_products')
      .select('product_id')
      .eq('user_id', userId);

    if (error) throw error;
    const ids = data.map((item) => item.product_id);
    setLocalSavedIds(ids);
    return new Set(ids);
  } catch (err) {
    console.warn('Fetch saved products fallback:', err.message);
    return new Set(getLocalSavedIds());
  }
}

/**
 * Toggle bookmark/saved status for a product.
 */
export async function toggleSaveProduct(userId, productId, isCurrentlySaved) {
  // Local state update
  const localIds = new Set(getLocalSavedIds());
  if (isCurrentlySaved) {
    localIds.delete(productId);
  } else {
    localIds.add(productId);
  }
  setLocalSavedIds(Array.from(localIds));

  if (!isSupabaseConfigured() || !supabase || !userId) {
    return { success: true };
  }

  try {
    if (isCurrentlySaved) {
      const { error } = await supabase
        .from('saved_products')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('saved_products')
        .insert([{ user_id: userId, product_id: productId }]);
      if (error) throw error;
    }
    return { success: true };
  } catch (err) {
    console.error('Toggle save error:', err.message);
    return { success: false, error: err.message };
  }
}
