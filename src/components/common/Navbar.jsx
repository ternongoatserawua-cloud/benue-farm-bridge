import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, PlusCircle, User, LogIn, LogOut, Sprout, LayoutDashboard, ShieldCheck, ChevronDown, Bookmark, Smartphone, Headphones } from 'lucide-react';
import Button from './Button.jsx';

export default function Navbar({
  activePage = 'home',
  currentUser = null,
  savedCount = 0,
  theme = 'light',
  onToggleTheme = () => {},
  onNavigate = () => {},
  onOpenAuth = () => {},
  onOpenFarmerOnboarding = () => {},
  onOpenInstallApp = () => {},
  onSignOut = () => {}
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'browse', label: 'Browse Produce' },
    { id: 'farmers', label: 'Farmers' },
    { id: 'sell', label: 'Sell Produce' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Support' }
  ];

  const handleNavClick = (pageId) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  };

  return (
    <header className="navbar-root">
      <div className="container">
        <div className="navbar-wrapper">
          {/* Brand Logo & Slogan */}
          <a
            href="#home"
            className="navbar-brand"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('home');
            }}
            aria-label="Benue Farm Bridge — Connect. Trade. Grow."
          >
            <img src="/logo.png" alt="Benue Farm Bridge" className="navbar-logo-img" />
            <div className="navbar-brand-text">
              <span className="brand-name">Benue Farm Bridge</span>
              <span className="brand-slogan">Connect. Trade. Grow.</span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="navbar-nav desktop-only" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="navbar-actions desktop-only">
            {currentUser ? (
              <div
                className="profile-dropdown-container"
                ref={profileDropdownRef}
                onMouseEnter={() => setProfileDropdownOpen(true)}
                onMouseLeave={() => setProfileDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className={`profile-trigger-btn ${profileDropdownOpen ? 'active' : ''}`}
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="true"
                  aria-label="User profile dropdown menu"
                >
                  <div className="profile-avatar-wrapper">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name || 'User Avatar'}
                        className="navbar-avatar-img"
                      />
                    ) : (
                      <div className="profile-avatar-fallback">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                  <span className="profile-user-name">
                    {currentUser.name?.split(' ')[0] || 'My Account'}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`profile-chevron ${profileDropdownOpen ? 'rotated' : ''}`}
                  />
                </button>

                {/* Dropdown Menu (Appears on Hover / Click) */}
                {profileDropdownOpen && (
                  <div className="profile-dropdown-menu animate-dropdown-fade-in" role="menu">
                    <div className="profile-dropdown-header">
                      <div className="dropdown-avatar-wrap">
                        {currentUser.avatar ? (
                          <img
                            src={currentUser.avatar}
                            alt={currentUser.name || 'User Avatar'}
                            className="dropdown-avatar-img"
                          />
                        ) : (
                          <div className="dropdown-avatar-fallback">
                            <User size={18} />
                          </div>
                        )}
                      </div>
                      <div className="dropdown-user-details">
                        <h4 className="dropdown-user-name">{currentUser.name || 'User'}</h4>
                        <span className="dropdown-user-role">
                          {currentUser.role === 'admin' || currentUser.role === 'super_admin'
                            ? 'System Admin'
                            : currentUser.role === 'buyer/farmer'
                            ? 'Buyer & Farmer'
                            : currentUser.role === 'seller' || currentUser.role === 'farmer'
                            ? 'Farmer Producer'
                            : 'Buyer'}
                        </span>
                      </div>
                    </div>

                    <div className="profile-dropdown-divider" />

                    <div className="profile-dropdown-items">
                      <button
                        type="button"
                        className="profile-dropdown-item"
                        onClick={() => {
                          handleNavClick(
                            currentUser.role === 'admin' || currentUser.role === 'super_admin'
                              ? 'admin'
                              : currentUser.role === 'seller' || currentUser.role === 'farmer' || currentUser.role === 'buyer/farmer'
                              ? 'farmer-dashboard'
                              : 'buyer-dashboard'
                          );
                        }}
                        role="menuitem"
                      >
                        {currentUser.role === 'admin' || currentUser.role === 'super_admin' ? (
                          <ShieldCheck size={16} className="dropdown-item-icon admin-icon" />
                        ) : (
                          <LayoutDashboard size={16} className="dropdown-item-icon" />
                        )}
                        <div className="dropdown-item-text">
                          <span className="dropdown-item-title">
                            {currentUser.role === 'seller' || currentUser.role === 'farmer' || currentUser.role === 'buyer/farmer'
                              ? 'Farmer Dashboard'
                              : currentUser.role === 'admin' || currentUser.role === 'super_admin'
                              ? 'Admin Control'
                              : 'Buyer Dashboard'}
                          </span>
                          <span className="dropdown-item-sub">
                            {currentUser.role === 'admin' || currentUser.role === 'super_admin'
                              ? 'Admin control center & moderation'
                              : currentUser.role === 'seller' || currentUser.role === 'farmer' || currentUser.role === 'buyer/farmer'
                              ? 'Manage produce listings & stock'
                              : 'View saved produce & profile'}
                          </span>
                        </div>
                      </button>

                      {/* Saved Produce Bookmarks Shortcut */}
                      <button
                        type="button"
                        className="profile-dropdown-item"
                        onClick={() => handleNavClick('saved')}
                        role="menuitem"
                      >
                        <Bookmark size={16} className="dropdown-item-icon" />
                        <div className="dropdown-item-text">
                          <span className="dropdown-item-title flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Saved Bookmarks</span>
                            {savedCount > 0 && (
                              <span className="badge badge-accent badge-sm" style={{ padding: '2px 7px', fontSize: '11px' }}>
                                {savedCount}
                              </span>
                            )}
                          </span>
                          <span className="dropdown-item-sub">Access your saved produce listings</span>
                        </div>
                      </button>

                      {/* Buyer to Farmer Activation Callout */}
                      {currentUser.role === 'buyer' && (
                        <button
                          type="button"
                          className="profile-dropdown-item"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            if (typeof onOpenFarmerOnboarding === 'function') {
                              onOpenFarmerOnboarding();
                            }
                          }}
                          role="menuitem"
                        >
                          <Sprout size={16} className="dropdown-item-icon" style={{ color: 'var(--color-primary-600)' }} />
                          <div className="dropdown-item-text">
                            <span className="dropdown-item-title" style={{ color: 'var(--color-primary-700)', fontWeight: '700' }}>
                              Activate Farmer Account
                            </span>
                            <span className="dropdown-item-sub">Create farm profile &amp; list harvests</span>
                          </div>
                        </button>
                      )}

                      <button
                        type="button"
                        className="profile-dropdown-item"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          if (typeof onOpenInstallApp === 'function') {
                            onOpenInstallApp();
                          }
                        }}
                        role="menuitem"
                      >
                        <Smartphone size={16} className="dropdown-item-icon" />
                        <div className="dropdown-item-text">
                          <span className="dropdown-item-title">Install Mobile App</span>
                          <span className="dropdown-item-sub">Add to home screen for offline access</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="profile-dropdown-item"
                        onClick={() => handleNavClick('contact')}
                        role="menuitem"
                      >
                        <Headphones size={16} className="dropdown-item-icon" />
                        <div className="dropdown-item-text">
                          <span className="dropdown-item-title">Help & Support Desk</span>
                          <span className="dropdown-item-sub">Direct WhatsApp, hotlines & tickets</span>
                        </div>
                      </button>

                      <div className="profile-dropdown-divider" />

                      <button
                        type="button"
                        className="profile-dropdown-item dropdown-item-logout"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onSignOut();
                        }}
                        role="menuitem"
                      >
                        <LogOut size={16} className="dropdown-item-icon logout-icon" />
                        <div className="dropdown-item-text">
                          <span className="dropdown-item-title">Logout</span>
                          <span className="dropdown-item-sub">Sign out of your account</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                icon={LogIn}
                onClick={() => onOpenAuth('login')}
              >
                Login
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() => handleNavClick('sell')}
            >
              Sell Produce
            </Button>
          </div>

          {/* Mobile Right Controls: Menu Hamburger */}
          <div className="flex items-center gap-2 mobile-only">

            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-drawer mobile-only animate-fade-in">
          <nav className="mobile-nav-list" aria-label="Mobile Navigation">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`mobile-nav-link ${isActive ? 'mobile-nav-link-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mobile-drawer-actions">
            {currentUser ? (
              <>
                {(currentUser.role === 'admin' || currentUser.role === 'super_admin') ? (
                  <Button
                    variant="primary"
                    fullWidth
                    icon={ShieldCheck}
                    onClick={() => handleNavClick('admin')}
                  >
                    Admin Control Center
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    fullWidth
                    icon={LayoutDashboard}
                    onClick={() => handleNavClick(currentUser.role === 'seller' || currentUser.role === 'farmer' ? 'farmer-dashboard' : 'buyer-dashboard')}
                  >
                    Dashboard ({currentUser.name})
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  fullWidth
                  icon={LogOut}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                fullWidth
                icon={LogIn}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
              >
                Login / Register
              </Button>
            )}

            <Button
              variant="outline"
              fullWidth
              icon={Smartphone}
              onClick={() => {
                setMobileMenuOpen(false);
                if (typeof onOpenInstallApp === 'function') {
                  onOpenInstallApp();
                }
              }}
              style={{ borderColor: 'var(--color-primary-600)', color: 'var(--color-primary-700)' }}
            >
              Install Mobile App
            </Button>

            <Button
              variant="primary"
              fullWidth
              icon={PlusCircle}
              onClick={() => handleNavClick('sell')}
            >
              Sell Your Produce
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
