import os
import socket
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def get_local_ips():
    ips = ["127.0.0.1", "localhost"]
    try:
        # Get all interface addresses
        hostname = socket.gethostname()
        ips.append(socket.gethostbyname(hostname))

        # Additional check for common interfaces
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # doesn't even have to be reachable
            s.connect(("10.255.255.255", 1))
            IP = s.getsockname()[0]
            if IP not in ips:
                ips.append(IP)
        except Exception:
            pass
        finally:
            s.close()
    except Exception:
        pass
    return list(set(ips))


def generate_self_signed_cert(cert_path="cert.pem", key_path="key.pem"):
    if os.path.exists(cert_path) and os.path.exists(key_path):
        return

    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    subject = issuer = x509.Name(
        [
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "State"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "City"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "FastTransfer"),
            x509.NameAttribute(NameOID.COMMON_NAME, "FastTransfer Local"),
        ]
    )

    ips = get_local_ips()
    san = [x509.DNSName("localhost")]
    for item in ips:
        if item == "localhost":
            continue
        try:
            # Check if it's a valid IP address (v4 or v6)
            import ipaddress

            ip_obj = ipaddress.ip_address(item)
            san.append(x509.IPAddress(ip_obj))
        except ValueError:
            # If not a valid IP, treat as DNS name
            san.append(x509.DNSName(item))

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.utcnow())
        .not_valid_after(datetime.utcnow() + timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName(san),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )

    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    with open(key_path, "wb") as f:
        f.write(
            key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )
