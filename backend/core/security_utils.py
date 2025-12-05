import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from core.config import settings

def get_encryption_key() -> bytes:
    """
    Retrieves the AES-256 key from environment variables.
    Supports two formats:
    1. Base64-encoded 32-byte key
    2. Raw 32-character ASCII key (auto-encoded)
    """
    key_b64 = settings.TESTS_AES_KEY
    if not key_b64:
        raise ValueError("TESTS_AES_KEY environment variable is not set.")

    # First try Base64 decode
    try:
        key = base64.b64decode(key_b64)
        if len(key) == 32:
            return key
    except Exception:
        pass  # fall back to raw mode

    # Fallback: raw 32-character key
    if len(key_b64) == 32:
        return key_b64.encode("utf-8")

    raise ValueError(
        f"Invalid TESTS_AES_KEY: must be 32-byte Base64 or 32-char raw key, got len={len(key_b64)}"
    )

def encrypt_payload(payload: bytes) -> bytes:
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, payload, None)
    return nonce + ciphertext

def decrypt_payload(encrypted_data: bytes) -> bytes:
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    nonce = encrypted_data[:12]
    ciphertext = encrypted_data[12:]
    return aesgcm.decrypt(nonce, ciphertext, None)
