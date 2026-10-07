import React, { useState } from 'react';
import { Camera, Image as ImageIcon, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import ImageUploadPicker from './ImageUploadPicker.jsx';

export default function TripleImageUploadPicker({
  images = ['', '', ''],
  onChange = () => {},
  userId = null
}) {
  const [activeSlot, setActiveSlot] = useState(0);

  const slotLabels = [
    { title: 'Image 1: Primary Cover Photo', desc: 'Appears directly on Marketplace Produce Cards', required: true, icon: Camera },
    { title: 'Image 2: Harvest / Crop Quality Detail', desc: 'Appears in full view when buyers click View Details', required: true, icon: ImageIcon },
    { title: 'Image 3: Packaging / Farm Gate View', desc: 'Appears as 3rd image in product details gallery', required: true, icon: Sparkles }
  ];

  const handleSlotChange = (index, newUrl) => {
    const nextImages = [...images];
    nextImages[index] = newUrl;
    onChange(nextImages);
  };

  const filledCount = images.filter(img => Boolean(img && img.trim())).length;

  return (
    <div className="triple-image-picker-root" style={{
      backgroundColor: 'var(--color-slate-50)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: '18px 16px',
      marginBottom: '20px'
    }}>
      {/* Header & Status Counter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div>
          <h3 style={{
            fontSize: '0.95rem',
            fontWeight: '800',
            color: 'var(--color-slate-900)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Camera size={18} color="var(--color-primary-700)" />
            3 Compulsory Produce Photos *
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-slate-600)', margin: '2px 0 0 0' }}>
            Upload 3 photos of your crop. Image 1 displays on marketplace cards, Images 2 &amp; 3 display inside Details View.
          </p>
        </div>

        {/* Progress Counter Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '700',
          backgroundColor: filledCount === 3 ? '#dcfce7' : '#fef3c7',
          color: filledCount === 3 ? '#15803d' : '#b45309',
          border: `1px solid ${filledCount === 3 ? '#86efac' : '#fde68a'}`
        }}>
          {filledCount === 3 ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{filledCount} of 3 Photos Added</span>
        </div>
      </div>

      {/* 3 Slot Indicator Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        marginBottom: '16px'
      }}>
        {slotLabels.map((slot, idx) => {
          const hasImage = Boolean(images[idx] && images[idx].trim());
          const isCurrent = activeSlot === idx;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlot(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '10px 6px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${isCurrent ? 'var(--color-primary-600)' : hasImage ? '#86efac' : 'var(--border-default)'}`,
                backgroundColor: isCurrent ? '#ffffff' : hasImage ? '#f0fdf4' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isCurrent ? 'var(--shadow-sm)' : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'relative',
                width: '100%',
                height: '56px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-slate-100)',
                overflow: 'hidden',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {hasImage ? (
                  <img src={images[idx]} alt={`Slot ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <slot.icon size={20} color="var(--color-slate-400)" />
                )}

                {hasImage && (
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={12} />
                  </div>
                )}
              </div>

              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: isCurrent ? 'var(--color-primary-800)' : 'var(--color-slate-800)',
                lineHeight: '1.2'
              }}>
                Photo #{idx + 1}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                {idx === 0 ? 'Card Cover' : idx === 1 ? 'Details #1' : 'Details #2'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Slot Picker Container */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        padding: '14px'
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: '700',
          color: 'var(--color-slate-900)',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            backgroundColor: 'var(--color-primary-700)',
            color: '#ffffff',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            fontSize: '11px',
            fontWeight: '800',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {activeSlot + 1}
          </span>
          <span>{slotLabels[activeSlot].title} *</span>
        </div>

        <ImageUploadPicker
          value={images[activeSlot] || ''}
          onChange={(newUrl) => handleSlotChange(activeSlot, newUrl)}
          userId={userId}
          label=""
        />

        {/* Next Slot Quick Button */}
        {activeSlot < 2 && images[activeSlot] && (
          <button
            type="button"
            onClick={() => setActiveSlot(activeSlot + 1)}
            className="btn btn-outline btn-sm w-full mt-2"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <span>Proceed to Photo #{activeSlot + 2}</span>
          </button>
        )}
      </div>
    </div>
  );
}
