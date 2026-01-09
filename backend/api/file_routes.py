import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import FileResponse
from services.file_service import FileService
from services.session_manager import session_manager
from core.config import UPLOAD_DIR

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
    return {"save_path": FileService.SAVE_PATH}


@router.post("/config")
async def update_config(request: Request):
    data = await request.json()
    path = data.get("save_path")
    if not path:
        raise HTTPException(status_code=400, detail="save_path is required")
    FileService.set_save_path(path)
    return {"status": "success", "save_path": FileService.SAVE_PATH}


@router.get("/download/{filename:path}")
async def download(filename: str, request: Request):
    session_id = request.headers.get("x-session-id")
    is_host = request.headers.get("x-is-host") == "true"

    # Search Logic:
    # 1. If Host: Likely downloading 'received' files from SAVE_PATH.
    # 2. If Mobile: Likely downloading 'sent' files from UPLOAD_DIR/{session}/outgoing.

    search_paths = []

    # Check Project UPLOAD_DIR (Sent/Temp)
    if session_id and session_id != "null":
        # Sent to this device
        search_paths.append(os.path.join(UPLOAD_DIR, session_id, "outgoing", filename))

    # Check Global UPLOAD_DIR (legacy or root)
    search_paths.append(os.path.join(UPLOAD_DIR, filename))

    # Check SAVE_PATH (Incoming/Permanent)
    # Host might be requesting "DeviceName/file.jpg"
    search_paths.append(os.path.join(FileService.SAVE_PATH, filename))

    for path in search_paths:
        if os.path.exists(path) and os.path.isfile(path):
            return FileResponse(path, filename=os.path.basename(path))

    raise HTTPException(status_code=404, detail="File not found")
