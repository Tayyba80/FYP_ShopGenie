import httpx
from typing import Optional

class LLMRewriter:
    def __init__(self, config):
        self.config = config
        self.api_key = config.GROQ_API_KEY
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.request_count = 0
        
        # Check if LLM should be enabled
        if not self.api_key or not self.config.USE_LLM:
            print("ℹ️ LLM disabled: Missing API key or USE_LLM=false")
        else:
            print(f"✅ LLM enabled with model: {config.LLM_MODEL}")
    
    def rewrite(self, product_name: str, platform: str, factual_bullets: str) -> Optional[str]:
        """Rewrite factual bullets into natural language using GROQ API"""
        
        if not self.api_key or not self.config.USE_LLM:
            return None
        
        # Build the prompt
        prompt = f"""Product: {product_name}
Platform: {platform}

Facts about this product:
{factual_bullets}

Write 2 natural sentences using ONLY these facts. Do not add any new information. Be conversational:"""

        # Prepare API request
        payload = {
            "model": self.config.LLM_MODEL,
            "messages": [
                {
                    "role": "system", 
                    "content": "You rewrite facts naturally. Never add or change information."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "temperature": self.config.LLM_TEMPERATURE,
            "max_tokens": self.config.LLM_MAX_TOKENS
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            # Make the API call
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    self.api_url,
                    json=payload,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    result = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                    self.request_count += 1
                    return result.strip()
                else:
                    print(f"GROQ API error: HTTP {response.status_code}")
                    print(f"Response: {response.text[:200]}")
                    return None
                    
        except httpx.TimeoutException:
            print("GROQ API timeout: Request took too long (>30 seconds)")
            return None
        except Exception as e:
            print(f"GROQ API error: {e}")
            return None