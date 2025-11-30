from services.providers.groq_provider import GroqProvider
from services.providers.free_llama_provider import FreeLlamaProvider
from services.providers.gemini_provider import GeminiProvider
from core.config import settings
from core.logging import logger
import asyncio

class LLMService:
    def __init__(self):
        self.providers = []
        
        # 1. Primary: Groq
        if settings.GROQ_API_KEY:
            self.providers.append(("groq", GroqProvider()))
        
        # 2. Secondary: Free Llama (Pollinations)
        self.providers.append(("free-llama", FreeLlamaProvider()))
        
        # 3. Tertiary: Gemini (Optional)
        if settings.GEMINI_API_KEY:
            self.providers.append(("gemini", GeminiProvider()))

    async def generate(self, prompt: str, system_prompt: str = None, temperature: float = 0.2, max_tokens: int = 512) -> dict:
        """
        Generates text using the available providers in priority order.
        Returns a dict with 'provider' and 'text'.
        """
        last_error = None

        for name, provider in self.providers:
            # Try up to 2 times per provider
            for attempt in range(2):
                try:
                    logger.info(f"Attempting generation with {name} (attempt {attempt + 1})")
                    text = await provider.generate(prompt, system_prompt, temperature, max_tokens)
                    if text and text.strip():
                        logger.info(f"Successfully generated {len(text)} characters with {name}")
                        return {
                            "provider": name,
                            "text": text.strip()
                        }
                except Exception as e:
                    last_error = e
                    logger.warning(f"Provider {name} failed: {str(e)}")
                    # Short backoff
                    await asyncio.sleep(1)
            
        # If all fail
        logger.error("All LLM providers failed")
        raise last_error or Exception("All providers failed")

# Singleton instance
llm_service = LLMService()
