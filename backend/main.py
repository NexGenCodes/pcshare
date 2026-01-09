import os
import sys
import asyncio
import webbrowser
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

# Local Imports
from core.config import STATIC_DIR
from services.file_service import FileService
from services.mdns_service import MDNSService  # I will create this next
from ssl_gen import generate_self_signed_cert
from api import session_routes, file_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    mdns = MDNSService()
    await mdns.start(8000)
    watchdog_task = asyncio.create_task(FileService.watchdog_loop())

    if not os.path.exists("/.dockerenv") and os.environ.get("VITE_DEV") != "true":

        async def open_browser():
            await asyncio.sleep(1.5)
            webbrowser.open("https://127.0.0.1:8000")

        asyncio.create_task(open_browser())

    yield
    # Shutdown
    await mdns.stop()
    watchdog_task.cancel()


app = FastAPI(title="TurboTransfer")
app.router.lifespan_context = lifespan

# Include Routers
app.include_router(session_routes.router)
app.include_router(file_routes.router)

# Static Files
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

    generate_self_signed_cert()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        ssl_keyfile="key.pem",
        ssl_certfile="cert.pem",
        reload=not hasattr(sys, "_MEIPASS"),
    )
