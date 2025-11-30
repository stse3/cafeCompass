-- =====================================================
-- CAFE COMPASS SCHEMA (with AI scoring)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- TABLE 1: CAFES
-- =====================================================
CREATE TABLE cafes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT DEFAULT 'Toronto',
  google_place_id TEXT UNIQUE,
  google_maps_url TEXT,
  opening_hours JSONB,  -- Store hours as JSON: {"monday": "7:00-18:00", "tuesday": "7:00-18:00", ...}
  image_url TEXT,       -- Cafe photo URL
  google_rating DECIMAL(2,1),  -- Google's overall rating (1-5)
  google_review_count INTEGER, -- Total number of Google reviews
  google_reviews JSONB,        -- Store recent Google reviews as JSON
  -- Location (for map)
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  
  -- Work scores (0-10, calculated by AI from reviews)
  work_score DECIMAL(3, 1),
  wifi_quality DECIMAL(3, 1),
  noise_level DECIMAL(3, 1),
  
  -- AI-generated summary
  summary TEXT,
  
  -- Tracking
  review_count INTEGER DEFAULT 0,
  last_scraped_at TIMESTAMP,          -- When we scraped reviews
  last_analyzed_at TIMESTAMP,         -- When AI analyzed them
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLE 2: REVIEWS (with AI analysis flags)
-- =====================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  
  -- Review data from Outscraper
  author TEXT,
  rating INTEGER,
  text TEXT,
  date TIMESTAMP,
  google_review_id TEXT UNIQUE,       -- Prevent duplicates
  
  -- AI analysis flags (set by Gemini)
  is_work_related BOOLEAN DEFAULT FALSE,
  mentions_wifi BOOLEAN DEFAULT FALSE,
  mentions_noise BOOLEAN DEFAULT FALSE,
  analyzed_at TIMESTAMP,               -- NULL = not analyzed yet
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- AUTO-GENERATE LOCATION
-- =====================================================
CREATE OR REPLACE FUNCTION set_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON cafes
  FOR EACH ROW
  EXECUTE FUNCTION set_location();

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_cafes_location ON cafes USING GIST (location);
CREATE INDEX idx_cafes_city ON cafes (city);
CREATE INDEX idx_cafes_work_score ON cafes (work_score DESC) WHERE work_score IS NOT NULL;
CREATE INDEX idx_reviews_cafe ON reviews (cafe_id);
CREATE INDEX idx_reviews_work_related ON reviews (cafe_id, is_work_related) WHERE is_work_related = TRUE;

-- =====================================================
-- HELPER QUERIES
-- =====================================================

-- Get cafes needing analysis (have reviews but no scores)
COMMENT ON COLUMN cafes.last_analyzed_at IS 'When AI last analyzed reviews for this cafe';

-- Get unanalyzed reviews
COMMENT ON COLUMN reviews.analyzed_at IS 'When this review was analyzed by AI. NULL = needs analysis';

