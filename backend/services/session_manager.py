import random
import uuid
import time


class SessionManager:
    ADJECTIVES = [
        "Neon",
        "Swift",
        "Silent",
        "Ultra",
        "Frost",
        "Quantum",
        "Shadow",
        "Elite",
        "Crystal",
        "Turbo",
    ]
    NOUNS = [
        "Tiger",
        "Eagle",
        "Falcon",
        "Dolphin",
        "Nexus",
        "Drift",
        "Pulse",
        "Storm",
        "Volt",
        "Wave",
    ]

    def __init__(self):
        # Dictionary to store multiple sessions: {session_id: session_data}
        self.sessions = {}
        self.blocked_sessions = set()  # Set of session_ids that are blocked

    def remove_session(self, session_id):
        if session_id in self.sessions:
            # Cleanup files on disconnect
            from services.file_service import FileService

            FileService.delete_session_files(session_id)
            del self.sessions[session_id]
            return True
        return False

    def block_session(self, session_id):
        if session_id in self.sessions:
            from services.file_service import FileService

            FileService.delete_session_files(session_id)
            self.blocked_sessions.add(session_id)
            del self.sessions[session_id]
            return True
        return False

    def get_all_sessions(self):
        # Cleanup expired pending sessions (older than 120s)
        current_time = time.time()
        expired_ids = [
            sid
            for sid, s in self.sessions.items()
            if s["status"] == "PENDING_VERIFICATION"
            and current_time - s["created_at"] > 120
        ]
        for sid in expired_ids:
            del self.sessions[sid]
        return list(self.sessions.values())

    def get_session(self, session_id):
        if session_id in self.blocked_sessions:
            return None
        return self.sessions.get(session_id)

    def init_session(self, requested_name: str = None):
        # Create a new session for a new device
        session_id = str(uuid.uuid4())
        pin = str(random.randint(1000, 9999))

        # Ensure unique PIN
        while any(
            s["pin"] == pin
            for s in self.sessions.values()
            if s["status"] == "PENDING_VERIFICATION"
        ):
            pin = str(random.randint(1000, 9999))

        # Better Names
        if not requested_name:
            adj = random.choice(self.ADJECTIVES)
            noun = random.choice(self.NOUNS)
            device_name = f"{adj} {noun}"
        else:
            device_name = requested_name

        new_session = {
            "session_id": session_id,
            "status": "PENDING_VERIFICATION",
            "pin": pin,
            "created_at": time.time(),
            "expires_at": time.time() + 120,
            "device_name": device_name,
        }
        self.sessions[session_id] = new_session
        return new_session

    def verify_pin(self, pin: str):
        # Find the session with this PIN
        current_time = time.time()

        for sid, session in list(self.sessions.items()):
            if session["status"] == "PENDING_VERIFICATION" and session["pin"] == pin:
                if current_time > session["expires_at"]:
                    del self.sessions[sid]
                    return None  # Expired

                session["status"] = "AUTHENTICATED"
                return session
        return None

    def reset(self):
        # Clear all sessions and their files
        from services.file_service import FileService

        for sid in list(self.sessions.keys()):
            FileService.delete_session_files(sid)
        self.sessions = {}
        return {"status": "cleared"}


# Singleton instance for the app
session_manager = SessionManager()
