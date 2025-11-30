-- ========================================
-- CAFECOMPASS USER FEATURES DATABASE SCHEMA
-- Step-by-step setup for user profiles, favorites, and notes
-- ========================================

-- STEP 1: Enable necessary extensions (if not already enabled)
-- These are usually enabled by default in Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 2: Create user_profiles table
-- This stores additional user information beyond what auth.users provides
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Create user_favorites table
-- This stores which cafes users have favorited
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cafe_id UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only favorite a cafe once
    UNIQUE(user_id, cafe_id)
);

-- STEP 4: Create user_notes table
-- This stores personal notes users write about cafes
CREATE TABLE IF NOT EXISTS public.user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cafe_id UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
    title TEXT,
    note TEXT NOT NULL,
    is_private BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    visit_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_cafe_id ON public.user_favorites(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON public.user_favorites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON public.user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_cafe_id ON public.user_notes(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_created_at ON public.user_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_updated_at ON public.user_notes(updated_at DESC);

-- STEP 6: Enable Row Level Security (RLS)
-- This ensures users can only access their own data
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create RLS policies for user_profiles
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = id);

-- STEP 8: Create RLS policies for user_favorites
-- Users can manage their own favorites
CREATE POLICY "Users can view own favorites" 
ON public.user_favorites FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" 
ON public.user_favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" 
ON public.user_favorites FOR DELETE 
USING (auth.uid() = user_id);

-- STEP 9: Create RLS policies for user_notes
-- Users can manage their own notes
CREATE POLICY "Users can view own notes" 
ON public.user_notes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" 
ON public.user_notes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" 
ON public.user_notes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" 
ON public.user_notes FOR DELETE 
USING (auth.uid() = user_id);

-- STEP 10: Create function to handle automatic profile creation
-- This runs when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 11: Create trigger for automatic profile creation
-- This trigger fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 12: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 13: Create triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notes_updated_at
    BEFORE UPDATE ON public.user_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 14: Grant permissions to authenticated users
-- Allow authenticated users to access these tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_notes TO authenticated;

-- STEP 15: Create helpful views (optional but useful)
-- View to get user favorites with cafe information
CREATE OR REPLACE VIEW public.user_favorites_with_cafes AS
SELECT 
    uf.*,
    c.name as cafe_name,
    c.address as cafe_address,
    c.work_score,
    c.image_url as cafe_image_url
FROM public.user_favorites uf
JOIN public.cafes c ON uf.cafe_id = c.id;

-- View to get user notes with cafe information
CREATE OR REPLACE VIEW public.user_notes_with_cafes AS
SELECT 
    un.*,
    c.name as cafe_name,
    c.address as cafe_address
FROM public.user_notes un
JOIN public.cafes c ON un.cafe_id = c.id;

-- STEP 16: Create useful functions for common operations

-- Function to check if a user has favorited a cafe
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_favorites 
        WHERE user_id = user_uuid AND cafe_id = cafe_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's favorite count
CREATE OR REPLACE FUNCTION public.get_user_favorite_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM public.user_favorites 
        WHERE user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's note count
CREATE OR REPLACE FUNCTION public.get_user_note_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM public.user_notes 
        WHERE user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VERIFICATION QUERIES
-- Run these to verify everything is working
-- ========================================

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'user_favorites', 'user_notes');

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_favorites', 'user_notes');

-- Check if policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_favorites', 'user_notes');

-- Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
AND event_object_table IN ('user_profiles', 'user_notes') 
OR trigger_name = 'on_auth_user_created';


--- 