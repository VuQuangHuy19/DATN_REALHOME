'use client';

import { useState, useEffect, useCallback } from 'react';

const FAVORITES_KEY = 'realhome_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.error('Failed to load favorites', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
    
    // Custom event listener for cross-component sync
    const handleStorageChange = () => loadFavorites();
    window.addEventListener('favorites-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('favorites-updated', handleStorageChange);
    };
  }, [loadFavorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
        // Dispatch custom event to notify other instances of this hook
        window.dispatchEvent(new Event('favorites-updated'));
      } catch (e) {
        console.error('Failed to save favorites', e);
      }
      
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        try {
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
          window.dispatchEvent(new Event('favorites-updated'));
        } catch (e) {
          console.error('Failed to save favorites', e);
        }
      }
      return next;
    });
  }, []);

  return {
    favorites,
    loading,
    toggleFavorite,
    removeFavorite,
    isFavorite: (id: string) => favorites.has(id)
  };
}
