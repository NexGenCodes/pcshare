import random
import uuid


class SessionManager:
    def __init__(self):
        self.state = {
            "status": "IDLE",  # IDLE, PENDING_VERIFICATION, AUTHENTICATED
            "pin": None,
            "session_id": None,
        }

    def get_status(self):
        return self.state

    def init_session(self):
        if self.state["status"] == "IDLE":
            self.state["status"] = "PENDING_VERIFICATION"
            self.state["pin"] = str(random.randint(1000, 9999))
            self.state["session_id"] = str(uuid.uuid4())
        return self.state

    def verify_pin(self, pin: str):
        if self.state["status"] == "PENDING_VERIFICATION" and pin == self.state["pin"]:
            self.state["status"] = "AUTHENTICATED"
            return True
        return False

    def reset(self):
        self.state["status"] = "IDLE"
        self.state["pin"] = None
        self.state["session_id"] = None
        return self.state


# Singleton instance for the app
session_manager = SessionManager()
