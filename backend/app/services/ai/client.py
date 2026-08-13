import json
import httpx
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logging import logger

class AIClient:
    """Configurable AI Client for Vision / Multimodal analysis."""

    def __init__(self):
        self.api_key = settings.AI_API_KEY
        self.model = settings.VISION_MODEL

    async def analyze_image(self, image_base64: str, prompt: str) -> Optional[Dict[str, Any]]:
        """Sends image to AI Vision endpoint or returns fallback heuristics if API key not provided."""
        if not self.api_key:
            logger.info("AI_API_KEY not configured. Using heuristic Vision analyzer.")
            return None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Compatible with OpenAI Vision API format
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": 300
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]
                    return json.loads(content)
            except Exception as e:
                logger.error(f"Error calling AI Vision service: {e}")
                return None

        return None
