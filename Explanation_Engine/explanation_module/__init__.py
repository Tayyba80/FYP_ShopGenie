# backend/explanation_module/__init__.py
"""
ShopGenie Explanation Module
Converts ranked products into natural language explanations and product cards
"""

from .explanation_module import ShopGenieExplanationModule
from .config import Config
from .fact_extractor import FactExtractor
from .llm_rewriter import LLMRewriter
from .product_card_builder import ProductCardBuilder

__all__ = [
    'ShopGenieExplanationModule',
    'Config', 
    'FactExtractor',
    'LLMRewriter',
    'ProductCardBuilder'
]