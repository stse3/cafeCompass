#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { aiAnalysisService } from '../services/ai-analysis.js';

// Load environment variables
dotenv.config({ path: '../../.ENV' });

/**
 * CLI interface for AI analysis
 */
async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : 5;
  
  if (isNaN(limit) || limit <= 0) {
    console.log('');
    console.log('📖 USAGE:');
    console.log('  npm run analyze:cafes [LIMIT]');
    console.log('');
    console.log('📝 EXAMPLES:');
    console.log('  npm run analyze:cafes      # Analyze up to 5 cafes');
    console.log('  npm run analyze:cafes 10   # Analyze up to 10 cafes');
    console.log('');
    console.log('🤖 WHAT IT DOES:');
    console.log('  1. Finds cafes marked as needing AI reanalysis');
    console.log('  2. Analyzes their reviews for work-related content');
    console.log('  3. Calculates work scores and attributes');
    console.log('  4. Updates the cafe records with AI insights');
    console.log('  5. Logs the analysis process for monitoring');
    console.log('');
    process.exit(1);
  }

  console.log('🤖 Starting AI Analysis Process');
  console.log(`📊 Processing up to ${limit} cafes`);
  console.log('');

  try {
    await aiAnalysisService.processCafesNeedingAnalysis(limit);
    console.log('');
    console.log('🎉 AI Analysis completed successfully!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('  - Check the updated cafe scores in your database');
    console.log('  - Review the ai_analysis_log table for detailed results');
    console.log('  - Run the frontend to see the updated work scores');
    
  } catch (error) {
    console.error('');
    console.error('❌ AI Analysis failed:', error);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('  - Check your database connection');
    console.error('  - Ensure you have cafes marked for reanalysis');
    console.error('  - Verify your AI API keys are set');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}