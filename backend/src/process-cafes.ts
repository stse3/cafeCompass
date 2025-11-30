import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root - try multiple locations
dotenv.config({ path: path.join(__dirname, '../../.env') }); // From backend/src/ -> root/.env
// Debug: Check if environment variables are loaded
console.log('🔧 Environment check:');
console.log(`   OUTSCRAPER_API_KEY: ${process.env.OUTSCRAPER_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
console.log(`   GEMINI_API_KEY: ${process.env.GOOGLE_GEMINI_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
console.log(`   GOOGLE_MAPS_API_KEY: ${process.env.GOOGLE_MAPS_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
console.log(`   SUPABASE_URL: ${process.env.VITE_PUBLIC_SUPABASE_URL ? '✅ Loaded' : '❌ Missing'}`);
console.log(`   SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Loaded' : '❌ Missing'}\n`);

// Initialize clients
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

// =====================================================
// WORK-RELATED KEYWORDS
// =====================================================

const WORK_KEYWORDS = [
  'wifi', 'wi-fi', 'internet', 'work', 'working', 'laptop',
  'remote', 'study', 'studying', 'quiet', 'noise', 'loud',
  'outlet', 'plug', 'charging', 'workspace', 'coworking',
  'desk', 'table', 'seating',  'hours', 'stay',
  'focus', 'productive', 'concentration', 'meeting', 'call',
  'zoom', 
];

// =====================================================
// TYPES
// =====================================================

interface OutscraperReview {
  author_title: string;
  author_id: string;
  review_rating: number;
  review_text: string;
  review_datetime_utc: string;
  review_timestamp: number;
}

interface OutscraperPlace {
  name: string;
  full_address?: string;
  borough?: string;
  street?: string;
  city?: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviews: number;
  reviews_data?: OutscraperReview[];
  place_id: string;
  google_id?: string;
}

interface AIScores {
  work_score: number;
  wifi_quality: number;
  noise_level: number;
  vibe: number;
  summary: string;
  confidence: string;
  work_related_count: number;
}

// =====================================================
// GOOGLE PLACES API INTEGRATION
// =====================================================

interface GooglePlaceDetails {
  opening_hours?: {
    weekday_text: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
    relative_time_description: string;
  }>;
  rating?: number;
  user_ratings_total?: number;
}

async function fetchGooglePlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.log('⚠️  Google Maps API key not found, skipping place details');
    return null;
  }

  try {
    console.log('🔍 Fetching Google Places details (New API)...');
    console.log(`   API Key: ${apiKey.substring(0, 20)}...`);
    console.log(`   Place ID: ${placeId}`);
    
    // Use the new Places API (New) endpoint
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=displayName,currentOpeningHours,photos,reviews,rating,userRatingCount&key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places API error: ${response.status}`);
      console.error(`Response: ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    // Transform new API format to match our interface
    const transformed: GooglePlaceDetails = {};
    
    if (data.currentOpeningHours?.weekdayDescriptions) {
      transformed.opening_hours = {
        weekday_text: data.currentOpeningHours.weekdayDescriptions
      };
    }
    
    if (data.photos && data.photos.length > 0) {
      transformed.photos = data.photos.map((photo: any) => ({
        photo_reference: photo.name, // In new API, use the photo name
        height: photo.heightPx || 800,
        width: photo.widthPx || 800
      }));
    }
    
    if (data.reviews && data.reviews.length > 0) {
      transformed.reviews = data.reviews.map((review: any) => ({
        author_name: review.authorAttribution?.displayName || 'Anonymous',
        rating: review.rating || 0,
        text: review.text?.text || '',
        time: new Date(review.publishTime).getTime() / 1000,
        relative_time_description: review.relativePublishTimeDescription || ''
      }));
    }
    
    if (data.rating) {
      transformed.rating = data.rating;
    }
    
    if (data.userRatingCount) {
      transformed.user_ratings_total = data.userRatingCount;
    }

    console.log('✅ Google Places details fetched (New API)');
    return transformed;
  } catch (error) {
    console.error('❌ Error fetching Google Places details:', error);
    return null;
  }
}

function formatOpeningHours(weekdayText: string[]): Record<string, string> {
  const hours: Record<string, string> = {};
  
  weekdayText.forEach(dayText => {
    const [day, ...timeParts] = dayText.split(': ');
    const time = timeParts.join(': ');
    
    // Convert day names to consistent format
    const dayMap: Record<string, string> = {
      'Monday': 'monday',
      'Tuesday': 'tuesday', 
      'Wednesday': 'wednesday',
      'Thursday': 'thursday',
      'Friday': 'friday',
      'Saturday': 'saturday',
      'Sunday': 'sunday'
    };
    
    const normalizedDay = dayMap[day] || day.toLowerCase();
    hours[normalizedDay] = time || 'Closed';
  });
  
  return hours;
}

function getPhotoUrl(photoReference: string): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  // For new Places API, photoReference is actually the photo name
  // Use the new format for fetching photos
  return `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=800&key=${apiKey}`;
}

// =====================================================
// HELPER: Check if review mentions work
// =====================================================

function isWorkRelated(reviewText: string): boolean {
  if (!reviewText) return false;
  const lowerText = reviewText.toLowerCase();
  return WORK_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// =====================================================
// STEP 1: SCRAPE CAFE & REVIEWS FROM GOOGLE MAPS
// =====================================================

async function scrapeCafe(googlePlaceId: string) {
  console.log('\n📡 Scraping cafe from Google Maps...');
  console.log(`Place ID: ${googlePlaceId}\n`);

  try {
    // First, try to get basic place info using the search endpoint
    console.log('🔍 Step 1a: Getting basic place info...');
    
    const searchResponse = await fetch(
      'https://api.app.outscraper.com/maps/search-v3',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.OUTSCRAPER_API_KEY!,
        },
        body: JSON.stringify({
          query: [googlePlaceId],      // Search by Place ID
          language: 'en',               // English
          region: 'CA',                 // Canada
          limit: 1,                     // Just one place
          async: false,                 // Wait for results
        }),
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Outscraper search error: ${searchResponse.status} - ${errorText}`);
    }

    const searchData = await searchResponse.json();
    console.log('📍 Basic place info retrieved');

    // Now try to get reviews using the reviews endpoint (GET request)
    console.log('🔍 Step 1b: Getting reviews...');
    
    const reviewsUrl = new URL('https://api.app.outscraper.com/maps/reviews-v3');
    reviewsUrl.searchParams.append('query', googlePlaceId);
    reviewsUrl.searchParams.append('reviews_limit', '50');
    reviewsUrl.searchParams.append('language', 'en');
    reviewsUrl.searchParams.append('region', 'CA');
    reviewsUrl.searchParams.append('async', 'false');
    
    const response = await fetch(reviewsUrl.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY!,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Outscraper reviews error: ${response.status} - ${errorText}`);
    }

    const reviewsData = await response.json();
    
    // Debug: Log both responses
    console.log('🔍 Debug - Search Response:');
    console.log('Search data structure:', JSON.stringify(searchData, null, 2).substring(0, 300) + '...');
    
    console.log('🔍 Debug - Reviews Response:');
    console.log('Reviews data structure:', JSON.stringify(reviewsData, null, 2).substring(0, 300) + '...');
    
    // Extract place info from search response (nested array structure)
    const basicPlace = searchData.data?.[0]?.[0];
    
    // Extract reviews from reviews response (different structure - direct object)
    const reviewsPlace = reviewsData.data?.[0];
    
    // Combine data from both sources
    const place = basicPlace;

    if (!place) {
      console.log('⚠️  No place data found');
      console.log('   Search response structure:', searchData ? Object.keys(searchData) : 'none');
      return null;
    }

    // Merge reviews from the reviews endpoint if available
    if (reviewsPlace && reviewsPlace.reviews_data) {
      place.reviews_data = reviewsPlace.reviews_data;
      console.log(`🔄 Merged ${reviewsPlace.reviews_data.length} reviews from reviews endpoint`);
    } else if (reviewsPlace && reviewsPlace.reviews) {
      // Sometimes reviews are in a different field
      place.reviews_data = reviewsPlace.reviews;
      console.log(`🔄 Merged ${reviewsPlace.reviews.length} reviews from reviews field`);
    } else {
      console.log('⚠️  No reviews found in reviews response');
      console.log('   Reviews response keys:', reviewsPlace ? Object.keys(reviewsPlace) : 'none');
    }

    console.log(`✅ Found cafe: ${place.name}`);
    console.log(`   Address: ${place.full_address || place.street}`);
    console.log(`   Rating: ${place.rating}/5 (${place.reviews} reviews)`);
    console.log(`   Reviews scraped: ${place.reviews_data?.length || 0}\n`);

    // Filter for work-related reviews only
    const allReviews = place.reviews_data || [];
    const workReviews = allReviews.filter((review: OutscraperReview) => 
      isWorkRelated(review.review_text)
    );

    console.log(`🎯 Work-related reviews: ${workReviews.length}/${allReviews.length}`);
    console.log(`   (Filtered using keywords: wifi, work, laptop, etc.)\n`);

    return {
      place,
      allReviews,
      workReviews,
    };

  } catch (error: any) {
    console.error('❌ Scraping failed:', error.message);
    throw error;
  }
}

// =====================================================
// STEP 2: ADD OR UPDATE CAFE IN DATABASE
// =====================================================

async function upsertCafe(place: OutscraperPlace) {
  console.log('💾 Updating cafe in database...\n');

  // Fetch additional details from Google Places API
  const placeDetails = await fetchGooglePlaceDetails(place.place_id);
  
  // Prepare opening hours
  let opening_hours = null;
  if (placeDetails?.opening_hours?.weekday_text) {
    opening_hours = formatOpeningHours(placeDetails.opening_hours.weekday_text);
    console.log('✅ Opening hours added');
  }

  // Prepare image URL
  let image_url = null;
  if (placeDetails?.photos && placeDetails.photos.length > 0) {
    // Get the first (usually best) photo
    const photo = placeDetails.photos[0];
    image_url = getPhotoUrl(photo.photo_reference);
    console.log('✅ Image URL added');
  }

  // Prepare Google reviews data
  let google_rating = null;
  let google_review_count = null;
  let google_reviews = null;
  
  if (placeDetails?.rating) {
    google_rating = placeDetails.rating;
    console.log(`✅ Google rating: ${google_rating}/5`);
  }
  
  if (placeDetails?.user_ratings_total) {
    google_review_count = placeDetails.user_ratings_total;
    console.log(`✅ Google review count: ${google_review_count}`);
  }
  
  if (placeDetails?.reviews && placeDetails.reviews.length > 0) {
    // Store the reviews as JSON, limiting to most recent 5
    google_reviews = placeDetails.reviews.slice(0, 5).map(review => ({
      author: review.author_name,
      rating: review.rating,
      text: review.text,
      time: review.time,
      relative_time: review.relative_time_description
    }));
    console.log(`✅ Google reviews added: ${google_reviews.length} reviews`);
  }

  const cafeData = {
    name: place.name,
    address: place.full_address || place.street || '',
    city: place.city || place.borough || 'Toronto',
    google_place_id: place.place_id,
    latitude: place.latitude,
    longitude: place.longitude,
    google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    opening_hours,
    image_url,
    google_rating,
    google_review_count,
    google_reviews,
  };

  // Try to update existing cafe, or insert new one
  const { data: existingCafe } = await supabase
    .from('cafes')
    .select('id')
    .eq('google_place_id', place.place_id)
    .single();

  let cafeId: string;

  if (existingCafe) {
    // Update existing
    const { error } = await supabase
      .from('cafes')
      .update(cafeData)
      .eq('id', existingCafe.id);

    if (error) throw error;
    cafeId = existingCafe.id;
    console.log('✅ Updated existing cafe\n');
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('cafes')
      .insert(cafeData)
      .select('id')
      .single();

    if (error) throw error;
    cafeId = data!.id;
    console.log('✅ Added new cafe\n');
  }

  return cafeId;
}

// =====================================================
// STEP 3: STORE REVIEWS IN DATABASE
// =====================================================

async function storeReviews(cafeId: string, reviews: OutscraperReview[]) {
  console.log('💾 Storing reviews in database...\n');

  // First, get existing review IDs to avoid duplicates
  console.log('🔍 Checking for existing reviews...');
  const { data: existingReviews } = await supabase
    .from('reviews')
    .select('google_review_id')
    .eq('cafe_id', cafeId);

  const existingIds = new Set(existingReviews?.map(r => r.google_review_id) || []);
  console.log(`   Found ${existingIds.size} existing reviews\n`);

  let storedCount = 0;
  let skippedCount = 0;
  let workRelatedCount = 0;

  for (const review of reviews) {
    const googleReviewId = `${review.author_id}_${review.review_timestamp}`;
    const isWork = isWorkRelated(review.review_text);

    // Skip if review already exists
    if (existingIds.has(googleReviewId)) {
      skippedCount++;
      continue;
    }

    const { error } = await supabase.from('reviews').insert({
      cafe_id: cafeId,
      author: review.author_title || 'Anonymous',
      rating: review.review_rating,
      text: review.review_text || '',
      date: review.review_datetime_utc,
      google_review_id: googleReviewId,
      is_work_related: isWork,
      mentions_wifi: review.review_text ? 
                     (review.review_text.toLowerCase().includes('wifi') || 
                      review.review_text.toLowerCase().includes('wi-fi') ||
                      review.review_text.toLowerCase().includes('internet')) : false,
      mentions_noise: review.review_text ? 
                      (review.review_text.toLowerCase().includes('quiet') ||
                       review.review_text.toLowerCase().includes('loud') ||
                       review.review_text.toLowerCase().includes('noise')) : false,
    });

    if (error) {
      console.error(`⚠️  Error storing review:`, error.message);
    } else {
      storedCount++;
      if (isWork) workRelatedCount++;
    }
  }

  console.log(`✅ Stored ${storedCount}/${reviews.length} reviews`);
  if (skippedCount > 0) {
    console.log(`   Skipped ${skippedCount} duplicates`);
  }
  console.log(`   Work-related: ${workRelatedCount}\n`);
  
  return { storedCount, workRelatedCount };
}

// =====================================================
// STEP 4: ANALYZE WITH GEMINI AI
// =====================================================

async function analyzeWithAI(cafeId: string): Promise<AIScores> {
  console.log('🤖 Analyzing reviews with Gemini AI...\n');

  // Get ONLY work-related reviews for analysis
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('rating, text')
    .eq('cafe_id', cafeId)
    .eq('is_work_related', true);  // Only work reviews!

  if (error || !reviews || reviews.length === 0) {
    console.log('⚠️  No work-related reviews found');
    console.log('   Falling back to all reviews...\n');
    
    // Fallback: use all reviews
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating, text')
      .eq('cafe_id', cafeId);

    if (!allReviews || allReviews.length === 0) {
      throw new Error('No reviews to analyze');
    }

    return analyzeReviews(allReviews, false);
  }

  console.log(`   Analyzing ${reviews.length} work-related reviews...`);
  return analyzeReviews(reviews, true);
}

async function analyzeReviews(reviews: any[], hasWorkReviews: boolean): Promise<AIScores> {
  // Format for AI
  const reviewText = reviews
    .map((r, i) => `Review ${i + 1}:\nRating: ${r.rating}/5\n${r.text}`)
    .join('\n\n---\n\n');

  // Create prompt
  const prompt = `Analyze these cafe reviews for remote work suitability in Toronto.

${reviewText}

${hasWorkReviews ? 
  'These reviews specifically mention work, WiFi, or laptop usage.' :
  'These are general reviews. Estimate work-friendliness based on atmosphere, noise, seating.'
}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "work_score": 0-5,
  "wifi_quality": 0-5,
  "noise_level": 0-5,
  "summary": "one sentence about work-friendliness",
  "confidence": "high/medium/low",
  "work_related_count": ${hasWorkReviews ? reviews.length : 0}
}

Scoring:
- work_score: Overall work-friendliness (0=terrible, 5=perfect)
- wifi_quality: 0=no wifi mentioned, 3=adequate, 5=very fast
- noise_level: 0=silent library, 3=moderate, 5=very loud
- summary: Focus on WiFi, noise, seating, outlets for remote workers
- confidence: ${hasWorkReviews ? '"high"' : '"low" (no work reviews)'}

Be realistic. Most cafes score 3-4. Only exceptional places get 4-5.`;

  // Call Gemini 2.0 Flash
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp"
  });

  const result = await model.generateContent(prompt);
  let response = result.response.text();

  // Clean response
  response = response
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/`/g, '')
    .trim();

  const scores: AIScores = JSON.parse(response);

  console.log(`✅ Analysis complete`);
  console.log(`   Work Score: ${scores.work_score}/5`);
  console.log(`   WiFi: ${scores.wifi_quality}/5`);
  console.log(`   Noise: ${scores.noise_level}/5`);
  console.log(`   Confidence: ${scores.confidence}\n`);

  return scores;
}

// =====================================================
// STEP 5: UPDATE CAFE WITH SCORES
// =====================================================

async function updateCafeScores(cafeId: string, scores: AIScores, reviewCount: number) {
  console.log('📝 Updating cafe with scores...\n');

  const { error } = await supabase
    .from('cafes')
    .update({
      work_score: scores.work_score,
      wifi_quality: scores.wifi_quality,
      noise_level: scores.noise_level,
      summary: scores.summary,
      review_count: reviewCount,
      last_scraped_at: new Date().toISOString(),
      last_analyzed_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    })
    .eq('id', cafeId);

  if (error) {
    throw new Error(`Update failed: ${error.message}`);
  }

  // Mark reviews as analyzed
  await supabase
    .from('reviews')
    .update({ analyzed_at: new Date().toISOString() })
    .eq('cafe_id', cafeId);

  console.log('✅ Database updated\n');
}

// =====================================================
// UPDATE-ONLY FUNCTION (No Outscraper - Just Google Places API)
// =====================================================

async function updateExistingCafeDetails(googlePlaceId: string) {
  const startTime = Date.now();
  
  console.log('\n============================================================');
  console.log('☕ CAFE COMPASS - UPDATE EXISTING CAFE DETAILS');
  console.log('============================================================\n');

  try {
    // Check if cafe exists in database
    const { data: existingCafe, error: fetchError } = await supabase
      .from('cafes')
      .select('id, name, google_place_id')
      .eq('google_place_id', googlePlaceId)
      .single();

    if (fetchError || !existingCafe) {
      console.error('❌ Cafe not found in database');
      console.log('💡 Use the full process command to add new cafes with Outscraper');
      return;
    }

    console.log(`📍 Found existing cafe: ${existingCafe.name}\n`);

    // Fetch Google Places details
    console.log('🔍 Fetching Google Places details...');
    const placeDetails = await fetchGooglePlaceDetails(googlePlaceId);
    
    if (!placeDetails) {
      console.log('❌ Could not fetch Google Places details');
      return;
    }

    // Prepare updates
    const updates: any = {};
    let hasUpdates = false;

    // Add opening hours
    if (placeDetails.opening_hours?.weekday_text) {
      updates.opening_hours = formatOpeningHours(placeDetails.opening_hours.weekday_text);
      console.log('✅ Opening hours updated');
      hasUpdates = true;
    }

    // Add image URL
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      const photo = placeDetails.photos[0];
      updates.image_url = getPhotoUrl(photo.photo_reference);
      console.log('✅ Image URL updated');
      hasUpdates = true;
    }

    // Add Google rating and reviews
    if (placeDetails.rating) {
      updates.google_rating = placeDetails.rating;
      console.log(`✅ Google rating updated: ${placeDetails.rating}/5`);
      hasUpdates = true;
    }
    
    if (placeDetails.user_ratings_total) {
      updates.google_review_count = placeDetails.user_ratings_total;
      console.log(`✅ Google review count updated: ${placeDetails.user_ratings_total}`);
      hasUpdates = true;
    }
    
    if (placeDetails.reviews && placeDetails.reviews.length > 0) {
      // Store the reviews as JSON, limiting to most recent 5
      updates.google_reviews = placeDetails.reviews.slice(0, 5).map(review => ({
        author: review.author_name,
        rating: review.rating,
        text: review.text,
        time: review.time,
        relative_time: review.relative_time_description
      }));
      console.log(`✅ Google reviews updated: ${updates.google_reviews.length} reviews`);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      console.log('ℹ️  No new details to update');
      return;
    }

    // Update the cafe
    const { error: updateError } = await supabase
      .from('cafes')
      .update(updates)
      .eq('id', existingCafe.id);

    if (updateError) {
      throw updateError;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ UPDATE COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n☕ ${existingCafe.name}`);
    console.log(`⏱️  Processing time: ${elapsed}s`);
    console.log(`💰 Cost: ~$0.00 (Google Places API only)`);
    console.log('\n✅ Cafe details updated!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// =====================================================
// BULK UPDATE ALL CAFES (Google Places API only)
// =====================================================

async function updateAllCafesWithGoogleData() {
  const startTime = Date.now();

  try {
    // Get all cafes from database
    const { data: allCafes, error: fetchError } = await supabase
      .from('cafes')
      .select('id, name, google_place_id')
      .order('name');

    if (fetchError) {
      throw fetchError;
    }

    if (!allCafes || allCafes.length === 0) {
      console.log('❌ No cafes found in database');
      return;
    }

    console.log(`📍 Found ${allCafes.length} cafes in database\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Process each cafe
    for (let i = 0; i < allCafes.length; i++) {
      const cafe = allCafes[i];
      console.log(`\n[${i + 1}/${allCafes.length}] 🔄 Processing: ${cafe.name}`);

      if (!cafe.google_place_id) {
        console.log('   ⚠️  No Google Place ID - skipping');
        skipCount++;
        continue;
      }

      try {
        // Fetch Google Places details
        const placeDetails = await fetchGooglePlaceDetails(cafe.google_place_id);
        
        if (!placeDetails) {
          console.log('   ❌ Could not fetch Google Places details');
          errorCount++;
          continue;
        }

        // Prepare updates
        const updates: any = {};
        let hasUpdates = false;

        // Add opening hours
        if (placeDetails.opening_hours?.weekday_text) {
          updates.opening_hours = formatOpeningHours(placeDetails.opening_hours.weekday_text);
          console.log('   ✅ Opening hours');
          hasUpdates = true;
        }

        // Add image URL
        if (placeDetails.photos && placeDetails.photos.length > 0) {
          const photo = placeDetails.photos[0];
          updates.image_url = getPhotoUrl(photo.photo_reference);
          console.log('   ✅ Image URL');
          hasUpdates = true;
        }

        // Add Google rating and reviews
        if (placeDetails.rating) {
          updates.google_rating = placeDetails.rating;
          console.log(`   ✅ Google rating: ${placeDetails.rating}/5`);
          hasUpdates = true;
        }
        
        if (placeDetails.user_ratings_total) {
          updates.google_review_count = placeDetails.user_ratings_total;
          console.log(`   ✅ Review count: ${placeDetails.user_ratings_total}`);
          hasUpdates = true;
        }
        
        if (placeDetails.reviews && placeDetails.reviews.length > 0) {
          updates.google_reviews = placeDetails.reviews.slice(0, 5).map(review => ({
            author: review.author_name,
            rating: review.rating,
            text: review.text,
            time: review.time,
            relative_time: review.relative_time_description
          }));
          console.log(`   ✅ Google reviews: ${updates.google_reviews.length}`);
          hasUpdates = true;
        }

        if (!hasUpdates) {
          console.log('   ℹ️  No new details to update');
          skipCount++;
          continue;
        }

        // Update the cafe
        const { error: updateError } = await supabase
          .from('cafes')
          .update(updates)
          .eq('id', cafe.id);

        if (updateError) {
          console.log(`   ❌ Database update failed: ${updateError.message}`);
          errorCount++;
          continue;
        }

        console.log('   🎉 Updated successfully');
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ BULK UPDATE COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${allCafes.length}`);
    console.log(`\n⏱️  Processing time: ${elapsed}s`);
    console.log(`💰 Cost: ~$0.00 (Google Places API only)`);
    console.log('\n🎉 All cafes processed!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// =====================================================
// MAIN: PROCESS CAFE
// =====================================================

async function processCafe(googlePlaceId: string) {
  console.log('\n' + '='.repeat(60));
  console.log('☕ CAFE COMPASS - OPTIMIZED BACKEND PROCESSOR');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    // STEP 1: Scrape cafe and reviews
    const result = await scrapeCafe(googlePlaceId);
    
    if (!result) {
      console.log('❌ Could not fetch cafe data\n');
      process.exit(1);
    }

    const { place, allReviews, workReviews } = result;

    // STEP 2: Add/update cafe
    const cafeId = await upsertCafe(place);

    // STEP 3: Store reviews (we store ALL, but flag work-related ones)
    const { storedCount, workRelatedCount } = await storeReviews(cafeId, allReviews);

    if (storedCount === 0) {
      console.log('⚠️  No new reviews stored\n');
    }

    // STEP 4: AI Analysis (uses only work-related reviews)
    const scores = await analyzeWithAI(cafeId);

    // STEP 5: Update cafe (use total reviews processed, not just newly stored ones)
    await updateCafeScores(cafeId, scores, allReviews.length);

    // SUMMARY
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('='.repeat(60));
    console.log('✅ PROCESSING COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n☕ ${place.name}`);
    console.log(`   ${place.full_address || place.street}`);
    console.log(`\n📊 Final Scores:`);
    console.log(`   Work Score: ${scores.work_score}/5`);
    console.log(`   WiFi Quality: ${scores.wifi_quality}/5`);
    console.log(`   Noise Level: ${scores.noise_level}/5`);
    console.log(`\n💬 Summary:`);
    console.log(`   "${scores.summary}"`);
    console.log(`\n📈 Stats:`);
    console.log(`   Total reviews: ${allReviews.length}`);
    console.log(`   Work-related: ${workRelatedCount} (${((workRelatedCount/allReviews.length)*100).toFixed(0)}%)`);
    console.log(`   Stored: ${storedCount}`);
    console.log(`   AI Confidence: ${scores.confidence}`);
    console.log(`\n⏱️  Processing time: ${elapsed}s`);
    console.log(`💰 Cost: ~$0.05\n`);
    console.log('='.repeat(60));
    console.log('\n✅ Cafe is now live on your website!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);

    // Helpful error messages
    if (error.message.includes('401') || error.message.includes('X-API-KEY')) {
      console.log('\n💡 Check OUTSCRAPER_API_KEY in .env.local');
    }
    if (error.message.includes('402') || error.message.includes('credits')) {
      console.log('\n💡 Out of Outscraper credits. Add more at outscraper.com');
    }
    if (error.message.includes('GEMINI') || error.message.includes('API_KEY')) {
      console.log('\n💡 Check GEMINI_API_KEY in .env.local');
    }
    if (error.message.includes('JSON') || error.message.includes('SyntaxError')) {
      console.log('\n💡 AI returned invalid JSON. Try running again.');
    }

    console.log('');
    process.exit(1);
  }
}

// =====================================================
// CLI
// =====================================================

const args = process.argv.slice(2);
const command = args[0];
const googlePlaceId = args[1] || args[0];

if (!command) {
  console.log(`
📖 Cafe Compass - Backend Processor

Usage:
  npm run process <google_place_id>          # Full process (with Outscraper)
  npm run process update <google_place_id>   # Update existing cafe (Google Places only)
  npm run process update all                 # Update ALL cafes (Google Places only)

Examples:
  npm run process ChIJzMQo-Jg1K4gRvzK2trT46CoA
  npm run process update ChIJzMQo-Jg1K4gRvzK2trT46CoA
  npm run process update all

Full Process (with Outscraper):
  ✅ Scrapes reviews and basic info
  ✅ Adds cafe to database
  ✅ AI analysis of work-friendliness
  ✅ Fetches opening hours, images & Google reviews
  💰 Cost: ~$0.05 per cafe

Update Only (Google Places API):
  ✅ Updates existing cafe with opening hours, images & Google reviews
  ✅ No review scraping or AI analysis
  💰 Cost: ~$0.00 (just Google Places API)

Environment variables needed:
  - GOOGLE_MAPS_API_KEY (for both modes)
  - VITE_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - OUTSCRAPER_API_KEY (full process only)
  - GOOGLE_GEMINI_API_KEY (full process only)
  `);
  process.exit(0);
}

// Handle commands
if (command === 'update' && googlePlaceId === 'all') {
  // Update ALL cafes in database with Google Places details
  updateAllCafesWithGoogleData();
} else if (command === 'update' && googlePlaceId) {
  // Update existing cafe with Google Places details only (no Outscraper)
  updateExistingCafeDetails(googlePlaceId);
} else if (command !== 'update' && command && !command.startsWith('-')) {
  // Full process with Outscraper (existing functionality)
  processCafe(command);
} else {
  console.error('❌ Invalid command. Use --help for usage information.');
  process.exit(1);
}