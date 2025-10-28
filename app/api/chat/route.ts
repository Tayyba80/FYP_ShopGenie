import { NextRequest, NextResponse } from 'next/server';
import { parseUserQuery } from '../../lib/queryParser';
import { searchProducts } from '../../lib/searchEngine';
import { rankProducts, generateExplanation } from '../../lib/rankingEngine';
import { getFromCache, setToCache } from '../../lib/cache';
import { ChatResponse } from '../../types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { message } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }
    console.log('checking cache');
    // Check cache first
    const cachedResult = getFromCache(message);
    console.log(cachedResult)
    if (cachedResult) {
      console.log('Serving from cache:', message);
      return NextResponse.json(cachedResult);
    }
    
    //parse user query
    const parsedQuery = parseUserQuery(message);
    console.log('Parsed Query:', parsedQuery);
    
    //search products
    const searchResults = searchProducts(parsedQuery);
    console.log('Search Results:', searchResults.length);
    
    //rank products
    const rankedProducts = rankProducts(searchResults, parsedQuery);
    console.log('Ranked Products:', rankedProducts.length);
    
    //generate explanation
    const explanation = generateExplanation(rankedProducts, parsedQuery);
    
    //final response
    const response: ChatResponse = {
      products: rankedProducts,
      explanation: explanation,
      originalQuery: message,
      totalResults: rankedProducts.length,
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    setToCache(message, response);
    console.log('set cache for :', response);
    console.log('Response in routes');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}