#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { outscraperService } from '../services/outscraper.js';
import { databaseService } from '../services/database.js';

// Load environment variables
dotenv.config({ path: '../../.ENV' });

interface ScrapeOptions {
  placeId: string;
  cafeId: string;
  reviewsLimit?: number;
}

/**
 * Main scraping function
 */
async function scrapeReviews({ placeId, cafeId, reviewsLimit = 100 }: ScrapeOptions) {
  try {
    console.log('='.repeat(50));
    console.log('🔍 Starting Review Scraping Process');
    console.log('='.repeat(50));
    console.log(`Cafe ID: ${cafeId}`);
    console.log(`Place ID: ${placeId}`);
    console.log(`Review Limit: ${reviewsLimit}`);
    console.log('');

    // Step 1: Verify cafe exists
    console.log('📍 Step 1: Verifying cafe exists in database...');
    const cafe = await databaseService.getCafe(cafeId);
    if (!cafe) {
      throw new Error(`Cafe with ID ${cafeId} not found in database`);
    }
    console.log(`✅ Found cafe: ${cafe.name}`);
    console.log('');

    // Step 2: Scrape reviews from Outscraper
    console.log('🌐 Step 2: Scraping reviews from Google Maps...');
    const result = await outscraperService.scrapeReviews(placeId, {
      reviewsLimit,
      language: 'en',
      region: 'us'
    });

    if (!result || !result.reviews || result.reviews.length === 0) {
      console.log('⚠️ No reviews found for this place ID');
      return;
    }

    console.log(`✅ Successfully scraped ${result.reviews.length} reviews`);
    console.log('');

    // Step 3: Store reviews in database
    console.log('💾 Step 3: Storing reviews in database...');
    const storedReviews = await databaseService.storeReviews(
      cafeId,
      result.reviews
    );
    console.log(`✅ Stored ${storedReviews.length} reviews in database`);
    console.log('');

    // Step 4: Mark cafe for AI reanalysis
    console.log('🤖 Step 4: Marking cafe for AI reanalysis...');
    await databaseService.markCafeForReanalysis(cafeId);
    console.log('✅ Cafe marked for AI reanalysis');
    console.log('');

    // Summary
    console.log('='.repeat(50));
    console.log('🎉 SCRAPING COMPLETED SUCCESSFULLY');
    console.log('='.repeat(50));
    console.log(`📊 Total reviews scraped: ${result.reviews.length}`);
    console.log(`💾 Reviews stored in database: ${storedReviews.length}`);
    console.log(`🏪 Cafe: ${result.name}`);
    console.log(`⭐ Average rating: ${result.rating}/5`);
    console.log(`🔄 Next step: Run AI analysis on reviews`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('');
    console.error('❌ SCRAPING FAILED');
    console.error('='.repeat(50));
    console.error('Error:', error);
    console.error('='.repeat(50));
    process.exit(1);
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('');
    console.log('📖 USAGE:');
    console.log('  npm run scrape:reviews <PLACE_ID> <CAFE_ID> [REVIEW_LIMIT]');
    console.log('');
    console.log('📝 EXAMPLES:');
    console.log('  npm run scrape:reviews ChIJN1t_tDeuEmsRUsoyG83frY4 cafe-001');
    console.log('  npm run scrape:reviews ChIJN1t_tDeuEmsRUsoyG83frY4 cafe-001 50');
    console.log('');
    console.log('🔍 HOW TO FIND PLACE ID:');
    console.log('  1. Go to Google Maps');
    console.log('  2. Search for the cafe');
    console.log('  3. Copy the Place ID from the URL or use Google Places API');
    console.log('');
    process.exit(1);
  }

  const placeId = args[0];
  const cafeId = args[1];
  const reviewsLimit = args[2] ? parseInt(args[2]) : 100;

  if (isNaN(reviewsLimit) || reviewsLimit <= 0) {
    console.error('❌ Review limit must be a positive number');
    process.exit(1);
  }

  await scrapeReviews({ placeId, cafeId, reviewsLimit });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { scrapeReviews };