import socket
from zeroconf import IPVersion, ServiceInfo, Zeroconf


def start_mdns(port=8000):
    desc = {"path": "/"}

    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

    # Try to get the IP used for outgoing connections
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        local_ip = s.getsockname()[0]
    except Exception:
        pass
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

    zeroconf = Zeroconf(ip_version=IPVersion.V4Only)
    zeroconf.register_service(info)
    print(f"mDNS: Registered as {hostname}.local (transfer.local)")
    return zeroconf, info


def stop_mdns(zeroconf, info):
    zeroconf.unregister_service(info)
    zeroconf.close()
