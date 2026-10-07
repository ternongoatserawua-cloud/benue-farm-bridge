import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Reusable Toast Notification Component
 * Types: success | error | warning | info
 */
export default function Toast({
  message,
  type = 'success',
  duration = 4000,
  onClose,
  visible = true
}) {
  useEffect(() => {
    if (duration > 0 && visible && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, visible, onClose]);

  if (!visible || !message) return null;

  const icons = {
    success: <CheckCircle2 size={18} className="toast-icon toast-icon-success" />,
    error: <AlertCircle size={18} className="toast-icon toast-icon-error" />,
    warning: <AlertTriangle size={18} className="toast-icon toast-icon-warning" />,
    info: <Info size={18} className="toast-icon toast-icon-info" />
  };

  return (
    <div className={`toast-item toast-${type}`} role="alert">
      <div className="toast-content">
        {icons[type] || icons.info}
        <span className="toast-message">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="toast-close"
          aria-label="Dismiss notification"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
