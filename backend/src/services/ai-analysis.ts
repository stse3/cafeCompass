import dotenv from 'dotenv';
import { databaseService } from './database.js';
import { CafeNeedingAnalysis, AIAnalysisLog } from '../types/index.js';

// Load environment variables
dotenv.config({ path: '../../.ENV' });

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface ReviewAnalysisResult {
  is_work_related: boolean;
  work_relevance_score: number;
  extracted_attributes: {
    wifi_quality?: {
      score: number; // 1-10
      confidence: number; // 0-1
      evidence: string;
    };
    noise_level?: {
      score: number; // 1-10 (1=very quiet, 10=very loud)
      confidence: number;
      evidence: string;
    };
    outlet_availability?: {
      score: number; // 1-10
      confidence: number;
      evidence: string;
    };
    seating_comfort?: {
      score: number; // 1-10
      confidence: number;
      evidence: string;
    };
    laptop_friendliness?: {
      score: number; // 1-10
      confidence: number;
      evidence: string;
    };
    good_for_calls?: {
      score: number; // 1-10
      confidence: number;
      evidence: string;
    };
    good_for_focus?: {
      score: number; // 1-10
      confidence: number;
      evidence: string;
    };
  };
  sentiment_score: number; // -1 to 1
  matched_keywords: string[];
}

interface CafeScores {
  wifi_speed: 'fast' | 'adequate' | 'slow';
  outlet_rating: number; // 1-5
  noise_level: 'quiet' | 'moderate' | 'loud';
  seating_rating: number; // 1-5
  laptop_policy: 'encouraged' | 'allowed' | 'discouraged';
  good_for_calls: boolean;
  good_for_focus: boolean;
  remote_work_score: number; // 0-10
  work_summary: string;
  vibe_tags: string[];
  best_times_to_work: Record<string, boolean>;
  deal_breakers: string[];
  ai_confidence_score: number;
  work_reviews_count: number;
}

export class AIAnalysisService {
  /**
   * Process all cafes that need AI reanalysis
   */
  async processCafesNeedingAnalysis(limit: number = 5): Promise<void> {
    try {
      console.log('🤖 Starting AI Analysis Process');
      console.log('='.repeat(50));

      const cafes = await databaseService.getCafesNeedingReanalysis(limit);
      console.log(`Found ${cafes.length} cafes needing analysis`);

      for (const cafe of cafes) {
        await this.analyzeCafe(cafe);
      }

      console.log('✅ AI Analysis Process Completed');

    } catch (error) {
      console.error('❌ AI Analysis Process Failed:', error);
      throw error;
    }
  }

  /**
   * Analyze a single cafe
   */
  async analyzeCafe(cafe: CafeNeedingAnalysis): Promise<void> {
    const startTime = Date.now();
    let analysisLog: Partial<AIAnalysisLog> = {
      cafe_id: cafe.id,
      analysis_type: cafe.last_ai_analysis_at ? 'reanalysis' : 'initial_analysis',
      status: 'processing',
      ai_model: 'gemini-1.5-flash',
      previous_work_score: 0, // Will be updated if it's a reanalysis
    };

    try {
      console.log(`\n🏪 Analyzing: ${cafe.name}`);
      console.log(`   Reviews to process: ${cafe.total_reviews_scraped}`);

      // Get all reviews for this cafe
      const reviews = await databaseService.getCafeReviews(cafe.id, 200);
      console.log(`   Fetched ${reviews.length} reviews`);

      if (reviews.length === 0) {
        console.log('   ⚠️ No reviews found, skipping analysis');
        return;
      }

      // Analyze each review with AI
      const reviewAnalyses: ReviewAnalysisResult[] = [];
      let workRelatedCount = 0;

      for (const review of reviews) {
        const analysis = await this.analyzeReview(review.review_text);
        reviewAnalyses.push(analysis);

        if (analysis.is_work_related) {
          workRelatedCount++;
          // Update the review with analysis results
          await databaseService.updateReviewAnalysis(review.id!, analysis);
        }
      }

      // Calculate aggregate scores
      const cafeScores = this.calculateCafeScores(reviewAnalyses);
      
      // Update analysis log
      analysisLog = {
        ...analysisLog,
        status: 'completed',
        reviews_processed: reviews.length,
        work_reviews_found: workRelatedCount,
        new_work_score: cafeScores.remote_work_score,
        score_change: cafeScores.remote_work_score - (analysisLog.previous_work_score || 0),
        processing_time_ms: Date.now() - startTime,
        confidence_score: cafeScores.ai_confidence_score,
        analysis_summary: `Processed ${reviews.length} reviews, found ${workRelatedCount} work-related. Work score: ${cafeScores.remote_work_score}/10`,
        ai_cost_usd: this.estimateCost(reviews.length)
      };

      // Update cafe with new scores
      await databaseService.updateCafeScores(cafe.id, cafeScores);

      // Log the analysis
      await databaseService.logAIAnalysis(analysisLog as Omit<AIAnalysisLog, 'id' | 'created_at'>);

      console.log(`   ✅ Analysis complete - Work Score: ${cafeScores.remote_work_score}/10`);
      console.log(`   📊 Work-related reviews: ${workRelatedCount}/${reviews.length}`);
      console.log(`   🎯 Confidence: ${Math.round(cafeScores.ai_confidence_score * 100)}%`);

    } catch (error) {
      console.error(`   ❌ Analysis failed for ${cafe.name}:`, error);
      
      // Log the failure
      analysisLog = {
        ...analysisLog,
        status: 'failed',
        processing_time_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
      
      await databaseService.logAIAnalysis(analysisLog as Omit<AIAnalysisLog, 'id' | 'created_at'>);
    }
  }

  /**
   * Analyze a single review with AI
   */
  private async analyzeReview(reviewText: string): Promise<ReviewAnalysisResult> {
    // For now, we'll use a simple keyword-based analysis
    // In production, you'd call Gemini or GPT-4 API here
    
    const workKeywords = [
      'wifi', 'internet', 'laptop', 'work', 'study', 'meeting', 'call',
      'quiet', 'noise', 'outlet', 'power', 'charging', 'focus', 'productive',
      'remote', 'office', 'desk', 'table', 'seating', 'comfortable'
    ];

    const text = reviewText.toLowerCase();
    const matchedKeywords = workKeywords.filter(keyword => text.includes(keyword));
    const isWorkRelated = matchedKeywords.length >= 2;

    // Simple scoring based on keywords and sentiment
    const hasWifiMention = text.includes('wifi') || text.includes('internet');
    const hasNoiseMention = text.includes('quiet') || text.includes('loud') || text.includes('noise');
    const hasOutletMention = text.includes('outlet') || text.includes('power') || text.includes('charging');
    const hasLaptopMention = text.includes('laptop') || text.includes('computer') || text.includes('work');

    // Basic sentiment analysis (you'd use a proper AI model in production)
    const positivePhrases = ['great', 'excellent', 'love', 'perfect', 'amazing', 'good', 'nice'];
    const negativePhrases = ['bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'slow'];
    
    const positiveCount = positivePhrases.filter(phrase => text.includes(phrase)).length;
    const negativeCount = negativePhrases.filter(phrase => text.includes(phrase)).length;
    const sentimentScore = (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);

    const result: ReviewAnalysisResult = {
      is_work_related: isWorkRelated,
      work_relevance_score: isWorkRelated ? Math.min(matchedKeywords.length / 10, 1) : 0,
      extracted_attributes: {},
      sentiment_score: Math.max(-1, Math.min(1, sentimentScore)),
      matched_keywords: matchedKeywords
    };

    // Add specific attribute analysis if work-related
    if (isWorkRelated) {
      if (hasWifiMention) {
        const wifiScore = text.includes('fast') || text.includes('good wifi') ? 8 : 
                         text.includes('slow') || text.includes('bad wifi') ? 3 : 6;
        result.extracted_attributes.wifi_quality = {
          score: wifiScore,
          confidence: 0.7,
          evidence: reviewText.substring(0, 100) + '...'
        };
      }

      if (hasNoiseMention) {
        const noiseScore = text.includes('quiet') ? 2 : 
                          text.includes('loud') ? 8 : 5;
        result.extracted_attributes.noise_level = {
          score: noiseScore,
          confidence: 0.8,
          evidence: reviewText.substring(0, 100) + '...'
        };
      }

      if (hasOutletMention) {
        const outletScore = text.includes('plenty') || text.includes('lots of outlets') ? 9 :
                           text.includes('no outlets') || text.includes('few outlets') ? 2 : 6;
        result.extracted_attributes.outlet_availability = {
          score: outletScore,
          confidence: 0.6,
          evidence: reviewText.substring(0, 100) + '...'
        };
      }

      if (hasLaptopMention) {
        const laptopScore = text.includes('laptop friendly') || text.includes('welcome laptops') ? 9 :
                           text.includes('no laptops') ? 1 : 7;
        result.extracted_attributes.laptop_friendliness = {
          score: laptopScore,
          confidence: 0.7,
          evidence: reviewText.substring(0, 100) + '...'
        };
      }
    }

    return result;
  }

  /**
   * Calculate aggregate cafe scores from review analyses
   */
  private calculateCafeScores(analyses: ReviewAnalysisResult[]): CafeScores {
    const workRelatedAnalyses = analyses.filter(a => a.is_work_related);
    const workReviewsCount = workRelatedAnalyses.length;

    if (workReviewsCount === 0) {
      // Default scores if no work-related reviews
      return {
        wifi_speed: 'adequate',
        outlet_rating: 3,
        noise_level: 'moderate',
        seating_rating: 3,
        laptop_policy: 'allowed',
        good_for_calls: false,
        good_for_focus: false,
        remote_work_score: 5,
        work_summary: 'Limited information available for work assessment',
        vibe_tags: ['general'],
        best_times_to_work: {},
        deal_breakers: [],
        ai_confidence_score: 0.1,
        work_reviews_count: workReviewsCount
      };
    }

    // Calculate averages from work-related reviews
    const avgWifiScore = this.calculateAttributeAverage(workRelatedAnalyses, 'wifi_quality');
    const avgNoiseScore = this.calculateAttributeAverage(workRelatedAnalyses, 'noise_level');
    const avgOutletScore = this.calculateAttributeAverage(workRelatedAnalyses, 'outlet_availability');
    const avgSeatingScore = this.calculateAttributeAverage(workRelatedAnalyses, 'seating_comfort');
    const avgLaptopScore = this.calculateAttributeAverage(workRelatedAnalyses, 'laptop_friendliness');

    // Convert to final ratings
    const wifiSpeed = avgWifiScore >= 7 ? 'fast' : avgWifiScore >= 4 ? 'adequate' : 'slow';
    const noiseLevel = avgNoiseScore <= 3 ? 'quiet' : avgNoiseScore <= 7 ? 'moderate' : 'loud';
    const laptopPolicy = avgLaptopScore >= 7 ? 'encouraged' : avgLaptopScore >= 4 ? 'allowed' : 'discouraged';

    // Calculate remote work score (weighted average)
    const remoteWorkScore = Math.round(
      (avgWifiScore * 0.3 + 
       (10 - avgNoiseScore) * 0.2 + 
       avgOutletScore * 0.2 + 
       avgSeatingScore * 0.15 + 
       avgLaptopScore * 0.15) * 0.8 // Scale to 0-8, leave room for manual adjustments
    );

    // Generate vibe tags based on analysis
    const vibeTags = [];
    if (avgNoiseScore <= 3) vibeTags.push('quiet');
    if (avgLaptopScore >= 7) vibeTags.push('laptop-friendly');
    if (avgWifiScore >= 7) vibeTags.push('fast-wifi');
    if (avgOutletScore >= 7) vibeTags.push('plenty-of-outlets');
    if (remoteWorkScore >= 7) vibeTags.push('work-friendly');

    // Generate work summary
    const workSummary = this.generateWorkSummary({
      wifiSpeed, noiseLevel, laptopPolicy, 
      remoteWorkScore, workReviewsCount
    });

    return {
      wifi_speed: wifiSpeed,
      outlet_rating: Math.max(1, Math.min(5, Math.round(avgOutletScore / 2))),
      noise_level: noiseLevel,
      seating_rating: Math.max(1, Math.min(5, Math.round(avgSeatingScore / 2))),
      laptop_policy: laptopPolicy,
      good_for_calls: avgNoiseScore <= 4,
      good_for_focus: avgNoiseScore <= 3 && avgWifiScore >= 6,
      remote_work_score: Math.max(0, Math.min(10, remoteWorkScore)),
      work_summary: workSummary,
      vibe_tags: vibeTags,
      best_times_to_work: {}, // Could be extracted from time-based reviews
      deal_breakers: avgWifiScore <= 3 ? ['slow wifi'] : [],
      ai_confidence_score: Math.min(1, workReviewsCount / 10), // More reviews = higher confidence
      work_reviews_count: workReviewsCount
    };
  }

  private calculateAttributeAverage(analyses: ReviewAnalysisResult[], attribute: keyof ReviewAnalysisResult['extracted_attributes']): number {
    const relevantAnalyses = analyses.filter(a => a.extracted_attributes[attribute]);
    if (relevantAnalyses.length === 0) return 5; // Default middle score

    const sum = relevantAnalyses.reduce((acc, a) => acc + (a.extracted_attributes[attribute]?.score || 0), 0);
    return sum / relevantAnalyses.length;
  }

  private generateWorkSummary(data: {
    wifiSpeed: string;
    noiseLevel: string;
    laptopPolicy: string;
    remoteWorkScore: number;
    workReviewsCount: number;
  }): string {
    const { wifiSpeed, noiseLevel, laptopPolicy, remoteWorkScore, workReviewsCount } = data;
    
    let summary = '';
    
    if (remoteWorkScore >= 8) {
      summary = 'Excellent for remote work. ';
    } else if (remoteWorkScore >= 6) {
      summary = 'Good for remote work. ';
    } else if (remoteWorkScore >= 4) {
      summary = 'Decent for remote work. ';
    } else {
      summary = 'May not be ideal for remote work. ';
    }

    summary += `${wifiSpeed} WiFi, ${noiseLevel} atmosphere. `;
    
    if (laptopPolicy === 'encouraged') {
      summary += 'Laptops are welcome. ';
    } else if (laptopPolicy === 'discouraged') {
      summary += 'Laptops may not be encouraged. ';
    }

    summary += `Based on ${workReviewsCount} work-related review${workReviewsCount === 1 ? '' : 's'}.`;

    return summary;
  }

  private estimateCost(reviewCount: number): number {
    // Rough estimate: $0.001 per review for AI analysis
    return reviewCount * 0.001;
  }
}

export const aiAnalysisService = new AIAnalysisService();