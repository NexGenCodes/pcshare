import os
import shutil
import uuid
import asyncio
import time
import re
from core.config import UPLOAD_DIR
from fastapi import HTTPException


class FileService:
    # Default save path is user's Downloads folder
    SAVE_PATH = os.path.join(os.path.expanduser("~"), "Downloads", "TurboSync")
    CHUNK_SIZE = 64 * 1024  # 64KB chunks for optimized transfer speed
    BLOCK_EXTENSIONS = [".exe", ".bat", ".cmd", ".msi", ".sh", ".vbs", ".scr"]
    SAFETY_FILTER_ENABLED = True

    @classmethod
    def set_save_path(cls, path: str):
        cls.SAVE_PATH = path
        os.makedirs(cls.SAVE_PATH, exist_ok=True)

    @staticmethod
    def sanitize_filename(filename: str):
        # Remove paths, keep basename, limit characters
        filename = os.path.basename(filename)
        # Remove any character that isn't alphanumeric, space, dot, underscore, or hyphen
        filename = re.sub(r"[^\w\s\.\-\(\)]", "_", filename)
        # Prevent hidden files
        if filename.startswith("."):
            filename = "_" + filename
        return filename

    @classmethod
    def is_safe(cls, filename: str) -> bool:
        if not cls.SAFETY_FILTER_ENABLED:
            return True
        ext = os.path.splitext(filename)[1].lower()
        return ext not in cls.BLOCK_EXTENSIONS

    @classmethod
    async def save_stream(cls, request, session_id: str = None, is_host: bool = False):
        filename = cls.sanitize_filename(
            request.headers.get("x-filename", "unnamed_file")
        )
        expected_size = int(request.headers.get("x-filesize", 0))

        if not cls.is_safe(filename):
            raise HTTPException(status_code=403, detail="File type blocked for security")

        if is_host:
            # Host uploads to a device (OUTGOING)
            if not session_id:
                raise HTTPException(
                    status_code=400, detail="Session ID required for host uploads"
                )
            target_dir = os.path.join(UPLOAD_DIR, session_id, "outgoing")
            device_name = "Host"
        else:
            # Client uploads to host (INCOMING)
            device_name = request.headers.get("x-device-name", "Unknown_Device")
            device_name = cls.sanitize_filename(device_name)
            target_dir = os.path.join(cls.SAVE_PATH, device_name)

        os.makedirs(target_dir, exist_ok=True)

        file_id = str(uuid.uuid4())
        temp_path = os.path.join(target_dir, f"{file_id}.tmp")

        import aiofiles
        from services.analytics_service import AnalyticsService
        from services.thumbnail_service import ThumbnailService

        try:
            async with aiofiles.open(temp_path, "wb") as f:
                async for chunk in request.stream():
                    # Optimization: Using larger chunking isn't strictly necessary here
                    # as request.stream() handles it, but we can ensure efficiency
                    await f.write(chunk)

            actual_size = os.path.getsize(temp_path)
            if expected_size > 0 and actual_size != expected_size:
                os.remove(temp_path)
                raise HTTPException(status_code=400, detail="File size mismatch")

            final_path = os.path.join(target_dir, filename)
            # Avoid overwrites - append unique ID if exists
            if os.path.exists(final_path):
                name, ext = os.path.splitext(filename)
                final_path = os.path.join(target_dir, f"{name}_{file_id[:8]}{ext}")

            shutil.move(temp_path, final_path)
            
            # Analytics & Thumbnails
            direction = "sent" if is_host else "received"
            AnalyticsService.log_transfer(device_name, filename, actual_size, direction)
            
            # Generate thumbnail if image
            ThumbnailService.generate_thumbnail(final_path)
            
            return os.path.basename(final_path)

        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    @classmethod
    def list_files(cls, session_id: str = None, device_name: str = None):
        """
        Returns a list of files.
        If session_id provided:
          - Received: Files in SAVE_PATH / device_name
          - Sent: Files in UPLOAD_DIR / session_id / outgoing
        If no session_id (Legacy or Global view?):
          - Lists everything (Host mode)
        """
        files = []

            from services.thumbnail_service import ThumbnailService
            if not os.path.exists(directory):
                return
            for f in os.listdir(directory):
                path = os.path.join(directory, f)
                is_dir = os.path.isdir(path)
                if (os.path.isfile(path) or is_dir) and not f.endswith(".tmp") and not f.startswith("."):
                    has_thumb = False
                    if not is_dir:
                        thumb_path = ThumbnailService.get_thumbnail_path(path)
                        has_thumb = os.path.exists(thumb_path)

                    files.append(
                        {
                            "name": f,
                            "size": os.path.getsize(path) if not is_dir else 0,
                            "modified": os.path.getmtime(path),
                            "direction": direction,
                            "session_id": session_tag,
                            "is_dir": is_dir,
                            "has_thumbnail": has_thumb
                        }
                    )

        if session_id:
            # Specific session view
            # 1. Received from device
            if device_name:
                recv_dir = os.path.join(
                    cls.SAVE_PATH, cls.sanitize_filename(device_name)
                )
                scan(recv_dir, "received", session_id)

            # 2. Sent to device (from host)
            sent_dir = os.path.join(UPLOAD_DIR, session_id, "outgoing")
            scan(sent_dir, "sent", session_id)
        else:
            # Global view (Host)
            # Scan ALL incoming device folders in SAVE_PATH
            if os.path.exists(cls.SAVE_PATH):
                for d in os.listdir(cls.SAVE_PATH):
                    path = os.path.join(cls.SAVE_PATH, d)
                    if os.path.isdir(path):
                        scan(path, "received", d)

            # Scan ALL outgoing folders in UPLOAD_DIR
            if os.path.exists(UPLOAD_DIR):
                for d in os.listdir(UPLOAD_DIR):
                    path = os.path.join(UPLOAD_DIR, d, "outgoing")
                    if os.path.isdir(path):
                        scan(path, "sent", d)

        return files

    @staticmethod
    def delete_session_files(session_id: str):
        """Strict cleanup: Remove outgoing files for this session"""
        path = os.path.join(UPLOAD_DIR, session_id)
        if os.path.exists(path):
            shutil.rmtree(path)

    @staticmethod
    async def watchdog_loop():
        # Clean .tmp files recursively across all possible storage roots
        while True:
            try:
                # 1. Project UPLOAD_DIR
                for root, dirs, files in os.walk(UPLOAD_DIR):
                    for f in files:
                        if f.endswith(".tmp"):
                            path = os.path.join(root, f)
                            if os.path.getmtime(path) < time.time() - 60:
                                os.remove(path)

                # 2. Configured SAVE_PATH
                if os.path.exists(FileService.SAVE_PATH):
                    for root, dirs, files in os.walk(FileService.SAVE_PATH):
                        for f in files:
                            if f.endswith(".tmp"):
                                path = os.path.join(root, f)
                                if os.path.getmtime(path) < time.time() - 60:
                                    os.remove(path)

            except Exception as e:
                print(f"Watchdog Error: {e}")
            await asyncio.sleep(10)

    @classmethod
    async def zip_directory(cls, directory_path: str) -> str:
        """Zips a directory and returns the path to the zip file. Zip is saved in a temp location."""
        import tempfile
        temp_dir = tempfile.gettempdir()
        base_name = os.path.basename(directory_path)
        zip_path = os.path.join(temp_dir, f"{base_name}_{uuid.uuid4().hex}")
        
        # Run shutil.make_archive in a thread to keep FastAPI alive
        loop = asyncio.get_event_loop()
        final_zip = await loop.run_in_executor(None, lambda: shutil.make_archive(zip_path, 'zip', directory_path))
        return final_zip
