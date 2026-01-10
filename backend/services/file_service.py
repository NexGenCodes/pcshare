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
    OVERWRITE_DUPLICATES = True
    AUTOSYNC_PATH = os.path.join(
        os.path.expanduser("~"), "Downloads", "TurboSync", "Sync"
    )
    _sync_observer = None

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
        if not ext and "." not in filename:
            return True  # Allow files without extensions
        return ext not in cls.BLOCK_EXTENSIONS

    @classmethod
    async def save_stream(cls, request, session_id: str = None, is_host: bool = False):
        filename = cls.sanitize_filename(
            request.headers.get("x-filename", "unnamed_file")
        )
        expected_size = int(request.headers.get("x-filesize", 0))

        if not cls.is_safe(filename):
            raise HTTPException(
                status_code=403, detail="File type blocked for security"
            )

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
            # Avoid overwrites if disabled - append unique ID if exists
            if os.path.exists(final_path) and not cls.OVERWRITE_DUPLICATES:
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

        def scan(directory, direction, session_tag):
            from services.thumbnail_service import ThumbnailService

            if not os.path.exists(directory):
                return
            for f in os.listdir(directory):
                path = os.path.join(directory, f)
                is_dir = os.path.isdir(path)
                if (
                    (os.path.isfile(path) or is_dir)
                    and not f.endswith(".tmp")
                    and not f.startswith(".")
                ):
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
                            "has_thumbnail": has_thumb,
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

    @classmethod
    def batch_delete(
        cls, filenames: list[str], session_id: str = None, device_name: str = None
    ):
        """Deletes multiple files from either session outgoing or device incoming"""
        for filename in filenames:
            paths = []
            if session_id:
                paths.append(os.path.join(UPLOAD_DIR, session_id, "outgoing", filename))
            if device_name:
                paths.append(os.path.join(cls.SAVE_PATH, device_name, filename))

            for p in paths:
                if os.path.exists(p):
                    if os.path.isfile(p):
                        os.remove(p)
                    elif os.path.isdir(p):
                        shutil.rmtree(p)

    @classmethod
    async def zip_files(
        cls, filenames: list[str], session_id: str = None, device_name: str = None
    ) -> str:
        """Zips multiple files and returns the path to the zip."""
        import tempfile

        temp_dir = tempfile.mkdtemp()
        bundle_dir = os.path.join(temp_dir, "transfer_bundle")
        os.makedirs(bundle_dir, exist_ok=True)

        for filename in filenames:
            src = None
            if session_id:
                p = os.path.join(UPLOAD_DIR, session_id, "outgoing", filename)
                if os.path.exists(p):
                    src = p
            if device_name and not src:
                p = os.path.join(cls.SAVE_PATH, device_name, filename)
                if os.path.exists(p):
                    src = p

            if src:
                target = os.path.join(bundle_dir, filename)
                if os.path.isdir(src):
                    shutil.copytree(src, target)
                else:
                    shutil.copy2(src, target)

        zip_path = await cls.zip_directory(bundle_dir)
        shutil.rmtree(temp_dir)
        return zip_path

    @classmethod
    def start_sync_watcher(cls):
        """Starts the watchdog observer for the Sync folder"""
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler

        class SyncHandler(FileSystemEventHandler):
            def on_created(self, event):
                if not event.is_directory:
                    # New file added to Sync folder
                    # In a real app, we might trigger a broadcast here
                    # For now, we'll just log it. The UI polls /files/ so it'll see it.
                    print(f"Auto-Sync: New file detected: {event.src_path}")
                    # We could also copy it to all session outgoing folders if we wanted 'push'
                    # But letting them download it from a global Sync folder is cleaner.

        if not os.path.exists(cls.AUTOSYNC_PATH):
            os.makedirs(cls.AUTOSYNC_PATH, exist_ok=True)

        cls._sync_observer = Observer()
        cls._sync_observer.schedule(SyncHandler(), cls.AUTOSYNC_PATH, recursive=False)
        cls._sync_observer.start()

    @classmethod
    def cleanup_transfers(cls, max_age_hours: int = 24):
        """Removes files older than max_age_hours from UPLOAD_DIR and SAVE_PATH"""
        now = time.time()
        max_age = max_age_hours * 3600
        count = 0

        for base_dir in [UPLOAD_DIR, cls.SAVE_PATH]:
            if not os.path.exists(base_dir):
                continue
            for root, dirs, files in os.walk(base_dir):
                for f in files:
                    path = os.path.join(root, f)
                    if now - os.path.getmtime(path) > max_age:
                        try:
                            if os.path.isfile(path):
                                os.remove(path)
                            elif os.path.isdir(path):
                                shutil.rmtree(path)
                            count += 1
                        except Exception:
                            pass
        return count

    @staticmethod
    async def watchdog_loop():
        # Clean .tmp files and old ZIPs recursively
        import tempfile

        while True:
            try:
                now = time.time()
                # 1. Project UPLOAD_DIR
                for root, dirs, files in os.walk(UPLOAD_DIR):
                    for f in files:
                        path = os.path.join(root, f)
                        if f.endswith(".tmp") and os.path.getmtime(path) < now - 60:
                            os.remove(path)

                # 2. Configured SAVE_PATH
                if os.path.exists(FileService.SAVE_PATH):
                    for root, dirs, files in os.walk(FileService.SAVE_PATH):
                        for f in files:
                            path = os.path.join(root, f)
                            if f.endswith(".tmp") and os.path.getmtime(path) < now - 60:
                                os.remove(path)

                # 3. System TEMP (Batch ZIPs)
                sys_temp = tempfile.gettempdir()
                for f in os.listdir(sys_temp):
                    if f.endswith(".zip") and "transfer_bundle" in f:
                        path = os.path.join(sys_temp, f)
                        if os.path.getmtime(path) < now - 3600:  # 1 hour
                            os.remove(path)

            except Exception as e:
                print(f"Watchdog Error: {e}")
            await asyncio.sleep(60)  # Check every minute

    @classmethod
    async def zip_directory(cls, directory_path: str) -> str:
        """Zips a directory and returns the path to the zip file. Zip is saved in a temp location."""
        import tempfile

        temp_dir = tempfile.gettempdir()
        base_name = os.path.basename(directory_path)
        zip_path = os.path.join(temp_dir, f"{base_name}_{uuid.uuid4().hex}")

        # Run shutil.make_archive in a thread to keep FastAPI alive
        loop = asyncio.get_event_loop()
        final_zip = await loop.run_in_executor(
            None, lambda: shutil.make_archive(zip_path, "zip", directory_path)
        )
        return final_zip
