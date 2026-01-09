import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import FileResponse
from services.file_service import FileService
from core.config import UPLOAD_DIR

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/")
async def list_files():
    return FileService.list_files()


@router.post("/upload")
async def upload(request: Request):
    filename = await FileService.save_stream(request)
    return {"status": "success", "filename": filename}


@router.get("/download/{filename}")
async def download(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=filename)
