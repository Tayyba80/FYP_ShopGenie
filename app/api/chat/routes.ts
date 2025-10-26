import { NextRequest, NextResponse } from 'next/server';
import { parseUserQuery } from '@/app/lib/queryParser';
import { searchProducts } from '@/app/lib/searchEngine';
import { rankProducts, generateExplanation } from '@/app/lib/rankingEngine';
import { getFromCache, setToCache } from '@/app/lib/cache';
import { ChatResponse } from '@/app/types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { message } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Check cache first
    const cachedResult = getFromCache(message);
    if (cachedResult) {
      console.log('Serving from cache:', message);
      return NextResponse.json(cachedResult);
    }
    
    // Step 1: Parse user query
    const parsedQuery = parseUserQuery(message);
    console.log('Parsed Query:', parsedQuery);
    
    // Step 2: Search products
    const searchResults = searchProducts(parsedQuery);
    console.log('Search Results:', searchResults.length);
    
    // Step 3: Rank products
    const rankedProducts = rankProducts(searchResults, parsedQuery);
    console.log('Ranked Products:', rankedProducts.length);
    
    // Step 4: Generate explanation
    const explanation = generateExplanation(rankedProducts, parsedQuery);
    
    // Prepare final response
    const response: ChatResponse = {
      products: rankedProducts,
      explanation: explanation,
      originalQuery: message,
      totalResults: rankedProducts.length,
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    setToCache(message, response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}