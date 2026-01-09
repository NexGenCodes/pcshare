import socket
import asyncio
from zeroconf.asyncio import AsyncZeroconf
from zeroconf import ServiceInfo


async def start_mdns(port=8000):
    desc = {"path": "/"}

    hostname = socket.gethostname()

    # Try to get the IP used for outgoing connections
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        local_ip = s.getsockname()[0]
    except Exception:
        local_ip = socket.gethostbyname(hostname)
    finally:
        s.close()

    info = ServiceInfo(
        "_http._tcp.local.",
        "Turbo Transfer._http._tcp.local.",
        addresses=[socket.inet_aton(local_ip)],
        port=port,
        properties=desc,
        server=f"{hostname}.local.",
    )

    try:
        aio_zeroconf = AsyncZeroconf()
        await aio_zeroconf.async_register_service(info)
        print(f"mDNS: Registered as {hostname}.local (transfer.local) at {local_ip}")
        return aio_zeroconf, info
    except Exception as e:
        print(f"mDNS Error: Could not register service: {e}")
        return None, None


async def stop_mdns(aio_zeroconf, info):
    if aio_zeroconf and info:
        try:
            await aio_zeroconf.async_unregister_service(info)
            await aio_zeroconf.async_close()
        except Exception as e:
            print(f"mDNS Shutdown Error: {e}")
