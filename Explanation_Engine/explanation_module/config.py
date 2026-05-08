# backend/explanation_module/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Score thresholds (0-1)
    PRICE_THRESHOLD = 0.70
    RATING_THRESHOLD = 0.70
    SENTIMENT_THRESHOLD = 0.70
    FEATURE_THRESHOLD = 0.70
    TRUST_THRESHOLD = 0.80
    
    # LLM Configuration
    USE_LLM = os.environ.get("USE_LLM", "true").lower() == "true"
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    LLM_MODEL = "llama-3.3-70b-versatile"
    LLM_TEMPERATURE = 0.3
    LLM_MAX_TOKENS = 200
    
    # Product card limits
    MAX_MATCHING_FEATURES = 3
    MAX_BULLET_POINTS = 5
    
    # Platform configurations
    PLATFORM_CONFIG = {
        "daraz": {"name": "Daraz", "color": "orange", "icon": "🛍️"},
        "temu": {"name": "Temu", "color": "purple", "icon": "🎯"},
        "amazon": {"name": "Amazon", "color": "yellow", "icon": "📦"},
        "shopee": {"name": "Shopee", "color": "orange", "icon": "🛒"},
        "alibaba": {"name": "Alibaba", "color": "red", "icon": "🏭"}
    }
    
    # Currency symbols
    CURRENCY_SYMBOLS = {
        "USD": "$", "EUR": "€", "GBP": "£", "PKR": "₨", 
        "INR": "₹", "BDT": "৳", "CAD": "C$", "AUD": "A$"
    }