import React from 'react';
import { Home, Compass, Bookmark, PlusCircle, User } from 'lucide-react';

export default function MobileBottomNav({
  activePage = 'home',
  onNavigate = () => {},
  savedCount = 0
}) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'browse', label: 'Browse', icon: Compass },
    { id: 'sell', label: 'Sell', icon: PlusCircle, isHighlight: true },
    { id: 'saved', label: 'Saved', icon: Bookmark, count: savedCount },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className="mobile-bottom-nav mobile-only" aria-label="Mobile Bottom Navigation">
      <div className="mobile-bottom-nav-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePage === tab.id;

          if (tab.isHighlight) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className="mobile-bottom-nav-highlight"
                aria-label="Sell Produce"
              >
                <div className="highlight-icon-wrap">
                  <Icon size={22} />
                </div>
                <span className="mobile-nav-text">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="nav-icon-wrapper">
                <Icon size={20} />
                {tab.count > 0 && (
                  <span className="bottom-nav-badge">{tab.count}</span>
                )}
              </div>
              <span className="mobile-nav-text">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
