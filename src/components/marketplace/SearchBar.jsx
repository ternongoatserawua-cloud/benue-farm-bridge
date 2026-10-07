import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({
  value = '',
  onChange = () => {},
  onSearch = () => {},
  onClear = () => {},
  placeholder = 'Search for yam, rice, maize, soybeans...',
  className = ''
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(value);
  };

  const handleClear = () => {
    onChange('');
    onClear();
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`search-bar-root ${className}`.trim()}
    >
      <div className="search-bar-inner">
        <Search size={18} className="search-bar-icon" aria-hidden="true" />
        
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="search-bar-input"
          aria-label="Search Benue agricultural produce"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="search-bar-clear-btn"
            aria-label="Clear search input"
          >
            <X size={16} />
          </button>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-sm search-bar-submit-btn"
          aria-label="Submit search"
        >
          Search
        </button>
      </div>
    </form>
  );
}
