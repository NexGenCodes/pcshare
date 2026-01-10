import os
import subprocess
import logging


class HostService:
    @classmethod
    def get_host_name(cls):
        """Attempts to get the WiFi SSID or falls back to computer name"""
        try:
            # Try to get WiFi SSID on Windows
            result = subprocess.check_output(
                ["netsh", "wlan", "show", "interfaces"],
                stderr=subprocess.STDOUT,
                universal_newlines=True,
            )
            for line in result.split("\n"):
                if "SSID" in line and "BSSID" not in line:
                    ssid = line.split(":")[1].strip()
                    if ssid:
                        return f"WiFi: {ssid}"
        except Exception:
            pass

        # Fallback to computer name
        import socket

        return socket.gethostname()

    @classmethod
    def execute_command(cls, command: str):
        """Executes a host power command (Windows only)"""
        try:
            if command == "lock":
                subprocess.run(
                    ["rundll32.exe", "user32.dll,LockWorkStation"], check=True
                )
            elif command == "sleep":
                # Ensure it doesn't hibernate if sleep is requested
                # Note: This might hibernate depending on system settings
                subprocess.run(
                    ["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"],
                    check=True,
                )
            elif command == "shutdown":
                subprocess.run(["shutdown", "/s", "/t", "0"], check=True)
            else:
                raise ValueError(f"Unknown command: {command}")

            logging.info(f"Host command executed: {command}")
            return True
        except Exception as e:
            logging.error(f"Failed to execute host command {command}: {e}")
            return False
