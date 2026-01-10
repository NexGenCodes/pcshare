import os
import time
import threading


def start_watchdog(temp_dir=".", interval=10, timeout=60):
    def cleanup():
        while True:
            now = time.time()
            for f in os.listdir(temp_dir):
                if f.endswith(".tmp"):
                    path = os.path.join(temp_dir, f)
                    if os.path.getmtime(path) < now - timeout:
                        try:
                            os.remove(path)
                            print(f"Watchdog: Deleted stale file {f}")
                        except Exception as e:
                            print(f"Watchdog: Error deleting {f}: {e}")
            time.sleep(interval)

    thread = threading.Thread(target=cleanup, daemon=True)
    thread.start()
