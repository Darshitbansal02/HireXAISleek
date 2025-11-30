import httpx
from core.config import settings
from core.logging import logger

class GroqProvider:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        # FIXED: Updated to OpenAI's open-weight 120B model (hosted by Groq)
        self.model = "openai/gpt-oss-120b" 

    async def generate(self, prompt: str, system_prompt: str = None, temperature: float = 0.2, max_tokens: int = 512) -> str:
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Build messages array with optional system prompt
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.api_url, headers=headers, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            logger.error(f"Groq API error {e.response.status_code}: {e.response.text}")
            raise e
        except Exception as e:
            logger.error(f"Groq connection error: {str(e)}")
            raise e