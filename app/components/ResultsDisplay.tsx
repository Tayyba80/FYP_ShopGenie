import ProductCard from './ProductCard';
import { ChatResponse } from '@/app/types';
import { Info, TrendingUp } from 'lucide-react';

interface ResultDisplayProps {
  results: ChatResponse;
}

export default function ResultDisplay({ results }: ResultDisplayProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 h-fit">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={24} className="text-green-600" />
            Best Matches
          </h2>
          <p className="text-gray-600 mt-1">
            Found {results.totalResults} products for "{results.originalQuery}"
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date(results.timestamp).toLocaleTimeString()}
        </div>
      </div>
      
      {/* Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Why we recommend these:</h3>
            <p className="text-blue-800 text-sm leading-relaxed">{results.explanation}</p>
          </div>
        </div>
      </div>
      
      {/* Products Grid */}
      <div className="space-y-4">
        {results.products.map((product, index) => (
          <div key={product.id} className="relative">
            {index === 0 && (
              <div className="absolute -top-2 -left-2 z-10">
                <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  BEST CHOICE
                </span>
              </div>
            )}
            <ProductCard product={product} rank={index + 1} />
          </div>
        ))}
      </div>
      
      {results.products.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">No products found</div>
          <p className="text-gray-500 text-sm">
            Try adjusting your search terms or check the sample queries.
          </p>
        </div>
      )}
    </div>
  );
}