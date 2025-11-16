import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { OutscraperResult, OutscraperReview } from '../types/index.js';

//Direct API integration for review scraping functionality, cafe information scraping and search capabilites
// Load environment variables
dotenv.config({ path: '../.ENV' });

const OUTSCRAPER_API_KEY = process.env.OUTSCRAPER_API_KEY;
const OUTSCRAPER_BASE_URL = 'https://api.outscraper.com';

if (!OUTSCRAPER_API_KEY) {
  throw new Error('OUTSCRAPER_API_KEY is required');
}

export class OutscraperService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = OUTSCRAPER_API_KEY!;
    this.baseUrl = OUTSCRAPER_BASE_URL;
  }

  private async makeRequest(endpoint: string, params: Record<string, any>): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add API key and parameters
    url.searchParams.append('key', this.apiKey);
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(item => url.searchParams.append(key, item));
      } else {
        url.searchParams.append(key, String(value));
      }
    });

    console.log(`Making request to: ${endpoint}`);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Outscraper API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Scrape reviews for a Google Place ID
   */
  async scrapeReviews(placeId: string, options?: {
    reviewsLimit?: number;
    language?: string;
    region?: string;
  }): Promise<OutscraperResult | null> {
    try {
      console.log(`Starting review scrape for place ID: ${placeId}`);
      
      const params = {
        query: placeId,
        reviewsLimit: options?.reviewsLimit || 100,
        language: options?.language || 'en',
        region: options?.region || 'us',
        async: 'false', // Wait for results
      };

      const results = await this.makeRequest('/maps/reviews-v3', params);
      
      if (!results || !Array.isArray(results) || results.length === 0) {
        console.log(`No results found for place ID: ${placeId}`);
        return null;
      }

      const result = results[0];
      console.log(`Found ${result.reviews_data?.length || 0} reviews for ${result.name}`);
      
      return {
        place_id: placeId,
        name: result.name || 'Unknown',
        reviews: result.reviews_data || [],
        reviews_count: result.reviews_count || 0,
        rating: result.rating || 0,
      };

    } catch (error) {
      console.error('Error scraping reviews:', error);
      throw new Error(`Failed to scrape reviews for place ID ${placeId}: ${error}`);
    }
  }

  /**
   * Scrape basic cafe information from Google Place ID
   */
  async scrapeCafeInfo(placeId: string): Promise<any> {
    try {
      console.log(`Scraping cafe info for place ID: ${placeId}`);
      
      const params = {
        query: placeId,
        language: 'en',
        region: 'us',
      };

      const results = await this.makeRequest('/maps/search-v3', params);
      
      if (!results || !Array.isArray(results) || results.length === 0) {
        console.log(`No cafe info found for place ID: ${placeId}`);
        return null;
      }

      const result = results[0];
      console.log(`Found cafe info for: ${result.name}`);
      
      return result;

    } catch (error) {
      console.error('Error scraping cafe info:', error);
      throw new Error(`Failed to scrape cafe info for place ID ${placeId}: ${error}`);
    }
  }

  /**
   * Search for cafes in a specific location
   */
  async searchCafes(query: string, options?: {
    limit?: number;
    language?: string;
    region?: string;
  }): Promise<any[]> {
    try {
      console.log(`Searching for cafes: ${query}`);
      
      const params = {
        query: query,
        limit: options?.limit || 20,
        language: options?.language || 'en',
        region: options?.region || 'us',
      };

      const results = await this.makeRequest('/maps/search-v3', params);
      
      if (!Array.isArray(results)) {
        return [];
      }
      
      console.log(`Found ${results.length || 0} cafes for query: ${query}`);
      
      return results;

    } catch (error) {
      console.error('Error searching cafes:', error);
      throw new Error(`Failed to search cafes for query ${query}: ${error}`);
    }
  }
}

export const outscraperService = new OutscraperService();