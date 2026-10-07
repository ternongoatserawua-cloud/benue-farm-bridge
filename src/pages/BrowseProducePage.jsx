import React, { useState, useMemo } from 'react';
import {
  Filter,
  SlidersHorizontal,
  RotateCcw,
  PackageSearch,
  Check,
  ChevronDown,
  X
} from 'lucide-react';
import ProductCard from '../components/marketplace/ProductCard.jsx';
import SearchBar from '../components/marketplace/SearchBar.jsx';
import CategoryPills from '../components/marketplace/CategoryPills.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';

import { CATEGORIES, normalizeCategory } from '../data/categories.js';
import { BENUE_LGAS } from '../data/locations.js';

export default function BrowseProducePage({
  products = [],
  savedProductIds = new Set(),
  onToggleSave = () => {},
  onViewProduct = () => {},
  initialFilters = {}
}) {
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category || 'all');
  const [selectedLga, setSelectedLga] = useState(initialFilters.lga || 'all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price-asc' | 'price-desc'
  const [inStockOnly, setInStockOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLga('all');
    setSortBy('newest');
    setInStockOnly(false);
  };

  // Active filters count
  const activeFiltersCount = (selectedCategory !== 'all' ? 1 : 0) +
    (selectedLga !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  // Filter and sort products (strictly approved items only)
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Must be approved for storefront display
      if ((prod.status || 'approved') !== 'approved') return false;

      // Category filter
      if (selectedCategory !== 'all' && normalizeCategory(prod.category) !== normalizeCategory(selectedCategory)) {
        return false;
      }

      // LGA filter
      if (selectedLga !== 'all') {
        const prodLga = (prod.lga || '').toLowerCase();
        const prodLoc = (prod.location || '').toLowerCase();
        const targetLga = selectedLga.toLowerCase();
        if (!prodLga.includes(targetLga) && !prodLoc.includes(targetLga)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(q);
        const matchesLoc = (prod.location || '').toLowerCase().includes(q);
        const matchesSeller = (prod.seller || '').toLowerCase().includes(q);
        const matchesDesc = (prod.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesLoc && !matchesSeller && !matchesDesc) {
          return false;
        }
      }

      // In Stock filter
      if (inStockOnly && !prod.available) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0; // default newest / original order
    });
  }, [products, selectedCategory, selectedLga, searchQuery, inStockOnly, sortBy]);

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
                onSearch={() => {}}
                onClear={() => setSearchQuery('')}
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
            {/* Category Selector Dropdown matching List Produce Page */}
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
                <button type="button" onClick={() => setSearchQuery('')} aria-label="Remove search query">
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

        {/* Results Header */}
        <div className="browse-results-count">
          <span>Showing <strong>{filteredProducts.length}</strong> agricultural listing{filteredProducts.length === 1 ? '' : 's'}</span>
        </div>

        {/* Product Grid / Empty State */}
        {filteredProducts.length > 0 ? (
          <div className="grid-products">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSaved={savedProductIds.has(product.id)}
                onToggleSave={onToggleSave}
                onViewDetails={onViewProduct}
              />
            ))}
          </div>
        ) : (
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
