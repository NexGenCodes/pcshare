import socket
import psutil


def get_smart_ips():
    """
    Returns a list of IP addresses, ignoring 127.x.x.x and 172.x.x.x (Docker bridge).
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

                # Prioritize LAN IPs for QR code
                if ip.startswith("192.168.") or ip.startswith("10."):
                    prioritized_ips.append(ip)
                else:
                    all_ips.append(ip)

    return prioritized_ips + all_ips


def get_primary_ip():
    """Returns the primary IP for QR code handshake."""
    ips = get_smart_ips()
    return ips[0] if ips else "127.0.0.1"
