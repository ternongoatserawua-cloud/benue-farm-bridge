import React, { useState } from 'react';
import { ShieldCheck, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { createAdminAccount } from '../../services/authService.js';

export default function AddAdminModal({
  isOpen,
  onClose,
  currentUserRole = 'super_admin',
  onSuccess = () => {}
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please provide a name and email.');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Please provide a strong password (minimum 8 characters).');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: createError } = await createAdminAccount(
      {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role
      },
      currentUserRole
    );

    setLoading(false);

    if (createError) {
      setError(createError);
      return;
    }

    onSuccess(data);
    onClose();
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'admin'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Marketplace Administrator"
      maxWidth="480px"
    >
      <form onSubmit={handleSubmit} className="admin-add-modal-form">
        <div className="admin-notice-box">
          <ShieldCheck size={18} className="text-brand-green" />
          <p>
            You are creating an authorized platform administrator with moderation and approval permissions.
          </p>
        </div>

        {error && (
          <div className="auth-error-alert" style={{ marginBottom: '1rem' }}>
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="admin-name">Full Name *</label>
          <div className="input-with-icon">
            <User size={16} className="input-icon" />
            <input
              id="admin-name"
              type="text"
              required
              className="form-control"
              placeholder="e.g. Terver Kange"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="admin-email">Admin Email *</label>
          <div className="input-with-icon">
            <Mail size={16} className="input-icon" />
            <input
              id="admin-email"
              type="email"
              required
              className="form-control"
              placeholder="admin@benuemarket.ng"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="admin-phone">Official Phone Line</label>
          <div className="input-with-icon">
            <Phone size={16} className="input-icon" />
            <input
              id="admin-phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              className="form-control"
              placeholder="Enter phone number (numbers only, e.g. 08031234567)"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="admin-password">Assigned Password</label>
          <div className="input-with-icon input-password-wrap">
            <Lock size={16} className="input-icon" />
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="Minimum 8 characters (required)"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <span className="form-hint">Create a strong, unique password for this administrator account.</span>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="admin-role">Administrative Role Level</label>
          <select
            id="admin-role"
            className="form-control"
            value={formData.role}
            onChange={(e) => handleChange('role', e.target.value)}
          >
            <option value="admin">Marketplace Admin (Review harvests, suspend buyers/farmers)</option>
            <option value="super_admin">Super Administrator (Full platform ownership &amp; admin controls)</option>
          </select>
        </div>

        <div className="modal-actions-footer flex justify-end gap-2" style={{ marginTop: '1.5rem' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={ShieldCheck}
          >
            Create Admin Account
          </Button>
        </div>
      </form>
    </Modal>
  );
}
