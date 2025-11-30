// Context for managing user favorites
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { favoritesApi, type Cafe } from '../services/api';

interface FavoritesContextType {
  favorites: Set<string>; // Set of cafe IDs
  favoriteCafes: Cafe[]; // Full cafe objects
  loading: boolean;
  isLoading: boolean;
  isFavorited: (cafeId: string) => boolean;
  toggleFavorite: (cafeId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteCafes, setFavoriteCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's favorites when user changes
  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setFavorites(new Set());
      setFavoriteCafes([]);
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load favorite cafe IDs for quick lookup
      const favoriteIds = new Set<string>();
      const cafes = await favoritesApi.getUserFavorites(user.id);
      
      cafes.forEach(cafe => favoriteIds.add(cafe.id));
      
      setFavorites(favoriteIds);
      setFavoriteCafes(cafes);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFavorited = (cafeId: string): boolean => {
    return favorites.has(cafeId);
  };

  const toggleFavorite = async (cafeId: string) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const newIsFavorited = await favoritesApi.toggleFavorite(user.id, cafeId);
      
      // Update favorites set
      const newFavorites = new Set(favorites);
      if (newIsFavorited) {
        newFavorites.add(cafeId);
      } else {
        newFavorites.delete(cafeId);
        // Remove from favorite cafes list
        setFavoriteCafes(prev => prev.filter(cafe => cafe.id !== cafeId));
      }
      setFavorites(newFavorites);
      
      // If we added a favorite, refresh the full list to get the cafe details
      if (newIsFavorited) {
        await loadFavorites();
      }
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFavorites = async () => {
    await loadFavorites();
  };

  const value: FavoritesContextType = {
    favorites,
    favoriteCafes,
    loading,
    isLoading,
    isFavorited,
    toggleFavorite,
    refreshFavorites
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}