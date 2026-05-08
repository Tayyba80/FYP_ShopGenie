from typing import List, Dict, Any
from datetime import datetime

from .config import Config
from .fact_extractor import FactExtractor
from .llm_rewriter import LLMRewriter
from .product_card_builder import ProductCardBuilder

class ShopGenieExplanationModule:
    def __init__(self, config=None):
        self.config = config or Config()
        self.fact_extractor = FactExtractor(self.config)
        self.llm_rewriter = LLMRewriter(self.config)
        self.card_builder = ProductCardBuilder(self.config)
        self.stats = {"total": 0, "llm_success": 0}
    
    def process(self, query: str, ranked_products: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process multiple ranked products (5-6 items)
        
        Args:
            query: User's search query
            ranked_products: List of RankedProduct objects (typically 5-6 items)
        
        Returns:
            Dict with chat response, product cards, and suggestions
        """
        
        # Limit to top 6 products maximum
        products_to_process = ranked_products[:6]
        total_received = len(ranked_products)
        total_processing = len(products_to_process)
        
        print(f"📊 Processing {total_processing} products (received {total_received})")
        
        cards = []
        for rank, rp in enumerate(products_to_process, 1):
            print(f"   🔍 Processing product #{rank}: {rp.get('product', {}).get('title', 'Unknown')[:40]}...")
            
            facts = self.fact_extractor.extract_facts(rp)
            bullet_str = self.fact_extractor.to_bullet_string(facts)
            
            llm_text = None
            if self.config.USE_LLM:
                product = rp.get('product', {})
                llm_text = self.llm_rewriter.rewrite(
                    product.get('title', ''),
                    product.get('platform', ''),
                    bullet_str
                )
            
            card = self.card_builder.build(rp, rank, facts, llm_text)
            cards.append(card)
            
            self.stats["total"] += 1
            if llm_text:
                self.stats["llm_success"] += 1
        
        # Build chat response with count of products
        chat_response = self._build_chat_response(query, cards, total_processing)
        
        return {
            "query": query,
            "timestamp": datetime.now().isoformat(),
            "total_products": total_processing,
            "total_found": total_received,
            "chat_response": chat_response,
            "product_cards": cards,
            "suggested_followups": self._get_followups(cards, query),
            "stats": self._get_stats()
        }
    
    def _build_chat_response(self, query: str, cards: List[Dict], total: int) -> str:
        """Build chat response with multiple products highlighted"""
        
        if not cards:
            return f"Sorry, no products found for '{query}'. Try a different search!"
        
        # Opening based on number of products
        if total == 1:
            opening = f"🔍 I found 1 great option for '{query}'!"
        else:
            opening = f"🔍 I found {total} great options for '{query}'!"
        
        response = opening + "\n\n"
        
        # Top pick highlight
        top = cards[0]
        response += f"🏆 **Top pick**: {top['name']}\n"
        response += f"   • {top['price']['display']} | ⭐ {top['rating']['display']}\n"
        
        if top.get('matchingFeatures'):
            response += f"   • Best for: {', '.join(top['matchingFeatures'][:2])}\n"
        
        if top['explanation']['natural']:
            response += f"\n✨ {top['explanation']['natural']}\n"
        
        # Brief of other products if more than 1
        if len(cards) > 1:
            response += f"\n📋 Also check out:\n"
            for card in cards[1:3]:  # Show next 2 products
                response += f"   • {card['name'][:35]} — {card['price']['display']} | ⭐ {card['rating']['display']}\n"
        
        response += f"\n💡 Scroll down to see all {total} recommendations with detailed product cards!"
        
        return response
    
    def _get_followups(self, cards: List[Dict], query: str) -> List[str]:
        """Generate smarter follow-up questions based on products"""
        
        followups = []
        
        # General follow-ups
        if len(cards) >= 2:
            followups.append(f"Compare the top 2 products")
        
        followups.append(f"Show me cheaper options")
        
        # Feature-based follow-ups from top product
        if cards and cards[0].get('matchingFeatures'):
            main_feature = cards[0]['matchingFeatures'][0]
            followups.append(f"Tell me more about {main_feature}")
        
        # Price-based follow-up
        prices = [c['price']['amount'] for c in cards if c.get('price', {}).get('amount')]
        if prices and len(prices) > 1:
            followups.append(f"What's the best value under ${min(prices) + 50:.0f}?")
        
        # Platform-based follow-up
        platforms = set(c.get('platform', {}).get('name', '') for c in cards)
        if len(platforms) > 1:
            followups.append(f"Show only {list(platforms)[0]} products")
        
        return followups[:5]  # Max 5 suggestions
    
    def _get_stats(self) -> Dict:
        total = max(1, self.stats["total"])
        return {
            "products_processed": self.stats["total"],
            "llm_success_count": self.stats["llm_success"],
            "llm_success_rate": f"{(self.stats['llm_success'] / total * 100):.1f}%"
        }