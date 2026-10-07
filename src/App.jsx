import React, { useState, useEffect } from 'react';
import Navbar from './components/common/Navbar.jsx';
import MobileBottomNav from './components/common/MobileBottomNav.jsx';
import Footer from './components/common/Footer.jsx';
import Toast from './components/common/Toast.jsx';
import AuthModal from './components/common/AuthModal.jsx';
import SignOutModal from './components/common/SignOutModal.jsx';

// Pages
import HomePage from './pages/HomePage.jsx';
import BrowseProducePage from './pages/BrowseProducePage.jsx';
import ProductDetailsPage from './pages/ProductDetailsPage.jsx';
import FarmersDirectoryPage from './pages/FarmersDirectoryPage.jsx';
import FarmerProfilePage from './pages/FarmerProfilePage.jsx';
import SellProducePage from './pages/SellProducePage.jsx';
import BuyerDashboardPage from './pages/BuyerDashboardPage.jsx';
import FarmerDashboardPage from './pages/FarmerDashboardPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import SubscriptionModal from './components/marketplace/SubscriptionModal.jsx';
import FarmerOnboardingModal from './components/farmer/FarmerOnboardingModal.jsx';

// Services & Supabase
import { MOCK_FARMERS } from './data/mockFarmers.js';
import {
  fetchProducts,
  getPersistedProducts,
  createProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  updateProductsSellerProfile,
  subscribeToRealtimeProducts,
  subscribeToLocalProducts,
  mapToSellerUUID,
  mapToProductUUID
} from './services/productsService.js';
import { fetchFarmers, updateFarmerProfileData } from './services/farmersService.js';
import { fetchSavedProductIds, toggleSaveProduct } from './services/savedService.js';
import { subscribeToAuthChanges, signOutUser, getCurrentSessionUser, updateUserProfile, upgradeUserToSeller, hasSellerRole, hasAdminRole, getProfileOverride, subscribeToRealtimeProfiles } from './services/authService.js';
import { getInitialRoute, buildRouteHash, persistRouteState, clearRouteState } from './utils/navigationHelper.js';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';
import {
  getVendorSubscription,
  getVendorSubscriptionSync,
  syncAllSubscriptionsFromSupabase,
  filterProductsBySubscription,
  isSubscriptionActive,
  getAllSubscriptionsSync,
  activateSubscription,
  getProductLimit
} from './services/subscriptionService.js';

// Helper to get friendly page display title
const getPageTitle = (page, itemData = {}) => {
  switch (page) {
    case 'home':
      return 'Marketplace Home';
    case 'browse':
      return 'Browse Produce';
    case 'product-details':
      return itemData?.productName ? `Produce: ${itemData.productName}` : 'Produce Details';
    case 'farmers':
      return 'Farmers Directory';
    case 'farmer-profile':
      return itemData?.farmerName ? `Farmer: ${itemData.farmerName}` : 'Farmer Profile';
    case 'sell':
      return 'Sell Produce';
    case 'buyer-dashboard':
    case 'profile':
      return 'Buyer Dashboard';
    case 'farmer-dashboard':
      return 'Producer Dashboard';
    case 'admin':
      return 'Admin Control Center';
    case 'saved':
      return 'Saved Bookmarks';
    case 'about':
      return 'About Marketplace';
    case 'contact':
      return 'Contact & Support';
    case 'reset-password':
      return 'Reset Password';
    default:
      return page ? page.charAt(0).toUpperCase() + page.slice(1) : 'Marketplace';
  }
};

export default function App() {
  // Rehydrate initial route on page refresh from URL Hash or sessionStorage
  const initialRoute = getInitialRoute();
  const [currentPage, setCurrentPage] = useState(initialRoute.page || 'home');
  const [pageParams, setPageParams] = useState(initialRoute.params || {});
  const [products, setProducts] = useState(() => getPersistedProducts());
  const [farmers, setFarmers] = useState(MOCK_FARMERS);
  
  // State for active item selection rehydrated from initial route
  const [activeProduct, setActiveProduct] = useState(() => {
    const list = getPersistedProducts();
    if (initialRoute.productId) {
      return list.find((p) => p.id === initialRoute.productId) || null;
    }
    return null;
  });
  const [activeFarmer, setActiveFarmer] = useState(() => {
    if (initialRoute.farmerId) {
      return MOCK_FARMERS.find((f) => f.id === initialRoute.farmerId) || null;
    }
    return null;
  });

  // Navigation History Stack
  const [historyStack, setHistoryStack] = useState([
    {
      page: initialRoute.page || 'home',
      params: initialRoute.params || {},
      activeProduct: null,
      activeFarmer: null,
      title: getPageTitle(initialRoute.page || 'home')
    }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Saved bookmarks state
  const [savedProductIds, setSavedProductIds] = useState(new Set(['prod-1', 'prod-2']));

  // System is locked to light mode
  const theme = 'light';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('benue_market_theme', 'light');
  }, []);

  const handleToggleTheme = () => {
    // Theme toggle is disabled (system strictly locked to light mode)
  };

  // Current authenticated user (Persisted in localStorage with profile overrides merged)
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('benue_market_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const override = getProfileOverride(parsed.id) || getProfileOverride(parsed.email);
        return override ? { ...parsed, ...override } : parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Sync user state to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('benue_market_user', JSON.stringify(user));
      } catch {
        // Ignore storage write issues
      }
    } else {
      localStorage.removeItem('benue_market_user');
    }
  }, [user]);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authInitialRole, setAuthInitialRole] = useState('buyer');
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [farmerOnboardingOpen, setFarmerOnboardingOpen] = useState(false);

  // Subscription state for current logged-in vendor
  const [currentSubscription, setCurrentSubscription] = useState(() =>
    user?.id ? getVendorSubscriptionSync(user.id) : null
  );
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState(null);

  const handleOpenSubscription = (plan = null) => {
    setSelectedPlanForModal(plan);
    setSubscriptionModalOpen(true);
  };

  // Sync subscription from Supabase whenever active user changes
  useEffect(() => {
    if (user?.id) {
      getVendorSubscription(user.id).then((sub) => {
        if (sub) setCurrentSubscription(sub);
      });
    } else {
      setCurrentSubscription(null);
    }
    syncAllSubscriptionsFromSupabase();
  }, [user?.id]);

  // Listen for local and cross-tab subscription updates
  useEffect(() => {
    const handleSubUpdated = (e) => {
      if (e.detail?.vendorId === user?.id) {
        setCurrentSubscription(e.detail.subscription);
      }
      syncAllSubscriptionsFromSupabase();
    };
    window.addEventListener('benue_market_subscription_updated', handleSubUpdated);
    return () => window.removeEventListener('benue_market_subscription_updated', handleSubUpdated);
  }, [user?.id]);

  // Toast notification state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success'
  });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Function to reload all products including pending directly from database
  const loadAllProducts = () => {
    fetchProducts({ includePending: true, includeRecycled: true }).then(({ data }) => {
      if (data) {
        setProducts(data);
        // If we are on product-details, sync activeProduct if needed
        const route = getInitialRoute();
        if (route.page === 'product-details' && route.productId) {
          const matched = data.find((p) => p.id === route.productId);
          if (matched) setActiveProduct(matched);
        }
      }
    });
  };

  // Navigate handler with robust history push, item data tracking, and URL hash sync
  const handleNavigate = (page, params = {}, options = {}) => {
    const { pushHistory = true, product = null, farmer = null } = options;

    const targetProduct = product !== null ? product : (page === 'product-details' ? activeProduct : null);
    const targetFarmer = farmer !== null ? farmer : (page === 'farmer-profile' ? activeFarmer : null);

    if (pushHistory) {
      setHistoryStack((prevStack) => {
        const nextStack = prevStack.slice(0, historyIndex + 1);
        const currentEntry = nextStack[nextStack.length - 1];

        // Avoid duplicate consecutive history entries
        if (
          currentEntry &&
          currentEntry.page === page &&
          JSON.stringify(currentEntry.params || {}) === JSON.stringify(params || {}) &&
          currentEntry.activeProduct?.id === targetProduct?.id &&
          currentEntry.activeFarmer?.id === targetFarmer?.id
        ) {
          return nextStack;
        }

        const newEntry = {
          page,
          params,
          activeProduct: targetProduct,
          activeFarmer: targetFarmer,
          title: getPageTitle(page, {
            productName: targetProduct?.name,
            farmerName: targetFarmer?.name
          })
        };

        const updated = [...nextStack, newEntry];
        setHistoryIndex(updated.length - 1);
        return updated;
      });
    }

    setCurrentPage(page);
    setPageParams(params);
    if (product !== null) setActiveProduct(product);
    if (farmer !== null) setActiveFarmer(farmer);

    // Synchronize URL hash & sessionStorage for page refresh persistence
    const hashUrl = buildRouteHash(page, params, targetProduct?.id, targetFarmer?.id);
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', hashUrl);
      } catch {
        window.location.hash = hashUrl;
      }
      persistRouteState({
        page,
        params,
        productId: targetProduct?.id || null,
        farmerId: targetFarmer?.id || null
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Move Backward in history
  const canGoBack = historyIndex > 0;
  const handleGoBack = () => {
    if (!canGoBack) return;
    const targetIndex = historyIndex - 1;
    const targetEntry = historyStack[targetIndex];
    if (!targetEntry) return;

    setHistoryIndex(targetIndex);
    setCurrentPage(targetEntry.page);
    setPageParams(targetEntry.params || {});
    if (targetEntry.activeProduct) setActiveProduct(targetEntry.activeProduct);
    if (targetEntry.activeFarmer) setActiveFarmer(targetEntry.activeFarmer);

    const hashUrl = buildRouteHash(targetEntry.page, targetEntry.params, targetEntry.activeProduct?.id, targetEntry.activeFarmer?.id);
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', hashUrl);
      } catch {
        window.location.hash = hashUrl;
      }
      persistRouteState({
        page: targetEntry.page,
        params: targetEntry.params || {},
        productId: targetEntry.activeProduct?.id || null,
        farmerId: targetEntry.activeFarmer?.id || null
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Move Forward in history
  const canGoForward = historyIndex < historyStack.length - 1;
  const handleGoForward = () => {
    if (!canGoForward) return;
    const targetIndex = historyIndex + 1;
    const targetEntry = historyStack[targetIndex];
    if (!targetEntry) return;

    setHistoryIndex(targetIndex);
    setCurrentPage(targetEntry.page);
    setPageParams(targetEntry.params || {});
    if (targetEntry.activeProduct) setActiveProduct(targetEntry.activeProduct);
    if (targetEntry.activeFarmer) setActiveFarmer(targetEntry.activeFarmer);

    const hashUrl = buildRouteHash(targetEntry.page, targetEntry.params, targetEntry.activeProduct?.id, targetEntry.activeFarmer?.id);
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', hashUrl);
      } catch {
        window.location.hash = hashUrl;
      }
      persistRouteState({
        page: targetEntry.page,
        params: targetEntry.params || {},
        productId: targetEntry.activeProduct?.id || null,
        farmerId: targetEntry.activeFarmer?.id || null
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Jump directly to Home
  const handleGoHome = () => {
    handleNavigate('home');
  };

  // Destination Titles for Tooltips & Previews
  const previousPageTitle = canGoBack ? (historyStack[historyIndex - 1]?.title || 'Previous Page') : '';
  const nextPageTitle = canGoForward ? (historyStack[historyIndex + 1]?.title || 'Next Page') : '';
  const currentPageTitle = historyStack[historyIndex]?.title || getPageTitle(currentPage, {
    productName: activeProduct?.name,
    farmerName: activeFarmer?.name
  });

  // Keyboard shortcut listener (Alt + LeftArrow for Back, Alt + RightArrow for Forward)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoForward();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyStack]);

  // 1. Initialize data & auth listener on mount + Hash route listener
  useEffect(() => {
    // Synchronize initial URL hash & sessionStorage if not already aligned
    const currentHash = buildRouteHash(currentPage, pageParams, activeProduct?.id, activeFarmer?.id);
    if (typeof window !== 'undefined') {
      if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
        try {
          window.history.replaceState(null, '', currentHash);
        } catch {
          window.location.hash = currentHash;
        }
      }
      persistRouteState({
        page: currentPage,
        params: pageParams,
        productId: activeProduct?.id || null,
        farmerId: activeFarmer?.id || null
      });
    }

    // Subscribe to Supabase Auth changes (login, logout, token refresh)
    const authSub = subscribeToAuthChanges((loggedInUser) => {
      if (loggedInUser) {
        const override = getProfileOverride(loggedInUser.id) || getProfileOverride(loggedInUser.email);
        const mergedUser = override ? { ...loggedInUser, ...override } : loggedInUser;
        setUser(mergedUser);
        try {
          localStorage.setItem('benue_market_user', JSON.stringify(mergedUser));
        } catch {}
        fetchSavedProductIds(loggedInUser.id).then((savedSet) => {
          setSavedProductIds(savedSet);
        });
      } else {
        // Active session is signed out or invalid – flush local user state
        setUser(null);
        try {
          localStorage.removeItem('benue_market_user');
        } catch {}
      }
    });

    // Validate active session against Supabase on startup to avoid restoring stale local sessions
    if (isSupabaseConfigured()) {
      getCurrentSessionUser().then((sessionUser) => {
        if (!sessionUser) {
          setUser(null);
          try {
            localStorage.removeItem('benue_market_user');
          } catch {}
        } else {
          const override = getProfileOverride(sessionUser.id) || getProfileOverride(sessionUser.email);
          setUser(override ? { ...sessionUser, ...override } : sessionUser);
        }
      });
    }

    // Detect Supabase PASSWORD_RECOVERY event and navigate to reset page
    // This fires when the user clicks the reset-password link in their email
    let recoveryAuthListener = null;
    try {
      if (isSupabaseConfigured() && supabase) {
        const { data: { subscription: recoverySub } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            handleNavigate('reset-password');
          }
        });
        recoveryAuthListener = recoverySub;
      }
    } catch {
      // Supabase not available – no-op
    }

    // Function to reload and sync all farmers
    const syncFarmersData = () => {
      fetchFarmers().then(({ data }) => {
        if (data && data.length > 0) {
          setFarmers(data);
          const route = getInitialRoute();
          if (route.page === 'farmer-profile' && route.farmerId) {
            const matched = data.find((f) => f.id === route.farmerId);
            if (matched) setActiveFarmer(matched);
          }
        }
      });
    };

    // Function to reload and sync all products from Supabase
    const loadAllProducts = () => {
      fetchProducts({ includePending: true, includeRecycled: true }).then(({ data }) => {
        if (data && Array.isArray(data)) {
          setProducts(data);
          const route = getInitialRoute();
          if (route.productId) {
            const matchedProd = data.find((p) => p.id === route.productId || p.id === mapToProductUUID(route.productId));
            if (matchedProd) setActiveProduct(matchedProd);
          }
        }
      });
    };

    // Load initial products (including pending and recycled for admin control)
    loadAllProducts();

    // Load initial farmers from Supabase (or fallback)
    syncFarmersData();

    // Live profile synchronization handler (handles profile changes from this or any other tab)
    const handleProfileSync = () => {
      try {
        const storedUser = localStorage.getItem('benue_market_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          const override = getProfileOverride(parsed.id) || getProfileOverride(parsed.email);
          setUser(override ? { ...parsed, ...override } : parsed);
        }
      } catch {
        // ignore
      }
      syncFarmersData();
      loadAllProducts();
    };

    window.addEventListener('benue_market_profile_updated', handleProfileSync);
    window.addEventListener('storage', handleProfileSync);

    // Live Supabase Realtime subscription across all devices & IP addresses
    const realtimeProfilesSub = subscribeToRealtimeProfiles((updatedRow) => {
      const newAvatar = updatedRow.avatar_url;
      const newCover = updatedRow.cover_url || updatedRow.cover_image;
      const updatedName = updatedRow.full_name;
      const updatedPhone = updatedRow.phone;
      const updatedLga = updatedRow.lga;

      // Update current user if matching this profile
      setUser((prevUser) => {
        if (prevUser && (prevUser.id === updatedRow.id || prevUser.email === updatedRow.email || prevUser.name === updatedName)) {
          const synced = {
            ...prevUser,
            name: updatedName || prevUser.name,
            avatar: newAvatar || prevUser.avatar,
            coverImage: newCover || prevUser.coverImage,
            phone: updatedPhone || prevUser.phone,
            lga: updatedLga || prevUser.lga
          };
          try {
            localStorage.setItem('benue_market_user', JSON.stringify(synced));
          } catch {}
          return synced;
        }
        return prevUser;
      });

      // Update farmers state across all devices
      setFarmers((prevFarmers) =>
        prevFarmers.map((f) => {
          if (f.id === updatedRow.id || f.name === updatedName) {
            return {
              ...f,
              name: updatedName || f.name,
              avatar: newAvatar || f.avatar,
              coverImage: newCover || f.coverImage,
              phone: updatedPhone || f.phone,
              lga: updatedLga || f.lga
            };
          }
          return f;
        })
      );

      // Update active farmer profile page
      setActiveFarmer((prevActive) => {
        if (prevActive && (prevActive.id === updatedRow.id || prevActive.name === updatedName)) {
          return {
            ...prevActive,
            name: updatedName || prevActive.name,
            avatar: newAvatar || prevActive.avatar,
            coverImage: newCover || prevActive.coverImage,
            phone: updatedPhone || prevActive.phone,
            lga: updatedLga || prevActive.lga
          };
        }
        return prevActive;
      });

      // Update products state
      setProducts((prevProducts) =>
        prevProducts.map((p) => {
          const targetSellerUUID = mapToSellerUUID(updatedRow.id);
          if (p.sellerId === updatedRow.id || (targetSellerUUID && p.sellerId === targetSellerUUID)) {
            return {
              ...p,
              seller: updatedName || p.seller,
              sellerAvatar: newAvatar || p.sellerAvatar,
              sellerCover: newCover || p.sellerCover,
              phone: updatedPhone || p.phone
            };
          }
          return p;
        })
      );

      // Update active product details page
      setActiveProduct((prevProduct) => {
        if (prevProduct && (prevProduct.sellerId === updatedRow.id || prevProduct.seller === updatedName)) {
          return {
            ...prevProduct,
            seller: updatedName || prevProduct.seller,
            sellerAvatar: newAvatar || prevProduct.sellerAvatar,
            sellerCover: newCover || prevProduct.sellerCover,
            phone: updatedPhone || prevProduct.phone
          };
        }
        return prevProduct;
      });
    });

      // Live Supabase Realtime subscription for produce listings across all devices & IP addresses
      const realtimeProductsSub = subscribeToRealtimeProducts(({ eventType, product, oldId }) => {
        if (eventType === 'INSERT' && product) {
          setProducts((prev) => {
            if (prev.some((p) => p.id === product.id)) {
              return prev.map((p) => (p.id === product.id ? product : p));
            }
            return [product, ...prev];
          });
          // Notify admin if logged in
          if (user?.role === 'admin' || user?.role === 'super_admin') {
            showToast(`New produce listing published: "${product.name}" is now live on the storefront.`, 'info');
          }
        } else if (eventType === 'UPDATE' && product) {
          // Merge the full updated product into React state — covers available, status, price, etc.
          setProducts((prev) =>
            prev.map((p) => (p.id === product.id ? { ...p, ...product } : p))
          );
          setActiveProduct((prev) => (prev?.id === product.id ? { ...prev, ...product } : prev));
        } else if (eventType === 'DELETE') {
          const targetDelId = product?.id || oldId;
          const targetDelUUID = targetDelId ? mapToProductUUID(targetDelId) : null;
          setProducts((prev) =>
            prev.filter((p) => p.id !== targetDelId && p.id !== targetDelUUID)
          );
          setActiveProduct((prev) => {
            if (prev?.id === targetDelId || prev?.id === targetDelUUID) {
              return null;
            }
            return prev;
          });
        }
      });

      // Live Cross-Tab & In-Window product synchronization (same browser, other tabs)
      const localProductsSub = subscribeToLocalProducts((updatedProducts, eventMeta) => {
        if (Array.isArray(updatedProducts)) {
          setProducts(updatedProducts);
        }
      });

      // Handle hash change events (browser back/forward buttons)
      const handleHashChange = () => {
        const route = getInitialRoute();
        if (route.page) {
          setCurrentPage(route.page);
          setPageParams(route.params || {});
          if (route.productId) {
            const list = getPersistedProducts();
            const matchedProd = list.find((p) => p.id === route.productId) || MOCK_PRODUCTS.find((p) => p.id === route.productId);
            if (matchedProd) setActiveProduct(matchedProd);
          }
          if (route.farmerId) {
            const matchedFarmer = farmers.find((f) => f.id === route.farmerId) || MOCK_FARMERS.find((f) => f.id === route.farmerId);
            if (matchedFarmer) setActiveFarmer(matchedFarmer);
          }
        }
      };

      window.addEventListener('hashchange', handleHashChange);

      return () => {
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('benue_market_profile_updated', handleProfileSync);
        window.removeEventListener('storage', handleProfileSync);
        if (authSub?.unsubscribe) authSub.unsubscribe();
        if (recoveryAuthListener?.unsubscribe) recoveryAuthListener.unsubscribe();
        if (realtimeProfilesSub?.unsubscribe) realtimeProfilesSub.unsubscribe();
        if (realtimeProductsSub?.unsubscribe) realtimeProductsSub.unsubscribe();
        if (localProductsSub?.unsubscribe) localProductsSub.unsubscribe();
      };
    }, []);

  // Route Guard: enforce RBAC on page navigation
  useEffect(() => {
    if (currentPage === 'admin' && !hasAdminRole(user)) {
      handleNavigate('home');
      setAuthMode('login');
      setAuthModalOpen(true);
      showToast('Please sign in with administrator credentials to access the Admin Control Center.', 'info');
    } else if (currentPage === 'farmer-dashboard' && !hasSellerRole(user)) {
      handleNavigate('sell');
      showToast('Producer Dashboard requires a Seller or Farmer account. Upgrade below to begin selling.', 'info');
    } else if ((currentPage === 'buyer-dashboard' || currentPage === 'profile') && !user) {
      handleNavigate('home');
      setAuthMode('login');
      setAuthModalOpen(true);
      showToast('Please sign in to access your buyer dashboard.', 'info');
    }
  }, [currentPage, user]);

  // Open authentication modal with mode and role
  const handleOpenAuth = (mode = 'login', initialRole = 'buyer') => {
    setAuthMode(mode);
    setAuthInitialRole(initialRole);
    setAuthModalOpen(true);
  };

  // Sign out confirmation trigger
  const handleRequestSignOut = () => {
    setSignOutModalOpen(true);
  };

  // Confirmed sign out execution
  const handleConfirmSignOut = async () => {
    setSignOutModalOpen(false);
    await signOutUser();
    clearRouteState();
    setUser(null);
    handleNavigate('home');
    showToast('You have been signed out successfully.', 'info');
  };

  // Bookmark toggle
  const handleToggleSave = async (product) => {
    const isSaved = savedProductIds.has(product.id);
    const next = new Set(savedProductIds);
    if (isSaved) {
      next.delete(product.id);
      showToast(`Removed "${product.name}" from saved produce.`, 'info');
    } else {
      next.add(product.id);
      showToast(`Saved "${product.name}" to bookmarks!`, 'success');
    }
    setSavedProductIds(next);

    await toggleSaveProduct(user?.id, product.id, isSaved);
  };

  // Product details view
  const handleViewProduct = (product) => {
    setActiveProduct(product);
    handleNavigate('product-details', {}, { product });
  };

  // Farmer profile view
  const handleViewFarmer = (farmer) => {
    setActiveFarmer(farmer);
    handleNavigate('farmer-profile', {}, { farmer });
  };

  // Upgrade buyer account to farmer role with full profile details
  const handleUpgradeToSeller = async (farmerProfileData = {}) => {
    if (!user) return;
    const { data, error } = await upgradeUserToSeller(user.id, farmerProfileData);
    if (error) {
      showToast(`Failed to activate farmer profile: ${error}`, 'error');
      return;
    }
    const updatedUser = {
      ...user,
      ...farmerProfileData,
      role: 'buyer/farmer'
    };
    setUser(updatedUser);
    try { localStorage.setItem('benue_market_user', JSON.stringify(updatedUser)); } catch {}
    setFarmerOnboardingOpen(false);
    showToast('Congratulations! Your Farmer Profile is active. You can now publish listings while retaining full buyer bookmark privileges!', 'success');
    handleNavigate('sell');
  };

  // Farmer publishes new produce (strictly allowed for farmers only, requires active subscription)
  const handlePublishProduct = async (newProductData, { bypassSubscriptionCheck = false } = {}) => {
    if (!hasSellerRole(user)) {
      showToast('Permission denied: Only verified Farmers/Sellers can publish produce listings.', 'error');
      return;
    }

    // Subscription gate — check if vendor has active subscription
    if (!bypassSubscriptionCheck) {
      const sub = getVendorSubscriptionSync(user?.id);
      if (!isSubscriptionActive(sub)) {
        setSubscriptionModalOpen(true);
        showToast('An active subscription is required to publish produce listings.', 'info');
        return { requiresSubscription: true };
      }

      // Check product limit
      const limit = getProductLimit(sub);
      const currentActive = products.filter(p =>
        (p.sellerId === user?.id || p.sellerId === mapToSellerUUID(user?.id)) &&
        p.status !== 'recycled' && !p.recycledAt
      ).length;
      if (currentActive >= limit) {
        showToast(`Your ${sub.planId} plan allows up to ${limit} product listings. Upgrade your plan to add more.`, 'info');
        setSubscriptionModalOpen(true);
        return { limitReached: true };
      }
    }

    const { data: createdProduct, error } = await createProduct(newProductData, user?.id, user?.role);
    if (error) {
      showToast(`Failed to publish listing: ${error}`, 'error');
      return;
    }

    const itemToAdd = createdProduct || newProductData;

    // Safely add to state without duplicates
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === itemToAdd.id);
      if (exists) {
        return prev.map((p) => (p.id === itemToAdd.id ? itemToAdd : p));
      }
      return [itemToAdd, ...prev];
    });

    setActiveProduct(itemToAdd);
    showToast(`"${itemToAdd.name}" published successfully and is now live on Benue Market!`, 'success');
    handleNavigate('product-details', {}, { product: itemToAdd });
  };

  // Farmer edits existing produce details
  const handleUpdateProduct = async (updatedProduct) => {
    // 1. Optimistic state update
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p))
    );
    if (activeProduct?.id === updatedProduct.id) {
      setActiveProduct(updatedProduct);
    }

    // 2. Persist directly to backend database & override previous changes
    const { data: savedProduct, error } = await updateProduct(updatedProduct.id, updatedProduct, user?.id);
    if (error) {
      showToast(`Warning: sync issue (${error})`, 'error');
    } else {
      showToast(`"${updatedProduct.name}" changes saved successfully!`, 'success');
      if (savedProduct) {
        setProducts((prev) =>
          prev.map((p) => (p.id === updatedProduct.id || p.id === savedProduct.id ? savedProduct : p))
        );
        if (activeProduct?.id === updatedProduct.id) {
          setActiveProduct(savedProduct);
        }
      }
    }
  };

  // Farmer toggles stock availability — optimistic update then DB persist
  const handleToggleStock = async (productId) => {
    const targetProduct = products.find(
      (p) => p.id === productId || p.id === productId?.replace('prod-', 'e0000000-0000-4000-8000-')
    );
    if (!targetProduct) {
      showToast('Product not found — please refresh the page.', 'error');
      return;
    }

    const nextAvailable = !targetProduct.available;
    const previousAvailable = targetProduct.available;

    // 1. Optimistic local state update — instant UI feedback on this device
    setProducts((prev) =>
      prev.map((p) =>
        (p.id === productId || p.id === targetProduct.id)
          ? { ...p, available: nextAvailable }
          : p
      )
    );

    // 2. Persist to Supabase — Realtime will propagate to ALL other devices
    const { error } = await updateProductStock(targetProduct.id, nextAvailable);

    if (error) {
      // 3. Rollback optimistic update on failure
      setProducts((prev) =>
        prev.map((p) =>
          (p.id === productId || p.id === targetProduct.id)
            ? { ...p, available: previousAvailable }
            : p
        )
      );
      showToast(`Failed to update stock status: ${error}`, 'error');
      return;
    }

    // 4. Success toast with clear status
    showToast(
      nextAvailable
        ? `"${targetProduct.name}" is now marked In Stock and visible on the marketplace.`
        : `"${targetProduct.name}" marked as Sold Out across all devices.`,
      nextAvailable ? 'success' : 'info'
    );
  };

  // Farmer or Admin permanently deletes produce listing
  const handleDeleteProduct = async (productId) => {
    const targetProduct = products.find(
      (p) => p.id === productId || p.id === mapToProductUUID(productId)
    );
    const productName = targetProduct?.name || 'Produce Listing';
    const targetUUID = mapToProductUUID(productId);

    // Optimistic deletion from React state across all views (Browse, Details, Dashboard, Saved)
    setProducts((prev) =>
      prev.filter(
        (p) => p.id !== productId && p.id !== targetUUID && p.id !== targetProduct?.id
      )
    );
    if (
      activeProduct?.id === productId ||
      activeProduct?.id === targetUUID ||
      activeProduct?.id === targetProduct?.id
    ) {
      setActiveProduct(null);
      if (currentPage === 'details') {
        setCurrentPage('browse');
      }
    }

    const { error } = await deleteProduct(productId);
    if (error) {
      // Re-fetch products if delete failed
      const { data: refreshed } = await fetchProducts({ includePending: true, includeRecycled: true });
      if (refreshed) setProducts(refreshed);
      showToast(`Failed to permanently delete listing: ${error}`, 'error');
      return;
    }

    showToast(`"${productName}" was permanently removed from the marketplace.`, 'info');
  };

  // Farmer or Buyer updates avatar photo, cover background, or profile details
  const handleUpdateFarmerProfile = async (profileData) => {
    if (!user) return;

    // 1. Persist to Auth Service / Supabase database (authoritative)
    const { error: authErr } = await updateUserProfile(user.id, profileData);
    if (authErr) {
      showToast(`Failed to save profile: ${authErr}`, 'error');
      return;
    }

    // 2. Persist to Farmers Service
    await updateFarmerProfileData(user.id, profileData);

    // 3. Update products seller profile in Products Service
    updateProductsSellerProfile(user.id, user.name, profileData);

    const updatedUser = {
      ...user,
      ...profileData
    };
    setUser(updatedUser);

    setFarmers((prev) =>
      prev.map((f) =>
        f.id === user.id || f.name === user.name ? { ...f, ...profileData } : f
      )
    );

    setActiveFarmer((prev) => {
      if (prev && (prev.id === user.id || prev.name === user.name)) {
        return { ...prev, ...profileData };
      }
      return prev;
    });

    const userSellerUUID = mapToSellerUUID(user.id);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.sellerId === user.id || (userSellerUUID && p.sellerId === userSellerUUID)) {
          return {
            ...p,
            seller: profileData.name || p.seller,
            sellerAvatar: profileData.avatar || p.sellerAvatar,
            sellerCover: profileData.coverImage || p.sellerCover,
            phone: profileData.phone || p.phone,
            whatsapp: profileData.phone
              ? (profileData.phone.startsWith('234') ? profileData.phone : `234${profileData.phone.replace(/^0+/, '')}`)
              : p.whatsapp
          };
        }
        return p;
      })
    );

    setActiveProduct((prev) => {
      if (prev && (prev.sellerId === user.id || (userSellerUUID && prev.sellerId === userSellerUUID))) {
        return {
          ...prev,
          seller: profileData.name || prev.seller,
          sellerAvatar: profileData.avatar || prev.sellerAvatar,
          sellerCover: profileData.coverImage || prev.sellerCover,
          phone: profileData.phone || prev.phone
        };
      }
      return prev;
    });

    showToast('Profile photo and customizations saved successfully!', 'success');
  };

  // Farmer's own listings (strictly shows listings created by the logged in farmer/seller)
  const myFarmerProducts = products.filter((p) => {
    if (!user) return false;
    const userSellerUUID = mapToSellerUUID(user.id);
    return (
      p.sellerId === user.id ||
      (userSellerUUID && p.sellerId === userSellerUUID)
    );
  });


  // Filtered approved products for public marketplace (Strictly approved items only)
  // Excludes recycled, pending, rejected products AND products from vendors without active subscriptions
  const publicApprovedProducts = (() => {
    // Get all subscription records for fast lookup
    const allSubs = getAllSubscriptionsSync();

    return products.filter((p) => {
      // Basic eligibility checks
      if ((p.status || 'approved') !== 'approved') return false;
      if (p.status === 'recycled' || p.recycledAt) return false;

      // Subscription check: find the vendor's subscription
      const sellerId = p.sellerId;
      if (!sellerId) return true; // legacy/seed products always visible

      // Seed/mock products (non-UUID IDs) bypass subscription check
      const isSeedProduct = !sellerId || sellerId.startsWith('farmer-') || sellerId.startsWith('mock-');
      if (isSeedProduct) return true;

      const sub = allSubs[sellerId];
      return isSubscriptionActive(sub);
    });
  })();

  return (
    <div className="app-container">
      {/* ── Full-screen Reset Password page – rendered outside Navbar/Footer shell ── */}
      {currentPage === 'reset-password' && (
        <ResetPasswordPage onNavigate={handleNavigate} />
      )}

      {/* ── Normal app shell (only when NOT on the reset-password page) ── */}
      {currentPage !== 'reset-password' && (
        <>
          {/* Toast Notification Container */}
          <div className="toast-fixed-wrapper">
            <Toast
              visible={toast.visible}
              message={toast.message}
              type={toast.type}
              onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
            />
          </div>

          {/* Auth Modal */}
          <AuthModal
            isOpen={authModalOpen}
            initialMode={authMode}
            initialRole={authInitialRole}
            onClose={() => setAuthModalOpen(false)}
            onSuccess={(newUser) => {
              setUser(newUser);
              showToast(`Welcome to Benue Market, ${newUser.name}!`, 'success');
              if (hasAdminRole(newUser)) {
                handleNavigate('admin');
              } else if (hasSellerRole(newUser)) {
                if (currentPage === 'sell' || currentPage === 'farmer-dashboard') {
                  handleNavigate('farmer-dashboard');
                }
              } else {
                if (currentPage === 'buyer-dashboard' || currentPage === 'profile') {
                  handleNavigate('buyer-dashboard');
                }
              }
            }}
          />

          {/* Sign Out Confirmation Modal */}
          <SignOutModal
            isOpen={signOutModalOpen}
            onClose={() => setSignOutModalOpen(false)}
            userName={user?.name || 'Farmer'}
            onConfirm={handleConfirmSignOut}
          />

          {/* Global Navbar */}
          <Navbar
            activePage={currentPage}
            currentUser={user}
            savedCount={savedProductIds.size}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onNavigate={handleNavigate}
            onOpenAuth={(mode) => handleOpenAuth(mode, 'buyer')}
            onOpenFarmerOnboarding={() => setFarmerOnboardingOpen(true)}
            onSignOut={handleRequestSignOut}
          />

          {/* Active Page View */}
          <main className="main-content">
            {currentPage === 'home' && (
              <HomePage
                products={publicApprovedProducts}
                farmers={farmers}
                savedProductIds={savedProductIds}
                onToggleSave={handleToggleSave}
                onViewProduct={handleViewProduct}
                onViewFarmer={handleViewFarmer}
                onNavigate={handleNavigate}
              />
            )}

            {currentPage === 'browse' && (
              <BrowseProducePage
                products={publicApprovedProducts}
                savedProductIds={savedProductIds}
                onToggleSave={handleToggleSave}
                onViewProduct={handleViewProduct}
                initialFilters={pageParams}
              />
            )}

            {currentPage === 'product-details' && (
              <ProductDetailsPage
                product={activeProduct || publicApprovedProducts[0] || products[0]}
                allProducts={publicApprovedProducts}
                savedProductIds={savedProductIds}
                onToggleSave={handleToggleSave}
                onViewProduct={handleViewProduct}
                onViewFarmer={handleViewFarmer}
                onBack={() => (canGoBack ? handleGoBack() : handleNavigate('browse'))}
              />
            )}

            {currentPage === 'farmers' && (
              <FarmersDirectoryPage
                farmers={farmers}
                onViewFarmer={handleViewFarmer}
              />
            )}

            {currentPage === 'farmer-profile' && (
              <FarmerProfilePage
                farmer={activeFarmer || farmers[0]}
                allProducts={publicApprovedProducts}
                savedProductIds={savedProductIds}
                onToggleSave={handleToggleSave}
                onViewProduct={handleViewProduct}
                onBack={() => (canGoBack ? handleGoBack() : handleNavigate('farmers'))}
              />
            )}

            {currentPage === 'sell' && (
              <SellProducePage
                currentUser={user}
                currentSubscription={currentSubscription}
                onPublishProduct={handlePublishProduct}
                onNavigate={handleNavigate}
                onOpenAuth={handleOpenAuth}
                onUpgradeToSeller={handleUpgradeToSeller}
                onOpenFarmerOnboarding={() => setFarmerOnboardingOpen(true)}
                onOpenSubscription={handleOpenSubscription}
              />
            )}

            {(currentPage === 'buyer-dashboard' || currentPage === 'saved' || currentPage === 'profile') && (
              <BuyerDashboardPage
                allProducts={publicApprovedProducts}
                savedProductIds={savedProductIds}
                currentUser={user}
                onUpdateUserProfile={handleUpdateFarmerProfile}
                onToggleSave={handleToggleSave}
                onViewProduct={handleViewProduct}
                onNavigate={handleNavigate}
              />
            )}

            {currentPage === 'farmer-dashboard' && hasSellerRole(user) && (
              <FarmerDashboardPage
                farmerProducts={myFarmerProducts}
                allProducts={publicApprovedProducts}
                savedProductIds={savedProductIds}
                onToggleSave={handleToggleSave}
                currentUserId={user?.id}
                currentUser={user}
                currentSubscription={currentSubscription}
                onUpdateFarmerProfile={handleUpdateFarmerProfile}
                onToggleStock={handleToggleStock}
                onDeleteProduct={handleDeleteProduct}
                onUpdateProduct={handleUpdateProduct}
                onNavigate={handleNavigate}
                onViewProduct={handleViewProduct}
                onOpenSubscription={handleOpenSubscription}
              />
            )}

            {currentPage === 'admin' && hasAdminRole(user) && (
              <AdminDashboardPage
                currentUser={user}
                allProducts={products}
                allUsers={[]} 
                onRefreshProducts={loadAllProducts}
                onViewProduct={handleViewProduct}
                onNavigate={handleNavigate}
              />
            )}

            {currentPage === 'about' && (
              <AboutPage onNavigate={handleNavigate} />
            )}

            {currentPage === 'contact' && (
              <ContactPage />
            )}
          </main>

          {/* Global Footer */}
          <Footer onNavigate={handleNavigate} />

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav
            activePage={currentPage}
            currentUser={user}
            onNavigate={handleNavigate}
            onOpenAuth={() => handleOpenAuth('login', 'buyer')}
          />
          {/* Subscription Modal – shown when vendor tries to publish without subscription */}
          <SubscriptionModal
            isOpen={subscriptionModalOpen}
            onClose={() => {
              setSubscriptionModalOpen(false);
              setSelectedPlanForModal(null);
            }}
            currentUser={user}
            currentSubscription={currentSubscription}
            initialPlan={selectedPlanForModal}
            onSubscribed={({ planId, reference }) => {
              const sub = getVendorSubscriptionSync(user?.id);
              setCurrentSubscription(sub);
              setSubscriptionModalOpen(false);
              setSelectedPlanForModal(null);
              showToast('Subscription activated! Your products are now visible on the marketplace.', 'success');
              loadAllProducts();
            }}
          />

          {/* Farmer Account Onboarding Modal */}
          <FarmerOnboardingModal
            isOpen={farmerOnboardingOpen}
            onClose={() => setFarmerOnboardingOpen(false)}
            currentUser={user}
            onComplete={handleUpgradeToSeller}
          />
        </>
      )}
    </div>
  );
}
