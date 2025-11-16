import dotenv from 'dotenv';
import { outscraperService } from './services/outscraper.js';
import { databaseService } from './services/database.js';

// Load environment variables
dotenv.config({ path: '../.ENV' });

console.log('🏪 Cafe Compass Backend Services');
console.log('================================');
console.log('');
console.log('Available commands:');
console.log('  npm run scrape:reviews <PLACE_ID> <CAFE_ID> [LIMIT]');
console.log('  npm run scrape:cafe <PLACE_ID> [CAFE_ID] [OPTIONS]');
console.log('');
console.log('For detailed usage instructions, see README.md');
console.log('');

// Test connections on startup
async function testConnections() {
  try {
    console.log('🔍 Testing connections...');
    
    // Test Outscraper API key
    if (process.env.OUTSCRAPER_API_KEY) {
      console.log('✅ Outscraper API key found');
    } else {
      console.log('❌ Outscraper API key missing');
    }
    
    // Test Supabase connection
    if (process.env.VITE_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('✅ Supabase credentials found');
    } else {
      console.log('❌ Supabase credentials missing');
    }
    
    console.log('');
    console.log('Backend services are ready! 🚀');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

// Run connection test
testConnections();