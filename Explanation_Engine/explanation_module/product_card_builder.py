from typing import Dict, Any, List

class ProductCardBuilder:
    def __init__(self, config):
        self.config = config
    
    def build(self, ranked_product: Dict[str, Any], rank: int, 
              facts: List[str], llm_explanation: str = None) -> Dict[str, Any]:
        
        product = ranked_product.get('product', {})
        breakdown = ranked_product.get('breakdown', {})
        sentiment = ranked_product.get('sentimentSummary', {})
        
        price = product.get('price', {})
        rating = product.get('rating', {})
        seller = product.get('seller', {})
        
        platform = product.get('platform', 'general')
        platform_config = self.config.PLATFORM_CONFIG.get(platform, {"name": platform.capitalize(), "icon": "🛍️"})
        
        currency = self.config.CURRENCY_SYMBOLS.get(price.get('currency', 'USD'), '$')
        amount = price.get('amount', 0)
        
        return {
            # Basic Info
            "rank": rank,
            "productId": product.get('productId', ''),
            "name": product.get('title', ''),
            "brand": product.get('brand', ''),
            
            # 🆕 URL and Image (your requested fields)
            "productUrl": product.get('productUrl', ''),
            "imageUrl": product.get('mainImageUrl', ''),
            
            # 🆕 Platform Info (your requested field)
            "platform": {
                "name": platform_config.get('name', platform.capitalize()),
                "code": platform,
                "icon": platform_config.get('icon', '🛍️'),
                "color": platform_config.get('color', 'gray')
            },
            
            # Price
            "price": {
                "amount": amount,
                "display": f"{currency}{amount:.2f}",
                "original": price.get('originalAmount'),
                "currency": currency,
                "currencySymbol": currency,
                "shipping": price.get('shippingCost', 0),
                "totalWithShipping": amount + price.get('shippingCost', 0)
            },
            
            # Rating
            "rating": {
                "score": rating.get('average', 0),
                "count": rating.get('count', 0),
                "display": f"{rating.get('average', 0)}/5",
                "stars": "★" * int(rating.get('average', 0)) + "☆" * (5 - int(rating.get('average', 0))),
                "percentage": (rating.get('average', 0) / 5) * 100
            },
            
            # Seller
            "seller": {
                "name": seller.get('name', ''),
                "isVerified": seller.get('isVerified', False),
                "rating": seller.get('rating')
            },
            
            # Availability
            "availability": product.get('availability', 'in_stock'),
            "delivery": product.get('estimatedDelivery', ''),
            
            # Features
            "keyFeatures": product.get('keyFeatures', [])[:3],
            "matchingFeatures": ranked_product.get('matchingFeatures', [])[:3],
            
            # Badges and Trust
            "badges": self._get_badges(breakdown, ranked_product.get('score', 0), rank),
            "trustBadge": self._get_trust_badge(seller, breakdown),
            
            # Scores
            "scores": {
                "overall": ranked_product.get('score', 0),
                "price": breakdown.get('priceScore', 0),
                "rating": breakdown.get('ratingScore', 0),
                "features": breakdown.get('featureScore', 0),
                "trust": breakdown.get('credibilityFactor', 0)
            },
            
            # Sentiment
            "sentiment": {
                "positive": sentiment.get('positive', 0),
                "spamRatio": sentiment.get('spamRatio', 0)
            },
            
            # Explanation (Your Module's Output)
            "explanation": {
                "bulletPoints": facts,
                "short": self._get_short_explanation(ranked_product),
                "natural": llm_explanation,
                "rankingReason": ranked_product.get('rankingReason', ''),
                "llmUsed": llm_explanation is not None
            },
            
            # CTA
            "cta": {
                "text": f"View on {platform_config.get('name', platform.capitalize())} →",
                "url": product.get('productUrl', '')
            }
        }
    
    def _get_badges(self, breakdown: Dict, score: float, rank: int) -> List[Dict]:
        badges = []
        
        # Rank badges
        if rank == 1:
            badges.append({"text": "🏆 Best Overall", "type": "gold", "priority": 1})
        elif rank == 2:
            badges.append({"text": "🥈 Runner Up", "type": "silver", "priority": 2})
        elif rank == 3:
            badges.append({"text": "🥉 Great Choice", "type": "bronze", "priority": 3})
        
        # Value badge
        if breakdown.get('priceScore', 0) > 0.85:
            badges.append({"text": "💰 Best Value", "type": "green", "priority": 1})
        
        # Rating badge
        if breakdown.get('ratingScore', 0) > 0.95:
            badges.append({"text": "⭐ Top Rated", "type": "gold", "priority": 1})
        
        # Score badge
        if score >= 9.5:
            badges.append({"text": "🔥 Exceptional", "type": "red", "priority": 2})
        elif score >= 9:
            badges.append({"text": "✨ Excellent", "type": "blue", "priority": 2})
        
        # Sort by priority and return top 4
        badges.sort(key=lambda x: x.get('priority', 99))
        return badges[:4]
    
    def _get_trust_badge(self, seller: Dict, breakdown: Dict) -> Dict:
        trust = breakdown.get('credibilityFactor', 0)
        
        if seller.get('isVerified') and trust > 0.85:
            return {"show": True, "text": "✓ Verified Premium Seller", "type": "premium"}
        if trust > 0.7:
            return {"show": True, "text": "✓ Trusted Seller", "type": "standard"}
        return {"show": False, "text": "", "type": "none"}
    
    def _get_short_explanation(self, ranked_product: Dict) -> str:
        breakdown = ranked_product.get('breakdown', {})
        product = ranked_product.get('product', {})
        
        if breakdown.get('priceScore', 0) > 0.85:
            price = product.get('price', {})
            currency = self.config.CURRENCY_SYMBOLS.get(price.get('currency', 'USD'), '$')
            return f"💰 Best value at {currency}{price.get('amount', 0)}"
        if breakdown.get('ratingScore', 0) > 0.9:
            rating = product.get('rating', {})
            return f"⭐ Top-rated with {rating.get('average', 0)} stars"
        if ranked_product.get('matchingFeatures'):
            return f"✨ Great for {ranked_product['matchingFeatures'][0]}"
        return "🎯 Solid choice"