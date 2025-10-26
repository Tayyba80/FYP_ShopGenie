import { Star, Truck, Shield, CheckCircle, Award } from 'lucide-react';
import { Product } from '@/app/types';

interface ProductCardProps {
  product: Product;
  rank?: number;
}

export default function ProductCard({ product, rank }: ProductCardProps) {
  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return 'text-green-600 bg-green-100';
    if (rating >= 4.0) return 'text-blue-600 bg-blue-100';
    if (rating >= 3.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight pr-2">
            {product.name}
          </h3>
          <div className="flex items-center gap-4 mt-1">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getRatingColor(product.rating)}`}>
              <Star size={14} fill="currentColor" />
              <span className="text-sm font-bold">{product.rating}</span>
            </div>
            <span className="text-sm text-gray-500">({product.reviews.toLocaleString()} reviews)</span>
          </div>
        </div>
        
        {rank && (
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            #{rank}
          </div>
        )}
      </div>
      
      {/* Price and Store */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-2xl font-bold text-gray-900">{formatPrice(product.price)}</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-gray-700">Sold by </span>
          <span className="text-sm font-semibold text-blue-600">{product.store}</span>
        </div>
      </div>
      
      {/* Features */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1 mb-2">
          {product.features.slice(0, 3).map((feature, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1"
            >
              <CheckCircle size={12} className="text-green-600" />
              {feature}
            </span>
          ))}
          {product.features.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
              +{product.features.length - 3} more
            </span>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Truck size={16} className="text-green-600" />
            <span className="font-medium">{product.deliveryTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield size={16} className="text-blue-600" />
            <span>{product.warranty}</span>
          </div>
        </div>
        
        <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium text-sm flex items-center gap-2">
          <Award size={16} />
          View Details
        </button>
      </div>
    </div>
  );
}