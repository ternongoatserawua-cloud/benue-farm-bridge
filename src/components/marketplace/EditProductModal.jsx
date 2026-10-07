import React, { useState, useEffect } from 'react';
import {
  Save,
  X,
  AlertCircle,
  Package,
  Layers,
  MapPin,
  Phone
} from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import ImageUploadPicker from '../common/ImageUploadPicker.jsx';
import { CATEGORIES } from '../../data/categories.js';
import { BENUE_LGAS } from '../../data/locations.js';
import { uploadProduceImage } from '../../services/productsService.js';

export default function EditProductModal({
  isOpen,
  onClose,
  product = null,
  currentUserId = null,
  onSave = () => {}
}) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'tubers',
    price: 0,
    unit: 'unit',
    quantity: 1,
    minimumOrder: 1,
    lga: 'Ukum',
    location: '',
    phone: '',
    whatsapp: '',
    image: '',
    available: true,
    description: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name || '',
        category: product.category || 'tubers',
        price: product.price || 0,
        unit: product.unit || 'unit',
        quantity: product.quantity || 1,
        minimumOrder: product.minimumOrder || 1,
        lga: product.lga || 'Ukum',
        location: product.location || '',
        phone: (product.phone && typeof product.phone === 'string' && !product.phone.includes('@')) ? product.phone : '',
        whatsapp: (product.whatsapp && typeof product.whatsapp === 'string' && !product.whatsapp.includes('@')) ? product.whatsapp : '',
        image: product.image || (product.images && product.images[0]) || '',
        available: product.available !== false,
        description: product.description || ''
      });
      setSelectedFile(null);
      setErrorMsg('');
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Please enter a produce title.');
      return;
    }
    if (!formData.price || formData.price <= 0) {
      setErrorMsg('Please enter a valid price.');
      return;
    }

    setLoading(true);

    let finalImageUrl = formData.image;
    if (selectedFile && currentUserId && !finalImageUrl.startsWith('http')) {
      const uploaded = await uploadProduceImage(selectedFile, currentUserId);
      if (uploaded) finalImageUrl = uploaded;
    }

    const updatedProduct = {
      ...product,
      name: formData.name.trim(),
      category: formData.category,
      price: Number(formData.price),
      unit: formData.unit.trim(),
      quantity: Number(formData.quantity || 1),
      minimumOrder: Number(formData.minimumOrder || 1),
      location: formData.location.trim() || `${formData.lga}, Benue`,
      lga: formData.lga,
      phone: formData.phone.trim(),
      whatsapp: formData.whatsapp.trim() || formData.phone.trim(),
      image: finalImageUrl,
      images: [finalImageUrl],
      available: Boolean(formData.available),
      description: formData.description.trim()
    };

    await onSave(updatedProduct);
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Produce Listing"
      maxWidth="560px"
    >
      <div className="edit-product-modal-root" style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
        {errorMsg && (
          <div className="auth-error-alert" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            backgroundColor: 'var(--color-danger-light, #fee2e2)',
            color: 'var(--color-danger, #b91c1c)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-body">
          {/* Product Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-name">Produce Name *</label>
            <input
              id="edit-name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g. Fresh Zaki Biam Yam Tubers"
            />
          </div>

          {/* Category & Unit */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-category">Category *</label>
              <select
                id="edit-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
              >
                <option value="" disabled hidden>
                  -- Select Agricultural Category --
                </option>
                {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-unit">Selling Unit *</label>
              <input
                id="edit-unit"
                name="unit"
                type="text"
                required
                value={formData.unit}
                onChange={handleChange}
                placeholder="e.g. tuber, 100kg bag, basket"
                className="form-input"
              />
            </div>
          </div>

          {/* Price & Quantity */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-price">Price in Naira (₦) *</label>
              <input
                id="edit-price"
                name="price"
                type="number"
                min="0"
                required
                value={formData.price}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-quantity">Quantity Available *</label>
              <input
                id="edit-quantity"
                name="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          {/* Minimum Order & LGA */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-minimumOrder">Minimum Order</label>
              <input
                id="edit-minimumOrder"
                name="minimumOrder"
                type="number"
                min="1"
                value={formData.minimumOrder}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-lga">
                Benue State LGA <span style={{ fontWeight: 'normal', color: 'var(--color-slate-500)', fontSize: '0.8rem' }}>(e.g. Ukum, Makurdi, Gboko)</span> *
              </label>
              <select
                id="edit-lga"
                name="lga"
                value={formData.lga}
                onChange={handleChange}
                className="form-select"
              >
                <option value="" disabled hidden>
                  -- Select Benue State LGA --
                </option>
                {BENUE_LGAS.filter(l => l.id !== 'all').map((lga) => (
                  <option key={lga.id} value={lga.name.split(' ')[0]}>
                    {lga.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location details */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-location">Farm / Market Location</label>
            <input
              id="edit-location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Zaki Biam Market Axis"
              className="form-input"
            />
          </div>

          {/* Phone & WhatsApp */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-phone">Phone Number (Direct Calls) *</label>
              <input
                id="edit-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="tel"
                required
                value={formData.phone}
                onChange={(e) => {
                  const numericVal = e.target.value.replace(/\D/g, '');
                  setFormData((prev) => ({ ...prev, phone: numericVal }));
                }}
                placeholder="+234 902 264 2177"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-whatsapp">WhatsApp Number (For Direct WhatsApp Chat) *</label>
              <input
                id="edit-whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="tel"
                required
                value={formData.whatsapp}
                onChange={(e) => {
                  const numericVal = e.target.value.replace(/\D/g, '');
                  setFormData((prev) => ({ ...prev, whatsapp: numericVal }));
                }}
                placeholder="+234 902 264 2177"
                className="form-input"
              />
            </div>
          </div>

          {/* Stock Availability Toggle */}
          <div className="form-group" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--color-slate-50)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)'
          }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--color-slate-900)' }}>Stock Status</div>
              <div style={{ fontSize: '12px', color: 'var(--color-slate-600)' }}>Is this harvest available for buyers to purchase?</div>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="available"
                checked={formData.available}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary-600)' }}
              />
              <span style={{ fontSize: '13px', fontWeight: '700', color: formData.available ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {formData.available ? 'In Stock' : 'Sold Out'}
              </span>
            </label>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-description">Description &amp; Quality Notes</label>
            <textarea
              id="edit-description"
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Describe freshness, harvest date, packaging, and pickup terms..."
            />
          </div>

          {/* Image Selection / Upload / URL Paste */}
          <ImageUploadPicker
            value={formData.image}
            onChange={(url, file) => {
              setFormData((prev) => ({ ...prev, image: url }));
              if (file) setSelectedFile(file);
            }}
            userId={currentUserId}
            label="Produce Photo (Upload File or Paste Image URL)"
          />

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', marginTop: '20px' }}>
            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={loading}
              icon={Save}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
