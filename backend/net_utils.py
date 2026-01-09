import socket
import psutil


def get_smart_ips():
    """
    Returns a list of IP addresses, ignoring 127.x.x.x and 172.17.x.x (Docker bridge).
    Prioritizes 192.168.x.x and 10.x.x.x.
    """
    all_ips = []
    prioritized_ips = []

    for interface, snics in psutil.net_if_addrs().items():
        for snic in snics:
            if snic.family == socket.AF_INET:
                ip = snic.address
                # Ignore loopback and Docker bridge
                if ip.startswith("127.") or ip.startswith("172."):
                    continue

                if ip.startswith("192.168.") or ip.startswith("10."):
                    prioritized_ips.append(ip)
                else:
                    all_ips.append(ip)

    # Return prioritized IPs first, then the rest
    return prioritized_ips + all_ips


def get_primary_ip():
    """Returns the most likely user-facing IP address."""
    ips = get_smart_ips()
    if ips:
        return ips[0]

    # Fallback to standard method if psutil discovery yields nothing
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = "127.0.0.1"
    finally:
        s.close()
    return IP
