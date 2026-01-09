import os
from PIL import Image
import logging


class ThumbnailService:
    THUMB_DIR = os.path.join("uploads", ".thumbnails")

    @classmethod
    def get_thumbnail_path(cls, file_path: str) -> str:
        if not os.path.exists(cls.THUMB_DIR):
            os.makedirs(cls.THUMB_DIR, exist_ok=True)

        file_name = os.path.basename(file_path)
        thumb_name = f"thumb_{file_name}.webp"
        return os.path.join(cls.THUMB_DIR, thumb_name)

    @classmethod
    def generate_thumbnail(cls, file_path: str) -> bool:
        try:
            if not os.path.exists(file_path):
                return False

            # Supported image formats
            ext = os.path.splitext(file_path)[1].lower()
            if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
                return False

            thumb_path = cls.get_thumbnail_path(file_path)

            # Don't regenerate if newer thumb exists
            if os.path.exists(thumb_path) and os.path.getmtime(
                thumb_path
            ) >= os.path.getmtime(file_path):
                return True

            with Image.open(file_path) as img:
                img.thumbnail((128, 128))
                img.save(thumb_path, "WEBP", quality=80)

            logging.info(f"Generated thumbnail for {file_name}")
            return True
        except Exception as e:
            logging.error(f"Thumbnail generation failed for {file_path}: {e}")
            return False
