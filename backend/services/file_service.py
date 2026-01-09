import os
import shutil
import uuid
import asyncio
from core.config import UPLOAD_DIR
from fastapi import HTTPException


class FileService:
    @staticmethod
    async def save_stream(request):
        file_id = str(uuid.uuid4())
        temp_path = os.path.join(UPLOAD_DIR, f"{file_id}.tmp")
        filename = request.headers.get("x-filename", "unnamed_file")
        expected_size = int(request.headers.get("x-filesize", 0))

        import aiofiles

        try:
            async with aiofiles.open(temp_path, "wb") as f:
                async for chunk in request.stream():
                    await f.write(chunk)

            actual_size = os.path.getsize(temp_path)
            if expected_size > 0 and actual_size != expected_size:
                os.remove(temp_path)
                raise HTTPException(status_code=400, detail="File size mismatch")

            final_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(final_path):
                final_path = os.path.join(UPLOAD_DIR, f"{file_id}_{filename}")

            shutil.move(temp_path, final_path)
            return os.path.basename(final_path)

        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    @staticmethod
    def list_files():
        files = []
        for f in os.listdir(UPLOAD_DIR):
            if not f.endswith(".tmp"):
                path = os.path.join(UPLOAD_DIR, f)
                files.append(
                    {
                        "name": f,
                        "size": os.path.getsize(path),
                        "modified": os.path.getmtime(path),
                    }
                )
        return files

    @staticmethod
    async def watchdog_loop():
        while True:
            try:
                for f in os.listdir(UPLOAD_DIR):
                    if f.endswith(".tmp"):
                        path = os.path.join(UPLOAD_DIR, f)
                        if os.path.getmtime(path) < os.time.time() - 60:
                            os.remove(path)
            except Exception as e:
                print(f"Watchdog Error: {e}")
            await asyncio.sleep(10)
