from fastapi import APIRouter, Request, HTTPException
from services.clipboard_service import ClipboardService
from services.host_service import HostService
from services.session_manager import session_manager

router = APIRouter(prefix="/api/host", tags=["host"])


@router.get("/info")
async def get_host_info():
    return {
        "host_name": HostService.get_host_name(),
        "status": "online",
        "platform": "windows",
    }


@router.get("/clipboard")
async def get_clipboard():
    return ClipboardService.get_content()


@router.post("/clipboard")
async def update_clipboard(request: Request):
    data = await request.json()
    content = data.get("content", "")
    device_name = request.headers.get("x-device-name", "Unknown")

    ClipboardService.set_content(content, device_name)
    return {"status": "success"}


@router.post("/command")
async def host_command(request: Request):
    data = await request.json()
    command = data.get("command")

    # Security: Ensure only authenticated sessions can trigger host commands
    session_id = request.headers.get("x-session-id")
    if not session_id or not session_manager.get_session(session_id):
        raise HTTPException(status_code=401, detail="Unauthorized")

    success = HostService.execute_command(command)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to execute command")

    return {"status": "success"}
