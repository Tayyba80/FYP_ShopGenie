# backend/explanation_module/fact_extractor.py
import random
from typing import List, Dict, Any

class FactExtractor:
    def __init__(self, config):
        self.config = config
        self._init_phrases()
    
    def _init_phrases(self):
        # Price phrases
        self.price_phrases = {
            'excellent': [
                "🔥 Incredible value at {price}{currency}",
                "💰 Best price — {price}{currency}",
                "🎯 Unbeatable {price}{currency}",
                "💎 Amazing deal: {price}{currency}"
            ],
            'good': [
                "💰 Great value at {price}{currency}",
                "💵 Excellent price: {price}{currency}",
                "✨ Very competitive at {price}{currency}"
            ],
            'decent': [
                "💰 {price}{currency}",
                "💵 Available for {price}{currency}",
                "📦 Costs {price}{currency}"
            ]
        }
        
        # Rating phrases
        self.rating_phrases = {
            'exceptional': [
                "⭐ Exceptional {rating}/5",
                "🏆 Top-rated: {rating}/5",
                "👑 Elite {rating}⭐ rating"
            ],
            'great': [
                "⭐ Outstanding {rating}/5",
                "📊 {rating} stars — well above average",
                "⭐ Highly rated at {rating}/5"
            ],
            'good': [
                "⭐ {rating}/5 stars",
                "📊 Rated {rating} stars",
                "⭐ Solid {rating}-star rating"
            ]
        }
        
        # Sentiment phrases
        self.sentiment_phrases = {
            'excellent': [
                "🗣️ {positive}% of users recommend this",
                "❤️ {positive}% positive feedback",
                "🎉 {positive}% buyer satisfaction"
            ],
            'good': [
                "🗣️ {positive}% positive reviews",
                "👍 {positive}% user satisfaction",
                "📢 {positive}% recommend this"
            ]
        }
        
        # Feature match phrases
        self.feature_phrases = {
            'excellent': [
                "✨ Perfect match for: {features}",
                "🎯 Great for {features}",
                "⭐ Top pick for {features}"
            ],
            'good': [
                "✨ Good for {features}",
                "🎯 Matches {features}",
                "✓ Great {features} performance"
            ]
        }
        
        # Trust phrases
        self.trust_phrases = {
            'excellent': [
                "✅ Verified premium seller",
                "🛡️ Highly trusted store",
                "🔒 Authentic reviews only"
            ],
            'good': [
                "✅ Verified seller",
                "🛡️ Trusted store",
                "✓ Authentic feedback"
            ]
        }
        
        # Overall phrases
        self.overall_phrases = {
            'excellent': ["🏆 {score}/10 — exceptional!", "⭐ {score}/10 — top choice"],
            'good': ["📊 {score}/10 — strong pick", "✓ {score}/10 — recommended"],
            'solid': ["📊 {score}/10 — solid choice", "👍 {score}/10 — good value"],
            'decent': ["📊 {score}/10 — decent option", "✓ {score}/10 — consider this"]
        }
    
    def extract_facts(self, ranked_product: Dict[str, Any]) -> List[str]:
        facts = []
        
        product = ranked_product.get('product', {})
        breakdown = ranked_product.get('breakdown', {})
        sentiment = ranked_product.get('sentimentSummary', {})
        matching_features = ranked_product.get('matchingFeatures', [])
        
        # Price
        price_fact = self._get_price_fact(product, breakdown)
        if price_fact:
            facts.append(price_fact)
        
        # Rating
        rating_fact = self._get_rating_fact(product, breakdown)
        if rating_fact:
            facts.append(rating_fact)
        
        # Sentiment
        sentiment_fact = self._get_sentiment_fact(sentiment)
        if sentiment_fact:
            facts.append(sentiment_fact)
        
        # Features
        feature_fact = self._get_feature_fact(breakdown, matching_features)
        if feature_fact:
            facts.append(feature_fact)
        
        # Trust
        trust_fact = self._get_trust_fact(product, breakdown)
        if trust_fact:
            facts.append(trust_fact)
        
        # Overall
        facts.append(self._get_overall_fact(ranked_product))
        
        return facts[:self.config.MAX_BULLET_POINTS]
    
    def _get_price_fact(self, product: Dict, breakdown: Dict) -> str:
        score = breakdown.get('priceScore', 0)
        if score < self.config.PRICE_THRESHOLD:
            return None
        
        price = product.get('price', {})
        amount = price.get('amount', 0)
        currency = self.config.CURRENCY_SYMBOLS.get(price.get('currency', 'USD'), '$')
        
        if score > 0.9:
            tier = 'excellent'
        elif score > 0.8:
            tier = 'good'
        else:
            tier = 'decent'
        
        phrase = random.choice(self.price_phrases[tier])
        result = phrase.format(price=amount, currency=currency)
        
        # Add discount if available
        original = price.get('originalAmount')
        if original and original > amount:
            discount = int((1 - amount / original) * 100)
            result += f" (save {discount}%)"
        
        return result
    
    def _get_rating_fact(self, product: Dict, breakdown: Dict) -> str:
        score = breakdown.get('ratingScore', 0)
        if score < self.config.RATING_THRESHOLD:
            return None
        
        rating = product.get('rating', {})
        avg = rating.get('average', 0)
        count = rating.get('count', 0)
        
        if score > 0.95:
            tier = 'exceptional'
        elif score > 0.85:
            tier = 'great'
        else:
            tier = 'good'
        
        phrase = random.choice(self.rating_phrases[tier])
        result = phrase.format(rating=avg)
        
        if count > 100:
            result += f" from {count:,} reviews"
        
        return result
    
    def _get_sentiment_fact(self, sentiment: Dict) -> str:
        confidence = sentiment.get('confidence', 0)
        positive = sentiment.get('positive', 0)
        
        sentiment_score = confidence * (positive / 100)
        if sentiment_score < self.config.SENTIMENT_THRESHOLD:
            return None
        
        tier = 'excellent' if positive > 85 else 'good'
        phrase = random.choice(self.sentiment_phrases[tier])
        return phrase.format(positive=positive)
    
    def _get_feature_fact(self, breakdown: Dict, features: List[str]) -> str:
        score = breakdown.get('featureScore', 0)
        if score < self.config.FEATURE_THRESHOLD or not features:
            return None
        
        if len(features) == 1:
            features_str = features[0]
        elif len(features) == 2:
            features_str = f"{features[0]} and {features[1]}"
        else:
            features_str = f"{features[0]}, {features[1]}, and {features[2]}"
        
        tier = 'excellent' if score > 0.9 else 'good'
        phrase = random.choice(self.feature_phrases[tier])
        return phrase.format(features=features_str)
    
    def _get_trust_fact(self, product: Dict, breakdown: Dict) -> str:
        score = breakdown.get('credibilityFactor', 0)
        if score < self.config.TRUST_THRESHOLD:
            return None
        
        seller = product.get('seller', {})
        if not seller.get('isVerified', False) and score < 0.85:
            return None
        
        tier = 'excellent' if score > 0.95 else 'good'
        phrase = random.choice(self.trust_phrases[tier])
        return phrase
    
    def _get_overall_fact(self, ranked_product: Dict) -> str:
        score = ranked_product.get('score', 0)
        
        if score >= 9:
            tier = 'excellent'
        elif score >= 8:
            tier = 'good'
        elif score >= 7:
            tier = 'solid'
        else:
            tier = 'decent'
        
        phrase = random.choice(self.overall_phrases[tier])
        return phrase.format(score=score)
    
    def to_bullet_string(self, facts: List[str]) -> str:
        return "\n".join(f"• {fact}" for fact in facts)