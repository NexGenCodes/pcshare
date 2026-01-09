import os
import json
import time
from typing import List, Dict


class AnalyticsService:
    LOG_FILE = os.path.join("uploads", ".metadata", "transfer_history.json")

    @classmethod
    def _ensure_metadata_dir(cls):
        os.makedirs(os.path.dirname(cls.LOG_FILE), exist_ok=True)

    @classmethod
    def log_transfer(
        cls,
        device_name: str,
        filename: str,
        size: int,
        direction: str,
        status: str = "success",
    ):
        cls._ensure_metadata_dir()

        entry = {
            "timestamp": time.time(),
            "device": device_name,
            "filename": filename,
            "size": size,
            "direction": direction,  # 'sent' or 'received'
            "status": status,
        }

        history = cls.get_history()
        history.append(entry)

        # Keep only last 100 entries for performance
        if len(history) > 100:
            history = history[-100:]

        try:
            with open(cls.LOG_FILE, "w") as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            print(f"Failed to log analytics: {e}")

    @classmethod
    def get_history(cls) -> List[Dict]:
        if not os.path.exists(cls.LOG_FILE):
            return []
        try:
            with open(cls.LOG_FILE, "r") as f:
                return json.load(f)
        except:
            return []

    @classmethod
    def get_stats(cls) -> Dict:
        history = cls.get_history()
        total_sent = sum(
            h["size"]
            for h in history
            if h["direction"] == "sent" and h["status"] == "success"
        )
        total_received = sum(
            h["size"]
            for h in history
            if h["direction"] == "received" and h["status"] == "success"
        )

        return {
            "total_sent": total_sent,
            "total_received": total_received,
            "count": len(history),
        }
