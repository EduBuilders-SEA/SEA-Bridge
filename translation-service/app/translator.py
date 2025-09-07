import os
import math
from typing import Optional, List
import asyncio

try:
    import boto3
    import json
except ImportError:
    boto3 = None


class TranslatorBase:
    async def translate(self, text: str, target_lang: str, source_lang: Optional[str], preserve_format: str) -> str:
        raise NotImplementedError


class BedrockSeaLionTranslator(TranslatorBase):
    def __init__(self):
        if not boto3:
            raise RuntimeError("boto3 is required for Bedrock translator")
        self.region = os.getenv("AWS_REGION", "ap-southeast-1")
        self.model_id = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-v2")
        if not self.region:
            raise RuntimeError("AWS_REGION is required for Bedrock translator")
        self.client = boto3.client("bedrock-runtime", region_name=self.region)
        self.chunk_chars = int(os.getenv("CHUNK_CHARS", "12000"))

    def _chunks(self, text: str) -> List[str]:
        n = self.chunk_chars
        if len(text) <= n:
            return [text]
        chunks = []
        i = 0
        overlap = int(n * 0.05)
        while i < len(text):
            chunks.append(text[i:i + n])
            i += n - overlap
        return chunks

    async def translate(self, text: str, target_lang: str, source_lang: Optional[str], preserve_format: str) -> str:
        system = (
            "You are a professional translator specializing in Southeast Asian languages. "
            "Translate the following document into the requested target language. "
            "CRITICAL: Preserve ALL formatting, structure, and special characters. "
            "Maintain names, dates, times, and monetary amounts exactly as they appear. "
            "If the input is Markdown, keep all Markdown formatting intact. "
            "Do not add any explanations or commentary - only provide the translation."
        )
        if source_lang:
            system += f" The source language is {source_lang}."

        tasks = []
        for idx, chunk in enumerate(self._chunks(text), start=1):
            prompt = f"System: {system}\n\nTarget language: {target_lang}\nReturn format: {'Markdown' if preserve_format=='markdown' else 'Plain text'}\n\nText chunk {idx} to translate:\n{chunk}\n\nTranslation:"
            tasks.append(self._ainvoke(prompt))
        
        translated_chunks = await asyncio.gather(*tasks)
        return "\n".join(translated_chunks)

    async def _ainvoke(self, prompt: str) -> str:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._invoke, prompt)

    def _invoke(self, prompt: str) -> str:
        body = json.dumps({
            "prompt": prompt,
            "max_tokens_to_sample": 4096,
            "temperature": 0.2,
            "top_p": 0.9,
        })
        resp = self.client.invoke_model(modelId=self.model_id, body=body)
        payload = json.loads(resp["body"].read())
        return payload.get("completion", str(payload))


class PassThroughTranslator(TranslatorBase):
    async def translate(self, text: str, target_lang: str, source_lang: Optional[str], preserve_format: str) -> str:
        return text


def get_translator() -> TranslatorBase:
    if os.getenv("USE_BEDROCK", "false").lower() in ("1", "true", "yes"):
        try:
            return BedrockSeaLionTranslator()
        except Exception as e:
            print(f"[translator] Bedrock unavailable: {e}. Falling back to passthrough.")
    return PassThroughTranslator()