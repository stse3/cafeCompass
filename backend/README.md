# Cafe Compass Backend

Backend services for scraping cafe data and reviews using Outscraper API.

## Setup

### 1. Environment Variables

Add your Outscraper API key to the `.ENV` file in the project root:

```bash
OUTSCRAPER_API_KEY=your_outscraper_api_key_here
```

Get your API key from: https://outscraper.com/

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Database Setup

Make sure your Supabase database has the following tables:

#### `cafes` table:
```sql
CREATE TABLE cafes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Work-focused amenities
  wifi_speed TEXT CHECK (wifi_speed IN ('fast', 'adequate', 'slow')),
  outlet_rating INTEGER CHECK (outlet_rating >= 1 AND outlet_rating <= 5),
  noise_level TEXT CHECK (noise_level IN ('quiet', 'moderate', 'loud')),
  seating_rating INTEGER CHECK (seating_rating >= 1 AND seating_rating <= 5),
  laptop_policy TEXT CHECK (laptop_policy IN ('encouraged', 'allowed', 'discouraged')),
  good_for_calls BOOLEAN DEFAULT FALSE,
  good_for_focus BOOLEAN DEFAULT FALSE,
  remote_work_score INTEGER CHECK (remote_work_score >= 0 AND remote_work_score <= 10),
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_permanently_closed BOOLEAN DEFAULT FALSE,
  needs_ai_reanalysis BOOLEAN DEFAULT FALSE,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `cafe_reviews` table:
```sql
CREATE TABLE cafe_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  google_place_id TEXT NOT NULL,
  
  -- Review data from Google
  author_name TEXT NOT NULL,
  author_url TEXT,
  language TEXT NOT NULL,
  profile_photo_url TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  relative_time_description TEXT NOT NULL,
  text TEXT NOT NULL,
  time BIGINT NOT NULL, -- Unix timestamp
  translated BOOLEAN DEFAULT FALSE,
  
  -- AI analysis fields (populated later)
  mentions_wifi BOOLEAN,
  mentions_outlets BOOLEAN,
  mentions_noise BOOLEAN,
  mentions_seating BOOLEAN,
  mentions_laptop_work BOOLEAN,
  work_sentiment TEXT CHECK (work_sentiment IN ('positive', 'negative', 'neutral')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(cafe_id, time, author_name) -- Prevent duplicate reviews
);
```

## Usage

### 1. Scrape Complete Cafe Information

To scrape a new cafe's complete information and reviews:

```bash
npm run scrape:cafe <GOOGLE_PLACE_ID> [CAFE_ID] [OPTIONS]
```

Examples:
```bash
# Scrape cafe with auto-generated ID
npm run scrape:cafe ChIJN1t_tDeuEmsRUsoyG83frY4

# Scrape cafe with specific ID
npm run scrape:cafe ChIJN1t_tDeuEmsRUsoyG83frY4 my-cafe-001

# Scrape cafe info only (no reviews)
npm run scrape:cafe ChIJN1t_tDeuEmsRUsoyG83frY4 --no-reviews

# Limit number of reviews
npm run scrape:cafe ChIJN1t_tDeuEmsRUsoyG83frY4 --reviews-limit=50
```

### 2. Scrape Reviews for Existing Cafe

If you already have a cafe in your database and want to scrape additional reviews:

```bash
npm run scrape:reviews <GOOGLE_PLACE_ID> <CAFE_ID> [REVIEW_LIMIT]
```

Example:
```bash
npm run scrape:reviews ChIJN1t_tDeuEmsRUsoyG83frY4 cafe-001 100
```

### 3. AI Analysis of Reviews

After scraping reviews, run AI analysis to calculate work scores:

```bash
npm run analyze:cafes [LIMIT]
```

Examples:
```bash
# Analyze up to 5 cafes needing analysis
npm run analyze:cafes

# Analyze up to 10 cafes
npm run analyze:cafes 10
```

## Finding Google Place IDs

### Method 1: Google Maps URL
1. Go to Google Maps
2. Search for the cafe
3. Look at the URL for a pattern like: `!1s0x[...]!8m2!3d[lat]!4d[lng]`
4. The Place ID is often in the data parameter

### Method 2: Google Places API
Use the Google Places API to search for places and get their Place IDs.

### Method 3: Online Tools
Use online Place ID finder tools by searching for "Google Place ID finder"

## Complete Data Flow

### 1. Data Scraping
**Command**: `scrape:cafe` or `scrape:reviews`
- Fetches cafe info and reviews from Google Maps via Outscraper API
- Stores raw data in `cafes` and `cafe_reviews` tables
- Automatically marks cafe with `needs_ai_reanalysis = true`
- Triggers database functions to update review counts

### 2. AI Analysis
**Command**: `analyze:cafes`
- Finds cafes marked for reanalysis (`needs_ai_reanalysis = true`)
- Analyzes each review for work-related content using AI
- Extracts structured attributes (WiFi quality, noise level, etc.)
- Calculates sentiment scores and work relevance
- Updates `cafe_reviews` table with analysis results

### 3. Score Calculation
**Automatic during AI analysis**
- Aggregates individual review analyses
- Calculates overall work scores (0-10 scale)
- Determines categorical ratings (fast/adequate/slow WiFi, etc.)
- Generates human-readable summaries and vibe tags
- Updates `cafes` table with final scores

### 4. Audit Logging
**Automatic during AI analysis**
- Logs every analysis run in `ai_analysis_log` table
- Tracks processing time, costs, and confidence scores
- Records before/after work scores for monitoring
- Enables debugging and performance optimization

### Database Triggers
- **Location Generation**: Auto-creates PostGIS geography from lat/lng
- **Timestamp Updates**: Auto-updates `updated_at` fields
- **Reanalysis Marking**: Auto-marks cafes when new reviews added

## API Costs

Outscraper pricing:
- Google Maps Reviews: ~$1.50 per 1000 reviews
- Google Maps Search: ~$1.50 per 1000 places

Monitor your usage at: https://outscraper.com/dashboard

## Error Handling

The scripts include comprehensive error handling and logging:
- API failures are logged with details
- Database errors are caught and reported
- Process exits with appropriate error codes
- Progress is shown with clear status messages

## Development

Build the TypeScript code:
```bash
npm run build
```

Run in development mode with auto-reload:
```bash
npm run dev
```

Type checking:
```bash
npm run type-check
```