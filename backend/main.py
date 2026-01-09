import os
import sys
import uuid
import shutil
import asyncio
import aiofiles
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from ssl_gen import generate_self_signed_cert
from qr_gen import generate_qr_code_buffer, get_primary_ip
from mdns_gen import start_mdns, stop_mdns

from contextlib import asynccontextmanager
import webbrowser

# Constants
CHUNK_SIZE = 1024 * 1024  # 1MB buffer
UPLOAD_DIR = "uploads"
STATIC_DIR = os.path.join(os.path.dirname(__file__), "dist")

# Handle PyInstaller _MEIPASS
if hasattr(sys, "_MEIPASS"):
    STATIC_DIR = os.path.join(sys._MEIPASS, "dist")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Global for mDNS
mdns_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global mdns_service
    mdns_service = await start_mdns(8000)
    # Background watchdog loop
    watchdog_task = asyncio.create_task(watchdog_loop())

    # Auto-open browser (Native only)
    if not os.path.exists("/.dockerenv"):

        async def open_browser():
            await asyncio.sleep(1.5)
            # Use https as that is what we started uvicorn with
            webbrowser.open("https://127.0.0.1:8000")

        asyncio.create_task(open_browser())

    yield

    # Shutdown
    if mdns_service and mdns_service[0]:
        await stop_mdns(*mdns_service)
    watchdog_task.cancel()


app = FastAPI(title="TurboTransfer", lifespan=lifespan)


async def watchdog_loop():
    """Monitors .tmp files and cleans up stale ones."""
    while True:
        try:
            now = asyncio.get_event_loop().time()
            for f in os.listdir(UPLOAD_DIR):
                if f.endswith(".tmp"):
                    path = os.path.join(UPLOAD_DIR, f)
                    # Simple timeout-based watchdog for .tmp files
                    # In a production environment with socket tracking,
                    # we'd match these to active request objects.
                    if os.path.getmtime(path) < os.time.time() - 60:
                        os.remove(path)
                        print(f"Watchdog: Cleaned up stale {f}")
        except Exception as e:
            print(f"Watchdog Error: {e}")
        await asyncio.sleep(10)


@app.get("/api/qr")
async def get_qr():
    ip = get_primary_ip()
    url = f"https://{ip}:8000"
    buf = generate_qr_code_buffer(url)
    return StreamingResponse(buf, media_type="image/png")


@app.post("/api/upload")
async def upload_file(request: Request):
    """Turbo Streaming Engine: Direct write with aiofiles."""
    file_id = str(uuid.uuid4())
    temp_path = os.path.join(UPLOAD_DIR, f"{file_id}.tmp")
    filename = request.headers.get("x-filename", "unnamed_file")
    expected_size = int(request.headers.get("x-filesize", 0))

    try:
        async with aiofiles.open(temp_path, "wb") as f:
            async for chunk in request.stream():
                await f.write(chunk)

        # Atomic Move & Verification
        actual_size = os.path.getsize(temp_path)
        if expected_size > 0 and actual_size != expected_size:
            os.remove(temp_path)
            raise HTTPException(
                status_code=400, detail="File size mismatch / Interrupted"
            )

        final_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(final_path):
            final_path = os.path.join(UPLOAD_DIR, f"{file_id}_{filename}")

        shutil.move(temp_path, final_path)
        return {"status": "success", "filename": os.path.basename(final_path)}

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files")
async def list_files():
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


@app.get("/api/download/{filename}")
async def download_file(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=filename)


# Serve React static files
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
else:

    @app.get("/")
    async def index():
        return JSONResponse(
            {"message": "TurboTransfer Backend Running. Frontend not found."}
        )


if __name__ == "__main__":
    import uvicorn

    # Ensure certs are generated BEFORE uvicorn starts
    generate_self_signed_cert()

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        ssl_keyfile="key.pem",
        ssl_certfile="cert.pem",
        reload=not hasattr(sys, "_MEIPASS"),
    )
