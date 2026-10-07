import React, { useState, useRef } from 'react';
import {
  Upload,
  Link,
  Sparkles,
  CheckCircle2,
  X,
  Image as ImageIcon,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { uploadProduceImage } from '../../services/productsService.js';
import { compressImage, formatBytes } from '../../utils/imageCompressor.js';

export const SAMPLE_CROP_IMAGES = [
  { label: 'Yam Tubers', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Soybeans & Grains', url: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=800&q=80' },
  { label: 'Benue Rice', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80' },
  { label: 'Peppers & Veg', url: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Groundnuts', url: 'https://images.unsplash.com/photo-1567892308967-5f7823528b1e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Citrus & Fruits', url: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=800&q=80' },
  { label: 'Livestock / Goat', url: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cassava Harvest', url: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&w=800&q=80' }
];

export default function ImageUploadPicker({
  value = '',
  onChange = () => {},
  userId = null,
  label = 'Produce Image',
  disabled = false
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url' | 'presets'
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [compressionStats, setCompressionStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Handle File Selection
  const handleFile = async (file) => {
    if (disabled || !file) return;

    if (!file.type.startsWith('image/') && !file.type.includes('heic') && !file.type.includes('heif')) {
      setUrlError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUrlError('Image size exceeds 25MB limit. Please choose a smaller image.');
      return;
    }

    setUrlError('');
    setSelectedFileName(file.name);
    setUploading(true);

    try {
      // 1. Auto-compress file to minimum capacity (<120KB WebP)
      const compResult = await compressImage(file, 'produce');
      setCompressionStats(compResult);

      if (compResult?.dataUrl) {
        onChange(compResult.dataUrl, compResult.file);
      }

      // 2. Upload compressed file to Supabase Storage if user is authenticated
      if (userId) {
        const publicUrl = await uploadProduceImage(compResult.file || file, userId);
        if (publicUrl) {
          onChange(publicUrl, compResult.file || file);
        }
      }
    } catch (err) {
      console.error('Image processing error:', err);
      setUrlError('Could not process this image file. Please try another photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Handle URL Apply
  const handleApplyUrl = (e) => {
    if (e) e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      setUrlError('Please enter or paste an image URL.');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setUrlError('URL must start with http:// or https://');
      return;
    }

    setUrlError('');
    setSelectedFileName('');
    onChange(cleanUrl, null);
  };

  // Handle Preset Select
  const handleSelectPreset = (url) => {
    setSelectedFileName('');
    setUrlError('');
    onChange(url, null);
  };

  // Handle Clear / Remove
  const handleRemoveImage = () => {
    setSelectedFileName('');
    setUrlInput('');
    setUrlError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onChange('', null);
  };

  return (
    <div className="image-upload-picker-root" style={{ marginBottom: '16px' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span>{label} *</span>
        {value && (
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={disabled}
            className="text-xs text-danger flex items-center gap-1"
            style={{ background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', color: 'var(--color-danger, #b91c1c)', fontWeight: '600', opacity: disabled ? 0.6 : 1 }}
          >
            <X size={13} /> Remove Photo
          </button>
        )}
      </label>

      {/* Active Image Preview Box */}
      {value ? (
        <div style={{
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--color-slate-900)',
          maxHeight: '220px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img
            src={value}
            alt="Preview"
            style={{ width: '100%', maxHeight: '220px', objectFit: 'cover' }}
            onError={() => setUrlError('Could not load image from this URL. Please verify the link.')}
          />
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {uploading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Compressing & Uploading...</span>
              </>
            ) : selectedFileName ? (
              <>
                <CheckCircle2 size={13} color="#4ade80" />
                <span>{selectedFileName}</span>
                {compressionStats && compressionStats.compressedSize > 0 && (
                  <span style={{
                    marginLeft: '4px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(34, 197, 94, 0.25)',
                    color: '#86efac',
                    fontSize: '10px',
                    fontWeight: 600
                  }}>
                    {formatBytes(compressionStats.compressedSize)} (-{compressionStats.compressionRatio})
                  </span>
                )}
              </>
            ) : (
              <>
                <ImageIcon size={13} />
                <span>Image Active</span>
              </>
            )}
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Change image"
            >
              <X size={15} />
            </button>
          )}
        </div>
      ) : null}

      {/* Mode Switch Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        backgroundColor: 'var(--color-slate-100)',
        padding: '3px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '10px',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveTab('upload')}
          style={{
            padding: '6px 4px',
            fontSize: '11px',
            fontWeight: activeTab === 'upload' ? '700' : '600',
            backgroundColor: activeTab === 'upload' ? '#ffffff' : 'transparent',
            color: activeTab === 'upload' ? 'var(--color-primary-800)' : 'var(--color-slate-700)',
            borderRadius: '4px',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            boxShadow: activeTab === 'upload' ? 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.05))' : 'none'
          }}
        >
          <Upload size={13} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Upload File</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveTab('url')}
          style={{
            padding: '6px 4px',
            fontSize: '11px',
            fontWeight: activeTab === 'url' ? '700' : '600',
            backgroundColor: activeTab === 'url' ? '#ffffff' : 'transparent',
            color: activeTab === 'url' ? 'var(--color-primary-800)' : 'var(--color-slate-700)',
            borderRadius: '4px',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            boxShadow: activeTab === 'url' ? 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.05))' : 'none'
          }}
        >
          <Link size={13} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Paste URL</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveTab('presets')}
          style={{
            padding: '6px 4px',
            fontSize: '11px',
            fontWeight: activeTab === 'presets' ? '700' : '600',
            backgroundColor: activeTab === 'presets' ? '#ffffff' : 'transparent',
            color: activeTab === 'presets' ? 'var(--color-primary-800)' : 'var(--color-slate-700)',
            borderRadius: '4px',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            boxShadow: activeTab === 'presets' ? 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.05))' : 'none'
          }}
        >
          <Sparkles size={13} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Samples</span>
        </button>
      </div>

      {/* Tab 1: Upload from Device */}
      {activeTab === 'upload' && (
        <div
          onDrop={disabled ? undefined : handleDrop}
          onDragOver={disabled ? undefined : handleDragOver}
          onDragLeave={disabled ? undefined : handleDragLeave}
          onClick={disabled ? undefined : () => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--color-primary-600)' : 'var(--border-default)'}`,
            backgroundColor: dragOver ? 'var(--color-primary-50)' : 'var(--color-slate-50)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 16px',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            disabled={disabled}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-50)',
            color: 'var(--color-primary-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px auto'
          }}>
            <Upload size={18} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-slate-800)', marginBottom: '2px' }}>
            Click to browse or drag &amp; drop produce photo (1 photo only)
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-slate-500)' }}>
            Supports JPG, PNG, WebP (Max 10MB)
          </div>
        </div>
      )}

      {/* Tab 2: Paste Image URL */}
      {activeTab === 'url' && (
        <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
          <input
            type="url"
            disabled={disabled}
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (urlError) setUrlError('');
            }}
            placeholder="https://images.unsplash.com/... or direct image link"
            className="form-input"
            style={{ flex: 1, minWidth: 0, fontSize: '13px' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyUrl();
              }
            }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={handleApplyUrl}
            className="btn btn-primary btn-sm"
            style={{ whiteSpace: 'nowrap' }}
          >
            Apply URL
          </button>
        </div>
      )}

      {/* Tab 3: Sample Preset Photos */}
      {activeTab === 'presets' && (
        <div className="sample-img-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
          {SAMPLE_CROP_IMAGES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectPreset(sample.url)}
              className={`sample-img-btn ${value === sample.url ? 'active' : ''}`}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              {sample.label}
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {urlError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--color-danger, #b91c1c)'
        }}>
          <AlertCircle size={14} />
          <span>{urlError}</span>
        </div>
      )}
    </div>
  );
}
