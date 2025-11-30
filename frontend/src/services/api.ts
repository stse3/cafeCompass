// frontend/src/services/api.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_PUBLIC_SUPABASE_KEY;

console.log('🔧 Frontend Environment Check:');
console.log(`   supabaseUrl: ${supabaseUrl ? '✅ Loaded' : '❌ Missing'}`);
console.log(`   VITE_PUBLIC_SUPABASE_KEY: ${supabaseKey ? '✅ Loaded' : '❌ Missing'}`);
if (supabaseKey) console.log(`   Key starts with: ${supabaseKey.substring(0, 20)}...`);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types
export interface Cafe {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  work_score: number | null;
  wifi_quality: number | null;
  noise_level: number | null;
  summary: string | null;
  review_count: number | null;
  google_place_id: string;
  google_maps_url: string | null;
  google_rating: number | null;
  opening_hours: Record<string, string> | null;
  image_url: string | null;
  last_updated: string;
}

// Helper function to transform raw cafe data to match our interface
function transformCafeData(rawCafe: any): Cafe {
  return {
    id: rawCafe.id,
    name: rawCafe.name,
    address: rawCafe.address,
    city: rawCafe.city,
    latitude: typeof rawCafe.latitude === 'string' ? parseFloat(rawCafe.latitude) : rawCafe.latitude,
    longitude: typeof rawCafe.longitude === 'string' ? parseFloat(rawCafe.longitude) : rawCafe.longitude,
    work_score: typeof rawCafe.work_score === 'string' ? parseFloat(rawCafe.work_score) : rawCafe.work_score,
    wifi_quality: typeof rawCafe.wifi_quality === 'string' ? parseFloat(rawCafe.wifi_quality) : rawCafe.wifi_quality,
    noise_level: typeof rawCafe.noise_level === 'string' ? parseFloat(rawCafe.noise_level) : rawCafe.noise_level,
    summary: rawCafe.summary,
    review_count: rawCafe.review_count,
    google_place_id: rawCafe.google_place_id,
    google_maps_url: rawCafe.google_maps_url,
    google_rating: typeof rawCafe.google_rating === 'string' ? parseFloat(rawCafe.google_rating) : rawCafe.google_rating,
    opening_hours: typeof rawCafe.opening_hours === 'string' 
      ? JSON.parse(rawCafe.opening_hours) 
      : rawCafe.opening_hours,
    image_url: rawCafe.image_url,
    last_updated: rawCafe.last_updated || rawCafe.created_at
  };
}

// API Functions
export const cafeApi = {
  // Get all cafes
  async getAllCafes(): Promise<Cafe[]> {
    const { data, error } = await supabase
      .from('cafes')
      .select('*')
      .order('work_score', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching cafes:', error);
      throw error;
    }

    return (data || []).map(transformCafeData);
  },

  // Get cafes by city
  async getCafesByCity(city: string): Promise<Cafe[]> {
    const { data, error } = await supabase
      .from('cafes')
      .select('*')
      .eq('city', city)
      .order('work_score', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data || []).map(transformCafeData);
  },

  // Get single cafe
  async getCafeById(id: string): Promise<Cafe | null> {
    const { data, error } = await supabase
      .from('cafes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? transformCafeData(data) : null;
  },

  // Get cafes within bounds (for map viewport)
  async getCafesInBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  ): Promise<Cafe[]> {
    const { data, error } = await supabase
      .from('cafes')
      .select('*')
      .gte('latitude', minLat)
      .lte('latitude', maxLat)
      .gte('longitude', minLng)
      .lte('longitude', maxLng);

    if (error) throw error;
    return (data || []).map(transformCafeData);
  },

  // Search cafes by name
  async searchCafes(query: string): Promise<Cafe[]> {
    const { data, error } = await supabase
      .from('cafes')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('work_score', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data || []).map(transformCafeData);
  },
};

// User Favorites API
export const favoritesApi = {
  // Get user's favorite cafes
  async getUserFavorites(userId: string): Promise<Cafe[]> {
    const { data, error } = await supabase
      .from('user_favorites')
      .select(`
        cafe_id,
        created_at,
        cafes (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform the joined data to match Cafe interface
    return (data || [])
      .filter(favorite => favorite.cafes) // Filter out any null cafes
      .map(favorite => transformCafeData(favorite.cafes));
  },

  // Check if a cafe is favorited by user
  async isCafeFavorited(userId: string, cafeId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('cafe_id', cafeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return !!data;
  },

  // Add cafe to favorites
  async addFavorite(userId: string, cafeId: string): Promise<void> {
    const { error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: userId,
        cafe_id: cafeId
      });

    if (error) throw error;
  },

  // Remove cafe from favorites
  async removeFavorite(userId: string, cafeId: string): Promise<void> {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('cafe_id', cafeId);

    if (error) throw error;
  },

  // Toggle favorite status
  async toggleFavorite(userId: string, cafeId: string): Promise<boolean> {
    const isFavorited = await this.isCafeFavorited(userId, cafeId);
    
    if (isFavorited) {
      await this.removeFavorite(userId, cafeId);
      return false;
    } else {
      await this.addFavorite(userId, cafeId);
      return true;
    }
  }
};