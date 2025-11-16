import { supabase } from './supabase.js';
import { CafeReview, Cafe, AIAnalysisLog, CafeNeedingAnalysis } from '../types/index.js';

export class DatabaseService {
  /**
   * Store reviews in the database (Updated for new schema)
   */
  async storeReviews(cafeId: string, reviews: any[]): Promise<CafeReview[]> {
    try {
      console.log(`Storing ${reviews.length} reviews for cafe ${cafeId}`);
      
      const reviewsToInsert: Omit<CafeReview, 'id'>[] = reviews.map(review => ({
        cafe_id: cafeId,
        author_name: review.author_name,
        rating: review.rating,
        review_text: review.text || review.review_text,
        review_date: new Date(review.time * 1000).toISOString(), // Convert Unix timestamp
        source: 'google',
        google_review_id: review.google_review_id || `${cafeId}_${review.time}_${review.author_name}`,
        matched_keywords: [], // Will be populated by AI analysis
        is_work_related: false, // Will be determined by AI
        work_relevance_score: 0, // Will be calculated by AI
        extracted_attributes: {}, // Will be populated by AI
        sentiment_score: 0, // Will be calculated by AI
        scraped_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('cafe_reviews')
        .insert(reviewsToInsert)
        .select();

      if (error) {
        console.error('Error storing reviews:', error);
        throw error;
      }

      // Update cafe's review count
      await this.updateCafeReviewCount(cafeId, reviews.length);

      console.log(`Successfully stored ${data?.length || 0} reviews`);
      return data || [];

    } catch (error) {
      console.error('Error in storeReviews:', error);
      throw error;
    }
  }

  /**
   * Update cafe's review count after scraping
   */
  async updateCafeReviewCount(cafeId: string, newReviewCount: number): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_cafe_review_count', {
        cafe_id: cafeId,
        increment_by: newReviewCount
      });

      if (error) {
        // Fallback: manual update
        const { data: cafe } = await supabase
          .from('cafes')
          .select('total_reviews_scraped')
          .eq('id', cafeId)
          .single();

        if (cafe) {
          await supabase
            .from('cafes')
            .update({ 
              total_reviews_scraped: (cafe.total_reviews_scraped || 0) + newReviewCount,
              last_review_scraped_at: new Date().toISOString()
            })
            .eq('id', cafeId);
        }
      }
    } catch (error) {
      console.error('Error updating cafe review count:', error);
    }
  }

  /**
   * Mark cafe as needing AI reanalysis
   */
  async markCafeForReanalysis(cafeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('cafes')
        .update({ 
          needs_ai_reanalysis: true,
          last_scraped_at: new Date().toISOString()
        })
        .eq('id', cafeId);

      if (error) {
        console.error('Error marking cafe for reanalysis:', error);
        throw error;
      }

      console.log(`Marked cafe ${cafeId} for AI reanalysis`);

    } catch (error) {
      console.error('Error in markCafeForReanalysis:', error);
      throw error;
    }
  }

  /**
   * Get cafe by ID
   */
  async getCafe(cafeId: string): Promise<Cafe | null> {
    try {
      const { data, error } = await supabase
        .from('cafes')
        .select('*')
        .eq('id', cafeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows found
        }
        throw error;
      }

      return data;

    } catch (error) {
      console.error('Error fetching cafe:', error);
      throw error;
    }
  }

  /**
   * Create or update cafe
   */
  async upsertCafe(cafe: Partial<Cafe>): Promise<Cafe> {
    try {
      const { data, error } = await supabase
        .from('cafes')
        .upsert(cafe)
        .select()
        .single();

      if (error) {
        console.error('Error upserting cafe:', error);
        throw error;
      }

      return data;

    } catch (error) {
      console.error('Error in upsertCafe:', error);
      throw error;
    }
  }

  /**
   * Get cafes that need AI reanalysis (Updated for new schema)
   */
  async getCafesNeedingReanalysis(limit: number = 10): Promise<CafeNeedingAnalysis[]> {
    try {
      const { data, error } = await supabase
        .from('cafes')
        .select('id, name, total_reviews_scraped, work_reviews_count, last_ai_analysis_at, needs_ai_reanalysis')
        .eq('needs_ai_reanalysis', true)
        .order('last_review_scraped_at', { ascending: true }) // Oldest first
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching cafes needing reanalysis:', error);
      throw error;
    }
  }

  /**
   * Log AI analysis run
   */
  async logAIAnalysis(log: Omit<AIAnalysisLog, 'id' | 'created_at'>): Promise<AIAnalysisLog> {
    try {
      const { data, error } = await supabase
        .from('ai_analysis_log')
        .insert({
          ...log,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging AI analysis:', error);
        throw error;
      }

      return data;

    } catch (error) {
      console.error('Error in logAIAnalysis:', error);
      throw error;
    }
  }

  /**
   * Update cafe scores after AI analysis
   */
  async updateCafeScores(cafeId: string, scores: {
    wifi_speed: 'fast' | 'adequate' | 'slow';
    outlet_rating: number;
    noise_level: 'quiet' | 'moderate' | 'loud';
    seating_rating: number;
    laptop_policy: 'encouraged' | 'allowed' | 'discouraged';
    good_for_calls: boolean;
    good_for_focus: boolean;
    remote_work_score: number;
    work_summary?: string;
    vibe_tags: string[];
    best_times_to_work?: Record<string, boolean>;
    deal_breakers?: string[];
    ai_confidence_score: number;
    work_reviews_count: number;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('cafes')
        .update({
          ...scores,
          last_ai_analysis_at: new Date().toISOString(),
          needs_ai_reanalysis: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', cafeId);

      if (error) {
        console.error('Error updating cafe scores:', error);
        throw error;
      }

      console.log(`Updated scores for cafe ${cafeId}`);

    } catch (error) {
      console.error('Error in updateCafeScores:', error);
      throw error;
    }
  }

  /**
   * Update review analysis results
   */
  async updateReviewAnalysis(reviewId: string, analysis: {
    is_work_related: boolean;
    work_relevance_score: number;
    extracted_attributes: Record<string, any>;
    sentiment_score: number;
    matched_keywords: string[];
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('cafe_reviews')
        .update({
          ...analysis,
          analyzed_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) {
        console.error('Error updating review analysis:', error);
        throw error;
      }

    } catch (error) {
      console.error('Error in updateReviewAnalysis:', error);
      throw error;
    }
  }

  /**
   * Get reviews for a cafe
   */
  async getCafeReviews(cafeId: string, limit: number = 100): Promise<CafeReview[]> {
    try {
      const { data, error } = await supabase
        .from('cafe_reviews')
        .select('*')
        .eq('cafe_id', cafeId)
        .order('time', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching cafe reviews:', error);
      throw error;
    }
  }
}

export const databaseService = new DatabaseService();