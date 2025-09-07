import os
import io
import time
import asyncio
import base64
import fnmatch
import urllib.parse
from hashlib import sha256
from typing import Optional, Tuple, List

import aiohttp
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

from .parsers import extract_text_from_bytes, choose_output_ext_and_mime
from .translator import get_translator

APP_VERSION = os.getenv("APP_VERSION", "0.3.0")
API_KEY = os.getenv("TRANSLATE_API_KEY", "devkey")
MAX_BYTES = int(os.getenv("MAX_FILE_BYTES", str(50 * 1024 * 1024)))  # 50MB default
ALLOWED_EXTS = {".pdf", ".txt", ".md", ".rtf", ".html", ".htm", ".docx"}
ALLOWED_URL_HOSTS = [h.strip() for h in os.getenv(
    "ALLOWED_URL_HOSTS",
    "s3.amazonaws.com,*.s3.amazonaws.com,s3.*.amazonaws.com,*.s3.*.amazonaws.com"
).split(",") if h.strip()]

app = FastAPI(title="SEA-Bridge Document Translation Service", version=APP_VERSION)


def ensure_auth(auth_header: Optional[str]):
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = auth_header.split(" ", 1)[1]
    if token != API_KEY:
        raise HTTPException(403, "Invalid token")


def ext_from_name(name: str) -> str:
    name = name or ""
    dot = name.rfind(".")
    return name[dot:].lower() if dot != -1 else ""


def host_allowed(url: str) -> bool:
    host = urllib.parse.urlparse(url).hostname or ""
    return any(fnmatch.fnmatch(host, pat) for pat in ALLOWED_URL_HOSTS)


async def head_info(url: str) -> Tuple[Optional[int], Optional[str], Optional[str]]:
    async with aiohttp.ClientSession() as sess:
        async with sess.head(url) as resp:
            if resp.status >= 400:
                return None, None, None
            size = resp.headers.get("Content-Length")
            etag = resp.headers.get("ETag")
            ctype = resp.headers.get("Content-Type")
            return (int(size) if size else None), etag, ctype


async def fetch_bytes(url: str, max_bytes: int = MAX_BYTES) -> bytes:
    if not host_allowed(url):
        raise HTTPException(400, "URL host not allowed")
    read = 0
    chunks: List[bytes] = []
    async with aiohttp.ClientSession() as sess:
        async with sess.get(url) as resp:
            if resp.status != 200:
                text = await resp.text()
                raise HTTPException(400, f"Failed to fetch file: {resp.status} {text}")
            async for chunk in resp.content.iter_chunked(1 << 16):
                read += len(chunk)
                if read > max_bytes:
                    raise HTTPException(413, "File too large")
                chunks.append(chunk)
    return b"".join(chunks)


async def put_bytes(url: str, data: bytes, content_type: str = "application/octet-stream"):
    if not host_allowed(url):
        raise HTTPException(400, "Output URL host not allowed")
    async with aiohttp.ClientSession() as sess:
        async with sess.put(url, data=data, headers={"Content-Type": content_type}) as resp:
            if resp.status not in (200, 201, 204):
                text = await resp.text()
                raise HTTPException(400, f"Failed to upload to output_url: {resp.status} {text}")


@app.get("/healthz")
async def healthz():
    return {"ok": True, "version": APP_VERSION}


@app.post("/v1/translate-file")
async def translate_file(
    authorization: Optional[str] = Header(None),
    file_url: Optional[str] = Form(None),
    output_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    target_lang: str = Form(...),
    source_lang: Optional[str] = Form(None),
    preserve_format: str = Form("markdown"),
    return_mode: str = Form("async"),
    integrity_sha256: Optional[str] = Form(None),
):
    ensure_auth(authorization)

    if not file_url and not file:
        raise HTTPException(400, "Provide file_url or multipart file")

    filename = (file.filename if file and getattr(file, "filename", None)
                else urllib.parse.urlparse(file_url).path.split("/")[-1] if file_url
                else "file")

    ext = ext_from_name(filename)
    if ext and ext not in ALLOWED_EXTS:
        raise HTTPException(415, f"Unsupported file type: {ext}")

    if file_url:
        if not host_allowed(file_url):
            raise HTTPException(400, "URL host not allowed")
        size, _, _ = await head_info(file_url)
        if size and size > MAX_BYTES:
            raise HTTPException(413, "File too large")

    if file:
        raw = await file.read()
        if len(raw) > MAX_BYTES:
            raise HTTPException(413, "File too large")
    else:
        raw = await fetch_bytes(file_url)

    if integrity_sha256 and sha256(raw).hexdigest() != integrity_sha256.lower():
        raise HTTPException(400, "Integrity hash mismatch")

    translator = get_translator()

    async def do_work() -> Tuple[bytes, str, str]:
        text, _ = await extract_text_from_bytes(raw, filename_hint=filename)
        out_ext, out_mime = choose_output_ext_and_mime(preserve_format)
        translated_text = await translator.translate(
            text=text,
            target_lang=target_lang,
            source_lang=source_lang,
            preserve_format=preserve_format
        )
        out_name = f"{filename}.translated{out_ext}"
        out_bytes = translated_text.encode("utf-8")
        if output_url:
            await put_bytes(output_url, out_bytes, content_type=out_mime)
        return out_bytes, out_mime, out_name

    if return_mode == "async":
        job_id = str(int(time.time() * 1000))
        asyncio.create_task(do_work())
        return JSONResponse({"job_id": job_id, "status": "queued"})

    out_bytes, out_mime, out_name = await do_work()
    if output_url:
        return JSONResponse({"status": "succeeded", "output_url": output_url, "filename": out_name, "mime": out_mime})
    
    return StreamingResponse(io.BytesIO(out_bytes), media_type=out_mime, headers={"Content-Disposition": f'attachment; filename="{out_name}"'})