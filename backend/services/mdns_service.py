import socket
import asyncio
from zeroconf.asyncio import AsyncZeroconf
from zeroconf import ServiceInfo
import logging


class MDNSService:
    _aio_zeroconf = None
    _info = None

    @classmethod
    async def start(cls, port: int = 8000):
        try:
            cls._aio_zeroconf = AsyncZeroconf()
            hostname = socket.gethostname()

            # Robust IP discovery
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                s.connect(("10.255.255.255", 1))
                local_ip = s.getsockname()[0]
            except Exception:
                local_ip = socket.gethostbyname(hostname)
            finally:
                s.close()

            cls._info = ServiceInfo(
                "_http._tcp.local.",
                f"TurboSync Host ({hostname})._http._tcp.local.",
                addresses=[socket.inet_aton(local_ip)],
                port=port,
                properties={"path": "/"},
                server=f"{hostname}.local.",
            )

            await cls._aio_zeroconf.async_register_service(cls._info)
            logging.info(f"mDNS Service started: {hostname}.local (IP: {local_ip})")
        except Exception as e:
            logging.error(f"Failed to start mDNS service: {e}")

    @classmethod
    async def stop(cls):
        if cls._aio_zeroconf and cls._info:
            try:
                await cls._aio_zeroconf.async_unregister_service(cls._info)
                await cls._aio_zeroconf.async_close()
                logging.info("mDNS Service stopped")
            except Exception as e:
                logging.error(f"mDNS Shutdown Error: {e}")
