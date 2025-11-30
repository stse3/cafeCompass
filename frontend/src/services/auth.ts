// Authentication service for CafeCompass
import { type User, type Session } from '@supabase/supabase-js';
import { supabase } from './api'; // Use existing supabase client

// Types
export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  cafe_id: string;
  created_at: string;
}

export interface UserNote {
  id: string;
  user_id: string;
  cafe_id: string;
  note: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// Authentication functions
export const authService = {
  // Sign in with Google
  async signInWithGoogle() {
    console.log('🔐 Starting Google OAuth with redirect:', `${window.location.origin}/auth/callback`);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) {
      console.error('❌ OAuth initiation failed:', error);
      throw error;
    }
    
    console.log('✅ OAuth initiated, redirecting to:', data.url);
    return data;
  },

  // Sign out
  async signOut() {
    try {
      // Simple local sign out with timeout
      const signOutPromise = supabase.auth.signOut();
      
      // Race against a 3-second timeout
      await Promise.race([
        signOutPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign out timeout')), 3000)
        )
      ]);
    } catch (error) {
      console.warn('Sign out timed out or failed, clearing local session:', error);
      // Clear local storage manually as fallback
      localStorage.removeItem('sb-vquspxpfyjxjdeodbiki-auth-token');
      sessionStorage.removeItem('sb-vquspxpfyjxjdeodbiki-auth-token');
    }
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Get current session
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// User profile functions
export const profileService = {
  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data;
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Favorites functions
export const favoritesService = {
  // Get user's favorites
  async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    const { data, error } = await supabase
      .from('user_favorites')
      .select(`
        *,
        cafes (
          id,
          name,
          address,
          work_score,
          image_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add cafe to favorites
  async addToFavorites(userId: string, cafeId: string): Promise<UserFavorite> {
    const { data, error } = await supabase
      .from('user_favorites')
      .insert({ user_id: userId, cafe_id: cafeId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Remove cafe from favorites
  async removeFromFavorites(userId: string, cafeId: string): Promise<void> {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('cafe_id', cafeId);

    if (error) throw error;
  },

  // Check if cafe is favorited
  async isCafeFavorited(userId: string, cafeId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('cafe_id', cafeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },
};

// Notes functions
export const notesService = {
  // Get user's notes for a cafe
  async getCafeNotes(userId: string, cafeId: string): Promise<UserNote[]> {
    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('cafe_id', cafeId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all user's notes
  async getUserNotes(userId: string): Promise<UserNote[]> {
    const { data, error } = await supabase
      .from('user_notes')
      .select(`
        *,
        cafes (
          id,
          name,
          address
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add or update note
  async saveNote(
    userId: string,
    cafeId: string,
    note: string,
    isPrivate: boolean = true,
    noteId?: string
  ): Promise<UserNote> {
    if (noteId) {
      // Update existing note
      const { data, error } = await supabase
        .from('user_notes')
        .update({ note, is_private: isPrivate })
        .eq('id', noteId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new note
      const { data, error } = await supabase
        .from('user_notes')
        .insert({
          user_id: userId,
          cafe_id: cafeId,
          note,
          is_private: isPrivate,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // Delete note
  async deleteNote(userId: string, noteId: string): Promise<void> {
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};