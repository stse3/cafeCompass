-- =====================================================
-- CAFE COMPASS DATABASE SCHEMA
-- =====================================================
-- Complete database setup for the Cafe Compass application
-- Includes tables, indexes, triggers, and RLS policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- 1. PROFILES TABLE (User accounts)
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  default_search_radius_km INTEGER DEFAULT 5 CHECK (default_search_radius_km > 0),
  favorite_cafe_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CAFES TABLE (THE MAIN TABLE)
-- =====================================================
CREATE TABLE cafes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location GEOGRAPHY(POINT, 4326), -- Auto-generated from lat/lng
  
  -- Google Integration
  google_place_id TEXT UNIQUE NOT NULL,
  google_maps_url TEXT,
  google_rating DECIMAL(2, 1) CHECK (google_rating >= 0 AND google_rating <= 5),
  google_review_count INTEGER DEFAULT 0,
  
  -- Review Tracking
  total_reviews_scraped INTEGER DEFAULT 0,
  work_reviews_count INTEGER DEFAULT 0,
  last_review_scraped_at TIMESTAMP WITH TIME ZONE,
  last_ai_analysis_at TIMESTAMP WITH TIME ZONE,
  
  -- AI Analysis
  ai_confidence_score DECIMAL(3, 2) DEFAULT 0.00 CHECK (ai_confidence_score >= 0.00 AND ai_confidence_score <= 1.00),
  needs_ai_reanalysis BOOLEAN DEFAULT FALSE,
  
  -- Work Scores (Your competitive advantage!)
  wifi_speed TEXT CHECK (wifi_speed IN ('fast', 'adequate', 'slow')),
  outlet_rating INTEGER CHECK (outlet_rating >= 1 AND outlet_rating <= 5),
  noise_level TEXT CHECK (noise_level IN ('quiet', 'moderate', 'loud')),
  seating_rating INTEGER CHECK (seating_rating >= 1 AND seating_rating <= 5),
  laptop_policy TEXT CHECK (laptop_policy IN ('encouraged', 'allowed', 'discouraged')),
  good_for_calls BOOLEAN DEFAULT FALSE,
  good_for_focus BOOLEAN DEFAULT FALSE,
  remote_work_score INTEGER CHECK (remote_work_score >= 0 AND remote_work_score <= 10),
  
  -- AI-Generated Content
  work_summary TEXT, -- "Great for focus, loud at lunch"
  vibe_tags TEXT[] DEFAULT '{}', -- ["quiet", "productive", "cozy"]
  best_times_to_work JSONB, -- {"morning": true, "lunch": false}
  deal_breakers TEXT[] DEFAULT '{}', -- ["no_wifi", "too_loud"]
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_permanently_closed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CAFE_REVIEWS TABLE (Evidence for scores)
-- =====================================================
CREATE TABLE cafe_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  
  -- Review Data
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  review_date TIMESTAMP WITH TIME ZONE NOT NULL,
  source TEXT DEFAULT 'google' CHECK (source IN ('google', 'yelp', 'manual')),
  google_review_id TEXT,
  matched_keywords TEXT[] DEFAULT '{}', -- ["wifi", "work", "laptop"]
  
  -- AI Analysis Results
  is_work_related BOOLEAN DEFAULT FALSE,
  work_relevance_score DECIMAL(3, 2) DEFAULT 0.00 CHECK (work_relevance_score >= 0.00 AND work_relevance_score <= 1.00),
  extracted_attributes JSONB DEFAULT '{}', -- THE MAGIC FIELD! ✨
  sentiment_score DECIMAL(3, 2) DEFAULT 0.00 CHECK (sentiment_score >= -1.00 AND sentiment_score <= 1.00),
  
  -- Processing Status
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE, -- NULL = needs AI, has date = done
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate reviews
  UNIQUE(cafe_id, google_review_id),
  UNIQUE(cafe_id, author_name, review_date)
);

-- =====================================================
-- 4. AI_ANALYSIS_LOG TABLE (Audit trail)
-- =====================================================
CREATE TABLE ai_analysis_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  
  -- What Happened
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('work_score_calculation', 'vibe_extraction', 'initial_analysis', 'reanalysis')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  reviews_processed INTEGER DEFAULT 0,
  work_reviews_found INTEGER DEFAULT 0,
  
  -- AI Model Info
  ai_model TEXT NOT NULL, -- "gemini-1.5-flash", "gpt-4o-mini"
  ai_cost_usd DECIMAL(8, 4) DEFAULT 0.0000,
  processing_time_ms INTEGER DEFAULT 0,
  
  -- What Changed
  previous_work_score INTEGER,
  new_work_score INTEGER,
  score_change INTEGER,
  
  -- Results
  analysis_summary TEXT,
  confidence_score DECIMAL(3, 2) DEFAULT 0.00 CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES (Performance optimization)
-- =====================================================

-- Cafes indexes
CREATE INDEX cafes_location_idx ON cafes USING GIST (location);
CREATE INDEX cafes_city_idx ON cafes (city);
CREATE INDEX cafes_work_score_idx ON cafes (remote_work_score DESC);
CREATE INDEX cafes_wifi_idx ON cafes (wifi_speed);
CREATE INDEX cafes_google_place_id_idx ON cafes (google_place_id);
CREATE INDEX cafes_needs_reanalysis_idx ON cafes (needs_ai_reanalysis) WHERE needs_ai_reanalysis = TRUE;

-- Reviews indexes
CREATE INDEX cafe_reviews_cafe_id_idx ON cafe_reviews (cafe_id);
CREATE INDEX cafe_reviews_work_related_idx ON cafe_reviews (is_work_related) WHERE is_work_related = TRUE;
CREATE INDEX cafe_reviews_analyzed_idx ON cafe_reviews (analyzed_at) WHERE analyzed_at IS NULL;
CREATE INDEX cafe_reviews_sentiment_idx ON cafe_reviews (sentiment_score);

-- Analysis log indexes
CREATE INDEX ai_analysis_log_cafe_id_idx ON ai_analysis_log (cafe_id);
CREATE INDEX ai_analysis_log_status_idx ON ai_analysis_log (status);
CREATE INDEX ai_analysis_log_created_idx ON ai_analysis_log (created_at DESC);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- 1. Auto-Generate Location from Coordinates
CREATE OR REPLACE FUNCTION generate_location_from_coords()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cafes_location_trigger
  BEFORE INSERT OR UPDATE OF latitude, longitude ON cafes
  FOR EACH ROW
  EXECUTE FUNCTION generate_location_from_coords();

-- 2. Auto-Update Timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cafes_updated_at
  BEFORE UPDATE ON cafes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 3. Auto-Mark for Reanalysis when new reviews added
CREATE OR REPLACE FUNCTION mark_cafe_for_reanalysis()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cafes 
  SET needs_ai_reanalysis = TRUE,
      total_reviews_scraped = total_reviews_scraped + 1
  WHERE id = NEW.cafe_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cafe_reviews_reanalysis_trigger
  AFTER INSERT ON cafe_reviews
  FOR EACH ROW
  EXECUTE FUNCTION mark_cafe_for_reanalysis();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to increment cafe review count (used by backend)
CREATE OR REPLACE FUNCTION increment_cafe_review_count(cafe_id UUID, increment_by INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE cafes 
  SET total_reviews_scraped = total_reviews_scraped + increment_by,
      last_review_scraped_at = NOW()
  WHERE id = cafe_id;
END;
$$ LANGUAGE plpgsql;

-- Function to find cafes needing analysis
CREATE OR REPLACE FUNCTION get_cafes_needing_analysis(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name TEXT,
  total_reviews_scraped INTEGER,
  work_reviews_count INTEGER,
  last_ai_analysis_at TIMESTAMP WITH TIME ZONE,
  needs_ai_reanalysis BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.total_reviews_scraped, c.work_reviews_count, 
         c.last_ai_analysis_at, c.needs_ai_reanalysis
  FROM cafes c
  WHERE c.needs_ai_reanalysis = TRUE
  ORDER BY c.last_review_scraped_at ASC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get work-related reviews for a cafe
CREATE OR REPLACE FUNCTION get_work_reviews_for_cafe(target_cafe_id UUID)
RETURNS TABLE (
  id UUID,
  review_text TEXT,
  rating INTEGER,
  sentiment_score DECIMAL,
  extracted_attributes JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT cr.id, cr.review_text, cr.rating, cr.sentiment_score, cr.extracted_attributes
  FROM cafe_reviews cr
  WHERE cr.cafe_id = target_cafe_id 
    AND cr.is_work_related = TRUE
    AND cr.analyzed_at IS NOT NULL
  ORDER BY cr.review_date DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_log ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Cafes: Anyone can read, only authenticated users can create
CREATE POLICY "Anyone can view cafes" ON cafes FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can create cafes" ON cafes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Creators can update their cafes" ON cafes FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Reviews: Anyone can read, only authenticated users can create
CREATE POLICY "Anyone can view reviews" ON cafe_reviews FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can create reviews" ON cafe_reviews FOR INSERT TO authenticated WITH CHECK (true);

-- Analysis Log: Only authenticated users can read
CREATE POLICY "Authenticated users can view analysis log" ON ai_analysis_log FOR SELECT TO authenticated USING (true);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert a sample profile (you'll need to replace with actual auth user ID)
-- INSERT INTO profiles (id, username, email) VALUES 
-- ('123e4567-e89b-12d3-a456-426614174000', 'testuser', 'test@example.com');

-- Insert sample cafes
INSERT INTO cafes (
  name, address, city, latitude, longitude, google_place_id,
  wifi_speed, outlet_rating, noise_level, seating_rating, laptop_policy,
  good_for_calls, good_for_focus, remote_work_score, vibe_tags,
  is_verified, needs_ai_reanalysis
) VALUES 
(
  'Code & Coffee', '123 Queen St W, Toronto, ON', 'Toronto',
  43.6511, -79.3831, 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  'fast', 5, 'quiet', 4, 'encouraged',
  false, true, 9, ARRAY['quiet', 'productive', 'laptop-friendly'],
  true, false
),
(
  'The Grind Cafe', '456 King St E, Toronto, ON', 'Toronto',
  43.6506, -79.3676, 'ChIJA1B2C3D4E5F6G7H8I9J0K1L2',
  'adequate', 3, 'moderate', 3, 'allowed',
  true, false, 6, ARRAY['social', 'casual'],
  false, false
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that location is auto-generated
-- SELECT name, latitude, longitude, ST_AsText(location) as location_wkt FROM cafes LIMIT 2;

-- Check indexes
-- SELECT schemaname, tablename, indexname FROM pg_indexes WHERE tablename IN ('cafes', 'cafe_reviews', 'ai_analysis_log');

-- Test the reanalysis function
-- SELECT * FROM get_cafes_needing_analysis(5);

COMMENT ON TABLE cafes IS 'Main table storing cafe information with work-focused attributes and AI-generated insights';
COMMENT ON TABLE cafe_reviews IS 'Individual reviews scraped from Google Maps with AI analysis results';
COMMENT ON TABLE ai_analysis_log IS 'Audit trail of all AI analysis runs for monitoring and debugging';
COMMENT ON TABLE profiles IS 'User profiles and preferences';

COMMENT ON COLUMN cafes.remote_work_score IS 'The main score (0-10) indicating how suitable the cafe is for remote work';
COMMENT ON COLUMN cafe_reviews.extracted_attributes IS 'JSONB field containing structured AI analysis of the review (wifi quality, noise level, etc.)';
COMMENT ON COLUMN cafes.location IS 'PostGIS geography point auto-generated from latitude/longitude for spatial queries';

-- =====================================================
-- END OF SCHEMA
-- =====================================================