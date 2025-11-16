#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { outscraperService } from '../services/outscraper.js';
import { databaseService } from '../services/database.js';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: '../../.ENV' });

interface ScrapeCafeOptions {
  placeId: string;
  cafeId?: string;
  includeReviews?: boolean;
  reviewsLimit?: number;
}

/**
 * Scrape complete cafe information and optionally reviews
 */
async function scrapeCafe({ 
  placeId, 
  cafeId, 
  includeReviews = true, 
  reviewsLimit = 100 
}: ScrapeCafeOptions) {
  try {
    console.log('='.repeat(60));
    console.log('🏪 Starting Complete Cafe Scraping Process');
    console.log('='.repeat(60));
    console.log(`Place ID: ${placeId}`);
    console.log(`Cafe ID: ${cafeId || 'Auto-generate'}`);
    console.log(`Include Reviews: ${includeReviews}`);
    if (includeReviews) {
      console.log(`Review Limit: ${reviewsLimit}`);
    }
    console.log('');

    // Step 1: Scrape basic cafe information
    console.log('📍 Step 1: Scraping cafe information...');
    const cafeInfo = await outscraperService.scrapeCafeInfo(placeId);
    
    if (!cafeInfo) {
      throw new Error(`No cafe information found for place ID: ${placeId}`);
    }

    console.log(`✅ Found cafe: ${cafeInfo.name}`);
    console.log(`📍 Address: ${cafeInfo.full_address || cafeInfo.address}`);
    console.log(`⭐ Rating: ${cafeInfo.rating}/5 (${cafeInfo.reviews_count} reviews)`);
    console.log('');

    // Step 2: Create/update cafe record
    console.log('💾 Step 2: Creating/updating cafe record...');
    const finalCafeId = cafeId || uuidv4();
    
    const cafeData = {
      id: finalCafeId,
      google_place_id: placeId,
      name: cafeInfo.name,
      address: cafeInfo.full_address || cafeInfo.address || '',
      city: extractCityFromAddress(cafeInfo.full_address || cafeInfo.address || ''),
      latitude: cafeInfo.latitude || 0,
      longitude: cafeInfo.longitude || 0,
      is_verified: false,
      is_permanently_closed: cafeInfo.closed || false,
      needs_ai_reanalysis: includeReviews,
      last_scraped_at: new Date().toISOString(),
    };

    const storedCafe = await databaseService.upsertCafe(cafeData);
    console.log(`✅ Cafe record ${cafeId ? 'updated' : 'created'}: ${finalCafeId}`);
    console.log('');

    let reviewCount = 0;
    
    // Step 3: Scrape reviews (if requested)
    if (includeReviews && !cafeInfo.closed) {
      console.log('🌐 Step 3: Scraping reviews...');
      const reviewResult = await outscraperService.scrapeReviews(placeId, {
        reviewsLimit,
        language: 'en',
        region: 'us'
      });

      if (reviewResult && reviewResult.reviews && reviewResult.reviews.length > 0) {
        console.log(`✅ Found ${reviewResult.reviews.length} reviews`);
        
        // Store reviews
        console.log('💾 Step 4: Storing reviews in database...');
        const storedReviews = await databaseService.storeReviews(
          finalCafeId,
          reviewResult.reviews
        );
        reviewCount = storedReviews.length;
        console.log(`✅ Stored ${reviewCount} reviews`);
      } else {
        console.log('⚠️ No reviews found for this cafe');
      }
    } else if (cafeInfo.closed) {
      console.log('⚠️ Skipping reviews - cafe is permanently closed');
    } else {
      console.log('⏭️ Skipping reviews as requested');
    }

    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('🎉 CAFE SCRAPING COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`🏪 Cafe: ${cafeInfo.name}`);
    console.log(`🆔 Cafe ID: ${finalCafeId}`);
    console.log(`📍 Location: ${cafeData.latitude}, ${cafeData.longitude}`);
    console.log(`⭐ Google Rating: ${cafeInfo.rating}/5`);
    console.log(`📊 Total Google Reviews: ${cafeInfo.reviews_count || 0}`);
    console.log(`💾 Reviews Scraped: ${reviewCount}`);
    console.log(`🔄 Needs AI Analysis: ${includeReviews ? 'Yes' : 'No'}`);
    console.log('='.repeat(60));

    return {
      cafe: storedCafe,
      reviewCount,
      originalData: cafeInfo
    };

  } catch (error) {
    console.error('');
    console.error('❌ CAFE SCRAPING FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

/**
 * Extract city from full address
 */
function extractCityFromAddress(address: string): string {
  // Simple city extraction - you might want to make this more sophisticated
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim();
  }
  return 'Unknown';
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('');
    console.log('📖 USAGE:');
    console.log('  npm run scrape:cafe <PLACE_ID> [CAFE_ID] [--no-reviews] [--reviews-limit=N]');
    console.log('');
    console.log('📝 EXAMPLES:');
    console.log('  npm run scrape:cafe ChIJN1t_tDeuEmsRUsoyG83frY4');
    console.log('  npm run scrape:cafe ChIJN1t_tDeuEmsRUsoyG83frY4 cafe-001');
    console.log('  npm run scrape:cafe ChIJN1t_tDeuEmsRUsoyG83frY4 --no-reviews');
    console.log('  npm run scrape:cafe ChIJN1t_tDeuEmsRUsoyG83frY4 --reviews-limit=50');
    console.log('');
    console.log('🔍 HOW TO FIND PLACE ID:');
    console.log('  1. Go to Google Maps');
    console.log('  2. Search for the cafe');
    console.log('  3. Copy the Place ID from the URL or use Google Places API');
    console.log('');
    process.exit(1);
  }

  const placeId = args[0];
  let cafeId: string | undefined;
  let includeReviews = true;
  let reviewsLimit = 100;

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--no-reviews') {
      includeReviews = false;
    } else if (arg.startsWith('--reviews-limit=')) {
      const limit = parseInt(arg.split('=')[1]);
      if (!isNaN(limit) && limit > 0) {
        reviewsLimit = limit;
      }
    } else if (!arg.startsWith('--')) {
      cafeId = arg;
    }
  }

  await scrapeCafe({ placeId, cafeId, includeReviews, reviewsLimit });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { scrapeCafe };