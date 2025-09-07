"""
Translation engine using AWS Translate.
"""
from typing import List, Dict, Any
from src.config import settings
from src.core.aws import get_translate_client
from src.core.exceptions import TranslationError
from src.core.logging import logger

class TranslationEngine:
    """A wrapper for the AWS Translate service."""

    async def translate_text(
        self, 
        text: str, 
        target_language: str, 
        source_language: str = "auto"
    ) -> str:
        """Translate a single string of text."""
        if not text.strip():
            return ""

        try:
            async with get_translate_client() as client:
                response = await client.translate_text(
                    Text=text,
                    SourceLanguageCode=source_language,
                    TargetLanguageCode=target_language
                )
                return response.get("TranslatedText", "")
        except Exception as e:
            logger.error(f"Error translating text: {e}")
            raise TranslationError(f"Failed to translate text to {target_language}")

    async def batch_translate_text(
        self, 
        text_list: List[str], 
        target_language: str, 
        source_language: str = "auto"
    ) -> List[str]:
        """Translate a list of strings."""
        # AWS Translate doesn't have a direct batch translation API for real-time.
        # We can simulate it by calling translate_text in parallel in the future if needed.
        # For now, we'll do it sequentially.
        translated_texts = []
        for text in text_list:
            translated_texts.append(
                await self.translate_text(text, target_language, source_language)
            )
        return translated_texts

    def is_language_supported(self, language_code: str) -> bool:
        """Check if a language is supported by our configuration."""
        return language_code in settings.SUPPORTED_LANGUAGES

# Global instance
translation_engine = TranslationEngine()
