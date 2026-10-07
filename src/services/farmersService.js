import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { MOCK_FARMERS } from '../data/mockFarmers.js';
import {
  mapToSellerUUID,
  broadcastProfileUpdate,
  uploadProfileAsset
} from './authService.js';
import { compressDataUrlForDatabase } from '../utils/imageCompressor.js';

// In-memory farmer store that can be mutated during runtime fallback
let FARMERS_STORE = [...MOCK_FARMERS];

/**
 * Format raw database profile row to farmer profile model.
 */
function formatFarmerRow(row, listingCount = 0) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.full_name || 'Benue Farmer',
    location: row.location || 'Benue State',
    lga: row.lga || 'Ukum',
    community: row.community || '',
    products: [],
    listingCount: listingCount || row.products_count || 0,
    verified: row.verified ?? true,
    phone: row.phone || '08031234567',
    whatsapp: row.phone ? `234${row.phone.replace(/^0+/, '')}` : '2348031234567',
    avatar: row.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    coverImage: row.cover_url || row.cover_image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
    about: row.about || 'Commercial grower and agricultural supplier in Benue State.',
    memberSince: row.created_at ? new Date(row.created_at).getFullYear().toString() : '2023',
    rating: Number(row.rating || 4.9),
    dealsCompleted: Number(row.deals_completed || 20)
  };
}

/**
 * Fetch all registered sellers / farmers directly from Supabase database (authoritative).
 */
export async function fetchFarmers() {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: FARMERS_STORE, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        products (id, category, name)
      `)
      .in('role', ['farmer', 'seller'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return { data: FARMERS_STORE, error: null };
    }

    const formatted = data.map((profile) => {
      const distinctCategories = Array.from(new Set(profile.products?.map((p) => p.category) || []));
      const farmer = formatFarmerRow(profile, profile.products?.length || 0);
      farmer.products = distinctCategories.length > 0 ? distinctCategories : ['Yam', 'Grains'];
      return farmer;
    });

    FARMERS_STORE = formatted;
    return { data: formatted, error: null };
  } catch (err) {
    console.warn('Fetch farmers fallback to mock:', err.message);
    return { data: FARMERS_STORE, error: err.message };
  }
}

/**
 * Fetch a single farmer by ID directly from Supabase database (authoritative).
 */
export async function fetchFarmerById(id) {
  if (!id) return { data: null, error: null };
  const targetUUID = mapToSellerUUID(id);

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          products (*)
        `)
        .in('id', [targetUUID, id].filter(Boolean))
        .maybeSingle();

      if (!error && data) {
        const distinctCategories = Array.from(new Set(data.products?.map((p) => p.category) || []));
        const farmer = formatFarmerRow(data, data.products?.length || 0);
        farmer.products = distinctCategories.length > 0 ? distinctCategories : ['Produce'];
        return { data: farmer, error: null };
      }
    } catch (err) {
      console.warn('Fetch farmer by id warning:', err.message);
    }
  }

  const fallback = FARMERS_STORE.find((f) => f.id === id || f.id === targetUUID);
  return { data: fallback || null, error: null };
}

/**
 * Update farmer profile data across Supabase cloud database and memory.
 * Supabase is the sole source of truth; failed writes are returned as errors.
 */
export async function updateFarmerProfileData(farmerId, updates) {
  if (!farmerId) return { data: null, error: 'Farmer ID is required.' };

  // 1. If avatar or coverImage are local files or base64 data URIs, upload to Supabase Cloud Storage
  if (updates.avatar && ((typeof updates.avatar === 'string' && updates.avatar.startsWith('data:')) || updates.avatar instanceof Blob || updates.avatar instanceof File)) {
    try {
      const publicAvatarUrl = await uploadProfileAsset(updates.avatar, farmerId, 'avatar');
      if (publicAvatarUrl) {
        updates.avatar = publicAvatarUrl;
      }
    } catch (e) {
      console.warn('Farmer avatar cloud upload notice:', e);
    }
  }

  if (updates.coverImage && ((typeof updates.coverImage === 'string' && updates.coverImage.startsWith('data:')) || updates.coverImage instanceof Blob || updates.coverImage instanceof File)) {
    try {
      const publicCoverUrl = await uploadProfileAsset(updates.coverImage, farmerId, 'cover');
      if (publicCoverUrl) {
        updates.coverImage = publicCoverUrl;
      }
    } catch (e) {
      console.warn('Farmer cover cloud upload notice:', e);
    }
  }

  const targetUUID = mapToSellerUUID(farmerId);

  // 2. Persist directly to Supabase cloud database (authoritative)
  if (isSupabaseConfigured() && supabase) {
    try {
      const dbPayload = {
        updated_at: new Date().toISOString()
      };
      if (updates.name !== undefined) dbPayload.full_name = updates.name;
      if (updates.phone !== undefined) dbPayload.phone = updates.phone;
      if (updates.location !== undefined) dbPayload.location = updates.location;
      if (updates.lga !== undefined) dbPayload.lga = updates.lga;
      if (updates.community !== undefined) dbPayload.community = updates.community;
      if (updates.about !== undefined) dbPayload.about = updates.about;
      if (updates.avatar !== undefined) {
        let cleanAvatar = updates.avatar;
        if (typeof cleanAvatar === 'string' && cleanAvatar.startsWith('data:')) {
          cleanAvatar = await compressDataUrlForDatabase(cleanAvatar, 'avatar');
        }
        dbPayload.avatar_url = cleanAvatar;
      }
      if (updates.coverImage !== undefined) {
        let cleanCover = updates.coverImage;
        if (typeof cleanCover === 'string' && cleanCover.startsWith('data:')) {
          cleanCover = await compressDataUrlForDatabase(cleanCover, 'cover');
        }
        dbPayload.cover_url = cleanCover;
        dbPayload.cover_image = cleanCover;
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: targetUUID,
          role: 'seller',
          ...dbPayload
        }, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Supabase farmer profile update error:', error.message);
        return { data: null, error: `Farmer update failed: ${error.message}` };
      }

      // Update in-memory FARMERS_STORE only after successful DB update
      const idx = FARMERS_STORE.findIndex((f) => f.id === farmerId || f.id === targetUUID || f.name === updates.name);
      if (idx !== -1) {
        FARMERS_STORE[idx] = {
          ...FARMERS_STORE[idx],
          ...updates
        };
      }

      broadcastProfileUpdate(farmerId, updates);
      return { data: data || updates, error: null };
    } catch (err) {
      console.error('Update farmer profile error:', err.message);
      return { data: null, error: err.message };
    }
  }

  // Fallback for offline mode
  const idx = FARMERS_STORE.findIndex((f) => f.id === farmerId || f.id === targetUUID || f.name === updates.name);
  if (idx !== -1) {
    FARMERS_STORE[idx] = {
      ...FARMERS_STORE[idx],
      ...updates
    };
  }
  broadcastProfileUpdate(farmerId, updates);
  return { data: updates, error: null };
}
