import os
from PyPDF2 import PdfReader
import docx

async def extract_text_from_file(path: str):
    text = ''
    if path.lower().endswith('.pdf'):
        try:
            reader = PdfReader(path)
            for p in reader.pages:
                text += p.extract_text() or ''
        except Exception:
            pass
    elif path.lower().endswith('.docx'):
        try:
            doc = docx.Document(path)
            for p in doc.paragraphs:
                text += p.text + '\n'
        except Exception:
            pass
    else:
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        except Exception:
            text = ''
    return text
