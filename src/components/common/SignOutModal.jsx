import React, { useState } from 'react';
import { LogOut, AlertTriangle, X } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function SignOutModal({
  isOpen,
  onClose,
  userName = 'User',
  onConfirm = () => {}
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="420px"
    >
      <div className="signout-modal-content" style={{ textAlign: 'center', padding: '10px 4px' }}>
        {/* Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-danger-light, #fee2e2)',
          color: 'var(--color-danger, #b91c1c)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: '0 4px 12px rgba(185, 28, 28, 0.15)'
        }}>
          <LogOut size={26} />
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          fontWeight: '800',
          color: 'var(--color-slate-900)',
          marginBottom: '8px'
        }}>
          Confirm Sign Out
        </h2>

        {/* Description */}
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--color-slate-600)',
          lineHeight: '1.5',
          marginBottom: '24px'
        }}>
          Are you sure you want to sign out, <strong>{userName}</strong>? You will need to log back in to publish harvests, access your farmer dashboard, or contact producers.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
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
            type="button"
            variant="danger"
            size="md"
            fullWidth
            loading={loading}
            icon={LogOut}
            onClick={handleConfirm}
            style={{
              backgroundColor: 'var(--color-danger, #b91c1c)',
              color: '#ffffff',
              borderColor: 'var(--color-danger, #b91c1c)'
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </Modal>
  );
}
