from cryptography.fernet import Fernet
from core.config import settings
import base64
import os

# Ensure we have a valid key. In production, this should be in env vars.
# For now, we'll derive one or generate one if missing.
# settings.SECRET_KEY is usually a string, Fernet needs 32 url-safe base64 bytes.

def get_cipher_suite():
    key = settings.SECRET_KEY
    # Pad or truncate to 32 bytes then base64 encode
    if len(key) < 32:
        key = key.ljust(32, '0')
    else:
        key = key[:32]
    
    key_bytes = base64.urlsafe_b64encode(key.encode())
    return Fernet(key_bytes)

def encrypt_text(text: str) -> str:
    if not text:
        return ""
    cipher_suite = get_cipher_suite()
    return cipher_suite.encrypt(text.encode()).decode()

def decrypt_text(encrypted_text: str) -> str:
    if not encrypted_text:
        return ""
    cipher_suite = get_cipher_suite()
    return cipher_suite.decrypt(encrypted_text.encode()).decode()
