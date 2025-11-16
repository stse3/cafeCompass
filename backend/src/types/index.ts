export interface Profile {
  id: string;
  username: string;
  email: string;
  default_search_radius_km: number;
  favorite_cafe_count: number;
  created_at: string;
  updated_at: string;
}

export interface CafeReview {
  id?: string;
  cafe_id: string;
  author_name: string;
  rating: number; // 1-5
  review_text: string;
  review_date: string;
  source: string; // 'google', 'yelp', etc.
  google_review_id?: string;
  matched_keywords: string[]; // ["wifi", "work", "laptop"]
  
  // AI Analysis Results
  is_work_related: boolean;
  work_relevance_score: number; // 0.00-1.00
  extracted_attributes: Record<string, any>; // JSONB field for structured data
  sentiment_score: number; // -1.00 to 1.00
  
  // Processing Status
  scraped_at: string;
  analyzed_at?: string; // NULL = needs AI, has date = done
  created_at: string;
}

export interface Cafe {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  location?: any; // PostGIS GEOGRAPHY - auto-generated from lat/lng
  
  // Google Integration
  google_place_id: string;
  google_maps_url?: string;
  google_rating?: number;
  google_review_count?: number;
  
  // Review Tracking
  total_reviews_scraped: number;
  work_reviews_count: number;
  last_review_scraped_at?: string;
  last_ai_analysis_at?: string;
  
  // AI Analysis
  ai_confidence_score: number; // 0.00-1.00
  needs_ai_reanalysis: boolean;
  
  // Work Scores (Your competitive advantage!)
  wifi_speed: 'fast' | 'adequate' | 'slow';
  outlet_rating: number; // 1-5
  noise_level: 'quiet' | 'moderate' | 'loud';
  seating_rating: number; // 1-5
  laptop_policy: 'encouraged' | 'allowed' | 'discouraged';
  good_for_calls: boolean;
  good_for_focus: boolean;
  remote_work_score: number; // 0-10 - THE MAIN SCORE
  
  // AI-Generated Content
  work_summary?: string; // "Great for focus, loud at lunch"
  vibe_tags: string[]; // ["quiet", "productive", "cozy"]
  best_times_to_work?: Record<string, boolean>; // {"morning": true, "lunch": false}
  deal_breakers?: string[]; // ["no_wifi", "too_loud"]
  
  // Status
  is_verified: boolean;
  is_permanently_closed: boolean;
  created_by?: string; // Profile ID
  
  created_at: string;
  updated_at: string;
}

export interface OutscraperReview {
  author_name: string;
  author_url: string;
  language: string;
  profile_photo_url: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  translated: boolean;
}

export interface AIAnalysisLog {
  id?: string;
  cafe_id: string;
  
  // What Happened
  analysis_type: 'work_score_calculation' | 'vibe_extraction' | 'initial_analysis' | 'reanalysis';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reviews_processed: number;
  work_reviews_found: number;
  
  // AI Model Info
  ai_model: string; // "gemini-1.5-flash", "gpt-4o-mini"
  ai_cost_usd: number;
  processing_time_ms: number;
  
  // What Changed
  previous_work_score?: number;
  new_work_score: number;
  score_change?: number;
  
  // Results
  analysis_summary?: string; // "Found excellent wifi mentions..."
  confidence_score: number; // 0.00-1.00
  error_message?: string;
  
  created_at: string;
}

export interface OutscraperResult {
  place_id: string;
  name: string;
  reviews: OutscraperReview[];
  reviews_count: number;
  rating: number;
}

// Helper function return types
export interface CafeNeedingAnalysis {
  id: string;
  name: string;
  total_reviews_scraped: number;
  work_reviews_count: number;
  last_ai_analysis_at?: string;
  needs_ai_reanalysis: boolean;
}