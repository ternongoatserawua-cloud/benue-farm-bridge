import React from 'react';
import {
  LayoutGrid,
  Layers,
  Wheat,
  CircleDot,
  Carrot,
  Apple,
  Beef,
  Egg,
  Fish,
  Package,
  Bird,
  Sprout,
  Wrench,
  ChevronDown
} from 'lucide-react';
import { CATEGORIES } from '../../data/categories.js';

const ICON_MAP = {
  LayoutGrid,
  Layers,
  Wheat,
  CircleDot,
  Carrot,
  Apple,
  Beef,
  Egg,
  Fish,
  Package,
  Bird,
  Sprout,
  Wrench
};

export default function CategoryPills({
  categories = CATEGORIES,
  selectedCategory = 'all',
  onSelectCategory = () => {}
}) {
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="category-pills-container" role="region" aria-label="Product Categories">
      <div className="category-pills-scroll">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const IconComponent = ICON_MAP[cat.icon] || Package;

          if (cat.id === 'all') {
            return (
              <div key="all-produce-dropdown-wrap" className="all-produce-dropdown-wrap">
                <button
                  type="button"
                  className={`category-pill-btn all-produce-pill-btn ${isSelected ? 'selected' : ''}`}
                  aria-pressed={isSelected}
                  title="Click or select category from dropdown"
                >
                  <span className="category-pill-icon">
                    <IconComponent size={16} aria-hidden="true" />
                  </span>
                  <span className="category-pill-name">
                    {selectedCategory !== 'all' && selectedCategoryObj
                      ? `Category: ${selectedCategoryObj.name}`
                      : 'All Produce'}
                  </span>
                  <ChevronDown size={14} className="all-produce-chevron" />
                </button>

                {/* Dropdown with all produce categories from List Produce page */}
                <select
                  value={selectedCategory}
                  onChange={(e) => onSelectCategory(e.target.value)}
                  className="all-produce-select-overlay"
                  aria-label="Select produce category"
                >
                  <option value="all" title="All Produce Categories">-- All Produce Categories --</option>
                  {categories.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id} title={`Category: ${c.name}`}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`category-pill-btn ${isSelected ? 'selected' : ''}`}
              aria-pressed={isSelected}
            >
              <span className="category-pill-icon">
                <IconComponent size={16} aria-hidden="true" />
              </span>
              <span className="category-pill-name">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
