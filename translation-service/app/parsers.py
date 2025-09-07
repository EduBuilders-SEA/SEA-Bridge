import io
from typing import Tuple

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import docx  # python-docx
except ImportError:
    docx = None


async def extract_text_from_bytes(data: bytes, filename_hint: str = "file") -> Tuple[str, str]:
    def ext_from_name(name: str) -> str:
        dot = (name or "").rfind(".")
        return name[dot:].lower() if dot != -1 else ""
    
    ext = ext_from_name(filename_hint)

    if ext == ".pdf" and fitz:
        text_chunks = []
        with fitz.open(stream=data, filetype="pdf") as doc:
            for page in doc:
                text_chunks.append(page.get_text("text"))
        return "\n\n".join(text_chunks), ext

    if ext == ".docx" and docx:
        f = io.BytesIO(data)
        d = docx.Document(f)
        return "\n".join([p.text for p in d.paragraphs if p.text]), ext

    try:
        return data.decode("utf-8"), ext or ""
    except UnicodeDecodeError:
        return data.decode("utf-8", errors="ignore"), ext or ""


def choose_output_ext_and_mime(preserve_format: str) -> Tuple[str, str]:
    if preserve_format == "markdown":
        return ".md", "text/markdown"
    return ".txt", "text/plain"