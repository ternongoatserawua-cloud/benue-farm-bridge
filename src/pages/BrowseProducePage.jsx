import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RotateCcw,
  PackageSearch,
  ChevronDown,
  X,
  Loader2,
  ArrowUp,
  Sprout,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import ProductCard from '../components/marketplace/ProductCard.jsx';
import ProductCardSkeleton from '../components/marketplace/ProductCardSkeleton.jsx';
import SearchBar from '../components/marketplace/SearchBar.jsx';
import CategoryPills from '../components/marketplace/CategoryPills.jsx';
import Button from '../components/common/Button.jsx';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';
import { fetchPaginatedProducts } from '../services/productsService.js';
import { CATEGORIES } from '../data/categories.js';
import { BENUE_LGAS } from '../data/locations.js';

const PAGE_SIZE = 12;

export default function BrowseProducePage({
  products: initialProducts = [],
  savedProductIds = new Set(),
  onToggleSave = () => {},
  onViewProduct = () => {},
  initialFilters = {}
}) {
  // Filter and sorting states
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search || '');
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category || 'all');
  const [selectedLga, setSelectedLga] = useState(initialFilters.lga || 'all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price-asc' | 'price-desc'
  const [inStockOnly, setInStockOnly] = useState(false);

  // Paginated produce listing states
  const [produceList, setProduceList] = useState([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Request race-condition and debounce tracker
  const requestIdRef = useRef(0);

  // Debounce search input keystrokes by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch initial batch (Page 0) whenever search, category, location, or sort changes
  const loadInitialBatch = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoadingInitial(true);
    setIsLoadingMore(false);
    setError(null);
    setPage(0);

    try {
      const result = await fetchPaginatedProducts({
        page: 0,
        pageSize: PAGE_SIZE,
        category: selectedCategory,
        lga: selectedLga,
        search: debouncedSearch,
        inStockOnly,
        sortBy
      });

      // Discard results from old/superseded queries
      if (currentRequestId !== requestIdRef.current) return;

      if (result.error && (!result.data || result.data.length === 0)) {
        setError(result.error);
        setProduceList([]);
        setTotalCount(0);
        setHasMore(false);
      } else {
        setProduceList(result.data || []);
        setTotalCount(result.totalCount || (result.data ? result.data.length : 0));
        setHasMore(Boolean(result.hasMore));
        setError(null);
      }
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to fetch produce listings from database.');
      setProduceList([]);
      setTotalCount(0);
      setHasMore(false);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoadingInitial(false);
      }
    }
  }, [selectedCategory, selectedLga, debouncedSearch, inStockOnly, sortBy]);

  // Trigger initial batch load when filters change
  useEffect(() => {
    loadInitialBatch();
  }, [loadInitialBatch]);

  // Immediately refresh storefront whenever any subscription is activated or updated
  useEffect(() => {
    const handleSubUpdated = () => {
      loadInitialBatch();
    };
    window.addEventListener('benue_market_subscription_updated', handleSubUpdated);
    return () => {
      window.removeEventListener('benue_market_subscription_updated', handleSubUpdated);
    };
  }, [loadInitialBatch]);

  // Fetch subsequent batch when user scrolls near the bottom
  const loadNextBatch = useCallback(async () => {
    if (isLoadingInitial || isLoadingMore || !hasMore || error) return;

    const nextPage = page + 1;
    const currentRequestId = requestIdRef.current;
    setIsLoadingMore(true);

    try {
      const result = await fetchPaginatedProducts({
        page: nextPage,
        pageSize: PAGE_SIZE,
        category: selectedCategory,
        lga: selectedLga,
        search: debouncedSearch,
        inStockOnly,
        sortBy
      });

      // Discard results from old/superseded queries
      if (currentRequestId !== requestIdRef.current) return;

      if (result.error && (!result.data || result.data.length === 0)) {
        setError(result.error);
      } else {
        const freshItems = result.data || [];
        setProduceList((prev) => {
          // Strictly prevent duplicate products when loading subsequent batches
          const existingIds = new Set(prev.map((item) => item.id));
          const deduplicated = freshItems.filter((item) => !existingIds.has(item.id));
          return [...prev, ...deduplicated];
        });
        setPage(nextPage);
        setTotalCount(result.totalCount || (produceList.length + freshItems.length));
        setHasMore(Boolean(result.hasMore));
        setError(null);
      }
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to load additional produce listings.');
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [isLoadingInitial, isLoadingMore, hasMore, error, page, selectedCategory, selectedLga, debouncedSearch, inStockOnly, sortBy, produceList.length]);

  // Connect Intersection Observer sentinel
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadNextBatch,
    hasMore,
    isLoading: isLoadingInitial || isLoadingMore,
    rootMargin: '350px',
    threshold: 0.1,
    disabled: Boolean(error)
  });

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setSelectedLga('all');
    setSortBy('newest');
    setInStockOnly(false);
    setError(null);
  };

  // Retry loading after an error
  const handleRetry = () => {
    setError(null);
    if (produceList.length === 0) {
      loadInitialBatch();
    } else {
      loadNextBatch();
    }
  };

  // Active filters count
  const activeFiltersCount = (selectedCategory !== 'all' ? 1 : 0) +
    (selectedLga !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const displayCount = produceList.length;
  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((displayCount / totalCount) * 100)) : 0;

  return (
    <div className="browse-page-root">
      {/* Header Banner */}
      <section className="browse-header-banner">
        <div className="container">
          <div className="browse-header-content">
            <h1 className="browse-title">Browse Benue Agricultural Produce</h1>
            <p className="browse-subtitle">
              Discover verified harvest listings from farmers in Zaki Biam, Makurdi, Gboko, Otukpo, and across Benue State.
            </p>

            {/* Search Input Bar */}
            <div className="browse-search-wrapper">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={() => setDebouncedSearch(searchQuery)}
                onClear={() => {
                  setSearchQuery('');
                  setDebouncedSearch('');
                }}
                placeholder="Search produce name, farmer, or location (e.g., Zaki Biam, Rice, Gboko)..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Browse Container */}
      <div className="container browse-content-layout">
        {/* Category Pills Navigation */}
        <div className="browse-category-pills-wrap">
          <CategoryPills
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => setSelectedCategory(catId)}
          />
        </div>

        {/* Filter Toolbar & Controls */}
        <div className="browse-toolbar">
          <div className="browse-toolbar-left">
            {/* Category Selector Dropdown */}
            <div className="filter-select-wrap">
              <label htmlFor="category-select" className="filter-label">Produce Category:</label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-select filter-select"
              >
                <option value="all" title="All Produce Categories">All Produce Categories</option>
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id} title={`Category: ${cat.name} (${cat.id})`}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* LGA Selector */}
            <div className="filter-select-wrap">
              <label htmlFor="lga-select" className="filter-label">Location / LGA:</label>
              <select
                id="lga-select"
                value={selectedLga}
                onChange={(e) => setSelectedLga(e.target.value)}
                className="form-select filter-select"
              >
                <option value="all" title="All Benue Locations">All Benue Locations</option>
                {BENUE_LGAS.filter(l => l.id !== 'all').map((lga) => (
                  <option key={lga.id} value={lga.name} title={`LGA: ${lga.name}`}>
                    {lga.name}
                  </option>
                ))}
              </select>
            </div>

            {/* In Stock Only Checkbox */}
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="filter-checkbox"
              />
              <span>In Stock Only</span>
            </label>
          </div>

          <div className="browse-toolbar-right">
            {/* Sort Selector */}
            <div className="filter-select-wrap">
              <label htmlFor="sort-select" className="filter-label">Sort by:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select filter-select"
              >
                <option value="newest" title="Sort by Newest Harvest">Newest Harvest</option>
                <option value="price-asc" title="Sort by Price: Low to High">Price: Low to High</option>
                <option value="price-desc" title="Sort by Price: High to Low">Price: High to Low</option>
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={handleResetFilters}
              >
                Reset ({activeFiltersCount})
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="active-filters-row">
            <span className="active-filters-title">Active Filters:</span>

            {selectedCategory !== 'all' && (
              <span className="active-filter-chip">
                Category: {CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory}
                <button type="button" onClick={() => setSelectedCategory('all')} aria-label="Remove category filter">
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedLga !== 'all' && (
              <span className="active-filter-chip">
                LGA: {selectedLga}
                <button type="button" onClick={() => setSelectedLga('all')} aria-label="Remove LGA filter">
                  <X size={12} />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="active-filter-chip">
                Search: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedSearch('');
                  }}
                  aria-label="Remove search query"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {inStockOnly && (
              <span className="active-filter-chip">
                In Stock Only
                <button type="button" onClick={() => setInStockOnly(false)} aria-label="Remove in-stock filter">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Results Header with Infinite Scroll Progress */}
        <div className="browse-results-count-bar">
          <div className="browse-results-count">
            {isLoadingInitial ? (
              <span>Loading verified Benue produce listings...</span>
            ) : totalCount > 0 ? (
              <span>
                Showing <strong>{displayCount}</strong> of <strong>{totalCount}</strong> agricultural listing{totalCount === 1 ? '' : 's'}
              </span>
            ) : (
              <span>No agricultural listings found</span>
            )}
          </div>

          {!isLoadingInitial && totalCount > PAGE_SIZE && (
            <div
              className="browse-progress-container"
              title={`${progressPercent}% of listings loaded`}
            >
              <div className="browse-progress-bar">
                <div
                  className="browse-progress-fill"
                  style={{
                    width: `${progressPercent}%`
                  }}
                />
              </div>
              <span className="browse-progress-text">
                {progressPercent}%
              </span>
            </div>
          )}
        </div>

        {/* Main Produce Content Area */}
        {isLoadingInitial ? (
          // Initial Loading State: 12 Product Skeletons
          <div className="grid-products">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <ProductCardSkeleton key={`init-skeleton-${index}`} />
            ))}
          </div>
        ) : produceList.length > 0 ? (
          // Products Display Grid
          <>
            <div className="grid-products">
              {produceList.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSaved={savedProductIds.has(product.id)}
                  onToggleSave={onToggleSave}
                  onViewDetails={onViewProduct}
                />
              ))}

              {/* Shimmer skeleton placeholders during subsequent infinite batch loading */}
              {isLoadingMore && (
                <>
                  <ProductCardSkeleton key="skel-more-1" />
                  <ProductCardSkeleton key="skel-more-2" />
                  <ProductCardSkeleton key="skel-more-3" />
                  <ProductCardSkeleton key="skel-more-4" />
                </>
              )}
            </div>

            {/* Invisible IntersectionObserver Sentinel Element */}
            {hasMore && !error && (
              <div
                ref={sentinelRef}
                className="infinite-scroll-sentinel"
                aria-hidden="true"
              />
            )}

            {/* Unobtrusive Active Loading Status Indicator */}
            {isLoadingMore && (
              <div className="infinite-scroll-loading-indicator" role="status" aria-live="polite">
                <Loader2 size={20} className="spinner-icon animate-spin" />
                <span>Loading more fresh harvests from Benue farmers...</span>
              </div>
            )}

            {/* Network / Fetch Error State with Retry Button */}
            {error && (
              <div className="infinite-scroll-error" role="alert">
                <AlertCircle size={20} />
                <span>{error}</span>
                <Button
                  variant="outline-primary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={handleRetry}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* End of catalog milestone */}
            {!hasMore && !isLoadingMore && produceList.length > 0 && (
              <div className="infinite-scroll-end">
                <div className="infinite-scroll-end-badge">
                  <Sprout size={24} />
                </div>
                <h4 className="infinite-scroll-end-title">You've reached the end of the harvest listings</h4>
                <p className="infinite-scroll-end-desc">
                  You have viewed all {displayCount} verified produce listings currently available matching your selection across Benue State.
                </p>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="btn-back-to-top"
                  aria-label="Scroll back to top of produce listings"
                >
                  <ArrowUp size={16} />
                  <span>Back to Top</span>
                </button>
              </div>
            )}
          </>
        ) : error ? (
          // Error State when no products could be loaded
          <div className="empty-state-card">
            <div className="empty-state-icon-wrap" style={{ color: '#ef4444' }}>
              <AlertCircle size={48} />
            </div>
            <h3 className="empty-state-title">Unable to load produce listings</h3>
            <p className="empty-state-desc">
              {error}
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="primary"
                icon={RefreshCw}
                onClick={handleRetry}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                icon={RotateCcw}
                onClick={handleResetFilters}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        ) : (
          // Empty state: No matching produce listings
          <div className="empty-state-card">
            <div className="empty-state-icon-wrap">
              <PackageSearch size={48} />
            </div>
            <h3 className="empty-state-title">No produce matches your filters</h3>
            <p className="empty-state-desc">
              We couldn't find any agricultural listings matching your current selection. Try changing the category or clearing search keywords.
            </p>
            <Button
              variant="primary"
              icon={RotateCcw}
              onClick={handleResetFilters}
            >
              Reset All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
