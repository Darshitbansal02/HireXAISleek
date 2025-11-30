import httpx
from core.config import settings
from core.logging import logger

class GeminiProvider:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={self.api_key}"

    async def generate(self, prompt: str, system_prompt: str = None, temperature: float = 0.2, max_tokens: int = 512) -> str:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found")

        # Prepend system prompt if provided
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        payload = {
            "contents": [{
                "parts": [{"text": full_prompt}]
            }],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.api_url, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                if "candidates" in data and data["candidates"]:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                return ""
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Gemini API error {e.response.status_code}: {e.response.text}")
            raise e
        except Exception as e:
            logger.error(f"Gemini connection error: {str(e)}")
            raise e
