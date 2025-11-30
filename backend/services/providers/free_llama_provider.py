import httpx
from core.logging import logger

class FreeLlamaProvider:
    def __init__(self):
        # Use the OpenAI-compatible endpoint for better message formatting support
        self.api_url = "https://text.pollinations.ai/openai/v1/chat/completions"

    async def generate(self, prompt: str, system_prompt: str = None, temperature: float = 0.2, max_tokens: int = 512) -> str:
        # Build messages array with optional system prompt
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            # FIXED: 'llama3' is invalid. Use 'llama' (updates automatically) or 'openai'.
            "model": "llama",  
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        headers = {
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient() as client:
                # Pollinations often takes a bit longer, so higher timeout
                response = await client.post(self.api_url, json=payload, headers=headers, timeout=60.0)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            logger.error(f"Free Llama (Pollinations) API error {e.response.status_code}: {e.response.text}")
            raise e
        except Exception as e:
            logger.error(f"Free Llama connection error: {str(e)}")
            raise e