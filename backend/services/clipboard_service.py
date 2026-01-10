import time
from typing import Optional


class ClipboardService:
    _content: str = ""
    _last_updated: float = 0
    _device_source: str = "Host"

    @classmethod
    def set_content(cls, content: str, device_source: str = "Host"):
        cls._content = content
        cls._last_updated = time.time()
        cls._device_source = device_source

    @classmethod
    def get_content(cls) -> dict:
        return {
            "content": cls._content,
            "last_updated": cls._last_updated,
            "device_source": cls._device_source,
        }
