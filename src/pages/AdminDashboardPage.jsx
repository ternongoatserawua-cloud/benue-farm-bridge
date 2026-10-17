import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  UserPlus,
  Trash2,
  Ban,
  RotateCcw,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Shield,
  CreditCard,
  DollarSign,
  Settings,
  Save,
  Zap,
  Crown,
  Copy,
  Check,
  Loader2,
  Database,
  AtSign,
  Hash,
  ExternalLink,
  X,
  RefreshCw,
  AlertCircle,
  CalendarClock,
  SlidersHorizontal,
  Sparkles,
  SearchCheck
} from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Modal from '../components/common/Modal.jsx';
import AddAdminModal from '../components/admin/AddAdminModal.jsx';
import { formatNaira } from '../utils/formatters.js';
import {
  fetchAllUsers,
  searchUsersInDatabase,
  toggleSuspendUser,
  deleteUserAccount,
  revokeUserSubscription,
  updateUserRole
} from '../services/authService.js';
import {
  approveProduct,
  rejectProduct,
  deleteProduct,
  recycleProduct,
  restoreProduct,
  emptyRecycleBin
} from '../services/productsService.js';
import {
  getSubscriptionPlans,
  saveSubscriptionPlans,
  DEFAULT_PLANS,
  getAllSubscriptionsSync,
  adminSetSubscription,
  revokeSubscription,
  computeSubscriptionStatus,
  daysUntilExpiry,
  syncAllSubscriptionsFromSupabase,
  getProductLimit,
  isSubscriptionActive,
  getVendorSubscription
} from '../services/subscriptionService.js';

export default function AdminDashboardPage({
  currentUser = null,
  allProducts = [],
  onRefreshProducts = () => {},
  onViewProduct = () => {},
  onNavigate = () => {}
}) {
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'users' | 'recycle_bin' | 'subscriptions'
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSubFilter, setUserSubFilter] = useState('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchField, setUserSearchField] = useState('all'); // 'all' | 'id' | 'email'
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [inspectModalUser, setInspectModalUser] = useState(null);
  const [recycleSearchQuery, setRecycleSearchQuery] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState(null);

  // Copy to clipboard helper with animated feedback
  const handleCopy = (text, key) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {}
  };

  const showToast = (message, type = 'success') => {
    setAdminFeedback({ message, type });
    setTimeout(() => setAdminFeedback(null), 4000);
  };

  // Subscription management state
  const [subPlans, setSubPlans] = useState(() => getSubscriptionPlans());
  const [subPlansEditing, setSubPlansEditing] = useState(false);
  const [subPlansSaved, setSubPlansSaved] = useState(false);
  const [allVendorSubs, setAllVendorSubs] = useState(() => getAllSubscriptionsSync());
  const [grantSubUser, setGrantSubUser] = useState(null);
  const [grantSubPlanId, setGrantSubPlanId] = useState('starter');

  // Subscription Search, Filter & Inspector State
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('all'); // 'all' | 'active' | 'expiring_soon' | 'expired'
  const [subPlanFilter, setSubPlanFilter] = useState('all'); // 'all' | 'starter' | 'growth'
  const [isSyncingSubs, setIsSyncingSubs] = useState(false);
  const [inspectorQuery, setInspectorQuery] = useState('');
  const [inspectedUser, setInspectedUser] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);

  // Modals State
  const [recycleModalProduct, setRecycleModalProduct] = useState(null);
  const [adminDeleteModalProduct, setAdminDeleteModalProduct] = useState(null);
  const [emptyBinModalOpen, setEmptyBinModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject Produce Modal State
  const [rejectModalProduct, setRejectModalProduct] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // User Moderation Modals State
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [suspendModalUser, setSuspendModalUser] = useState(null);
  const [revokeSubModalUser, setRevokeSubModalUser] = useState(null);
  const [grantSubModalUser, setGrantSubModalUser] = useState(null);
  const [grantSubModalPlanId, setGrantSubModalPlanId] = useState('starter');
  const [promoteModalUser, setPromoteModalUser] = useState(null);
  const [promoteSelectedRole, setPromoteSelectedRole] = useState('admin');

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Load users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await fetchAllUsers();
      if (data && Array.isArray(data)) {
        setUsersList(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingUsers(false);
    }
  };

  // Search users across the database by ID or Email
  const handleSearchDatabase = async () => {
    const q = userSearchQuery.trim();
    if (!q) {
      loadUsers();
      return;
    }
    setIsSearchingDb(true);
    try {
      const { data, error } = await searchUsersInDatabase({
        query: q,
        searchBy: userSearchField
      });
      if (!error && Array.isArray(data)) {
        setUsersList((prev) => {
          const map = new Map();
          data.forEach((u) => map.set(u.id, u));
          prev.forEach((u) => {
            if (!map.has(u.id)) map.set(u.id, u);
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Database search exception:', err);
    } finally {
      setIsSearchingDb(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Sync subscriptions from Supabase when switching to subscriptions tab
  useEffect(() => {
    if (activeTab === 'subscriptions') {
      syncAllSubscriptionsFromSupabase().then((subs) => {
        if (subs) setAllVendorSubs(subs);
      });
    }
  }, [activeTab]);

  const safeProducts = Array.isArray(allProducts) ? allProducts.filter(Boolean) : [];
  const safeUsers = Array.isArray(usersList) ? usersList.filter(Boolean) : [];

  const activeProducts = safeProducts.filter((p) => p.status !== 'recycled');
  const recycledProducts = safeProducts.filter((p) => p.status === 'recycled');

  // Filtered produce submissions for Active Tab
  const filteredProducts = activeProducts.filter((p) => {
    if (approvalFilter === 'all') return true;
    if (approvalFilter === 'instock') return p.available !== false;
    if (approvalFilter === 'outofstock') return p.available === false;
    return (p.status || 'approved') === approvalFilter;
  });

  const inStockCount = activeProducts.filter((p) => p.available !== false).length;
  const outOfStockCount = activeProducts.filter((p) => p.available === false).length;
  const pendingCount = activeProducts.filter((p) => p.status === 'pending').length;
  const approvedCount = activeProducts.filter((p) => (p.status || 'approved') === 'approved').length;
  const rejectedCount = activeProducts.filter((p) => p.status === 'rejected').length;

  // Filtered recycled listings
  const filteredRecycledProducts = recycledProducts.filter((p) => {
    if (!recycleSearchQuery.trim()) return true;
    const q = recycleSearchQuery.toLowerCase();
    const matchesName = p.name?.toLowerCase().includes(q);
    const matchesSeller = p.seller?.toLowerCase().includes(q);
    const matchesLga = (p.lga || p.location || '').toLowerCase().includes(q);
    return matchesName || matchesSeller || matchesLga;
  });

  // Calculate days left in 60-day lifecycle
  const getDaysRemaining = (product) => {
    const recycledDate = new Date(product.recycledAt || product.updatedAt || product.createdAt || Date.now());
    const now = Date.now();
    const elapsedDays = Math.floor((now - recycledDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 60 - elapsedDays);
  };

  // Filtered users with multi-mode search (ID, Email, or All fields)
  const filteredUsers = safeUsers.filter((u) => {
    if (userRoleFilter !== 'all') {
      if (userRoleFilter === 'buyer/farmer' && u.role !== 'buyer/farmer') return false;
      if (userRoleFilter === 'farmer' && u.role !== 'farmer' && u.role !== 'seller' && u.role !== 'buyer/farmer') return false;
      if (userRoleFilter === 'buyer' && u.role !== 'buyer' && u.role !== 'buyer/farmer') return false;
      if (userRoleFilter === 'admin' && u.role !== 'admin') return false;
      if (userRoleFilter === 'super_admin' && u.role !== 'super_admin') return false;
    }
    if (userStatusFilter !== 'all' && (u.status || 'active') !== userStatusFilter) return false;
    if (userSubFilter !== 'all') {
      const hasActiveSub = Boolean(
        u.subscriptionPlan &&
        u.subscriptionStatus !== 'cancelled' &&
        u.subscriptionStatus !== 'expired' &&
        (!u.subscriptionExpiresAt || new Date(u.subscriptionExpiresAt).getTime() > Date.now())
      );
      const isExpiredSub = Boolean(
        u.subscriptionStatus === 'expired' ||
        u.subscriptionStatus === 'cancelled' ||
        (u.subscriptionExpiresAt && new Date(u.subscriptionExpiresAt).getTime() <= Date.now())
      );
      if (userSubFilter === 'active_sub' && !hasActiveSub) return false;
      if (userSubFilter === 'expired_sub' && !isExpiredSub) return false;
      if (userSubFilter === 'free_sub' && (hasActiveSub || isExpiredSub)) return false;
    }
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase().trim();
      if (userSearchField === 'id') {
        return u.id?.toLowerCase().includes(q);
      }
      if (userSearchField === 'email') {
        return u.email?.toLowerCase().includes(q);
      }
      // 'all': search across ID, Email, Name, Phone, LGA, Plan, and Subscription status
      const idMatch = u.id?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const nameMatch = u.name?.toLowerCase().includes(q);
      const phoneMatch = u.phone?.toLowerCase().includes(q);
      const lgaMatch = u.lga?.toLowerCase().includes(q);
      const planMatch = u.subscriptionPlan?.toLowerCase().includes(q);
      const subStatusMatch = (u.subscriptionStatus || '').toLowerCase().includes(q);
      return idMatch || emailMatch || nameMatch || phoneMatch || lgaMatch || planMatch || subStatusMatch;
    }
    return true;
  });

  // ── Helper: Detailed subscription expiration calculator ──────────────────
  const getSubscriptionExpiryDetails = (sub) => {
    if (!sub || !sub.expiresAt) {
      return {
        status: 'none',
        formattedExpiry: '—',
        relativeText: 'No expiration date set',
        daysLeft: 0,
        hoursLeft: 0,
        isExpired: true
      };
    }

    const expiryTime = new Date(sub.expiresAt).getTime();
    const now = Date.now();
    const diffMs = expiryTime - now;
    const isExpired = diffMs <= 0;

    const totalDays = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    const totalHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));

    const formattedDate = new Date(sub.expiresAt).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (isExpired) {
      return {
        status: 'expired',
        formattedExpiry: formattedDate,
        relativeText: totalDays === 0 ? 'Expired today' : `Expired ${totalDays} day${totalDays === 1 ? '' : 's'} ago`,
        daysLeft: 0,
        hoursLeft: 0,
        isExpired: true
      };
    }

    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const isExpiringSoon = diffMs <= THREE_DAYS_MS;

    return {
      status: isExpiringSoon ? 'expiring_soon' : 'active',
      formattedExpiry: formattedDate,
      relativeText: totalDays <= 1 ? `Expires in ${totalHours} hour${totalHours === 1 ? '' : 's'}` : `Expires in ${totalDays} day${totalDays === 1 ? '' : 's'}`,
      daysLeft: totalDays,
      hoursLeft: totalHours,
      isExpired: false
    };
  };

  // ── Enriched subscriptions list merged with safeUsers profile context ──────
  const enrichedVendorSubs = React.useMemo(() => {
    const map = new Map();

    // 1. Add records from allVendorSubs
    Object.values(allVendorSubs).forEach(sub => {
      if (!sub || !sub.vendorId) return;
      map.set(sub.vendorId, { ...sub });
    });

    // 2. Also check safeUsers for any user with subscriptionPlan
    safeUsers.forEach(u => {
      if (u.subscriptionPlan) {
        const existing = map.get(u.id);
        if (!existing) {
          map.set(u.id, {
            vendorId: u.id,
            planId: u.subscriptionPlan,
            expiresAt: u.subscriptionExpiresAt,
            status: u.subscriptionStatus || 'active',
            paymentRef: ''
          });
        } else if (!existing.expiresAt && u.subscriptionExpiresAt) {
          existing.expiresAt = u.subscriptionExpiresAt;
        }
      }
    });

    // 3. Map user profile details (name, email, phone, location)
    return Array.from(map.values()).map(sub => {
      const userProfile = safeUsers.find(u => u.id === sub.vendorId || u.email === sub.vendorId);
      const expiryDetails = getSubscriptionExpiryDetails(sub);
      const planObj = subPlans.find(p => p.id === sub.planId);
      const activeProductsCount = safeProducts.filter(p =>
        (p.sellerId === sub.vendorId || p.seller === userProfile?.name) &&
        p.status === 'approved' && p.status !== 'recycled'
      ).length;

      return {
        ...sub,
        userName: userProfile?.name || 'Benue Vendor',
        userEmail: userProfile?.email || '',
        userPhone: userProfile?.phone || '',
        userRole: userProfile?.role || 'farmer',
        userLocation: userProfile?.lga ? `${userProfile.lga}, Benue` : (userProfile?.location || 'Benue'),
        expiryDetails,
        planName: planObj?.name || (sub.planId ? sub.planId.toUpperCase() : 'Starter'),
        planPrice: planObj?.price || (sub.planId === 'growth' ? 5000 : 2000),
        maxProducts: planObj?.maxProducts || (sub.planId === 'growth' ? 10 : 3),
        activeProductsCount
      };
    });
  }, [allVendorSubs, safeUsers, subPlans, safeProducts]);

  // ── Filtered vendor subscriptions matching search query & filters ──────────
  const filteredVendorSubs = React.useMemo(() => {
    return enrichedVendorSubs.filter(item => {
      // 1. Status Filter
      if (subStatusFilter !== 'all') {
        if (subStatusFilter === 'active' && item.expiryDetails.status !== 'active') return false;
        if (subStatusFilter === 'expiring_soon' && item.expiryDetails.status !== 'expiring_soon') return false;
        if (subStatusFilter === 'expired' && item.expiryDetails.status !== 'expired') return false;
      }

      // 2. Plan Filter
      if (subPlanFilter !== 'all' && item.planId !== subPlanFilter) {
        return false;
      }

      // 3. Search Query Filter
      if (subSearchQuery.trim()) {
        const q = subSearchQuery.toLowerCase().trim();
        const matchId = (item.vendorId || '').toLowerCase().includes(q);
        const matchName = (item.userName || '').toLowerCase().includes(q);
        const matchEmail = (item.userEmail || '').toLowerCase().includes(q);
        const matchPhone = (item.userPhone || '').toLowerCase().includes(q);
        const matchPlan = (item.planName || '').toLowerCase().includes(q);
        const matchRef = (item.paymentRef || '').toLowerCase().includes(q);
        return matchId || matchName || matchEmail || matchPhone || matchPlan || matchRef;
      }

      return true;
    });
  }, [enrichedVendorSubs, subStatusFilter, subPlanFilter, subSearchQuery]);

  // ── Handler: Synchronize subscriptions from Supabase ──────────────────────
  const handleRefreshSubscriptions = async () => {
    setIsSyncingSubs(true);
    try {
      const freshSubs = await syncAllSubscriptionsFromSupabase();
      if (freshSubs) setAllVendorSubs(freshSubs);
      await loadUsers();
      showToast('Vendor subscriptions synchronized with Supabase.', 'success');
    } catch (err) {
      showToast(`Sync error: ${err.message}`, 'error');
    } finally {
      setIsSyncingSubs(false);
    }
  };

  // ── Handler: Quick user subscription inspector lookup ─────────────────────
  const handleInspectSubscription = async (queryToSearch = null) => {
    const q = (queryToSearch || inspectorQuery || '').trim();
    if (!q) {
      setInspectedUser(null);
      return;
    }
    setIsInspecting(true);
    try {
      const qLower = q.toLowerCase();
      // 1. Check in safeUsers
      let matchedUser = safeUsers.find(
        (u) => u.id?.toLowerCase() === qLower || u.email?.toLowerCase() === qLower || u.name?.toLowerCase().includes(qLower)
      );

      // 2. If not found in safeUsers, search in Supabase
      if (!matchedUser) {
        const { data: dbUsers } = await searchUsersInDatabase({ query: q, searchBy: 'all' });
        if (dbUsers && dbUsers.length > 0) {
          matchedUser = dbUsers[0];
        }
      }

      if (!matchedUser) {
        showToast(`No user found matching "${q}".`, 'error');
        setInspectedUser(null);
        return;
      }

      // 3. Fetch latest subscription for this vendor from Supabase
      const sub = await getVendorSubscription(matchedUser.id);
      const expiryDetails = getSubscriptionExpiryDetails(sub || {
        planId: matchedUser.subscriptionPlan,
        expiresAt: matchedUser.subscriptionExpiresAt,
        status: matchedUser.subscriptionStatus
      });

      const planObj = subPlans.find((p) => p.id === (sub?.planId || matchedUser.subscriptionPlan));
      const activeProductsCount = safeProducts.filter(
        (p) =>
          (p.sellerId === matchedUser.id || p.seller === matchedUser.name) &&
          p.status === 'approved' &&
          p.status !== 'recycled'
      ).length;

      setInspectedUser({
        user: matchedUser,
        subscription: sub,
        expiryDetails,
        planObj,
        activeProductsCount
      });
      showToast(`Subscription details loaded for ${matchedUser.name}.`, 'info');
    } catch (err) {
      showToast(`Lookup notice: ${err.message}`, 'error');
    } finally {
      setIsInspecting(false);
    }
  };

  // ── Handler: Extend vendor subscription by 30 days ────────────────────────
  const handleExtendSubscription = async (vendorId, planId, durationDays = 30) => {
    if (!vendorId || !planId) return;
    setActionLoading(true);
    try {
      const { error } = await adminSetSubscription(vendorId, planId, durationDays);
      if (error) {
        showToast(`Failed to extend subscription: ${error}`, 'error');
        return;
      }
      const freshSubs = await syncAllSubscriptionsFromSupabase();
      if (freshSubs) setAllVendorSubs(freshSubs);
      await loadUsers();
      if (inspectedUser?.user?.id === vendorId) {
        handleInspectSubscription(vendorId);
      }
      showToast(`Subscription extended by ${durationDays} days successfully!`, 'success');
    } catch (err) {
      showToast(`Extend error: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalDual = safeUsers.filter((u) => u.role === 'buyer/farmer').length;
  const totalFarmers = safeUsers.filter((u) => u.role === 'farmer' || u.role === 'seller' || u.role === 'buyer/farmer').length;
  const totalBuyers = safeUsers.filter((u) => u.role === 'buyer' || u.role === 'buyer/farmer').length;
  const totalAdmins = safeUsers.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;
  const totalSuspended = safeUsers.filter((u) => u.status === 'suspended').length;
  const totalWithSubs = safeUsers.filter((u) => u.subscriptionPlan && u.subscriptionStatus !== 'cancelled' && u.subscriptionStatus !== 'expired').length;

  // Approve product handler
  const handleApproveProduct = async (product) => {
    const { error } = await approveProduct(product.id);
    if (error) {
      showToast(`Failed to approve listing: ${error}`, 'error');
      return;
    }
    showToast(`Listing "${product.name}" approved.`, 'success');
    onRefreshProducts();
  };

  // Confirm rejection handler
  const handleConfirmRejectProduct = async () => {
    if (!rejectModalProduct) return;
    const { error } = await rejectProduct(rejectModalProduct.id, rejectionReason || 'Listing did not meet quality verification standards.');
    if (error) {
      showToast(`Failed to reject listing: ${error}`, 'error');
      return;
    }
    showToast(`Listing "${rejectModalProduct.name}" rejected.`, 'success');
    setRejectModalProduct(null);
    setRejectionReason('');
    onRefreshProducts();
  };

  // Move product to Recycle Bin handler
  const handleConfirmRecycleProduct = async () => {
    if (!recycleModalProduct) return;
    setActionLoading(true);
    try {
      const { error } = await recycleProduct(recycleModalProduct.id);
      if (error) {
        showToast(`Failed to move listing to Recycle Bin: ${error}`, 'error');
        return;
      }
      showToast(`Listing moved to Recycle Bin.`, 'success');
      setRecycleModalProduct(null);
      onRefreshProducts();
    } finally {
      setActionLoading(false);
    }
  };

  // Restore product from Recycle Bin handler
  const handleRestoreProduct = async (product) => {
    setActionLoading(true);
    try {
      const { error } = await restoreProduct(product.id);
      if (error) {
        showToast(`Failed to restore listing: ${error}`, 'error');
        return;
      }
      showToast(`Listing restored to active storefront.`, 'success');
      onRefreshProducts();
    } finally {
      setActionLoading(false);
    }
  };

  // Permanent Delete Product handler
  const handleConfirmPermanentDelete = async () => {
    if (!adminDeleteModalProduct) return;
    setActionLoading(true);
    try {
      const { error } = await deleteProduct(adminDeleteModalProduct.id);
      if (error) {
        showToast(`Failed to permanently delete listing: ${error}`, 'error');
        return;
      }
      showToast(`Listing permanently deleted.`, 'success');
      setAdminDeleteModalProduct(null);
      onRefreshProducts();
    } finally {
      setActionLoading(false);
    }
  };

  // Empty Recycle Bin handler
  const handleConfirmEmptyBin = async () => {
    setActionLoading(true);
    try {
      const { error } = await emptyRecycleBin();
      if (error) {
        showToast(`Failed to empty Recycle Bin: ${error}`, 'error');
        return;
      }
      showToast(`Recycle Bin emptied.`, 'success');
      setEmptyBinModalOpen(false);
      onRefreshProducts();
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm user suspension / reactivation
  const handleConfirmSuspendUser = async () => {
    if (!suspendModalUser) return;
    setActionLoading(true);
    try {
      const isCurrentlySuspended = suspendModalUser.status === 'suspended';
      const callerRole = currentUser?.role || 'admin';
      const { error } = await toggleSuspendUser(suspendModalUser.id, !isCurrentlySuspended, callerRole);
      if (error) {
        showToast(error, 'error');
        return;
      }
      showToast(
        isCurrentlySuspended
          ? `User "${suspendModalUser.name}" has been reactivated successfully.`
          : `User "${suspendModalUser.name}" has been suspended.`,
        'success'
      );
      setSuspendModalUser(null);
      await loadUsers();
      onRefreshProducts();
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm delete user permanently
  const handleConfirmDeleteUser = async () => {
    if (!deleteModalUser) return;
    setActionLoading(true);
    try {
      const callerRole = currentUser?.role || 'admin';
      const { error } = await deleteUserAccount(deleteModalUser.id, callerRole);
      if (error) {
        showToast(error, 'error');
        return;
      }
      showToast(`User "${deleteModalUser.name}" and all associated listings were deleted permanently.`, 'success');
      setDeleteModalUser(null);
      await loadUsers();
      onRefreshProducts();
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm revoke subscription
  const handleConfirmRevokeSub = async () => {
    if (!revokeSubModalUser) return;
    setActionLoading(true);
    try {
      const callerRole = currentUser?.role || 'admin';
      const { error } = await revokeSubscription(revokeSubModalUser.id, callerRole);
      if (error) {
        showToast(error, 'error');
        return;
      }
      showToast(`Subscription for "${revokeSubModalUser.name}" has been revoked.`, 'success');
      setRevokeSubModalUser(null);
      setAllVendorSubs(getAllSubscriptionsSync());
      await loadUsers();
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm grant subscription
  const handleConfirmGrantSub = async () => {
    if (!grantSubModalUser) return;
    setActionLoading(true);
    try {
      const { error } = await adminSetSubscription(grantSubModalUser.id, grantSubModalPlanId);
      if (error) {
        showToast(error, 'error');
        return;
      }
      showToast(`Granted ${grantSubModalPlanId.toUpperCase()} subscription to "${grantSubModalUser.name}".`, 'success');
      setGrantSubModalUser(null);
      setAllVendorSubs(getAllSubscriptionsSync());
      await loadUsers();
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm role update
  const handleConfirmRoleUpdate = async () => {
    if (!promoteModalUser) return;
    setActionLoading(true);
    try {
      const callerRole = currentUser?.role || 'admin';
      const { error } = await updateUserRole(promoteModalUser.id, promoteSelectedRole, callerRole);
      if (error) {
        showToast(error, 'error');
        return;
      }
      showToast(`Role updated for "${promoteModalUser.name}".`, 'success');
      setPromoteModalUser(null);
      loadUsers();
    } finally {
      setActionLoading(false);
    }
  };

  // Check if current admin can moderate a target user
  const canModerateUser = (targetUser) => {
    if (targetUser.id === currentUser?.id || targetUser.email === currentUser?.email) {
      return false; // Cannot suspend/delete yourself
    }
    if (isSuperAdmin) {
      return true; // Super Admin can moderate everyone (including other Admins)
    }
    // Regular Admin cannot moderate other Admins or Super Admins
    if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
      return false;
    }
    return true;
  };

  return (
    <div className="admin-page-root">
      {/* Top Banner */}
      <section className="browse-header-banner admin-header-banner">
        <div className="container">
          <div className="browse-header-content">
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="badge badge-warning">
                  <Clock size={12} /> {pendingCount} Pending Approvals
                </span>
              </div>
            )}
            <h1 className="browse-title">Benue Agricultural Marketplace Control Center</h1>
            <p className="browse-subtitle">
              Monitor live produce listings from Benue farmers, inspect details and remove non-compliant items, manage registered buyers and producers, and maintain platform security.
            </p>
          </div>
        </div>
      </section>

      <div className="container dashboard-container">
        {/* Admin Action Feedback Notification */}
        {adminFeedback && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '10px',
              backgroundColor: adminFeedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
              border: adminFeedback.type === 'error' ? '1.5px solid #fecaca' : '1.5px solid #bbf7d0',
              color: adminFeedback.type === 'error' ? '#991b1b' : '#15803d',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              animation: 'fadeIn 0.2s ease-in-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {adminFeedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{adminFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setAdminFeedback(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* KPI Metrics Row */}
        <div className="dashboard-metrics-grid admin-metrics-grid">
          <div className="metric-card" onClick={() => { setActiveTab('approvals'); setApprovalFilter('all'); }} style={{ cursor: 'pointer' }}>
            <div className="metric-icon-wrap" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)', border: '1px solid var(--border-brand)' }}>
              <Package size={20} />
            </div>
            <div>
              <span className="metric-label">Active Storefront Produce</span>
              <h3 className="metric-val">{activeProducts.length}</h3>
            </div>
          </div>

          <div className="metric-card" onClick={() => { setActiveTab('approvals'); setApprovalFilter('instock'); }} style={{ cursor: 'pointer' }}>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="metric-label">In Stock &amp; Live</span>
              <h3 className="metric-val">{inStockCount}</h3>
            </div>
          </div>

          <div className="metric-card" onClick={() => { setActiveTab('recycle_bin'); }} style={{ cursor: 'pointer' }}>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              <Trash2 size={20} />
            </div>
            <div>
              <span className="metric-label">Recycle Bin (60 Days)</span>
              <h3 className="metric-val text-danger">{recycledProducts.length}</h3>
            </div>
          </div>

          <div className="metric-card" onClick={() => { setActiveTab('users'); setUserRoleFilter('all'); }} style={{ cursor: 'pointer' }}>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#f8fafc', color: '#0284c7', border: '1px solid #bae6fd' }}>
              <Users size={20} />
            </div>
            <div>
              <span className="metric-label">Registered Users</span>
              <h3 className="metric-val">{safeUsers.length} <span className="metric-subval">({totalFarmers} Farmers, {totalBuyers} Buyers)</span></h3>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Action Bar */}
        <div className="admin-tabs-bar">
          <div className="admin-tabs-group">
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => setActiveTab('approvals')}
            >
              <Package size={16} />
              <span>Active Produce ({activeProducts.length})</span>
            </button>

            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'recycle_bin' ? 'active' : ''}`}
              onClick={() => setActiveTab('recycle_bin')}
            >
              <Trash2 size={16} />
              <span>Recycle Bin</span>
              <span className="admin-tab-count-badge" style={{ backgroundColor: recycledProducts.length > 0 ? '#fef2f2' : undefined, color: recycledProducts.length > 0 ? '#b91c1c' : undefined }}>
                {recycledProducts.length}
              </span>
            </button>

            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={16} />
              <span>User Directory</span>
              <span className="admin-tab-count-badge">{safeUsers.length}</span>
            </button>

            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('subscriptions');
                setAllVendorSubs(getAllSubscriptionsSync());
                syncAllSubscriptionsFromSupabase().then((subs) => {
                  if (subs) setAllVendorSubs(subs);
                });
              }}
            >
              <CreditCard size={16} />
              <span>Subscriptions</span>
              <span className="admin-tab-count-badge" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
                {Object.keys(allVendorSubs).length}
              </span>
            </button>
          </div>

          {isSuperAdmin && (
            <Button
              variant="primary"
              icon={UserPlus}
              size="sm"
              onClick={() => setAddAdminModalOpen(true)}
            >
              Add New Admin
            </Button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PRODUCE MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'approvals' && (
          <div className="admin-section animate-fade-in">
            {/* Filter Pills */}
            <div className="admin-filters-row flex items-center justify-between">
              <div className="admin-filter-pills">
                <button
                  type="button"
                  className={`filter-pill ${approvalFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setApprovalFilter('all')}
                >
                  All Listings ({safeProducts.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${approvalFilter === 'instock' ? 'active' : ''}`}
                  onClick={() => setApprovalFilter('instock')}
                >
                  <CheckCircle2 size={14} /> In Stock ({inStockCount})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${approvalFilter === 'outofstock' ? 'active' : ''}`}
                  onClick={() => setApprovalFilter('outofstock')}
                >
                  Out of Stock ({outOfStockCount})
                </button>
                {pendingCount > 0 && (
                  <button
                    type="button"
                    className={`filter-pill ${approvalFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setApprovalFilter('pending')}
                  >
                    <Clock size={14} /> Pending Review ({pendingCount})
                  </button>
                )}
                {rejectedCount > 0 && (
                  <button
                    type="button"
                    className={`filter-pill ${approvalFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setApprovalFilter('rejected')}
                  >
                    <XCircle size={14} /> Rejected ({rejectedCount})
                  </button>
                )}
              </div>
            </div>

            {/* Produce Listings Table / Cards */}
            {filteredProducts.length > 0 ? (
              <div className="admin-table-container card">
                <div className="table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Produce Details</th>
                        <th>Farmer / Seller</th>
                        <th>Price &amp; Quantity</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th className="text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => {
                        const status = p.status || 'approved';
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.image || (p.images && p.images[0])}
                                  alt={p.name}
                                  className="admin-table-thumb"
                                />
                                <div>
                                  <strong className="admin-table-title" title={p.name}>{p.name}</strong>
                                  <span className="admin-table-sub"><Badge variant="category">{p.category}</Badge></span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="admin-user-cell">
                                <strong>{p.seller || 'Benue Farmer'}</strong>
                                <span className="admin-cell-muted flex items-center gap-1">
                                  <Phone size={11} /> {p.phone || '0803 123 4567'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div>
                                <span className="admin-price-text">{formatNaira(p.price)} / {p.unit}</span>
                                <span className="admin-cell-muted block">{p.quantity} {p.unit}s in stock</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin size={13} className="text-muted" />
                                <span>{p.lga || p.location}</span>
                              </div>
                            </td>
                            <td>
                              {status === 'pending' && (
                                <Badge variant="warning">
                                  <Clock size={11} /> Pending Review
                                </Badge>
                              )}
                              {status === 'approved' && (
                                <Badge variant="success">
                                  <CheckCircle2 size={11} /> Approved &amp; Live
                                </Badge>
                              )}
                              {status === 'rejected' && (
                                <Badge variant="danger" title={p.statusNote || 'Rejected'}>
                                  <XCircle size={11} /> Rejected
                                </Badge>
                              )}
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {status === 'pending' && (
                                  <>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      icon={CheckCircle2}
                                      onClick={() => handleApproveProduct(p)}
                                      title="Approve and publish to marketplace"
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      icon={XCircle}
                                      onClick={() => {
                                        setRejectModalProduct(p);
                                        setRejectionReason('');
                                      }}
                                      title="Reject listing with reason"
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}

                                {status === 'rejected' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    icon={RotateCcw}
                                    onClick={() => handleApproveProduct(p)}
                                    title="Re-approve listing"
                                  >
                                    Approve
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => onViewProduct(p)}
                                  title="View produce details"
                                />

                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Trash2}
                                  onClick={() => setRecycleModalProduct(p)}
                                  title="Move to Recycle Bin (60-day soft delete)"
                                  style={{ color: '#dc2626', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
                                >
                                  Recycle
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-state-card">
                <Package size={40} className="empty-state-icon text-muted" />
                <h3 className="empty-state-title">No listings found in this filter</h3>
                <p className="empty-state-desc">
                  Try selecting a different filter above.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RECYCLE BIN (60-DAY AUTO-PURGE LIFECYCLE) */}
        {/* ========================================================================= */}
        {activeTab === 'recycle_bin' && (
          <div className="admin-section animate-fade-in">
            {/* Recycle Bin Advisory Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '16px 20px',
                marginBottom: '20px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 'var(--radius-md, 8px)',
                flexWrap: 'wrap'
              }}
            >
              <div className="flex items-start gap-3">
                <Clock size={24} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#92400e' }}>
                    Recycle Bin &bull; 60-Day Auto-Purge Lifecycle
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#b45309', lineHeight: '1.4' }}>
                    Produce listings moved here are immediately removed from the live marketplace storefront. They are safely retained for <strong>60 days</strong> before permanent auto-purge. You can restore any listing back to active storefront status at any time.
                  </p>
                </div>
              </div>

              {recycledProducts.length > 0 && (
                <Button
                  variant="outline"
                  icon={Trash2}
                  size="sm"
                  onClick={() => setEmptyBinModalOpen(true)}
                  style={{ color: '#dc2626', borderColor: '#fecaca', backgroundColor: '#ffffff', flexShrink: 0 }}
                >
                  Empty Recycle Bin ({recycledProducts.length})
                </Button>
              )}
            </div>

            {/* Recycle Bin Controls Bar */}
            {recycledProducts.length > 0 && (
              <div className="admin-controls-bar flex items-center justify-between gap-3 flex-wrap" style={{ marginBottom: '16px' }}>
                <div className="input-with-icon admin-search-input flex-1">
                  <Search size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search recycled produce, farmer name, or LGA..."
                    value={recycleSearchQuery}
                    onChange={(e) => setRecycleSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Recycled Products Table */}
            {filteredRecycledProducts.length > 0 ? (
              <div className="admin-table-container">
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Produce &amp; Category</th>
                        <th>Seller / Location</th>
                        <th>Price</th>
                        <th>Recycled Lifecycle</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecycledProducts.map((p) => {
                        const daysLeft = getDaysRemaining(p);
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className="admin-product-cell flex items-center gap-3">
                                <img
                                  src={p.image || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=120&q=80'}
                                  alt={p.name}
                                  className="admin-product-thumb"
                                  style={{ filter: 'grayscale(0.5)' }}
                                />
                                <div>
                                  <span className="admin-product-name">{p.name}</span>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Badge variant="category">{p.category}</Badge>
                                    <Badge variant="danger">In Recycle Bin</Badge>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div className="admin-seller-cell">
                                <span className="seller-name">{p.seller || 'Benue Producer'}</span>
                                <span className="seller-loc text-muted flex items-center gap-1 text-xs">
                                  <MapPin size={11} /> {p.lga || p.location || 'Benue'}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="admin-price-cell">
                                <span className="font-semibold">{formatNaira(p.price)}</span>
                                <span className="text-muted text-xs block">/ {p.unit}</span>
                              </div>
                            </td>

                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <Badge variant={daysLeft <= 5 ? 'danger' : 'warning'}>
                                  <Clock size={12} /> {daysLeft === 0 ? 'Expires today' : `${daysLeft} days remaining`}
                                </Badge>
                                <span style={{ fontSize: '11px', color: 'var(--color-slate-500)' }}>
                                  Auto-purges after 60 days
                                </span>
                              </div>
                            </td>

                            <td className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={RotateCcw}
                                  onClick={() => handleRestoreProduct(p)}
                                  disabled={actionLoading}
                                  title="Restore listing back to active storefront"
                                >
                                  Restore
                                </Button>

                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm text-danger"
                                  onClick={() => setAdminDeleteModalProduct(p)}
                                  disabled={actionLoading}
                                  title="Permanently delete immediately"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-state-card">
                <Trash2 size={40} className="empty-state-icon text-muted" />
                <h3 className="empty-state-title">Recycle Bin is Empty</h3>
                <p className="empty-state-desc">
                  No produce listings are currently in the recycle bin. Active listings moved here will be safely kept for 60 days before auto-purge.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: USER DIRECTORY & MODERATION */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="admin-section animate-fade-in">
            {/* Search and Filters Bar */}
            {/* Search and Filters Bar */}
            <div className="admin-controls-bar flex items-center justify-between gap-3 flex-wrap">
              {/* Search Scope Mode Selector & Input */}
              <div className="flex items-center gap-2 flex-1" style={{ minWidth: '320px' }}>
                <select
                  className="form-control admin-select-filter admin-search-field-select"
                  value={userSearchField}
                  onChange={(e) => setUserSearchField(e.target.value)}
                  title="Choose what field to search by"
                  style={{ width: 'auto', minWidth: '150px' }}
                >
                  <option value="all">🔍 All Fields</option>
                  <option value="id">#️⃣ User ID / UUID</option>
                  <option value="email">✉️ Email Address</option>
                </select>

                <div className="input-with-icon admin-search-input flex-1" style={{ position: 'relative' }}>
                  {userSearchField === 'id' ? (
                    <Hash size={16} className="input-icon" />
                  ) : userSearchField === 'email' ? (
                    <AtSign size={16} className="input-icon" />
                  ) : (
                    <Search size={16} className="input-icon" />
                  )}
                  <input
                    type="text"
                    className="form-control"
                    placeholder={
                      userSearchField === 'id'
                        ? 'Enter user ID (e.g. e6b14f82 or mock-farmer)...'
                        : userSearchField === 'email'
                        ? 'Enter user email (e.g. farmer@benue.ng)...'
                        : 'Search by User ID, Email, Name, Phone, or LGA...'
                    }
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchDatabase();
                      }
                    }}
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      className="btn-icon-clear"
                      onClick={() => setUserSearchQuery('')}
                      title="Clear search"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-slate-400)',
                        padding: '4px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={isSearchingDb ? Loader2 : Database}
                  onClick={handleSearchDatabase}
                  disabled={isSearchingDb}
                  title="Deep search the Supabase profiles database"
                >
                  {isSearchingDb ? 'Searching...' : 'Search DB'}
                </Button>
              </div>

              <div className="flex items-center gap-2 admin-controls-filters flex-wrap">
                <select
                  className="form-control admin-select-filter"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="all">All User Roles</option>
                  <option value="super_admin">Super Admins</option>
                  <option value="admin">Administrators</option>
                  <option value="farmer">Farmers / Producers</option>
                  <option value="buyer">Buyers / Vendors</option>
                </select>

                <select
                  className="form-control admin-select-filter"
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                >
                  <option value="all">All Account Statuses</option>
                  <option value="active">Active Accounts</option>
                  <option value="suspended">Suspended Accounts</option>
                </select>

                <select
                  className="form-control admin-select-filter"
                  value={userSubFilter}
                  onChange={(e) => setUserSubFilter(e.target.value)}
                >
                  <option value="all">All Subscriptions</option>
                  <option value="active_sub">Active Subscriptions ({totalWithSubs})</option>
                  <option value="expired_sub">Expired Subscriptions</option>
                  <option value="free_sub">Standard Free</option>
                </select>
              </div>
            </div>

            {/* Search Match Status Feedback Bar */}
            {userSearchQuery.trim() && (
              <div className="admin-search-status-bar">
                <span className="flex items-center gap-2">
                  <Search size={14} />
                  Found <strong>{filteredUsers.length}</strong> user{filteredUsers.length === 1 ? '' : 's'} matching &ldquo;{userSearchQuery}&rdquo; {userSearchField === 'id' ? 'by ID' : userSearchField === 'email' ? 'by Email' : 'across all fields'}.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-primary underline"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={handleSearchDatabase}
                  >
                    Query Supabase DB
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted underline"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setUserSearchQuery('')}
                  >
                    Reset Search
                  </button>
                </div>
              </div>
            )}

            {/* Users Table */}
            {filteredUsers.length > 0 ? (
              <div className="admin-table-container card">
                <div className="table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>User Profile &amp; ID</th>
                        <th>Email &amp; Phone</th>
                        <th>Role</th>
                        <th>LGA / Location</th>
                        <th>Account Status</th>
                        <th>Subscription Plan</th>
                        <th className="text-right">Actions &amp; Moderation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const isSelf = u.id === currentUser?.id || u.email === currentUser?.email;
                        const isTargetAdmin = u.role === 'admin' || u.role === 'super_admin';
                        const canModerate = canModerateUser(u);
                        const isSuspended = u.status === 'suspended';
                        const hasActiveSub = Boolean(
                          u.subscriptionPlan &&
                          u.subscriptionStatus !== 'cancelled' &&
                          u.subscriptionStatus !== 'expired'
                        );

                        return (
                          <tr key={u.id} className={isSuspended ? 'row-suspended' : ''}>
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="admin-user-avatar">
                                  {u.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <strong className="admin-table-title flex items-center gap-1">
                                    {u.name}
                                    {isSelf && <span className="badge badge-accent badge-sm">You</span>}
                                  </strong>
                                  <div className="admin-user-id-pill" title={`User ID: ${u.id}`}>
                                    <span className="admin-user-id-prefix">ID:</span>
                                    <span className="admin-user-id-val">{u.id}</span>
                                    <button
                                      type="button"
                                      className="btn-copy-tag"
                                      onClick={() => handleCopy(u.id, `${u.id}-id`)}
                                      title="Copy full User ID"
                                      aria-label="Copy User ID"
                                    >
                                      {copiedKey === `${u.id}-id` ? (
                                        <Check size={10} style={{ color: '#16a34a' }} />
                                      ) : (
                                        <Copy size={10} />
                                      )}
                                    </button>
                                  </div>
                                  {u.verified && (
                                    <span className="admin-cell-muted flex items-center gap-1 text-success" style={{ marginTop: '2px' }}>
                                      <ShieldCheck size={11} /> Verified Account
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="admin-user-cell">
                                <div className="flex items-center gap-1.5 text-sm admin-user-email">
                                  <Mail size={12} className="text-muted flex-shrink-0" />
                                  <span className="admin-user-email-text">{u.email}</span>
                                  <button
                                    type="button"
                                    className="btn-copy-tag"
                                    onClick={() => handleCopy(u.email, `${u.id}-email`)}
                                    title="Copy Email Address"
                                    aria-label="Copy Email"
                                  >
                                    {copiedKey === `${u.id}-email` ? (
                                      <Check size={10} style={{ color: '#16a34a' }} />
                                    ) : (
                                      <Copy size={10} />
                                    )}
                                  </button>
                                </div>
                                {u.phone && (
                                  <span className="admin-cell-muted flex items-center gap-1">
                                    <Phone size={11} className="flex-shrink-0" /> {u.phone}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              {u.role === 'super_admin' && (
                                <Badge variant="danger">
                                  <Shield size={11} /> Super Admin
                                </Badge>
                              )}
                              {u.role === 'admin' && (
                                <Badge variant="verified">
                                  <ShieldCheck size={11} /> Admin
                                </Badge>
                              )}
                              {(u.role === 'farmer' || u.role === 'seller') && (
                                <Badge variant="success">Farmer</Badge>
                              )}
                              {u.role === 'buyer' && (
                                <Badge variant="category">Buyer</Badge>
                              )}
                            </td>
                            <td>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin size={13} className="text-muted" />
                                <span>{u.lga ? `${u.lga}, ${u.location || 'Benue'}` : (u.location || 'Benue State')}</span>
                              </div>
                            </td>
                            <td>
                              {isSuspended ? (
                                <Badge variant="danger">
                                  <Ban size={11} /> Suspended
                                </Badge>
                              ) : (
                                <Badge variant="success">
                                  <CheckCircle2 size={11} /> Active
                                </Badge>
                              )}
                            </td>
                            <td>
                              {hasActiveSub ? (
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge variant={u.subscriptionPlan === 'growth' ? 'accent' : 'success'}>
                                      <Crown size={11} /> {u.subscriptionPlan}
                                    </Badge>
                                    {canModerate && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-xs text-danger"
                                        onClick={() => setRevokeSubModalUser(u)}
                                        title="Revoke active subscription"
                                        style={{ padding: '2px 6px', fontSize: '11px' }}
                                      >
                                        Revoke
                                      </button>
                                    )}
                                  </div>
                                  {u.subscriptionExpiresAt ? (
                                    <div style={{ fontSize: '11px', color: 'var(--color-slate-500)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Clock size={11} style={{ color: daysUntilExpiry({ expiresAt: u.subscriptionExpiresAt }) <= 3 ? '#b45309' : '#16a34a' }} />
                                      <span>
                                        Expires: <strong>{new Date(u.subscriptionExpiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                                        {' '}({daysUntilExpiry({ expiresAt: u.subscriptionExpiresAt })}d left)
                                      </span>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '10.5px', color: 'var(--color-slate-400)', marginTop: '2px' }}>
                                      Active (No expiry set)
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span style={{ fontSize: '12px', color: 'var(--color-slate-400)', fontWeight: '600' }}>Free</span>
                                    {canModerate && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-xs text-primary"
                                        onClick={() => {
                                          setGrantSubModalUser(u);
                                          setGrantSubModalPlanId('starter');
                                        }}
                                        title="Grant a subscription plan to this user"
                                        style={{ padding: '2px 6px', fontSize: '11px' }}
                                      >
                                        + Grant
                                      </button>
                                    )}
                                  </div>
                                  {u.subscriptionExpiresAt && (
                                    <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <AlertCircle size={11} />
                                      <span>Expired: {new Date(u.subscriptionExpiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Inspect User Details */}
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm text-primary"
                                  onClick={() => setInspectModalUser(u)}
                                  title="Inspect User Details & ID"
                                  aria-label={`Inspect ${u.name}`}
                                >
                                  <Eye size={14} />
                                </button>

                                {/* Suspend / Unsuspend action */}
                                {canModerate && (
                                  <Button
                                    variant={isSuspended ? 'outline' : 'ghost'}
                                    size="sm"
                                    icon={isSuspended ? RotateCcw : Ban}
                                    onClick={() => setSuspendModalUser(u)}
                                    title={isSuspended ? 'Reactivate user account' : 'Suspend user account'}
                                    className={!isSuspended ? 'text-danger' : ''}
                                  >
                                    {isSuspended ? 'Reactivate' : 'Suspend'}
                                  </Button>
                                )}

                                {/* Promote / Change Role action (Super Admin Only) */}
                                {isSuperAdmin && !isSelf && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={ShieldCheck}
                                    onClick={() => {
                                      setPromoteModalUser(u);
                                      setPromoteSelectedRole(u.role === 'admin' ? 'farmer' : 'admin');
                                    }}
                                    title="Change role / Promote to Admin"
                                  >
                                    Role
                                  </Button>
                                )}

                                {/* Delete User action */}
                                {canModerate && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm text-danger"
                                    onClick={() => setDeleteModalUser(u)}
                                    title="Permanently delete user account"
                                    aria-label={`Delete ${u.name}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-state-card">
                <Users size={40} className="empty-state-icon text-muted" />
                <h3 className="empty-state-title">No users matched your search criteria</h3>
                <p className="empty-state-desc">Try clearing your search term or adjusting filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Add Admin Modal */}
      <AddAdminModal
        isOpen={addAdminModalOpen}
        onClose={() => setAddAdminModalOpen(false)}
        currentUserRole={currentUser?.role}
        onSuccess={() => {
          loadUsers();
          alert('New administrator account created successfully!');
        }}
      />

      {/* 2. Reject Produce Modal */}
      {rejectModalProduct && (
        <Modal
          isOpen={Boolean(rejectModalProduct)}
          onClose={() => setRejectModalProduct(null)}
          title={`Reject Produce Submission: "${rejectModalProduct.name}"`}
          maxWidth="450px"
        >
          <div className="admin-reject-modal-body">
            <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
              Provide the farmer with feedback on why their listing was rejected so they can correct it.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="reject-reason">Feedback / Rejection Reason *</label>
              <textarea
                id="reject-reason"
                className="form-control"
                rows={3}
                placeholder="e.g. Please upload clear photos of the actual yam harvest and verify unit pricing."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="modal-actions-footer flex justify-end gap-2" style={{ marginTop: '1.25rem' }}>
              <Button variant="ghost" onClick={() => setRejectModalProduct(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRejectProduct}
                style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Suspend / Reactivate User Confirmation Modal */}
      {suspendModalUser && (
        <Modal
          isOpen={Boolean(suspendModalUser)}
          onClose={() => {
            if (!actionLoading) setSuspendModalUser(null);
          }}
          title={suspendModalUser.status === 'suspended' ? `Reactivate Account: "${suspendModalUser.name}"` : `Suspend User Account: "${suspendModalUser.name}"`}
          maxWidth="480px"
        >
          <div style={{ padding: '4px 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                marginBottom: '18px',
                backgroundColor: suspendModalUser.status === 'suspended' ? '#f0fdf4' : '#fff1f2',
                border: suspendModalUser.status === 'suspended' ? '1px solid #bbf7d0' : '1px solid #fecdd3',
                borderRadius: '8px',
                color: suspendModalUser.status === 'suspended' ? '#15803d' : '#9f1239'
              }}
            >
              {suspendModalUser.status === 'suspended' ? (
                <RotateCcw size={22} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <Ban size={22} style={{ color: '#e11d48', flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '3px' }}>
                  {suspendModalUser.status === 'suspended' ? 'Account Reactivation' : 'Immediate Platform Suspension'}
                </strong>
                <span style={{ fontSize: '13px', lineHeight: '1.45' }}>
                  {suspendModalUser.status === 'suspended' ? (
                    <>
                      Reactivating <strong>{suspendModalUser.name}</strong> ({suspendModalUser.email}) will restore their ability to log in, manage inventory, and receive customer inquiries.
                    </>
                  ) : (
                    <>
                      Suspending <strong>{suspendModalUser.name}</strong> ({suspendModalUser.email}) will immediately block them from logging in, publishing listings, or transacting. Their active produce listings will be hidden from the storefront.
                    </>
                  )}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-surface-muted, #f8fafc)',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              <div className="admin-user-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                {suspendModalUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700', color: 'var(--color-slate-900)' }}>
                  {suspendModalUser.name}
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-slate-500)' }}>
                  {suspendModalUser.email} &bull; Role: <strong style={{ textTransform: 'capitalize' }}>{suspendModalUser.role}</strong>
                </p>
              </div>
            </div>

            <div className="modal-actions-footer flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setSuspendModalUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSuspendUser}
                disabled={actionLoading}
                icon={actionLoading ? Loader2 : (suspendModalUser.status === 'suspended' ? RotateCcw : Ban)}
                style={
                  suspendModalUser.status === 'suspended'
                    ? { backgroundColor: '#16a34a', borderColor: '#16a34a' }
                    : { backgroundColor: 'var(--color-danger, #dc2626)', borderColor: 'var(--color-danger, #dc2626)' }
                }
              >
                {actionLoading
                  ? 'Processing...'
                  : suspendModalUser.status === 'suspended'
                  ? 'Reactivate Account'
                  : 'Confirm Suspension'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Delete User Permanently Confirmation Modal */}
      {deleteModalUser && (
        <Modal
          isOpen={Boolean(deleteModalUser)}
          onClose={() => {
            if (!actionLoading) setDeleteModalUser(null);
          }}
          title={`Permanently Delete User: "${deleteModalUser.name}"?`}
          maxWidth="480px"
        >
          <div style={{ padding: '4px 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                marginBottom: '18px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#991b1b'
              }}
            >
              <AlertTriangle size={24} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '3px' }}>
                  Irreversible Action Warning
                </strong>
                <span style={{ fontSize: '13px', lineHeight: '1.45', color: '#b91c1c' }}>
                  You are about to permanently delete <strong>{deleteModalUser.name}</strong> ({deleteModalUser.email}). This will erase their profile, all published produce listings, saved bookmarks, and authentication account permanently.
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-surface-muted, #f8fafc)',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              <div className="admin-user-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                {deleteModalUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700', color: 'var(--color-slate-900)' }}>
                  {deleteModalUser.name}
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-slate-500)' }}>
                  ID: <code style={{ fontSize: '11px' }}>{deleteModalUser.id}</code> &bull; Role: <strong>{deleteModalUser.role}</strong>
                </p>
              </div>
            </div>

            <div className="modal-actions-footer flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteModalUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDeleteUser}
                disabled={actionLoading}
                icon={actionLoading ? Loader2 : Trash2}
                style={{ backgroundColor: 'var(--color-danger, #dc2626)', borderColor: 'var(--color-danger, #dc2626)' }}
              >
                {actionLoading ? 'Deleting Account...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Revoke Subscription Confirmation Modal */}
      {revokeSubModalUser && (
        <Modal
          isOpen={Boolean(revokeSubModalUser)}
          onClose={() => {
            if (!actionLoading) setRevokeSubModalUser(null);
          }}
          title={`Revoke Subscription: "${revokeSubModalUser.name}"`}
          maxWidth="480px"
        >
          <div style={{ padding: '4px 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                marginBottom: '18px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '8px',
                color: '#92400e'
              }}
            >
              <CreditCard size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '3px' }}>
                  Subscription Cancellation
                </strong>
                <span style={{ fontSize: '13px', lineHeight: '1.45', color: '#b45309' }}>
                  Revoking this subscription will cancel <strong>{revokeSubModalUser.name}&rsquo;s</strong> active <strong>{revokeSubModalUser.subscriptionPlan || 'premium'} plan</strong>. Their vendor account will be downgraded back to standard free listing limits immediately.
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-surface-muted, #f8fafc)',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              <div className="admin-user-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                {revokeSubModalUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700', color: 'var(--color-slate-900)' }}>
                  {revokeSubModalUser.name}
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-slate-500)' }}>
                  Current Plan: <Badge variant="accent">{revokeSubModalUser.subscriptionPlan || 'Active'}</Badge>
                  {revokeSubModalUser.subscriptionExpiresAt && (
                    <span style={{ marginLeft: '8px' }}>
                      Expires: {new Date(revokeSubModalUser.subscriptionExpiresAt).toLocaleDateString('en-NG')}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="modal-actions-footer flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setRevokeSubModalUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRevokeSub}
                disabled={actionLoading}
                icon={actionLoading ? Loader2 : XCircle}
                style={{ backgroundColor: '#e11d48', borderColor: '#e11d48' }}
              >
                {actionLoading ? 'Revoking Plan...' : 'Revoke Subscription'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Grant Subscription Modal */}
      {grantSubModalUser && (
        <Modal
          isOpen={Boolean(grantSubModalUser)}
          onClose={() => {
            if (!actionLoading) setGrantSubModalUser(null);
          }}
          title={`Grant Subscription to "${grantSubModalUser.name}"`}
          maxWidth="460px"
        >
          <div style={{ padding: '4px 0' }}>
            <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
              Grant an active advertising subscription tier to <strong>{grantSubModalUser.name}</strong> ({grantSubModalUser.email}).
            </p>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="grant-plan-select">Select Subscription Plan *</label>
              <select
                id="grant-plan-select"
                className="form-control"
                value={grantSubModalPlanId}
                onChange={(e) => setGrantSubModalPlanId(e.target.value)}
              >
                {subPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatNaira(p.price)}/mo (Up to {p.maxProducts} products)
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions-footer flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setGrantSubModalUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmGrantSub}
                disabled={actionLoading}
                icon={actionLoading ? Loader2 : ShieldCheck}
              >
                {actionLoading ? 'Granting Plan...' : 'Grant Subscription'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Change User Role Modal */}
      {promoteModalUser && (
        <Modal
          isOpen={Boolean(promoteModalUser)}
          onClose={() => setPromoteModalUser(null)}
          title={`Update Role for "${promoteModalUser.name}"`}
          maxWidth="440px"
        >
          <div className="admin-promote-modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="user-new-role">Select New Platform Role</label>
              <select
                id="user-new-role"
                className="form-control"
                value={promoteSelectedRole}
                onChange={(e) => setPromoteSelectedRole(e.target.value)}
              >
                <option value="buyer">Buyer / Vendor</option>
                <option value="farmer">Farmer / Producer</option>
                <option value="admin">Marketplace Administrator</option>
                <option value="super_admin">Super Administrator</option>
              </select>
            </div>
            <div className="modal-actions-footer flex justify-end gap-2" style={{ marginTop: '1.25rem' }}>
              <Button variant="ghost" onClick={() => setPromoteModalUser(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmRoleUpdate} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Role'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Move to Recycle Bin Confirmation Modal */}
      {recycleModalProduct && (
        <Modal
          isOpen={Boolean(recycleModalProduct)}
          onClose={() => {
            if (!actionLoading) setRecycleModalProduct(null);
          }}
          title={`Move to Recycle Bin: "${recycleModalProduct.name}"`}
          maxWidth="460px"
        >
          <div style={{ padding: '4px 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                marginBottom: '18px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 'var(--radius-md, 8px)',
                color: '#92400e'
              }}
            >
              <Clock size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '3px' }}>
                  60-Day Recycle Lifecycle
                </strong>
                <span style={{ fontSize: '13px', lineHeight: '1.45', color: '#b45309' }}>
                  Moving <strong>&ldquo;{recycleModalProduct.name}&rdquo;</strong> to the Recycle Bin will immediately hide it from the live marketplace storefront. It will be kept in the Recycle Bin for <strong>60 days</strong> before automatic permanent deletion, unless you restore it.
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-surface-muted, #f8fafc)',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                marginBottom: '20px'
              }}
            >
              <img
                src={recycleModalProduct.image || (recycleModalProduct.images && recycleModalProduct.images[0]) || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=120&q=80'}
                alt={recycleModalProduct.name}
                style={{ width: '46px', height: '46px', objectFit: 'cover', borderRadius: '6px' }}
              />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700', color: 'var(--color-slate-900)' }}>
                  {recycleModalProduct.name}
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-slate-600)' }}>
                  {formatNaira(recycleModalProduct.price)} / {recycleModalProduct.unit} &bull; Seller: {recycleModalProduct.seller || 'Farmer'}
                </p>
              </div>
            </div>

            <div className="modal-actions-footer flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRecycleModalProduct(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={Trash2}
                onClick={handleConfirmRecycleProduct}
                disabled={actionLoading}
                style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
              >
                {actionLoading ? 'Moving to Bin...' : 'Move to Recycle Bin'}
              </Button>
            </div>
          </div>
        </Modal>
      )}



        {/* ================================================================= */}
        {/* TAB 4: SUBSCRIPTION PLAN MANAGEMENT                               */}
        {/* ================================================================= */}
        {activeTab === 'subscriptions' && (
          <div className="admin-section animate-fade-in">

            {/* ── Plan Editor ── */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: '800', color: 'var(--color-slate-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={18} style={{ color: '#16a34a' }} /> Subscription Plan Settings
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-slate-500)' }}>Edit pricing and product limits. Changes take effect immediately for new subscriptions.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!subPlansEditing ? (
                    <Button variant="outline" size="sm" icon={Settings} onClick={() => { setSubPlansEditing(true); setSubPlansSaved(false); }}>
                      Edit Plans
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => { setSubPlansEditing(false); setSubPlans(getSubscriptionPlans()); }}>
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" icon={Save} onClick={() => {
                        saveSubscriptionPlans(subPlans);
                        setSubPlansEditing(false);
                        setSubPlansSaved(true);
                        setTimeout(() => setSubPlansSaved(false), 3000);
                      }}>
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {subPlansSaved && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '13px', fontWeight: '600', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={15} /> Plan settings saved successfully!
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '16px' }}>
                {subPlans.map((plan, idx) => (
                  <div key={plan.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{
                      background: plan.id === 'growth' ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'linear-gradient(135deg,#16a34a,#15803d)',
                      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px'
                    }}>
                      {plan.id === 'growth' ? <Crown size={20} color="#fff" /> : <Zap size={20} color="#fff" />}
                      <span style={{ color: '#fff', fontWeight: '800', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>{plan.name} Plan</span>
                    </div>
                    <div style={{ padding: '16px 20px', background: '#fff' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-slate-600)', marginBottom: '6px' }}>Monthly Price (₦)</label>
                        {subPlansEditing ? (
                          <input
                            type="number"
                            value={plan.price}
                            min="500"
                            step="100"
                            onChange={e => {
                              const updated = [...subPlans];
                              updated[idx] = { ...updated[idx], price: Number(e.target.value) };
                              setSubPlans(updated);
                            }}
                            style={{
                              width: '100%', padding: '8px 12px', borderRadius: '8px',
                              border: '1.5px solid #d1fae5', fontSize: '14px', fontWeight: '700',
                              boxSizing: 'border-box', outline: 'none'
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--color-slate-900)', fontFamily: 'var(--font-display)' }}>{formatNaira(plan.price)}</div>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-slate-600)', marginBottom: '6px' }}>Max Product Listings</label>
                        {subPlansEditing ? (
                          <input
                            type="number"
                            value={plan.maxProducts}
                            min="1"
                            max="100"
                            onChange={e => {
                              const updated = [...subPlans];
                              updated[idx] = { ...updated[idx], maxProducts: Number(e.target.value) };
                              setSubPlans(updated);
                            }}
                            style={{
                              width: '100%', padding: '8px 12px', borderRadius: '8px',
                              border: '1.5px solid #d1fae5', fontSize: '14px', fontWeight: '700',
                              boxSizing: 'border-box', outline: 'none'
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-slate-700)' }}>Up to {plan.maxProducts} products</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '12px', color: 'var(--color-slate-400)', marginTop: '10px' }}>
                * Default prices: Starter ₦2,000/month (3 products), Growth ₦5,000/month (10 products).
                <button
                  style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: '600', cursor: 'pointer', fontSize: '12px', marginLeft: '8px', textDecoration: 'underline' }}
                  onClick={() => { setSubPlans(DEFAULT_PLANS); setSubPlansSaved(false); }}
                >
                  Reset to defaults
                </button>
              </p>
            </div>

            {/* ── Vendor Subscriptions Management & Search ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-slate-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} style={{ color: '#16a34a' }} /> Vendor Subscriptions &amp; Expiry Management
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-slate-500)' }}>
                    Search and inspect any vendor&apos;s subscription state, check expiration countdowns, and grant or extend access.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={isSyncingSubs ? Loader2 : RefreshCw}
                  disabled={isSyncingSubs}
                  onClick={handleRefreshSubscriptions}
                  title="Synchronize all subscriptions with Supabase database"
                >
                  {isSyncingSubs ? 'Syncing DB...' : 'Sync with Supabase'}
                </Button>
              </div>

              {/* ── QUICK USER SUBSCRIPTION INSPECTOR / SEARCH CARD ── */}
              <div style={{
                padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1.5px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Search size={15} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-slate-800)' }}>
                      Quick Subscription &amp; Expiry Inspector
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-slate-500)' }}>
                    Look up any farmer or buyer by User ID, Email, or Name
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                    <input
                      type="text"
                      placeholder="Enter user ID (e.g. 274cd848-...) or vendor email..."
                      value={inspectorQuery}
                      onChange={(e) => setInspectorQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleInspectSubscription();
                      }}
                      style={{
                        width: '100%', padding: '10px 36px 10px 36px', borderRadius: '10px',
                        border: '1.5px solid #cbd5e1', fontSize: '13.5px', background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    />
                    {inspectorQuery && (
                      <button
                        type="button"
                        onClick={() => { setInspectorQuery(''); setInspectedUser(null); }}
                        style={{
                          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-400)'
                        }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    icon={isInspecting ? Loader2 : SearchCheck}
                    disabled={isInspecting || !inspectorQuery.trim()}
                    onClick={() => handleInspectSubscription()}
                  >
                    {isInspecting ? 'Inspecting...' : 'Inspect User Subscription'}
                  </Button>
                </div>

                {/* Inspected User Result Card */}
                {inspectedUser && (
                  <div style={{
                    marginTop: '16px', padding: '16px 20px', borderRadius: '12px', background: '#fff',
                    border: '1.5px solid #bbf7d0', boxShadow: '0 4px 12px rgba(22,163,74,0.08)',
                    animation: 'adminSectionFadeIn 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="admin-user-avatar" style={{ width: '42px', height: '42px', fontSize: '16px' }}>
                          {inspectedUser.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '15px', color: 'var(--color-slate-900)' }}>{inspectedUser.user?.name}</strong>
                            <Badge variant={inspectedUser.user?.role === 'farmer' ? 'success' : 'category'}>
                              {inspectedUser.user?.role}
                            </Badge>
                            {inspectedUser.user?.verified && (
                              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <ShieldCheck size={12} /> Verified
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-slate-500)', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span>{inspectedUser.user?.email}</span>
                            {inspectedUser.user?.phone && <span>· {inspectedUser.user?.phone}</span>}
                            <span>· {inspectedUser.user?.lga || inspectedUser.user?.location || 'Benue'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-muted"
                          onClick={() => setInspectedUser(null)}
                          title="Close inspector"
                        >
                          <X size={14} /> Close
                        </button>
                      </div>
                    </div>

                    {/* Subscription Diagnostic Metrics */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px', padding: '14px', borderRadius: '10px',
                      background: inspectedUser.expiryDetails.status === 'active' ? '#f0fdf4' :
                                  inspectedUser.expiryDetails.status === 'expiring_soon' ? '#fffbeb' :
                                  inspectedUser.expiryDetails.status === 'expired' ? '#fef2f2' : '#f8fafc',
                      border: `1px solid ${
                        inspectedUser.expiryDetails.status === 'active' ? '#bbf7d0' :
                        inspectedUser.expiryDetails.status === 'expiring_soon' ? '#fef3c7' :
                        inspectedUser.expiryDetails.status === 'expired' ? '#fecaca' : '#e2e8f0'
                      }`,
                      marginBottom: '14px'
                    }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-slate-500)', textTransform: 'uppercase', display: 'block' }}>Subscription State</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span style={{
                            fontSize: '13px', fontWeight: '800',
                            color: inspectedUser.expiryDetails.status === 'active' ? '#15803d' :
                                   inspectedUser.expiryDetails.status === 'expiring_soon' ? '#b45309' :
                                   inspectedUser.expiryDetails.status === 'expired' ? '#b91c1c' : '#64748b'
                          }}>
                            {inspectedUser.expiryDetails.status === 'active' ? '● Active Subscription' :
                             inspectedUser.expiryDetails.status === 'expiring_soon' ? '▲ Expiring Soon' :
                             inspectedUser.expiryDetails.status === 'expired' ? '✕ Expired' : 'Standard Free'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-slate-500)', textTransform: 'uppercase', display: 'block' }}>Plan &amp; Tier</span>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-slate-900)', marginTop: '4px', textTransform: 'capitalize' }}>
                          {inspectedUser.subscription?.planId ? `${inspectedUser.subscription.planId} (${formatNaira(inspectedUser.planObj?.price || 2000)}/mo)` : 'None (Free Tier)'}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-slate-500)', textTransform: 'uppercase', display: 'block' }}>Expiration Date</span>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-slate-900)', marginTop: '4px' }}>
                          {inspectedUser.expiryDetails.formattedExpiry}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-slate-500)', textTransform: 'uppercase', display: 'block' }}>Countdown / Time Left</span>
                        <div style={{ fontSize: '13px', fontWeight: '800', marginTop: '4px', color: inspectedUser.expiryDetails.status === 'active' ? '#15803d' : inspectedUser.expiryDetails.status === 'expiring_soon' ? '#b45309' : '#b91c1c' }}>
                          {inspectedUser.expiryDetails.relativeText}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-slate-500)', textTransform: 'uppercase', display: 'block' }}>Storefront Visibility</span>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-slate-800)', marginTop: '4px' }}>
                          {inspectedUser.activeProductsCount} of {inspectedUser.planObj?.maxProducts || 0} listings active
                        </div>
                      </div>
                    </div>

                    {/* Quick Admin Actions for this user */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div className="admin-user-id-pill" title={`User ID: ${inspectedUser.user?.id}`}>
                        <span className="admin-user-id-prefix">UUID:</span>
                        <span className="admin-user-id-val">{inspectedUser.user?.id}</span>
                        <button
                          type="button"
                          className="btn-copy-tag"
                          onClick={() => handleCopy(inspectedUser.user?.id, `${inspectedUser.user?.id}-insp`)}
                        >
                          {copiedKey === `${inspectedUser.user?.id}-insp` ? <Check size={10} style={{ color: '#16a34a' }} /> : <Copy size={10} />}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {inspectedUser.subscription?.planId ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Clock}
                              disabled={actionLoading}
                              onClick={() => handleExtendSubscription(inspectedUser.user?.id, inspectedUser.subscription.planId, 30)}
                            >
                              Extend +30 Days
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Zap}
                              onClick={() => {
                                setGrantSubModalUser(inspectedUser.user);
                                setGrantSubModalPlanId(inspectedUser.subscription.planId === 'starter' ? 'growth' : 'starter');
                              }}
                            >
                              Change Plan
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setRevokeSubModalUser(inspectedUser.user)}
                            >
                              Revoke Plan
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={ShieldCheck}
                            onClick={() => {
                              setGrantSubModalUser(inspectedUser.user);
                              setGrantSubModalPlanId('starter');
                            }}
                          >
                            Grant Subscription Plan
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Grant Subscription Accordion / Card */}
              <div style={{ padding: '16px 20px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '700', color: 'var(--color-slate-700)' }}>Grant Subscription to a Vendor</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2, minWidth: '220px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-slate-500)', marginBottom: '4px' }}>Vendor User ID or Select Farmer</label>
                    <input
                      type="text"
                      placeholder="Paste vendor user ID or UUID..."
                      value={grantSubUser || ''}
                      onChange={e => setGrantSubUser(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-slate-500)', marginBottom: '4px' }}>Plan</label>
                    <select
                      value={grantSubPlanId}
                      onChange={e => setGrantSubPlanId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      {subPlans.map(p => <option key={p.id} value={p.id}>{p.name} ({formatNaira(p.price)}/mo)</option>)}
                    </select>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ShieldCheck}
                    disabled={!grantSubUser?.trim() || actionLoading}
                    onClick={async () => {
                      if (!grantSubUser?.trim()) return;
                      await adminSetSubscription(grantSubUser.trim(), grantSubPlanId);
                      const freshSubs = await syncAllSubscriptionsFromSupabase();
                      if (freshSubs) setAllVendorSubs(freshSubs);
                      await loadUsers();
                      setGrantSubUser('');
                      showToast(`Granted ${grantSubPlanId.toUpperCase()} subscription.`, 'success');
                    }}
                  >
                    Grant Plan
                  </Button>
                </div>
              </div>

              {/* ── SEARCH & FILTER CONTROLS FOR SUBSCRIPTIONS TABLE ── */}
              <div className="admin-controls-bar flex items-center justify-between gap-3 flex-wrap" style={{ marginBottom: '14px' }}>
                <div className="input-with-icon admin-search-input flex-1" style={{ position: 'relative', minWidth: '260px' }}>
                  <Search size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search subscriptions by User ID, Name, Email, or Ref..."
                    value={subSearchQuery}
                    onChange={(e) => setSubSearchQuery(e.target.value)}
                  />
                  {subSearchQuery && (
                    <button
                      type="button"
                      className="btn-icon-clear"
                      onClick={() => setSubSearchQuery('')}
                      title="Clear search"
                      style={{
                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                        background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-slate-400)', padding: '4px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 admin-controls-filters flex-wrap">
                  <select
                    className="form-control admin-select-filter"
                    value={subStatusFilter}
                    onChange={(e) => setSubStatusFilter(e.target.value)}
                    style={{ minWidth: '150px' }}
                  >
                    <option value="all">All Statuses ({enrichedVendorSubs.length})</option>
                    <option value="active">Active (Valid)</option>
                    <option value="expiring_soon">Expiring Soon (≤3d)</option>
                    <option value="expired">Expired</option>
                  </select>

                  <select
                    className="form-control admin-select-filter"
                    value={subPlanFilter}
                    onChange={(e) => setSubPlanFilter(e.target.value)}
                    style={{ minWidth: '130px' }}
                  >
                    <option value="all">All Plans</option>
                    <option value="starter">Starter Plan</option>
                    <option value="growth">Growth Plan</option>
                  </select>
                </div>
              </div>

              {/* Search feedback bar */}
              {subSearchQuery.trim() && (
                <div className="admin-search-status-bar" style={{ marginBottom: '14px' }}>
                  <span className="flex items-center gap-2">
                    <Search size={14} />
                    Found <strong>{filteredVendorSubs.length}</strong> subscription{filteredVendorSubs.length === 1 ? '' : 's'} matching &ldquo;{subSearchQuery}&rdquo;.
                  </span>
                  <button
                    type="button"
                    className="text-xs text-muted underline"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setSubSearchQuery('')}
                  >
                    Reset Filter
                  </button>
                </div>
              )}

              {/* Enhanced Subscriptions Table */}
              {filteredVendorSubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: 'var(--color-slate-400)' }}>
                  <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-slate-700)', marginBottom: '4px' }}>
                    {subSearchQuery ? `No subscriptions matching "${subSearchQuery}"` : 'No vendor subscriptions recorded'}
                  </div>
                  <p style={{ fontSize: '13px', margin: 0 }}>
                    {subSearchQuery ? 'Try clearing your search query or changing status filters.' : 'Grant a subscription above to activate a vendor.'}
                  </p>
                </div>
              ) : (
                <div className="admin-table-container card">
                  <div className="table-responsive">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Vendor Profile &amp; ID</th>
                          <th>Plan &amp; Limit</th>
                          <th>Subscription Expiration</th>
                          <th>Status &amp; Countdown</th>
                          <th>Payment Ref</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVendorSubs.map((sub) => {
                          const ed = sub.expiryDetails;
                          const isExpiringSoon = ed.status === 'expiring_soon';
                          const isExpired = ed.status === 'expired';

                          return (
                            <tr key={sub.vendorId}>
                              {/* 1. Vendor Profile */}
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="admin-user-avatar">
                                    {sub.userName?.charAt(0).toUpperCase() || 'V'}
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <strong className="admin-table-title flex items-center gap-1">
                                      {sub.userName}
                                      <Badge variant={sub.userRole === 'farmer' ? 'success' : 'category'} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                        {sub.userRole}
                                      </Badge>
                                    </strong>
                                    {sub.userEmail && (
                                      <div style={{ fontSize: '12px', color: 'var(--color-slate-500)', marginBottom: '3px' }}>
                                        {sub.userEmail}
                                      </div>
                                    )}
                                    <div className="admin-user-id-pill" title={`User ID: ${sub.vendorId}`}>
                                      <span className="admin-user-id-prefix">ID:</span>
                                      <span className="admin-user-id-val">{sub.vendorId}</span>
                                      <button
                                        type="button"
                                        className="btn-copy-tag"
                                        onClick={() => handleCopy(sub.vendorId, `${sub.vendorId}-subid`)}
                                        title="Copy Vendor ID"
                                      >
                                        {copiedKey === `${sub.vendorId}-subid` ? <Check size={10} style={{ color: '#16a34a' }} /> : <Copy size={10} />}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Plan */}
                              <td>
                                <div>
                                  <Badge variant={sub.planId === 'growth' ? 'accent' : 'success'}>
                                    <Crown size={11} /> {sub.planName}
                                  </Badge>
                                  <div style={{ fontSize: '11px', color: 'var(--color-slate-500)', marginTop: '4px' }}>
                                    {formatNaira(sub.planPrice)}/mo · Up to {sub.maxProducts} listings
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-slate-400)', marginTop: '1px' }}>
                                    {sub.activeProductsCount} currently active
                                  </div>
                                </div>
                              </td>

                              {/* 3. Subscription Expiration */}
                              <td>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '700', color: isExpired ? '#b91c1c' : 'var(--color-slate-800)' }}>
                                    <CalendarClock size={14} style={{ color: isExpired ? '#b91c1c' : isExpiringSoon ? '#b45309' : '#16a34a' }} />
                                    <span>{ed.formattedExpiry}</span>
                                  </div>
                                  {sub.startedAt && (
                                    <div style={{ fontSize: '11px', color: 'var(--color-slate-400)', marginTop: '3px' }}>
                                      Started: {new Date(sub.startedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 4. Status & Countdown */}
                              <td>
                                <div>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: '700',
                                    background: isExpired ? '#fef2f2' : isExpiringSoon ? '#fffbeb' : '#f0fdf4',
                                    color: isExpired ? '#b91c1c' : isExpiringSoon ? '#b45309' : '#15803d',
                                    border: `1px solid ${isExpired ? '#fecaca' : isExpiringSoon ? '#fef3c7' : '#bbf7d0'}`
                                  }}>
                                    {isExpired ? <AlertCircle size={12} /> : isExpiringSoon ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                                    {ed.relativeText}
                                  </span>
                                </div>
                              </td>

                              {/* 5. Payment Ref */}
                              <td>
                                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-slate-600)' }}>
                                  {sub.paymentRef || '—'}
                                </span>
                              </td>

                              {/* 6. Actions */}
                              <td className="text-right">
                                <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs text-primary"
                                    onClick={() => handleExtendSubscription(sub.vendorId, sub.planId, 30)}
                                    disabled={actionLoading}
                                    title="Extend subscription by 30 days"
                                    style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '600', border: '1px solid #bae6fd', borderRadius: '6px' }}
                                  >
                                    +30d
                                  </button>
                                  <button
                                    type="button"
                                    style={{
                                      padding: '3px 8px', borderRadius: '6px', border: '1px solid #fecaca',
                                      background: '#fef2f2', color: '#b91c1c', fontSize: '11px', fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      const matchingUser = safeUsers.find((u) => u.id === sub.vendorId);
                                      setRevokeSubModalUser({
                                        id: sub.vendorId,
                                        name: matchingUser?.name || sub.userName || sub.vendorId,
                                        email: matchingUser?.email || sub.userEmail || '',
                                        subscriptionPlan: sub.planId,
                                        subscriptionExpiresAt: sub.expiresAt
                                      });
                                    }}
                                  >
                                    Revoke
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

    </div>
  );
}
