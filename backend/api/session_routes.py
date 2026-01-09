from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse
from services.session_manager import session_manager
from qr_gen import generate_qr_code_buffer
from net_utils import get_primary_ip

router = APIRouter(prefix="/api/session", tags=["session"])


@router.get("/status")
async def get_status():
    return {"sessions": session_manager.get_all_sessions()}


@router.get("/init")
async def init(device_name: str = None):
    return session_manager.init_session(device_name)


@router.post("/verify")
async def verify(request: Request):
    data = await request.json()
    session = session_manager.verify_pin(data.get("pin"))
    if session:
        return {"status": "AUTHENTICATED", "session": session}
    return JSONResponse(
        status_code=400, content={"status": "error", "message": "Invalid PIN"}
    )


@router.post("/disconnect/{session_id}")
async def disconnect_session(session_id: str):
    session_manager.remove_session(session_id)
    return {"status": "success", "message": "Session disconnected"}


@router.post("/block/{session_id}")
async def block_session(session_id: str):
    session_manager.block_session(session_id)
    return {"status": "success", "message": "Session blocked"}


@router.post("/reset")
async def reset():
    return session_manager.reset()


@router.get("/qr")
async def get_qr():
    ip = get_primary_ip()
    # URL now just points to the app; mobile will hit /init on load
    url = f"https://{ip}:8000?id=session&start=1"
    buf = generate_qr_code_buffer(url)
    return StreamingResponse(buf, media_type="image/png")
