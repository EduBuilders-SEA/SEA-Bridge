"""
Parses different document types to extract text content.
"""
from io import BytesIO
from typing import Protocol, Dict, Type
import fitz  # PyMuPDF
from docx import Document
from src.core.exceptions import DocumentProcessingError
from src.core.logging import logger

class DocumentParser(Protocol):
    """Protocol for document parsers."""
    def parse(self, file_content: bytes) -> str:
        """Parses the file content and returns the extracted text."""
        ...

class PdfParser:
    """Parses PDF files."""
    def parse(self, file_content: bytes) -> str:
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            return text
        except Exception as e:
            logger.error(f"Error parsing PDF file: {e}")
            raise DocumentProcessingError("Failed to parse PDF file.")

class DocxParser:
    """Parses DOCX files."""
    def parse(self, file_content: bytes) -> str:
        try:
            doc = Document(BytesIO(file_content))
            return "\n".join([p.text for p in doc.paragraphs])
        except Exception as e:
            logger.error(f"Error parsing DOCX file: {e}")
            raise DocumentProcessingError("Failed to parse DOCX file.")

class TxtParser:
    """Parses plain text files."""
    def parse(self, file_content: bytes) -> str:
        try:
            # Try decoding with UTF-8, with fallback to latin-1
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                return file_content.decode('latin-1')
            except Exception as e:
                logger.error(f"Error parsing TXT file: {e}")
                raise DocumentProcessingError("Failed to parse TXT file.")

class ParserFactory:
    """Factory to get the correct parser based on file type."""
    _parsers: Dict[str, Type[DocumentParser]] = {
        "application/pdf": PdfParser,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocxParser,
        "text/plain": TxtParser,
    }

    @classmethod
    def get_parser(cls, mime_type: str) -> DocumentParser:
        """
        Get the appropriate parser for the given MIME type.
        
        Args:
            mime_type: The MIME type of the file.
            
        Returns:
            An instance of a DocumentParser.
            
        Raises:
            DocumentProcessingError: If no parser is found for the MIME type.
        """
        parser_class = cls._parsers.get(mime_type)
        if not parser_class:
            logger.warning(f"No parser found for MIME type: {mime_type}")
            raise DocumentProcessingError(f"Unsupported file type: {mime_type}")
        return parser_class()

# Global instance
parser_factory = ParserFactory()

def parse_document(file_content: bytes, mime_type: str) -> str:
    """
    Parses a document and extracts its text content.

    Args:
        file_content: The raw content of the file.
        mime_type: The MIME type of the file.

    Returns:
        The extracted text as a string.
    """
    parser = parser_factory.get_parser(mime_type)
    return parser.parse(file_content)
