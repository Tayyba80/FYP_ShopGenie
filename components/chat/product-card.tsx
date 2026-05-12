"use client";

import { motion } from "framer-motion";
import { ExternalLink, Star, Shield, Truck, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { ProductCard as ProductCardType } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function ProductCard({ card, rank }: { card: ProductCardType; rank: number }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const platformColor = card.platform.color || "#6b7280";

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="group bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
    >
      {/* Top: image + badges */}
      <div className="relative h-44 w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <img
          src={card.imageUrl}
          alt={card.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.png";
          }}
        />
        {/* Platform badge */}
        <div
          className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium text-white shadow"
          style={{ backgroundColor: platformColor }}
        >
          {card.platform.name}
        </div>

        {/* Rank badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-gray-700 flex items-center gap-1">
          <Sparkles className="size-3 text-purple-500" /> #{rank}
        </div>

        {/* Trust badge */}
        {card.trustBadge.show && (
          <div className="absolute bottom-3 left-3 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
            <Shield className="size-3" /> {card.trustBadge.text}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col space-y-2">
        <h3 className="font-semibold text-gray-900 line-clamp-2">{card.name}</h3>
        {card.brand && <p className="text-xs text-gray-500">{card.brand}</p>}

        {/* Price & Rating */}
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-purple-700">{card.price.display}</span>
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="text-sm font-medium">{card.rating.display}</span>
            <span className="text-xs text-gray-400">({card.rating.count})</span>
          </div>
        </div>

        {/* Key features as tags */}
        <div className="flex flex-wrap gap-1 mt-1">
          {card.keyFeatures.slice(0, 3).map((feature, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>

        {/* Delivery / availability */}
        {card.delivery && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Truck className="size-3" /> {card.delivery}
          </p>
        )}

        {/* Natural explanation (collapsible) */}
        {card.explanation?.natural && (
          <div className="border-t pt-2 mt-1">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center gap-1 text-sm font-medium text-purple-700 hover:text-purple-900 transition-colors"
            >
              <Sparkles className="size-3" />
              Why this pick
              {showExplanation ? <ChevronUp className="size-4 ml-auto" /> : <ChevronDown className="size-4 ml-auto" />}
            </button>
            <motion.div
              initial={false}
              animate={{ height: showExplanation ? "auto" : 0, opacity: showExplanation ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-line">
                {card.explanation.natural}
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* CTA at bottom */}
      <div className="px-4 pb-4">
        <a href={card.productUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="size-3 mr-1" /> {card.cta.text}
          </Button>
        </a>
      </div>
    </motion.div>
  );
}