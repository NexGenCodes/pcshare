import os
import shutil
import tempfile
from typing import List, Optional
from fastapi import APIRouter, Request, Response, Query, BackgroundTasks
from fastapi.responses import FileResponse
from services.file_service import FileService, UPLOAD_DIR
from services.session_manager import session_manager
from services.analytics_service import AnalyticsService
from services.thumbnail_service import ThumbnailService

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/")
async def list_files(request: Request):
    session_id = request.headers.get("x-session-id")
    if session_id == "null" or not session_id:
        session_id = None

    device_name = None
    if session_id:
        session = session_manager.get_session(session_id)
        if session:
            device_name = session.get("device_name")

    return FileService.list_files(session_id, device_name)


@router.post("/upload")
async def upload(request: Request):
    session_id = request.headers.get("x-session-id")
    is_host = request.headers.get("x-is-host") == "true"

    if session_id == "null" or not session_id:
        session_id = None

    filename = await FileService.save_stream(request, session_id, is_host=is_host)
    return {"status": "success", "filename": filename}


@router.get("/config")
async def get_config():
    return {
        "save_path": FileService.SAVE_PATH,
        "safety_filter": FileService.SAFETY_FILTER_ENABLED,
        "overwrite_duplicates": FileService.OVERWRITE_DUPLICATES,
        "autosync_path": FileService.AUTOSYNC_PATH,
    }


@router.post("/cleanup")
async def cleanup():
    count = FileService.cleanup_transfers(0)  # Age 0 = clear everything
    return {"status": "success", "count": count}


@router.post("/config")
async def update_config(request: Request):
    data = await request.json()
    path = data.get("save_path")
    safety = data.get("safety_filter")
    overwrite = data.get("overwrite_duplicates")
    autosync = data.get("autosync_path")

    if path:
        FileService.set_save_path(path)
    if safety is not None:
        FileService.SAFETY_FILTER_ENABLED = safety
    if overwrite is not None:
        FileService.OVERWRITE_DUPLICATES = overwrite
    if autosync:
        FileService.AUTOSYNC_PATH = autosync

    return {
        "status": "success",
        "save_path": FileService.SAVE_PATH,
        "safety_filter": FileService.SAFETY_FILTER_ENABLED,
        "overwrite_duplicates": FileService.OVERWRITE_DUPLICATES,
        "autosync_path": FileService.AUTOSYNC_PATH,
    }


@router.post("/batch-delete")
async def batch_delete(request: Request):
    data = await request.json()
    filenames = data.get("filenames", [])
    session_id = request.headers.get("x-session-id")
    device_name = data.get("device_name")

    FileService.batch_delete(filenames, session_id, device_name)
    return {"status": "success"}


@router.get("/batch-download")
async def batch_download(
    request: Request,
    filenames: List[str] = Query([]),
    device_name: Optional[str] = Query(None),
):
    session_id = request.headers.get("x-session-id")
    if not filenames:
        raise HTTPException(status_code=400, detail="No filenames provided")

    zip_path = await FileService.zip_files(filenames, session_id, device_name)
    return FileResponse(
        zip_path, filename="batch_transfer.zip", media_type="application/zip"
    )


@router.get("/thumbnail/{filename:path}")
async def get_thumbnail(filename: str):
    # Try to find the thumbnail
    # Filename here might be "DeviceName/file.jpg"
    # We need to find the actual file to get its thumbnail path
    search_paths = [
        os.path.join(FileService.SAVE_PATH, filename),
        os.path.join(UPLOAD_DIR, filename),
    ]
    # Also check if it's a session-specific file
    # This is a bit tricky without session_id, but thumbnails are cached by basename mostly
    # Actually ThumbnailService.get_thumbnail_path just needs a unique name or full path.
    # Our implementation uses basename which might collide, let's refine later if needed.

    for path in search_paths:
        if os.path.exists(path):
            thumb_path = ThumbnailService.get_thumbnail_path(path)
            if os.path.exists(thumb_path):
                return FileResponse(thumb_path)

    raise HTTPException(status_code=404, detail="Thumbnail not found")


@router.get("/analytics/history")
async def get_analytics():
    return {
        "history": AnalyticsService.get_history(),
        "stats": AnalyticsService.get_stats(),
    }


@router.get("/download/{filename:path}")
async def download(filename: str, request: Request):
    session_id = request.headers.get("x-session-id")
    is_host = request.headers.get("x-is-host") == "true"

    search_paths = []

    if session_id and session_id != "null":
        search_paths.append(os.path.join(UPLOAD_DIR, session_id, "outgoing", filename))

    search_paths.append(os.path.join(UPLOAD_DIR, filename))
    search_paths.append(os.path.join(FileService.SAVE_PATH, filename))

    for path in search_paths:
        if os.path.exists(path):
            if os.path.isfile(path):
                return FileResponse(path, filename=os.path.basename(path))
            elif os.path.isdir(path):
                # Zip it!
                zip_path = await FileService.zip_directory(path)
                return FileResponse(
                    zip_path,
                    filename=f"{os.path.basename(path)}.zip",
                    media_type="application/zip",
                )

    raise HTTPException(status_code=404, detail="File not found")
