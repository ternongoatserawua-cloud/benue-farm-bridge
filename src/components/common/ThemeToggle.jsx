import React from 'react';
import { Sun } from 'lucide-react';

export default function ThemeToggle({
  className = ''
}) {
  return (
    <button
      type="button"
      disabled={true}
      className={`theme-toggle-btn disabled-theme-btn ${className}`}
      aria-disabled="true"
      aria-label="Light Mode Active"
      title="Light Mode Active"
      style={{ opacity: 0.65, cursor: 'not-allowed' }}
    >
      <div className="theme-toggle-icon-wrap">
        <Sun className="theme-icon sun-icon visible" size={18} />
      </div>
      <span className="theme-toggle-label hide-desktop">
        Light Mode
      </span>
    </button>
  );
}
