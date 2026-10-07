/**
 * Auto Image & File Compression Engine
 * Automatically compresses all uploaded files/images to minimum capacity
 * before uploading to Supabase Cloud Storage or persisting to the database.
 * 
 * Features:
 * - High-efficiency WebP / JPEG canvas compression
 * - Multi-pass iterative quality & dimension scaling to reach target minimum capacity
 * - Configurable presets: 'avatar', 'produce', 'cover', 'thumbnail', 'document'
 * - Preserves aspect ratios and handles mobile orientation
 * - Outputs compressed File, Blob, and compact Data URLs
 */

// Presets tailored for various use cases with minimum capacity targets
export const COMPRESSION_PRESETS = {
  avatar: {
    maxWidth: 400,
    maxHeight: 400,
    targetMaxBytes: 45 * 1024, // ~45 KB max target
    initialQuality: 0.82,
    minQuality: 0.45,
    mimeType: 'image/webp',
    fallbackMimeType: 'image/jpeg'
  },
  cover: {
    maxWidth: 1200,
    maxHeight: 600,
    targetMaxBytes: 140 * 1024, // ~140 KB max target
    initialQuality: 0.80,
    minQuality: 0.45,
    mimeType: 'image/webp',
    fallbackMimeType: 'image/jpeg'
  },
  produce: {
    maxWidth: 1080,
    maxHeight: 1080,
    targetMaxBytes: 120 * 1024, // ~120 KB max target
    initialQuality: 0.82,
    minQuality: 0.45,
    mimeType: 'image/webp',
    fallbackMimeType: 'image/jpeg'
  },
  thumbnail: {
    maxWidth: 240,
    maxHeight: 240,
    targetMaxBytes: 25 * 1024, // ~25 KB max target
    initialQuality: 0.75,
    minQuality: 0.40,
    mimeType: 'image/webp',
    fallbackMimeType: 'image/jpeg'
  },
  document: {
    maxWidth: 1600,
    maxHeight: 1600,
    targetMaxBytes: 180 * 1024, // ~180 KB max target
    initialQuality: 0.80,
    minQuality: 0.50,
    mimeType: 'image/webp',
    fallbackMimeType: 'image/jpeg'
  },
  default: {
    maxWidth: 1080,
    maxHeight: 1080,
    targetMaxBytes: 100 * 1024, // ~100 KB max target
    initialQuality: 0.80,
    minQuality: 0.45,
    mimeType: 'image/webp',
    fallbackMimeType: 'image/jpeg'
  }
};

/**
 * Format bytes into human readable format (KB / MB).
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Check if the browser supports export of a specific MIME type from canvas.
 */
function isMimeTypeSupported(mimeType) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL(mimeType);
    return dataUrl.startsWith(`data:${mimeType}`);
  } catch {
    return false;
  }
}

/**
 * Convert a base64 Data URL to a Blob.
 */
export function dataURItoBlob(dataURI) {
  if (!dataURI || typeof dataURI !== 'string' || !dataURI.startsWith('data:')) {
    return null;
  }
  try {
    const split = dataURI.split(',');
    const byteString = atob(split[1]);
    const mimeMatch = split[0].match(/:(.*?);/);
    const mimeString = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  } catch (err) {
    console.warn('dataURItoBlob conversion error:', err);
    return null;
  }
}

/**
 * Load an image from a File, Blob, or Data URL.
 */
function loadImageSource(source) {
  return new Promise((resolve, reject) => {
    if (!source) {
      reject(new Error('No image source provided.'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to decode image data.'));

    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof Blob || source instanceof File) {
      const objectUrl = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image from file blob.'));
      };
      img.src = objectUrl;
    } else {
      reject(new Error('Unsupported source format for compression.'));
    }
  });
}

/**
 * Core Image Compressor
 * Iteratively resizes and reduces file capacity to the minimum threshold.
 * 
 * @param {File|Blob|string} source - Image File, Blob, or base64 Data URL
 * @param {string|object} optionsOrPreset - Preset name ('avatar'|'produce'|'cover'|'thumbnail') or custom options
 * @returns {Promise<{ blob: Blob, file: File, dataUrl: string, originalSize: number, compressedSize: number, compressionRatio: string, width: number, height: number }>}
 */
export async function compressImage(source, optionsOrPreset = 'default') {
  if (!source) {
    throw new Error('No source provided for compression.');
  }

  // Resolve options from preset or custom object
  const presetConfig = typeof optionsOrPreset === 'string'
    ? (COMPRESSION_PRESETS[optionsOrPreset] || COMPRESSION_PRESETS.default)
    : { ...COMPRESSION_PRESETS.default, ...optionsOrPreset };

  const {
    maxWidth = 1080,
    maxHeight = 1080,
    targetMaxBytes = 120 * 1024,
    initialQuality = 0.82,
    minQuality = 0.45,
    mimeType = 'image/webp',
    fallbackMimeType = 'image/jpeg',
    fileName = 'compressed_image'
  } = presetConfig;

  // Determine original file size
  let originalSize = 0;
  if (source instanceof Blob || source instanceof File) {
    originalSize = source.size;
  } else if (typeof source === 'string' && source.startsWith('data:')) {
    originalSize = Math.round((source.length - (source.indexOf(',') + 1)) * 0.75);
  }

  // Load image into HTMLImageElement
  let img;
  try {
    img = await loadImageSource(source);
  } catch (loadErr) {
    console.warn('Image load failed during compression:', loadErr.message);
    // If source is already a blob/file, return fallback
    if (source instanceof Blob || source instanceof File) {
      return {
        blob: source,
        file: source instanceof File ? source : new File([source], fileName, { type: source.type || 'image/jpeg' }),
        dataUrl: typeof source === 'string' ? source : '',
        originalSize,
        compressedSize: originalSize,
        compressionRatio: '0%',
        width: 0,
        height: 0
      };
    }
    throw loadErr;
  }

  // Determine export MIME type (prefer WebP for minimum capacity, fallback to JPEG)
  const chosenMimeType = isMimeTypeSupported(mimeType) ? mimeType : fallbackMimeType;
  const fileExt = chosenMimeType === 'image/webp' ? 'webp' : 'jpg';

  // Base dimensions calculation
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width <= 0 || height <= 0) {
    width = 800;
    height = 800;
  }

  // Scale down if larger than max boundaries
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  // Iterative multi-pass compression
  let quality = initialQuality;
  let currentWidth = width;
  let currentHeight = height;
  let bestBlob = null;
  let bestDataUrl = null;
  const maxIterations = 5;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const canvas = document.createElement('canvas');
    canvas.width = currentWidth;
    canvas.height = currentHeight;

    const ctx = canvas.getContext('2d', { alpha: chosenMimeType === 'image/webp' });
    if (!ctx) break;

    // High quality canvas scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // If JPEG, fill white background for transparent PNG inputs
    if (chosenMimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, currentWidth, currentHeight);
    }

    ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

    // Generate output
    const dataUrl = canvas.toDataURL(chosenMimeType, quality);
    const blob = dataURItoBlob(dataUrl);

    if (!blob) break;

    bestBlob = blob;
    bestDataUrl = dataUrl;

    // Check if we've satisfied minimum capacity target
    if (blob.size <= targetMaxBytes || quality <= minQuality) {
      break;
    }

    // Step down quality and scale down slightly if still above target
    quality = Math.max(minQuality, quality - 0.12);
    if (currentWidth > 600 && currentHeight > 600 && blob.size > targetMaxBytes * 1.5) {
      currentWidth = Math.round(currentWidth * 0.85);
      currentHeight = Math.round(currentHeight * 0.85);
    }
  }

  if (!bestBlob) {
    // Ultimate fallback if canvas extraction failed
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = width;
    fallbackCanvas.height = height;
    const ctx = fallbackCanvas.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0, width, height);
    bestDataUrl = fallbackCanvas.toDataURL('image/jpeg', 0.8);
    bestBlob = dataURItoBlob(bestDataUrl) || (source instanceof Blob ? source : new Blob());
  }

  const compressedSize = bestBlob.size;
  const savings = originalSize > 0 ? Math.max(0, originalSize - compressedSize) : 0;
  const savingsPercent = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(0) : '0';

  // Construct output File object
  const cleanBaseName = (typeof source === 'object' && source?.name)
    ? source.name.substring(0, source.name.lastIndexOf('.')) || 'image'
    : fileName;
  const finalFileName = `${cleanBaseName}.${fileExt}`;
  const finalFile = new File([bestBlob], finalFileName, {
    type: chosenMimeType,
    lastModified: Date.now()
  });

  return {
    blob: bestBlob,
    file: finalFile,
    dataUrl: bestDataUrl,
    originalSize,
    compressedSize,
    compressionRatio: `${savingsPercent}%`,
    width: currentWidth,
    height: currentHeight,
    format: chosenMimeType
  };
}

/**
 * Automatically compress any File, Blob, or Data URL to a minimum capacity File
 * ready for Supabase Storage uploads.
 * 
 * @param {File|Blob|string} source 
 * @param {string|object} presetOrOptions ('avatar' | 'produce' | 'cover' | 'thumbnail')
 * @returns {Promise<File>} Compressed File object
 */
export async function compressFileForUpload(source, presetOrOptions = 'default') {
  if (!source) return null;
  try {
    const result = await compressImage(source, presetOrOptions);
    return result.file;
  } catch (err) {
    console.warn('Auto compression for upload failed, using original:', err.message);
    if (source instanceof File) return source;
    if (source instanceof Blob) return new File([source], 'upload.jpg', { type: source.type || 'image/jpeg' });
    const converted = dataURItoBlob(source);
    return converted ? new File([converted], 'upload.jpg', { type: 'image/jpeg' }) : null;
  }
}

/**
 * Automatically compress any image to a compact base64 Data URL
 * for saving to database columns or local cache with minimal footprint.
 * 
 * @param {File|Blob|string} source 
 * @param {string|object} presetOrOptions 
 * @returns {Promise<string>} Minimized Data URL
 */
export async function compressDataUrlForDatabase(source, presetOrOptions = 'default') {
  if (!source) return '';
  // If already a remote HTTP cloud URL, return unchanged
  if (typeof source === 'string' && source.startsWith('http')) {
    return source;
  }
  try {
    const result = await compressImage(source, presetOrOptions);
    return result.dataUrl;
  } catch (err) {
    console.warn('Auto compression for data URL failed:', err.message);
    return typeof source === 'string' ? source : '';
  }
}

/**
 * Mobile-Friendly Image Reader & Compressor Utility
 * Backward-compatible helper for drop-in usage across existing components.
 */
export async function compressAndReadImage(file, maxWidth = 1080, maxHeight = 1080, quality = 0.80) {
  if (!file) return null;
  try {
    const result = await compressImage(file, {
      maxWidth,
      maxHeight,
      initialQuality: quality,
      targetMaxBytes: 120 * 1024
    });
    return result.dataUrl;
  } catch (err) {
    console.error('compressAndReadImage error:', err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
}
