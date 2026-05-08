# # backend/explanation_module/tests/test_module.py
# import json
# import sys
# import os

# sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# from explanation_module import ShopGenieExplanationModule

# # Sample ranked product (using YOUR exact structure)
# SAMPLE_RANKED_PRODUCT = {
#     "product": {
#         "productId": "daraz_SONY1000XM5",
#         "platform": "daraz",
#         "title": "Sony WH-1000XM5 Wireless Headphones",
#         "productUrl": "https://daraz.com/sony",
#         "mainImageUrl": "https://example.com/sony.jpg",
#         "brand": "Sony",
#         "category": "Electronics > Headphones",
#         "description": "Premium noise cancelling headphones",
#         "keyFeatures": ["Noise Cancellation", "30hr Battery", "Comfort Fit"],
#         "price": {"amount": 178, "currency": "USD", "originalAmount": 399, "shippingCost": 0},
#         "availability": "in_stock",
#         "estimatedDelivery": "2-3 days",
#         "rating": {"average": 4.8, "count": 12450},
#         "reviews": [{"text": "Amazing product", "rating": 5}],
#         "specifications": {"battery": "30hr"},
#         "seller": {"name": "Sony Official", "isVerified": True},
#         "timestamp": "2026-05-08T10:00:00Z"
#     },
#     "score": 9.2,
#     "breakdown": {
#         "priceScore": 0.92, "ratingScore": 0.98, "sentimentScore": 0.94,
#         "featureScore": 0.96, "credibilityFactor": 0.97,
#         "hardConstraintPenalty": 0, "total": 9.2
#     },
#     "matchingFeatures": ["Noise Cancellation", "Battery Life"],
#     "sentimentSummary": {"positive": 94, "negative": 3, "neutral": 3, "spamRatio": 0.02, "confidence": 0.96},
#     "rankingReason": "Best value premium headphones"
# }

# def test():
#     module = ShopGenieExplanationModule()
#     result = module.process("wireless headphones under 200", [SAMPLE_RANKED_PRODUCT])
    
#     print("\n" + "="*60)
#     print("CHAT RESPONSE:")
#     print("="*60)
#     print(result['chat_response'])
    
#     print("\n" + "="*60)
#     print("PRODUCT CARD:")
#     print("="*60)
#     card = result['product_cards'][0]
#     print(f"Name: {card['name']}")
#     print(f"Price: {card['price']['display']}")
#     print(f"Rating: {card['rating']['display']} ({card['rating']['count']:,} reviews)")
#     print(f"\nBullet Points:")
#     for point in card['explanation']['bulletPoints']:
#         print(f"  • {point}")
#     if card['explanation']['natural']:
#         print(f"\nAI Explanation: {card['explanation']['natural']}")
    
#     print("\n" + "="*60)
#     print(f"STATS: {result['stats']}")

# if __name__ == "__main__":
#     test()

# backend/explanation_module/tests/test_module.py
"""
Test with multiple products (5-6 items)
"""

import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from explanation_module import ShopGenieExplanationModule

# Sample product template
def create_sample_product(product_id, name, brand, price, rating, review_count, platform, features):
    return {
        "product": {
            "productId": product_id,
            "platform": platform,
            "title": name,
            "productUrl": f"https://{platform}.com/{product_id}",
            "mainImageUrl": f"https://images.{platform}.com/{product_id}.jpg",
            "brand": brand,
            "category": "Electronics > Headphones",
            "description": f"Premium {brand} headphones with great features",
            "keyFeatures": features,
            "price": {"amount": price, "currency": "USD", "originalAmount": price * 1.5, "shippingCost": 0},
            "availability": "in_stock",
            "estimatedDelivery": "2-5 days",
            "rating": {"average": rating, "count": review_count},
            "reviews": [{"text": "Great product", "rating": 5}],
            "specifications": {"feature": "value"},
            "seller": {"name": f"{brand} Official", "isVerified": True},
            "timestamp": "2026-05-08T10:00:00Z"
        },
        "score": 7 + (price / 100),
        "breakdown": {
            "priceScore": min(0.95, 1 - (price / 400)),
            "ratingScore": rating / 5,
            "sentimentScore": 0.85 + (rating / 50),
            "featureScore": 0.85,
            "credibilityFactor": 0.92,
            "hardConstraintPenalty": 0,
            "total": 8.5
        },
        "matchingFeatures": features[:2],
        "sentimentSummary": {"positive": 85 + int(rating * 5), "negative": 5, "neutral": 10, "spamRatio": 0.02, "confidence": 0.95},
        "rankingReason": f"Great {features[0].lower()} performance"
    }

# Create 5 sample products
SAMPLE_PRODUCTS = [
    create_sample_product("sony_xm5", "Sony WH-1000XM5", "Sony", 178, 4.9, 12450, "daraz", 
                         ["Noise Cancellation", "30hr Battery", "Comfort Fit"]),
    create_sample_product("bose_qc45", "Bose QuietComfort 45", "Bose", 199, 4.8, 8900, "temu",
                         ["Acoustic Noise Cancelling", "24hr Battery", "Lightweight"]),
    create_sample_product("jbl_770", "JBL Tune 770NC", "JBL", 129, 4.6, 3450, "daraz",
                         ["Active Noise Cancelling", "70hr Battery", "Foldable"]),
    create_sample_product("m4_sony", "Sony WH-CH720N", "Sony", 98, 4.5, 5678, "temu",
                         ["Noise Cancelling", "50hr Battery", "Lightweight Design"]),
    create_sample_product("sg_pro", "Soundcore Space Q45", "Soundcore", 149, 4.7, 2345, "daraz",
                         ["Adaptive Noise Cancelling", "65hr Battery", "LDAC Support"]),
]

def test_multiple_products():
    """Test with 5 products"""
    
    print("\n" + "="*70)
    print("🧪 SHOPGENIE EXPLANATION MODULE - MULTIPLE PRODUCTS TEST")
    print("="*70)
    
    module = ShopGenieExplanationModule()
    result = module.process("wireless headphones under 200", SAMPLE_PRODUCTS)
    
    print("\n" + "="*70)
    print("💬 CHAT RESPONSE")
    print("="*70)
    print(result['chat_response'])
    
    print("\n" + "="*70)
    print(f"🃏 PRODUCT CARDS ({len(result['product_cards'])} products)")
    print("="*70)
    
    for card in result['product_cards']:
        print(f"\n{'='*50}")
        print(f"📦 Rank #{card['rank']}: {card['name']}")
        print(f"   🏷️  Brand: {card['brand']}")
        print(f"   🌐 Platform: {card['platform']['name']} {card['platform']['icon']}")
        print(f"   🔗 Product URL: {card['productUrl']}")
        print(f"   🖼️  Image URL: {card['imageUrl']}")
        print(f"   💰 Price: {card['price']['display']}")
        print(f"   ⭐ Rating: {card['rating']['display']} ({card['rating']['count']:,} reviews)")
        
        print(f"\n   🎯 Badges:")
        for badge in card['badges']:
            print(f"      - {badge['text']}")
        
        print(f"\n   📝 Explanation Bullet Points:")
        for point in card['explanation']['bulletPoints']:
            print(f"      {point}")
        
        if card['explanation']['natural']:
            print(f"\n   ✨ AI Natural Explanation:")
            print(f"      \"{card['explanation']['natural'][:150]}...\"")
        
        print(f"\n   🏷️  Seller: {card['seller']['name']}")
        if card['trustBadge']['show']:
            print(f"   ✅ Trust Badge: {card['trustBadge']['text']}")
        
        print(f"\n   🔘 CTA: {card['cta']['text']}")
    
    print("\n" + "="*70)
    print("📊 STATISTICS")
    print("="*70)
    print(f"Total Products Processed: {result['stats']['products_processed']}")
    print(f"LLM Success Count: {result['stats']['llm_success_count']}")
    print(f"LLM Success Rate: {result['stats']['llm_success_rate']}")
    
    print("\n" + "="*70)
    print("💡 SUGGESTED FOLLOW-UPS")
    print("="*70)
    for i, followup in enumerate(result['suggested_followups'], 1):
        print(f"   {i}. {followup}")
    
    print("\n" + "="*70)
    print("✅ TEST COMPLETED SUCCESSFULLY!")
    print("="*70 + "\n")
    
    return result

def test_single_product():
    """Quick test with single product"""
    
    module = ShopGenieExplanationModule()
    result = module.process("wireless headphones under 200", [SAMPLE_PRODUCTS[0]])
    
    print("\n" + "="*60)
    print("SINGLE PRODUCT TEST")
    print("="*60)
    print(f"Chat: {result['chat_response'][:200]}...")
    print(f"Stats: {result['stats']}")
    
    return result

if __name__ == "__main__":
    # Test with single product first
    test_single_product()
    
    # Test with multiple products
    test_multiple_products()