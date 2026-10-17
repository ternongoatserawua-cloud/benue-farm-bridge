import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useInfiniteScroll
 * High-performance, accessible infinite scroll hook with IntersectionObserver.
 * Supports both modern async sentinel observer pattern (with automatic trigger,
 * debounce guard, unmount cleanup) and legacy in-memory array slicing.
 *
 * Async Sentinel Mode:
 * @param {Object} config
 * @param {Function} config.onLoadMore - Callback to fetch the next batch
 * @param {boolean} config.hasMore - Whether more items are available to fetch
 * @param {boolean} config.isLoading - Whether a fetch is currently in progress
 * @param {string} [config.rootMargin='350px'] - Distance before viewport edge to trigger loading
 * @param {number} [config.threshold=0.1] - Intersection threshold
 * @param {boolean} [config.disabled=false] - Temporarily disable observer (e.g. during error)
 *
 * Legacy In-Memory Mode:
 * @param {Array} items - Full dataset to paginate locally
 * @param {Object} options - Pagination options { pageSize, initialBatch, loadDelay, rootMargin, threshold }
 */
export function useInfiniteScroll(param1 = {}, param2 = {}) {
  // ── Mode 1: Legacy In-Memory Array Slicing ───────────────────────────────
  if (Array.isArray(param1)) {
    const items = param1;
    const options = param2;
    const {
      pageSize = 8,
      initialBatch = 8,
      loadDelay = 350,
      rootMargin = '250px',
      threshold = 0.1
    } = options;

    const totalCount = items.length;
    const [displayCount, setDisplayCount] = useState(
      Math.min(initialBatch, totalCount)
    );
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const sentinelRef = useRef(null);
    const loadTimeoutRef = useRef(null);

    useEffect(() => {
      setDisplayCount(Math.min(initialBatch, items.length));
      setIsLoadingMore(false);
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    }, [items, initialBatch]);

    useEffect(() => {
      return () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      };
    }, []);

    const hasMore = displayCount < totalCount;

    const loadMore = useCallback(() => {
      if (isLoadingMore || displayCount >= totalCount) return;

      setIsLoadingMore(true);
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      loadTimeoutRef.current = setTimeout(() => {
        setDisplayCount((prev) => Math.min(prev + pageSize, totalCount));
        setIsLoadingMore(false);
        loadTimeoutRef.current = null;
      }, loadDelay);
    }, [isLoadingMore, displayCount, totalCount, pageSize, loadDelay]);

    const reset = useCallback(() => {
      setDisplayCount(Math.min(initialBatch, items.length));
      setIsLoadingMore(false);
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    }, [initialBatch, items.length]);

    useEffect(() => {
      const sentinelEl = sentinelRef.current;
      if (!sentinelEl || !hasMore || isLoadingMore) return;

      if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry && entry.isIntersecting && hasMore && !isLoadingMore) {
            loadMore();
          }
        },
        {
          root: null,
          rootMargin,
          threshold
        }
      );

      observer.observe(sentinelEl);

      return () => {
        observer.disconnect();
      };
    }, [hasMore, isLoadingMore, loadMore, rootMargin, threshold]);

    const visibleItems = items.slice(0, displayCount);

    return {
      visibleItems,
      displayCount: Math.min(displayCount, totalCount),
      totalCount,
      hasMore,
      isLoadingMore,
      loadMore,
      reset,
      sentinelRef
    };
  }

  // ── Mode 2: Modern Async Sentinel IntersectionObserver ───────────────────
  const {
    onLoadMore = () => {},
    hasMore = false,
    isLoading = false,
    rootMargin = '350px',
    threshold = 0.1,
    disabled = false
  } = param1 || {};

  const sentinelRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Sync ref with isLoading to reliably guard against duplicate triggers
  useEffect(() => {
    isFetchingRef.current = isLoading;
  }, [isLoading]);

  const handleObserverTrigger = useCallback(() => {
    if (disabled || !hasMore || isLoading || isFetchingRef.current) return;
    isFetchingRef.current = true;
    onLoadMore();
  }, [disabled, hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    const sentinelEl = sentinelRef.current;
    if (!sentinelEl || !hasMore || isLoading || disabled) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry &&
          entry.isIntersecting &&
          hasMore &&
          !isLoading &&
          !isFetchingRef.current &&
          !disabled
        ) {
          handleObserverTrigger();
        }
      },
      {
        root: null,
        rootMargin,
        threshold
      }
    );

    observer.observe(sentinelEl);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, disabled, handleObserverTrigger, rootMargin, threshold]);

  return {
    sentinelRef,
    triggerLoadMore: handleObserverTrigger
  };
}

export default useInfiniteScroll;
