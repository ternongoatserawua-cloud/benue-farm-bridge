import React from 'react';
import { ShieldCheck, MapPin, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

/**
 * Reusable Badge component for Benue Market
 * Variants: verified | location | available | sold | category | success | warning | danger | primary | accent
 */
export default function Badge({
  children,
  variant = 'primary',
  icon: CustomIcon = null,
  showDefaultIcon = true,
  className = '',
  ...props
}) {
  let DefaultIcon = null;

  if (showDefaultIcon && !CustomIcon) {
    switch (variant) {
      case 'verified':
        DefaultIcon = ShieldCheck;
        break;
      case 'location':
        DefaultIcon = MapPin;
        break;
      case 'available':
      case 'success':
        DefaultIcon = CheckCircle2;
        break;
      case 'sold':
      case 'danger':
        DefaultIcon = XCircle;
        break;
      case 'warning':
        DefaultIcon = AlertTriangle;
        break;
      default:
        DefaultIcon = null;
    }
  }

  const IconToRender = CustomIcon || DefaultIcon;

  return (
    <span className={`badge badge-${variant} ${className}`.trim()} {...props}>
      {IconToRender && <IconToRender size={13} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}
