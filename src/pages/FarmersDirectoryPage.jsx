import React, { useState, useMemo } from 'react';
import { Search, MapPin, Users, ShieldCheck, RotateCcw } from 'lucide-react';
import FarmerCard from '../components/marketplace/FarmerCard.jsx';
import SearchBar from '../components/marketplace/SearchBar.jsx';
import Button from '../components/common/Button.jsx';
import { BENUE_LGAS } from '../data/locations.js';

export default function FarmersDirectoryPage({
  farmers = [],
  onViewFarmer = () => {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLga, setSelectedLga] = useState('all');

  const filteredFarmers = useMemo(() => {
    return farmers.filter((farmer) => {
      // LGA Filter
      if (selectedLga !== 'all') {
        const farmerLga = (farmer.lga || '').toLowerCase();
        const farmerLoc = (farmer.location || '').toLowerCase();
        const target = selectedLga.toLowerCase();
        if (!farmerLga.includes(target) && !farmerLoc.includes(target)) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = farmer.name.toLowerCase().includes(q);
        const matchesLoc = farmer.location.toLowerCase().includes(q);
        const matchesProds = (farmer.products || []).some((p) => p.toLowerCase().includes(q));
        if (!matchesName && !matchesLoc && !matchesProds) {
          return false;
        }
      }

      return true;
    });
  }, [farmers, selectedLga, searchQuery]);

  return (
    <div className="farmers-directory-root">
      {/* Banner */}
      <section className="browse-header-banner">
        <div className="container">
          <div className="browse-header-content">
            <h1 className="browse-title">Benue State Farmers Directory</h1>
            <p className="browse-subtitle">
              Connect directly with verified local growers, aggregators, and commercial farms across all 23 Local Government Areas of Benue State.
            </p>

            <div className="browse-search-wrapper">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={() => {}}
                onClear={() => setSearchQuery('')}
                placeholder="Search farmers by farm name, LGA, or produce (e.g., Ter Farms, Gboko, Soybeans)..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Directory Content */}
      <div className="container directory-content-layout">
        {/* LGA Filter Pills */}
        <div className="directory-lga-bar">
          <span className="directory-lga-label">Filter by LGA:</span>
          <div className="directory-lga-scroll">
            <button
              type="button"
              className={`directory-lga-btn ${selectedLga === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedLga('all')}
            >
              All LGAs
            </button>
            {BENUE_LGAS.filter(l => l.id !== 'all').map((lga) => (
              <button
                key={lga.id}
                type="button"
                className={`directory-lga-btn ${selectedLga === lga.name ? 'active' : ''}`}
                onClick={() => setSelectedLga(lga.name)}
              >
                {lga.name}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Results count */}
        <div className="browse-results-count directory-count-row">
          <span>Showing <strong>{filteredFarmers.length}</strong> verified farmer{filteredFarmers.length === 1 ? '' : 's'}</span>
        </div>

        {/* Farmers Grid */}
        {filteredFarmers.length > 0 ? (
          <div className="grid-farmers">
            {filteredFarmers.map((farmer) => (
              <FarmerCard
                key={farmer.id}
                farmer={farmer}
                onViewProfile={onViewFarmer}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <Users size={40} className="empty-state-icon" />
            <h3 className="empty-state-title">No farmers found</h3>
            <p className="empty-state-desc">
              No registered farmers matched your search criteria. Try clearing filters or searching for another Benue LGA.
            </p>
            <Button
              variant="primary"
              icon={RotateCcw}
              onClick={() => {
                setSearchQuery('');
                setSelectedLga('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
