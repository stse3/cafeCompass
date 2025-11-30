// Authentication context for CafeCompass
import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { authService, profileService, type UserProfile, type AuthState } from '../services/auth';

interface AuthContextType extends AuthState {
  profile: UserProfile | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Get initial session with timeout
    const initAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        const session = await Promise.race([
          authService.getCurrentSession(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth timeout')), 5000)
          )
        ]);
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Load profile but don't wait for it to finish loading
          loadUserProfile(session.user.id).catch(console.error);
        }
        
        console.log('✅ Auth initialized successfully');
        setLoading(false);
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        if (isMounted) {
          setLoading(false);
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth event:', event, session?.user?.email || 'no user');
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          loadUserProfile(session.user.id).catch(console.error);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('👤 Loading user profile for:', userId);
      
      // Add timeout for profile loading
      const userProfile = await Promise.race([
        profileService.getUserProfile(userId),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Profile load timeout')), 3000)
        )
      ]);
      
      console.log('✅ Profile loaded:', userProfile?.display_name || userProfile?.email || 'unknown');
      setProfile(userProfile);
    } catch (error) {
      console.warn('⚠️ Could not load user profile (continuing without it):', error);
      // Don't set profile, but don't fail the auth process
      setProfile(null);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('🔐 Initiating Google sign-in...');
      const result = await authService.signInWithGoogle();
      
      console.log('✅ Sign-in initiated successfully:', result);
      // Note: Don't set loading to false here - the OAuth redirect will handle the flow
      // The page will redirect to Google, then back to our callback
    } catch (error) {
      console.error('❌ Error signing in with Google:', error);
      setLoading(false); // Only set loading to false on error
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Immediately clear local state for instant UI feedback
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Don't set loading to true - keep UI responsive
      // The auth state change listener will handle the rest
      await authService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if sign out fails, keep user logged out locally
      // They can refresh to get back to a clean state
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const updatedProfile = await profileService.updateUserProfile(user.id, updates);
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;