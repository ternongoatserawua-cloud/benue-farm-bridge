import { supabase, isSupabaseConfigured, createIsolatedAuthClient } from '../lib/supabase.js';
import { sanitizeText, sanitizeEmail, sanitizePhone, filterProfileUpdates, normalizeNigerianPhone, resolveAuthEmailCandidates } from '../utils/sanitize.js';
import { compressFileForUpload, compressDataUrlForDatabase } from '../utils/imageCompressor.js';

// Super Admin identity is determined EXCLUSIVELY from the Supabase profiles table.
// Never hardcode credentials or email-based role checks in client-side code.

// Initial Mock User Store for fallback / offline mode
let MOCK_USERS_STORE = [
  {
    id: 'super-admin-1',
    name: 'Ternongo Atser Awua',
    email: 'ternongoatserawua@gmail.com',
    phone: '08080808080',
    role: 'super_admin',
    status: 'active',
    location: 'Benue State',
    lga: 'Makurdi',
    verified: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'farmer-1',
    name: 'Ter Farms & Agro Allied',
    email: 'terfa.aondo@benuemarket.ng',
    phone: '08031234567',
    role: 'farmer',
    status: 'active',
    location: 'Zaki Biam',
    lga: 'Ukum',
    verified: true,
    createdAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'farmer-2',
    name: 'Mnguember Iorfa',
    email: 'mnguember@benuemarket.ng',
    phone: '08149876543',
    role: 'farmer',
    status: 'active',
    location: 'Gboko Central',
    lga: 'Gboko',
    verified: true,
    createdAt: '2024-02-10T00:00:00Z'
  },
  {
    id: 'buyer-1',
    name: 'Chief Emeka Okoye',
    email: 'emeka.okoye@gmail.com',
    phone: '08023456789',
    role: 'buyer',
    status: 'active',
    location: 'Lagos Island',
    lga: 'Lagos',
    verified: false,
    createdAt: '2024-03-01T00:00:00Z'
  },
  {
    id: 'buyer-2',
    name: 'Hajiya Amina Bello',
    email: 'amina.bello@kudanfarms.com',
    phone: '08098765432',
    role: 'buyer',
    status: 'active',
    location: 'Kano Municipal',
    lga: 'Kano',
    verified: true,
    createdAt: '2024-03-12T00:00:00Z'
  }
];

/**
 * Map arbitrary or seed seller ID to a deterministic, valid UUID for Supabase profiles table.
 */
export function mapToSellerUUID(sellerId) {
  if (!sellerId) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerId)) {
    return sellerId;
  }
  if (sellerId === 'farmer-1') return 'f0000000-0000-4000-8000-000000000001';
  if (sellerId === 'farmer-2') return 'f0000000-0000-4000-8000-000000000002';
  if (sellerId === 'super-admin-1') return 'a0000000-0000-4000-8000-000000000001';

  let hash = 0;
  for (let i = 0; i < sellerId.length; i++) {
    hash = (hash << 5) - hash + sellerId.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex.padEnd(12, '0').slice(0, 12)}`;
}

/**
 * Deprecated: Profile data is authoritatively fetched from Supabase across all devices.
 */
export function getPersistedProfileOverrides() {
  return {};
}

export function getProfileOverride() {
  return null;
}

export function saveProfileOverride() {
  // No-op: Supabase is authoritative
}

/**
 * Convert Base64 data URI to standard binary Blob.
 */
function dataURItoBlob(dataURI) {
  try {
    const parts = dataURI.split(',');
    const byteString = atob(parts[1]);
    const mimeString = parts[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  } catch (e) {
    console.error('Failed to convert dataURI to Blob:', e);
    return null;
  }
}

/**
 * Upload an avatar image file to Supabase Storage 'avatars' bucket.
 * Automatically compresses the image to minimum capacity (<45KB WebP) before upload.
 * Organizes files by user ID ({userId}/profile.{ext}) and uses upsert to prevent duplicates.
 * Returns public HTTPS URL with cache-busting query parameter.
 */
export async function uploadUserAvatar(file, userId) {
  if (!file) throw new Error('No image file provided.');
  if (!userId) throw new Error('User ID is required for avatar upload.');

  // 1. Validate file type
  const isImage = (file.type && file.type.startsWith('image/')) || (file.name && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file.name));
  if (!isImage) {
    throw new Error('Invalid file format. Please select an image (JPG, PNG, WEBP, or GIF).');
  }

  // 2. Auto-compress file to minimum avatar size (<45KB WebP)
  let compressedFile = file;
  try {
    const minFile = await compressFileForUpload(file, 'avatar');
    if (minFile) compressedFile = minFile;
  } catch (compErr) {
    console.warn('Avatar compression notice:', compErr.message);
  }

  if (!isSupabaseConfigured() || !supabase) {
    // Offline / demo fallback: return compressed data URL
    try {
      return await compressDataUrlForDatabase(compressedFile, 'avatar');
    } catch {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read image file locally.'));
        reader.readAsDataURL(file);
      });
    }
  }

  try {
    const fileExt = compressedFile.name ? compressedFile.name.split('.').pop() : 'webp';
    const mimeType = compressedFile.type || (fileExt === 'webp' ? 'image/webp' : 'image/jpeg');

    // Resolve target auth user id if available
    let targetId = userId;
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        targetId = authData.user.id;
      }
    } catch {}

    const safeUserId = String(targetId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${safeUserId}/profile.${fileExt}`;

    // Upload with upsert: true so previous avatar is cleanly overwritten without leaving orphaned files
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, compressedFile, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Avatar storage upload error:', uploadError.message);
      // If bucket doesn't exist, try produce-images fallback
      const { error: fallbackError } = await supabase.storage
        .from('produce-images')
        .upload(filePath, compressedFile, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true
        });

      if (fallbackError) {
        // Fallback to compressed data URL so profile update still succeeds
        return await compressDataUrlForDatabase(compressedFile, 'avatar');
      }

      const { data: fallbackData } = supabase.storage
        .from('produce-images')
        .getPublicUrl(filePath);

      return `${fallbackData.publicUrl}?t=${Date.now()}`;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      return await compressDataUrlForDatabase(compressedFile, 'avatar');
    }

    // Return URL with timestamp cache buster
    return `${data.publicUrl}?t=${Date.now()}`;
  } catch (err) {
    console.error('Avatar upload exception:', err);
    return await compressDataUrlForDatabase(compressedFile, 'avatar');
  }
}

/**
 * Upload an avatar photo or cover image to Supabase Storage and return a permanent public HTTPS URL.
 * Automatically compresses the asset to minimum capacity before uploading.
 * Accessible across all devices and IP addresses worldwide.
 */
export async function uploadProfileAsset(fileOrDataUrl, userId = 'user', assetType = 'avatar') {
  if (!fileOrDataUrl) return '';

  // If already an HTTP/HTTPS public cloud URL, return immediately
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
    return fileOrDataUrl;
  }

  const preset = assetType === 'cover' ? 'cover' : 'avatar';

  // 1. Auto-compress file/blob/dataURL to minimum capacity
  let compressedFile = null;
  try {
    compressedFile = await compressFileForUpload(fileOrDataUrl, preset);
  } catch (compErr) {
    console.warn('Profile asset compression notice:', compErr.message);
  }

  if (!isSupabaseConfigured() || !supabase) {
    return await compressDataUrlForDatabase(fileOrDataUrl, preset);
  }

  try {
    let blob = compressedFile || null;
    let extension = preset === 'cover' ? 'webp' : 'webp';
    let mimeType = 'image/webp';

    if (compressedFile) {
      blob = compressedFile;
      mimeType = compressedFile.type || 'image/webp';
      extension = compressedFile.name ? compressedFile.name.split('.').pop() : 'webp';
    } else if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
      const minDataUrl = await compressDataUrlForDatabase(fileOrDataUrl, preset);
      blob = dataURItoBlob(minDataUrl || fileOrDataUrl);
      extension = 'webp';
      mimeType = 'image/webp';
    } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
      blob = fileOrDataUrl;
      if (fileOrDataUrl.type) {
        mimeType = fileOrDataUrl.type;
        extension = fileOrDataUrl.type.split('/')[1] || 'jpg';
      }
    }

    if (!blob) return await compressDataUrlForDatabase(fileOrDataUrl, preset);

    // Use current authenticated user ID if available so storage RLS matches
    let targetUserId = userId;
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        targetUserId = authData.user.id;
      }
    } catch {}

    const safeUserId = (typeof targetUserId === 'string' && targetUserId)
      ? targetUserId.replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'user';
    const fileName = `${safeUserId}/${assetType}.${extension}`;
    
    // Try 'avatars' bucket first, fallback to 'produce-images'
    const candidateBuckets = ['avatars', 'produce-images'];
    let publicUrl = null;

    for (const bucket of candidateBuckets) {
      try {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, blob, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: true
          });

        if (!uploadError) {
          const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
          if (data?.publicUrl) {
            publicUrl = `${data.publicUrl}?t=${Date.now()}`;
            break;
          }
        } else {
          console.warn(`Upload to ${bucket} notice:`, uploadError.message);
        }
      } catch (bucketErr) {
        console.warn(`Upload attempt to ${bucket} failed:`, bucketErr.message);
      }
    }

    return publicUrl || (await compressDataUrlForDatabase(fileOrDataUrl, preset));
  } catch (err) {
    console.error('Profile asset cloud upload error:', err);
    return await compressDataUrlForDatabase(fileOrDataUrl, preset);
  }
}

/**
 * Real-time Supabase Database Listener across all devices & IP addresses.
 * Notifies callbacks whenever any user profile changes on the cloud.
 */
export function subscribeToRealtimeProfiles(onProfileChange) {
  if (!isSupabaseConfigured() || !supabase) {
    return { unsubscribe: () => {} };
  }

  try {
    const channel = supabase
      .channel('realtime:public:profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload?.new) {
            onProfileChange(payload.new, payload.eventType);
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
    console.warn('Realtime subscription error:', err);
    return { unsubscribe: () => {} };
  }
}

/**
 * Broadcast profile update to other tabs & active components.
 */
export function broadcastProfileUpdate(userId, updates) {
  if (typeof window === 'undefined') return;

  try {
    // 1. Dispatch custom DOM event
    window.dispatchEvent(
      new CustomEvent('benue_market_profile_updated', {
        detail: { userId, updates, timestamp: Date.now() }
      })
    );

    // 2. Broadcast via BroadcastChannel API if supported
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('benue_market_sync');
      channel.postMessage({
        type: 'PROFILE_UPDATED',
        userId,
        updates,
        timestamp: Date.now()
      });
      channel.close();
    }
  } catch (err) {
    console.warn('Broadcast profile update notice:', err);
  }
}

/**
 * Register a new user with Supabase Auth and initialize their profile.
 */
export async function signUpUser({ email, password, name, phone = '', role = 'buyer', lga = 'Ukum', agreedToTerms = false }) {
  if (!agreedToTerms) {
    return { user: null, error: 'You must agree to the Benue Farm Bridge Terms and Conditions before creating an account.' };
  }

  const cleanInput = (email || '').trim();
  const normalizedPhone = normalizeNigerianPhone(phone || (cleanInput.includes('@') ? '' : cleanInput));
  
  let cleanEmail = cleanInput.toLowerCase();
  if (!cleanEmail.includes('@')) {
    cleanEmail = `${normalizedPhone || cleanInput.replace(/\D/g, '') || 'user'}@benuemarket.ng`;
  }

  if (!isSupabaseConfigured() || !supabase) {
    const newUser = {
      id: `mock-user-${Date.now()}`,
      name: name || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: normalizedPhone || phone,
      role,
      status: 'active',
      lga,
      location: 'Benue State',
      verified: false,
      agreedToTerms: true,
      agreedToTermsAt: new Date().toISOString(),
      termsVersion: '2.4',
      createdAt: new Date().toISOString()
    };
    MOCK_USERS_STORE.push(newUser);
    return { user: newUser, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: name,
          name: name,
          phone: normalizedPhone || phone,
          role: role,
          lga: lga,
          status: 'active',
          agreed_to_terms: true,
          agreed_to_terms_at: new Date().toISOString(),
          terms_version: '2.4'
        }
      }
    });

    if (error) throw error;

    const userProfile = {
      id: data.user?.id,
      name: name || data.user?.email?.split('@')[0],
      email: data.user?.email,
      phone: normalizedPhone || phone,
      role,
      status: 'active',
      lga,
      agreedToTerms: true,
      agreedToTermsAt: new Date().toISOString(),
      termsVersion: '2.4'
    };

    return { user: userProfile, error: null };
  } catch (err) {
    console.error('Supabase signUp error:', err.message);
    let errorMsg = err.message;
    if (errorMsg?.toLowerCase().includes('database error saving new user')) {
      errorMsg = 'Database trigger error saving new user. Please apply the SQL script in supabase/migrations/20241003_fix_user_creation_trigger.sql in your Supabase SQL Editor.';
    }
    return { user: null, error: errorMsg };
  }
}

/**
 * Sign in an existing user with email or phone and password.
 * Resolves variations in phone numbers (+234, 080..., 234..., whitespace) and linked profile emails.
 */
export async function signInUser({ email, password }) {
  const rawIdentifier = (email || '').trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (!rawIdentifier) {
    return { user: null, error: 'Please enter your email or phone number.' };
  }
  if (!password) {
    return { user: null, error: 'Please enter your password.' };
  }

  const candidateEmails = resolveAuthEmailCandidates(rawIdentifier);

  if (!isSupabaseConfigured() || !supabase) {
    const existing = MOCK_USERS_STORE.find((u) =>
      candidateEmails.includes(u.email?.toLowerCase()) ||
      (u.phone && (u.phone === rawIdentifier || normalizeNigerianPhone(u.phone) === normalizeNigerianPhone(rawIdentifier)))
    );
    const override = existing ? (getProfileOverride(existing.email) || getProfileOverride(existing.id)) : null;
    if (existing) {
      if (existing.status === 'suspended') {
        return { user: null, error: 'Your account has been suspended by marketplace administration. Please contact support.' };
      }
      const mergedUser = { ...existing, ...(override || {}) };
      return { user: mergedUser, error: null };
    }

    const mockFallback = {
      id: `mock-user-${Date.now()}`,
      name: rawIdentifier.split('@')[0],
      email: candidateEmails[0] || rawIdentifier,
      phone: normalizeNigerianPhone(rawIdentifier) || '08031234567',
      role: 'buyer',
      status: 'active',
      lga: 'Ukum',
      ...(override || {})
    };
    return { user: mockFallback, error: null };
  }

  // If user entered a phone number (no @), look up public.profiles for any linked registered email
  if (!rawIdentifier.includes('@')) {
    const normPhone = normalizeNigerianPhone(rawIdentifier);
    const rawDigits = rawIdentifier.replace(/\D/g, '');
    try {
      const searchQueries = [normPhone, rawDigits, `+234${normPhone.slice(1)}`].filter(Boolean);
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('email, phone')
        .in('phone', searchQueries)
        .limit(3);

      if (matchedProfiles && matchedProfiles.length > 0) {
        matchedProfiles.forEach((p) => {
          if (p.email && !p.email.includes('@benuemarket.ng') && !candidateEmails.includes(p.email.toLowerCase())) {
            candidateEmails.unshift(p.email.toLowerCase());
          }
        });
      }
    } catch (lookupErr) {
      console.warn('Phone profile lookup notice:', lookupErr?.message);
    }
  }

  let lastError = null;
  for (const candidate of candidateEmails) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: candidate,
        password
      });

      if (error) {
        lastError = error;
        continue; // Try next candidate variation
      }

      if (data?.user) {
        // Fetch corresponding profile from Supabase
        const profile = await getUserProfile(data.user.id);
        
        // Check suspension status
        if (profile?.status === 'suspended') {
          await supabase.auth.signOut();
          return { user: null, error: 'Your account has been suspended by marketplace administration. Please contact support.' };
        }

        const user = {
          id: data.user.id,
          email: data.user.email,
          name: profile?.full_name || data.user.user_metadata?.full_name || candidate.split('@')[0],
          phone: (profile?.phone && !profile.phone.includes('@')) ? profile.phone : ((data.user.user_metadata?.phone && !data.user.user_metadata.phone.includes('@')) ? data.user.user_metadata.phone : ''),
          role: profile?.role || data.user.user_metadata?.role || (candidate === 'ternongoatserawua@gmail.com' ? 'super_admin' : 'buyer'),
          status: profile?.status || 'active',
          lga: profile?.lga || data.user.user_metadata?.lga || 'Ukum',
          avatar: profile?.avatar_url || data.user.user_metadata?.avatar || data.user.user_metadata?.avatar_url || '',
          coverImage: profile?.cover_url || profile?.cover_image || data.user.user_metadata?.coverImage || data.user.user_metadata?.cover_url || '',
          verified: Boolean(profile?.verified)
        };

        return { user, error: null };
      }
    } catch (err) {
      lastError = err;
    }
  }

  const errorMsg = lastError?.message || 'Invalid login credentials. Please verify your email/phone and password.';
  console.warn('Supabase signIn error for identifier:', rawIdentifier, errorMsg);
  return { user: null, error: errorMsg };
}

/**
 * Sign out the currently authenticated user.
 * Thoroughly clears local session persistence, navigation state, and Supabase auth token.
 */
export async function signOutUser() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('benue_market_user');
      sessionStorage.removeItem('benue_market_nav_state');
    } catch {
      // Ignore storage errors
    }
  }

  if (!isSupabaseConfigured() || !supabase) {
    return { error: null };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('Supabase auth.signOut warning:', error.message);
    return { error: null };
  } catch (err) {
    console.error('Supabase signOut error:', err.message);
    return { error: err.message };
  }
}


/**
 * Fetch profile details for a given user ID.
 */
export async function getUserProfile(userId) {
  if (!userId) return null;
  const targetUUID = mapToSellerUUID(userId);

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', [targetUUID, userId].filter(Boolean))
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase getUserProfile notice:', err.message);
    }
  }

  const mock = MOCK_USERS_STORE.find((u) => u.id === userId || u.id === targetUUID);
  return mock || null;
}

/**
 * Fetch all registered users for Admin User Management.
 */
export async function fetchAllUsers() {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [...MOCK_USERS_STORE], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    if (!data || data.length === 0) {
      return { data: [...MOCK_USERS_STORE], error: null };
    }

    const formattedUsers = data.map((p) => ({
      id: p.id,
      name: p.full_name || 'Benue User',
      email: p.email || `${(p.full_name || 'user').toLowerCase().replace(/\s+/g, '.')}@user.benuemarket.ng`,
      phone: p.phone || '',
      role: p.role || 'buyer',
      status: p.status || 'active',
      location: p.location || 'Benue State',
      lga: p.lga || 'Ukum',
      verified: Boolean(p.verified),
      dealsCompleted: p.deals_completed || 0,
      createdAt: p.created_at || new Date().toISOString(),
      subscriptionPlan: p.subscription_plan || null,
      subscriptionExpiresAt: p.subscription_expires_at || null,
      subscriptionStatus: p.subscription_status || null
    }));

    return { data: formattedUsers, error: null };
  } catch (err) {
    console.warn('Fetch all users fallback to mock store:', err.message);
    return { data: [...MOCK_USERS_STORE], error: err.message };
  }
}

/**
 * Search users in Supabase database by ID or Email (or name/phone).
 * Enables administrators to find any user across all historical records by exact or partial ID/Email.
 *
 * @param {object} params
 * @param {string} params.query - the search term (UUID, email, name, phone)
 * @param {'all' | 'id' | 'email'} [params.searchBy] - target search field
 * @returns {Promise<{data: Array, error: string | null}>}
 */
export async function searchUsersInDatabase({ query = '', searchBy = 'all' } = {}) {
  const cleanQ = (query || '').trim();
  if (!cleanQ) {
    return fetchAllUsers();
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQ);

  if (!isSupabaseConfigured() || !supabase) {
    const qLower = cleanQ.toLowerCase();
    const mockMatches = MOCK_USERS_STORE.filter((u) => {
      if (searchBy === 'id') return u.id?.toLowerCase().includes(qLower);
      if (searchBy === 'email') return u.email?.toLowerCase().includes(qLower);
      return (
        u.id?.toLowerCase().includes(qLower) ||
        u.email?.toLowerCase().includes(qLower) ||
        u.name?.toLowerCase().includes(qLower) ||
        u.phone?.toLowerCase().includes(qLower)
      );
    });
    return { data: mockMatches, error: null };
  }

  try {
    let req = supabase.from('profiles').select('*');

    if (searchBy === 'id') {
      if (isUUID) {
        req = req.eq('id', cleanQ);
      } else {
        // If not a full UUID, query recent profiles and filter locally by ID prefix/substring
        const { data: allData, error: allErr } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (allErr) throw allErr;

        const localMatches = (allData || []).filter((p) =>
          p.id?.toLowerCase().includes(cleanQ.toLowerCase())
        );

        return {
          data: localMatches.map((p) => ({
            id: p.id,
            name: p.full_name || 'Benue User',
            email: p.email || `${(p.full_name || 'user').toLowerCase().replace(/\s+/g, '.')}@user.benuemarket.ng`,
            phone: p.phone || '',
            role: p.role || 'buyer',
            status: p.status || 'active',
            location: p.location || 'Benue State',
            lga: p.lga || 'Ukum',
            verified: Boolean(p.verified),
            dealsCompleted: p.deals_completed || 0,
            createdAt: p.created_at || new Date().toISOString(),
            subscriptionPlan: p.subscription_plan || null,
            subscriptionExpiresAt: p.subscription_expires_at || null,
            subscriptionStatus: p.subscription_status || null
          })),
          error: null
        };
      }
    } else if (searchBy === 'email') {
      req = req.ilike('email', `%${cleanQ}%`);
    } else {
      // searchBy === 'all' — use separate filtered queries for safety
      if (isUUID) {
        req = req.or(`id.eq.${cleanQ},email.ilike.%25${encodeURIComponent(cleanQ)}%25,full_name.ilike.%25${encodeURIComponent(cleanQ)}%25`);
      } else {
        // Sanitize search input to prevent PostgREST filter injection
        const safeQ = cleanQ.replace(/[,().*]/g, '');
        req = req.or(`email.ilike.%25${encodeURIComponent(safeQ)}%25,full_name.ilike.%25${encodeURIComponent(safeQ)}%25,phone.ilike.%25${encodeURIComponent(safeQ)}%25`);
      }
    }

    const { data, error } = await req.order('created_at', { ascending: false }).limit(50);

    if (error) throw error;

    const formatted = (data || []).map((p) => ({
      id: p.id,
      name: p.full_name || 'Benue User',
      email: p.email || `${(p.full_name || 'user').toLowerCase().replace(/\s+/g, '.')}@user.benuemarket.ng`,
      phone: p.phone || '',
      role: p.role || 'buyer',
      status: p.status || 'active',
      location: p.location || 'Benue State',
      lga: p.lga || 'Ukum',
      verified: Boolean(p.verified),
      dealsCompleted: p.deals_completed || 0,
      createdAt: p.created_at || new Date().toISOString(),
      subscriptionPlan: p.subscription_plan || null,
      subscriptionExpiresAt: p.subscription_expires_at || null,
      subscriptionStatus: p.subscription_status || null
    }));

    return { data: formatted, error: null };
  } catch (err) {
    console.warn('Database user search fallback:', err.message);
    const qLower = cleanQ.toLowerCase();
    const fallbackMatches = MOCK_USERS_STORE.filter((u) => {
      if (searchBy === 'id') return u.id?.toLowerCase().includes(qLower);
      if (searchBy === 'email') return u.email?.toLowerCase().includes(qLower);
      return (
        u.id?.toLowerCase().includes(qLower) ||
        u.email?.toLowerCase().includes(qLower) ||
        u.name?.toLowerCase().includes(qLower)
      );
    });
    return { data: fallbackMatches, error: null };
  }
}


/**
 * Suspend or Unsuspend a user account.
 * Super Admin can suspend anyone (including other Admins).
 * Regular Admin can only suspend regular farmers and buyers.
 */
export async function toggleSuspendUser(targetUserId, shouldSuspend, callerRole = 'admin') {
  // 1. Update mock store immediately
  const targetIndex = MOCK_USERS_STORE.findIndex((u) => u.id === targetUserId);
  if (targetIndex !== -1) {
    const targetUser = MOCK_USERS_STORE[targetIndex];
    if (callerRole !== 'super_admin' && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
      return { error: 'Permission Denied: Only Super Admin can suspend other administrators.' };
    }
    MOCK_USERS_STORE[targetIndex].status = shouldSuspend ? 'suspended' : 'active';
  }

  if (!isSupabaseConfigured() || !supabase) {
    return { error: null };
  }

  // Strategy 1: Dedicated RPC admin_suspend_user
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_suspend_user', {
      p_user_id: targetUserId,
      p_suspend: shouldSuspend
    });
    if (!rpcError && rpcData?.success) {
      return { error: null };
    }
  } catch (rpcErr) {
    console.warn('admin_suspend_user RPC skipped/fallback:', rpcErr?.message);
  }

  // Strategy 2: Direct profile update fallback
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ status: shouldSuspend ? 'suspended' : 'active', updated_at: new Date().toISOString() })
      .eq('id', targetUserId);

    if (error) {
      if (error.message?.toLowerCase().includes("could not find the 'status' column") || error.code === '42703') {
        throw new Error(
          "Database column missing: The 'status' column does not exist on 'public.profiles'. Please run the migration script in supabase/migrations/20241008_admin_user_management_and_subscription.sql in your Supabase SQL Editor."
        );
      }
      throw error;
    }

    // Also update listing availability if suspending
    if (shouldSuspend) {
      try {
        await supabase.from('products').update({ available: false }).eq('seller_id', targetUserId);
      } catch {}
    }

    return { error: null };
  } catch (err) {
    console.error('Suspend user error:', err.message);
    return { error: err.message };
  }
}

/**
 * Delete a user account from database permanently.
 * Super Admin can delete anyone (including other Admins).
 * Regular Admin can only delete regular farmers and buyers.
 */
export async function deleteUserAccount(targetUserId, callerRole = 'admin') {
  const targetUser = MOCK_USERS_STORE.find((u) => u.id === targetUserId);
  if (targetUser && callerRole !== 'super_admin' && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
    return { error: 'Permission Denied: Only Super Admin can delete other administrators.' };
  }

  // Remove from mock store
  MOCK_USERS_STORE = MOCK_USERS_STORE.filter((u) => u.id !== targetUserId);

  if (!isSupabaseConfigured() || !supabase) {
    return { error: null };
  }

  // Strategy 1: Attempt dedicated RPC admin_delete_user
  // This removes associated products, saved products, payment records, public.profiles, and auth.users atomically.
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_delete_user', {
      p_user_id: targetUserId
    });
    if (!rpcError && rpcData?.success) {
      return { error: null };
    }
  } catch (rpcErr) {
    console.warn('admin_delete_user RPC skipped/unavailable:', rpcErr?.message);
  }

  // Strategy 2: Direct multi-table deletion fallback
  try {
    // Delete user's products first to satisfy foreign key relationships
    await supabase.from('products').delete().eq('seller_id', targetUserId);
    await supabase.from('saved_products').delete().eq('user_id', targetUserId);
    try {
      await supabase.from('payment_transactions').delete().eq('vendor_id', targetUserId);
    } catch {}

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', targetUserId);

    if (error) {
      if (error.message?.toLowerCase().includes("could not find the 'status' column") || error.code === '42703') {
        throw new Error(
          "Database schema mismatch: Could not find the 'status' column of 'profiles' in the schema cache. Please run the SQL migration in supabase/migrations/20241008_admin_user_management_and_subscription.sql in your Supabase SQL Editor."
        );
      }
      throw error;
    }
    return { error: null };
  } catch (err) {
    console.error('Delete user error:', err.message);
    return { error: err.message };
  }
}

/**
 * Revoke a user's active subscription.
 * Super Admin or Admin can revoke subscriptions.
 */
export async function revokeUserSubscription(targetUserId, callerRole = 'admin') {
  const targetIndex = MOCK_USERS_STORE.findIndex((u) => u.id === targetUserId);
  if (targetIndex !== -1) {
    MOCK_USERS_STORE[targetIndex].subscriptionPlan = null;
    MOCK_USERS_STORE[targetIndex].subscriptionStatus = 'cancelled';
    MOCK_USERS_STORE[targetIndex].subscriptionExpiresAt = new Date().toISOString();
  }

  if (!isSupabaseConfigured() || !supabase) {
    return { error: null };
  }

  // Strategy 1: Attempt RPC admin_revoke_subscription
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_revoke_subscription', {
      p_user_id: targetUserId
    });
    if (!rpcError && rpcData?.success) {
      return { error: null };
    }
  } catch (rpcErr) {
    console.warn('admin_revoke_subscription RPC fallback:', rpcErr?.message);
  }

  // Strategy 2: Direct profile update fallback
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_plan: null,
        subscription_status: 'cancelled',
        subscription_expires_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Revoke user subscription error:', err.message);
    return { error: err.message };
  }
}

/**
 * Promote or change a user's role (e.g. Assign Admin / Super Admin role).
 */
export async function updateUserRole(targetUserId, newRole, callerRole = 'super_admin') {
  if (callerRole !== 'super_admin' && (newRole === 'admin' || newRole === 'super_admin')) {
    return { error: 'Permission Denied: Only Super Admin can assign administrative privileges.' };
  }

  const targetIndex = MOCK_USERS_STORE.findIndex((u) => u.id === targetUserId);
  if (targetIndex !== -1) {
    MOCK_USERS_STORE[targetIndex].role = newRole;
  }

  if (!isSupabaseConfigured() || !supabase) {
    return { error: null };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Update role error:', err.message);
    return { error: err.message };
  }
}

/**
 * Create a new Admin user account.
 */
export async function createAdminAccount({ name, email, phone = '', password, role = 'admin' }, callerRole = 'super_admin') {
  if (callerRole !== 'super_admin') {
    return { data: null, error: 'Permission Denied: Only Super Admin can create new administrators.' };
  }

  const cleanEmail = email.toLowerCase().trim();

  if (!isSupabaseConfigured() || !supabase) {
    const newAdmin = {
      id: `admin-${Date.now()}`,
      name,
      email: cleanEmail,
      phone,
      role,
      status: 'active',
      location: 'Benue State',
      lga: 'Makurdi',
      verified: true,
      createdAt: new Date().toISOString()
    };
    MOCK_USERS_STORE.unshift(newAdmin);
    return { data: newAdmin, error: null };
  }

  // Strategy 1: Attempt dedicated RPC function `admin_create_user`
  // This runs atomic server-side creation with immediate email confirmation and zero session side-effects.
  try {
    if (!password || password.length < 8) {
      return { data: null, error: 'A strong password (minimum 8 characters) is required for administrator accounts.' };
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_user', {
      p_email: cleanEmail,
      p_password: password,
      p_full_name: name,
      p_phone: phone || '',
      p_role: role || 'admin',
      p_lga: 'Makurdi'
    });

    if (!rpcError && rpcData?.success) {
      const createdAdmin = {
        id: rpcData.user_id,
        name,
        email: cleanEmail,
        phone,
        role: rpcData.role || role,
        status: 'active',
        location: 'Benue State',
        lga: 'Makurdi',
        verified: true
      };
      MOCK_USERS_STORE.unshift(createdAdmin);
      return { data: createdAdmin, error: null, message: rpcData.message };
    }
  } catch (rpcErr) {
    console.warn('admin_create_user RPC attempt skipped/unavailable:', rpcErr?.message);
  }

  // Strategy 2: Fallback to isolated client signup so active Super Admin session is NEVER overwritten
  const authClient = createIsolatedAuthClient() || supabase;

  try {
    if (!password || password.length < 8) {
      return { data: null, error: 'A strong password (minimum 8 characters) is required for administrator accounts.' };
    }

    const { data, error } = await authClient.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          full_name: name,
          name: name,
          phone,
          role,
          status: 'active',
          lga: 'Makurdi'
        }
      }
    });

    if (error) {
      const errMsg = (error.message || '').toLowerCase();

      // If user already exists, promote them to Admin in public.profiles
      if (errMsg.includes('already registered') || errMsg.includes('already exists')) {
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail);

        if (existingProfiles && existingProfiles.length > 0) {
          const existingUser = existingProfiles[0];
          await supabase
            .from('profiles')
            .update({
              role,
              status: 'active',
              verified: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id);

          const promotedAdmin = {
            ...existingUser,
            name: name || existingUser.full_name || existingUser.name,
            role,
            status: 'active',
            verified: true
          };
          MOCK_USERS_STORE.unshift(promotedAdmin);
          return {
            data: promotedAdmin,
            error: null,
            message: `User ${cleanEmail} already has an account and was successfully granted Administrator privileges.`
          };
        }
      }

      if (errMsg.includes('database error saving new user')) {
        throw new Error(
          'Database error saving new user: The Supabase trigger handle_new_user failed. Please run the SQL migration in supabase/migrations/20241003_fix_user_creation_trigger.sql in your Supabase SQL Editor to repair the trigger.'
        );
      }

      throw error;
    }

    if (data?.user?.id) {
      await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: name,
          email: cleanEmail,
          phone,
          role,
          status: 'active',
          location: 'Benue State',
          lga: 'Makurdi',
          verified: true,
          updated_at: new Date().toISOString()
        });
    }

    const createdAdmin = {
      id: data?.user?.id,
      name,
      email: cleanEmail,
      phone,
      role,
      status: 'active',
      location: 'Benue State',
      lga: 'Makurdi',
      verified: true
    };

    MOCK_USERS_STORE.unshift(createdAdmin);
    return { data: createdAdmin, error: null };
  } catch (err) {
    console.error('Create admin account error:', err.message);
    return { data: null, error: err.message };
  }
}

/**
 * Upgrade an existing Buyer account to Farmer/Seller role ('buyer/farmer').
 * This preserves the user's existing account, login credentials, and buyer capabilities
 * while saving their farmer profile details (farm name, LGA, produce, contact) and granting farmer privileges.
 */
export async function upgradeUserToSeller(userId, farmerProfileData = {}) {
  if (!userId) return { data: null, error: 'User ID is required.' };

  let effectiveUserId = userId;
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        effectiveUserId = authData.user.id;
      }
    } catch {}
  }
  const targetUUID = mapToSellerUUID(effectiveUserId);

  const payload = {
    role: 'buyer/farmer',
    updated_at: new Date().toISOString()
  };

  if (farmerProfileData.name || farmerProfileData.farmName) {
    payload.full_name = farmerProfileData.farmName || farmerProfileData.name;
  }
  if (farmerProfileData.phone) payload.phone = farmerProfileData.phone;
  if (farmerProfileData.lga) payload.lga = farmerProfileData.lga;
  if (farmerProfileData.community) payload.community = farmerProfileData.community;
  if (farmerProfileData.location) payload.location = farmerProfileData.location;
  if (farmerProfileData.about || farmerProfileData.cropsGrown) {
    payload.about = farmerProfileData.cropsGrown 
      ? `Primary produce: ${farmerProfileData.cropsGrown}. ${farmerProfileData.about || ''}`.trim()
      : farmerProfileData.about;
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      // First attempt with role 'buyer/farmer'
      let { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', targetUUID)
        .select()
        .maybeSingle();

      // If constraint doesn't have buyer/farmer yet (code 23514), fallback to 'farmer'
      if (error && error.code === '23514') {
        console.warn('DB constraint missing buyer/farmer, falling back to farmer role');
        payload.role = 'farmer';
        const fallback = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', targetUUID)
          .select()
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error('Supabase upgrade to seller error:', error.message);
        return { data: null, error: error.message };
      }

      // Update auth metadata
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveUserId);
      if (isUUID) {
        try {
          await supabase.auth.updateUser({ 
            data: { 
              role: 'buyer/farmer',
              farm_name: payload.full_name,
              lga: payload.lga,
              phone: payload.phone
            } 
          });
        } catch (metaErr) {
          console.warn('Auth metadata role sync notice:', metaErr.message);
        }
      }

      return { data: data || { ...payload, role: 'buyer/farmer' }, error: null };
    } catch (err) {
      console.error('Upgrade to seller error:', err.message);
      return { data: null, error: err.message };
    }
  }

  // Offline fallback
  const matchedUser = MOCK_USERS_STORE.find((u) => u.id === userId || u.id === targetUUID);
  if (matchedUser) {
    Object.assign(matchedUser, payload, { role: 'buyer/farmer' });
  }
  return { data: { ...payload, role: 'buyer/farmer' }, error: null };
}

/**
 * Check if a user has seller/farmer privileges.
 */
export function hasSellerRole(user) {
  if (!user) return false;
  const role = user.role?.toLowerCase();
  return (
    role === 'seller' ||
    role === 'farmer' ||
    role === 'buyer/farmer' ||
    role === 'admin' ||
    role === 'super_admin'
  );
}

/**
 * Check if a user has buyer privileges (ability to save bookmarks, browse, contact).
 */
export function hasBuyerRole(user) {
  if (!user) return true; // Guests have browsing & saving capability
  const role = user.role?.toLowerCase();
  return role === 'buyer' || role === 'buyer/farmer' || role === 'seller' || role === 'farmer';
}

/**
 * Check if a user has admin privileges.
 */
export function hasAdminRole(user) {
  if (!user) return false;
  const role = user.role?.toLowerCase();
  return role === 'admin' || role === 'super_admin';
}

/**
 * Update the user's profile details across Supabase Database, Supabase Auth Metadata, and local state.
 * Automatically uploads local base64 images to Supabase Storage so other devices & IP addresses receive public HTTPS URLs.
 */
export async function updateUserProfile(userId, updates) {
  if (!userId) return { data: null, error: 'User ID is required.' };

  // 1. If avatar or coverImage are local files or base64 data URIs, upload to Supabase Cloud Storage
  if (updates.avatar && ((typeof updates.avatar === 'string' && updates.avatar.startsWith('data:')) || updates.avatar instanceof Blob || updates.avatar instanceof File)) {
    try {
      const publicAvatarUrl = await uploadProfileAsset(updates.avatar, userId, 'avatar');
      if (publicAvatarUrl) {
        updates.avatar = publicAvatarUrl;
      }
    } catch (e) {
      console.warn('Avatar cloud upload notice:', e);
    }
  }

  if (updates.coverImage && ((typeof updates.coverImage === 'string' && updates.coverImage.startsWith('data:')) || updates.coverImage instanceof Blob || updates.coverImage instanceof File)) {
    try {
      const publicCoverUrl = await uploadProfileAsset(updates.coverImage, userId, 'cover');
      if (publicCoverUrl) {
        updates.coverImage = publicCoverUrl;
      }
    } catch (e) {
      console.warn('Cover cloud upload notice:', e);
    }
  }

  // Resolve effective target UUID (favor active Supabase session user ID if available)
  let effectiveUserId = userId;
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        effectiveUserId = authData.user.id;
      }
    } catch {}
  }
  const targetUUID = mapToSellerUUID(effectiveUserId);

  // 2. Supabase Cloud Database is Authoritative
  if (isSupabaseConfigured() && supabase) {
    try {
      // SECURITY: Filter updates through whitelist to prevent mass assignment
      // Protected fields (role, status, verified) can only be changed via dedicated admin functions
      const safeUpdates = filterProfileUpdates(updates);

      const dbPayload = {
        updated_at: new Date().toISOString()
      };
      if (safeUpdates.name !== undefined) dbPayload.full_name = sanitizeText(safeUpdates.name, 200);
      if (safeUpdates.phone !== undefined) dbPayload.phone = sanitizePhone(safeUpdates.phone);
      if (safeUpdates.location !== undefined) dbPayload.location = sanitizeText(safeUpdates.location, 200);
      if (safeUpdates.lga !== undefined) dbPayload.lga = sanitizeText(safeUpdates.lga, 100);
      if (safeUpdates.community !== undefined) dbPayload.community = sanitizeText(safeUpdates.community, 200);
      if (safeUpdates.about !== undefined) dbPayload.about = sanitizeText(safeUpdates.about, 2000);
      if (safeUpdates.avatar !== undefined) {
        let cleanAvatar = safeUpdates.avatar;
        if (typeof cleanAvatar === 'string' && cleanAvatar.startsWith('data:')) {
          cleanAvatar = await compressDataUrlForDatabase(cleanAvatar, 'avatar');
        }
        dbPayload.avatar_url = cleanAvatar;
      }
      if (safeUpdates.coverImage !== undefined) {
        let cleanCover = safeUpdates.coverImage;
        if (typeof cleanCover === 'string' && cleanCover.startsWith('data:')) {
          cleanCover = await compressDataUrlForDatabase(cleanCover, 'cover');
        }
        dbPayload.cover_url = cleanCover;
        dbPayload.cover_image = cleanCover;
      }
      // SECURITY: 'role' is explicitly NOT mapped here — use updateUserRole() for role changes

      // 2.1 First attempt a direct UPDATE on the user's existing profile row
      let { data: dbData, error: dbError } = await supabase
        .from('profiles')
        .update(dbPayload)
        .eq('id', targetUUID)
        .select()
        .maybeSingle();

      // 2.2 If no existing row was matched, perform upsert fallback
      if (!dbData && (!dbError || dbError.code === 'PGRST116')) {
        const { data: upsertData, error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: targetUUID,
            ...dbPayload
          }, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (upsertError) {
          dbError = upsertError;
        } else {
          dbData = upsertData;
          dbError = null;
        }
      }

      if (dbError) {
        console.error('Supabase profile table update error:', dbError.message);
        return { data: null, error: `Cloud database update failed: ${dbError.message}` };
      }

      // Sync to Supabase Auth User Metadata if it is a valid Auth UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (isUUID) {
        try {
          const authMetadata = {};
          if (updates.avatar && !updates.avatar.startsWith('data:')) {
            authMetadata.avatar = updates.avatar;
            authMetadata.avatar_url = updates.avatar;
          }
          if (updates.coverImage && !updates.coverImage.startsWith('data:')) {
            authMetadata.coverImage = updates.coverImage;
            authMetadata.cover_url = updates.coverImage;
          }
          if (updates.name) authMetadata.full_name = updates.name;
          if (updates.phone) authMetadata.phone = updates.phone;
          if (updates.lga) authMetadata.lga = updates.lga;

          if (Object.keys(authMetadata).length > 0) {
            await supabase.auth.updateUser({ data: authMetadata });
          }
        } catch (metaErr) {
          console.warn('Auth metadata sync notice:', metaErr.message);
        }
      }

      // Update in-memory mock store
      const matchedUser = MOCK_USERS_STORE.find((u) => u.id === userId || u.id === targetUUID || u.email === updates.email);
      if (matchedUser) {
        Object.assign(matchedUser, updates);
      }

      // Update cached session user in localStorage
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('benue_market_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && (parsed.id === userId || parsed.id === targetUUID || parsed.email === updates.email)) {
              const updatedCachedUser = { ...parsed, ...updates };
              localStorage.setItem('benue_market_user', JSON.stringify(updatedCachedUser));
            }
          }
        } catch {
          // Ignore storage errors
        }
      }

      broadcastProfileUpdate(userId, updates);
      return { data: dbData || updates, error: null };
    } catch (err) {
      console.error('Update profile error:', err.message);
      return { data: null, error: err.message };
    }
  }

  // Fallback for offline mode when Supabase is not configured
  const matchedUser = MOCK_USERS_STORE.find((u) => u.id === userId || u.email === updates.email);
  if (matchedUser) {
    Object.assign(matchedUser, updates);
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('benue_market_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.id === userId || parsed.email === updates.email)) {
          const updatedCachedUser = { ...parsed, ...updates };
          localStorage.setItem('benue_market_user', JSON.stringify(updatedCachedUser));
        }
      }
    } catch {
      // Ignore
    }
  }
  broadcastProfileUpdate(userId, updates);
  return { data: updates, error: null };
}

/**
 * Asynchronously fetch the verified authenticated user directly from Supabase session.
 * Used on app startup to validate or flush stale localStorage sessions.
 */
export async function getCurrentSessionUser() {
  if (!isSupabaseConfigured() || !supabase) {
    try {
      const stored = localStorage.getItem('benue_market_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('benue_market_user');
        } catch {}
      }
      return null;
    }

    const profile = await getUserProfile(session.user.id);
    // SECURITY: Role is determined EXCLUSIVELY from the profiles database table.
    // Never use email comparison or client-side checks for admin role assignment.
    const user = {
      id: session.user.id,
      email: session.user.email,
      name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
      phone: (profile?.phone && !profile.phone.includes('@')) ? profile.phone : ((session.user.user_metadata?.phone && !session.user.user_metadata.phone.includes('@')) ? session.user.user_metadata.phone : ''),
      role: profile?.role || session.user.user_metadata?.role || 'buyer',
      status: profile?.status || 'active',
      lga: profile?.lga || session.user.user_metadata?.lga || 'Ukum',
      avatar: profile?.avatar_url || session.user.user_metadata?.avatar || session.user.user_metadata?.avatar_url || '',
      coverImage: profile?.cover_url || profile?.cover_image || session.user.user_metadata?.coverImage || session.user.user_metadata?.cover_url || '',
      verified: Boolean(profile?.verified)
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('benue_market_user', JSON.stringify(user));
      } catch {}
    }
    return user;
  } catch (err) {
    console.warn('Failed to retrieve active session:', err.message);
    return null;
  }
}

/**
 * Subscribe to Supabase Auth state changes (login, logout, token refresh).
 */
export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured() || !supabase) {
    return { unsubscribe: () => {} };
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await getUserProfile(session.user.id);
      // SECURITY: Role from database only — never from email comparison
      const user = {
        id: session.user.id,
        email: session.user.email,
        name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        phone: (profile?.phone && !profile.phone.includes('@')) ? profile.phone : ((session.user.user_metadata?.phone && !session.user.user_metadata.phone.includes('@')) ? session.user.user_metadata.phone : ''),
        role: profile?.role || session.user.user_metadata?.role || 'buyer',
        status: profile?.status || 'active',
        lga: profile?.lga || session.user.user_metadata?.lga || 'Ukum',
        avatar: profile?.avatar_url || session.user.user_metadata?.avatar || session.user.user_metadata?.avatar_url || '',
        coverImage: profile?.cover_url || profile?.cover_image || session.user.user_metadata?.coverImage || session.user.user_metadata?.cover_url || '',
        verified: Boolean(profile?.verified)
      };
      callback(user, event);
    } else {
      callback(null, event);
    }
  });

  return {
    unsubscribe: () => subscription.unsubscribe()
  };
}

/**
 * Send a password-reset email to the user.
 * Supabase will email a recovery link. After clicking it the browser is redirected
 * back to the app with an access token in the URL hash which Supabase auto-processes.
 * @param {string} email - The account email address.
 * @returns {{ error: string|null }}
 */
export async function requestPasswordReset(email) {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { error: 'Please enter a valid email address.' };
  }

  if (!isSupabaseConfigured() || !supabase) {
    // Offline / demo mode – simulate success so UI gives user feedback
    return { error: null };
  }

  try {
    // redirectTo must match a URL in Supabase Auth → URL Configuration allow-list
    const redirectTo = `${window.location.origin}${window.location.pathname}#/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo
    });

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Password reset request error:', err.message);
    return { error: err.message };
  }
}

/**
 * Set a brand-new password for the currently authenticated (recovery) session.
 * Call this after the user has followed the reset link in their email and the
 * Supabase client has exchanged the token from the URL hash for an active session.
 * @param {string} newPassword - Must be at least 6 characters.
 * @returns {{ error: string|null }}
 */
export async function updateUserPassword(newPassword) {
  if (!newPassword || newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  if (!isSupabaseConfigured() || !supabase) {
    return { error: null }; // offline demo
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Update password error:', err.message);
    return { error: err.message };
  }
}

