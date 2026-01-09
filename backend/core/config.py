import os
import sys

# Constants
CHUNK_SIZE = 1024 * 1024  # 1MB buffer
UPLOAD_DIR = "uploads"
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static_app")

# Handle PyInstaller _MEIPASS
if hasattr(sys, "_MEIPASS"):
    STATIC_DIR = os.path.join(sys._MEIPASS, "static_app")

# Ensure environment
os.makedirs(UPLOAD_DIR, exist_ok=True)
