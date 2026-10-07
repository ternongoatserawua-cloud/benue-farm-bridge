import React from 'react';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';

/**
 * Responsive Navigation Buttons (Move Forward / Backward)
 * Supports:
 * - 'navbar': Compact inline controls for the top navigation bar
 * - 'floating': Responsive floating thumb dock on mobile & desktop
 * - 'inline': In-page subheader / breadcrumb style
 */
export default function NavHistoryButtons({
  canGoBack = false,
  canGoForward = false,
  onGoBack = () => {},
  onGoForward = () => {},
  onGoHome = () => {},
  previousPageTitle = '',
  nextPageTitle = '',
  currentPageTitle = '',
  variant = 'navbar', // 'navbar' | 'floating' | 'inline'
  className = ''
}) {
  if (variant === 'floating') {
    return (
      <aside
        className={`nav-floating-dock animate-fade-in ${className}`}
        aria-label="Quick Page Navigation"
      >
        <div className="nav-floating-inner">
          {/* Back Button */}
          <button
            type="button"
            className={`nav-dock-btn nav-dock-btn-back ${!canGoBack ? 'disabled' : ''}`}
            onClick={onGoBack}
            disabled={!canGoBack}
            aria-label={canGoBack ? `Move backward to ${previousPageTitle}` : 'Move backward (No previous page)'}
            title={canGoBack ? `Move Back: ${previousPageTitle}` : 'No previous page in history'}
          >
            <ChevronLeft size={18} />
            <span className="nav-dock-btn-label">Back</span>
          </button>

          {/* Current Page Breadcrumb / Status */}
          <div className="nav-dock-current" title={`Current View: ${currentPageTitle}`}>
            <span className="nav-dock-dot" />
            <span className="nav-dock-title">{currentPageTitle || 'Benue Market'}</span>
          </div>

          {/* Forward Button */}
          <button
            type="button"
            className={`nav-dock-btn nav-dock-btn-forward ${!canGoForward ? 'disabled' : ''}`}
            onClick={onGoForward}
            disabled={!canGoForward}
            aria-label={canGoForward ? `Move forward to ${nextPageTitle}` : 'Move forward (No next page)'}
            title={canGoForward ? `Move Forward: ${nextPageTitle}` : 'No forward history'}
          >
            <span className="nav-dock-btn-label">Forward</span>
            <ChevronRight size={18} />
          </button>

          {/* Quick Home Jump */}
          {onGoHome && (
            <button
              type="button"
              className="nav-dock-btn nav-dock-btn-home"
              onClick={onGoHome}
              aria-label="Navigate to Home"
              title="Return to Home"
            >
              <Home size={16} />
            </button>
          )}
        </div>
      </aside>
    );
  }

  // Default Navbar / Inline Variant
  return (
    <div
      className={`nav-history-group nav-history-${variant} ${className}`}
      role="group"
      aria-label="History navigation controls"
    >
      {/* Move Backward Button */}
      <button
        type="button"
        className={`nav-history-btn nav-history-back ${!canGoBack ? 'is-disabled' : ''}`}
        onClick={onGoBack}
        disabled={!canGoBack}
        aria-label={canGoBack ? `Move backward to ${previousPageTitle}` : 'Move backward (Disabled)'}
        title={canGoBack ? `Back: ${previousPageTitle}` : 'No previous page in history'}
      >
        <ChevronLeft size={16} className="nav-history-icon" />
      </button>

      {/* Move Forward Button */}
      <button
        type="button"
        className={`nav-history-btn nav-history-forward ${!canGoForward ? 'is-disabled' : ''}`}
        onClick={onGoForward}
        disabled={!canGoForward}
        aria-label={canGoForward ? `Move forward to ${nextPageTitle}` : 'Move forward (Disabled)'}
        title={canGoForward ? `Forward: ${nextPageTitle}` : 'No forward history'}
      >
        <ChevronRight size={16} className="nav-history-icon" />
      </button>
    </div>
  );
}
