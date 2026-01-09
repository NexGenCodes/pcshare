from fastapi import APIRouter, Request, StreamingResponse
from fastapi.responses import JSONResponse
from services.session_manager import session_manager
from qr_gen import generate_qr_code_buffer, get_primary_ip

router = APIRouter(prefix="/api/session", tags=["session"])


@router.get("/status")
async def get_status():
    return session_manager.get_status()


@router.get("/init")
async def init():
    return session_manager.init_session()


@router.post("/verify")
async def verify(request: Request):
    data = await request.json()
    if session_manager.verify_pin(data.get("pin")):
        return {"status": "AUTHENTICATED"}
    return JSONResponse(
        status_code=400, content={"status": "error", "message": "Invalid PIN"}
    )


@router.post("/reset")
async def reset():
    return session_manager.reset()


@router.get("/qr")
async def get_qr():
    ip = get_primary_ip()
    url = f"https://{ip}:8000?id=session&start=1"
    buf = generate_qr_code_buffer(url)
    return StreamingResponse(buf, media_type="image/png")
