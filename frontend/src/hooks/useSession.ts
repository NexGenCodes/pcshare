import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { POLL_INTERVAL_SESSION } from '../constants/constants';

export interface SessionState {
    status: 'IDLE' | 'PENDING_VERIFICATION' | 'AUTHENTICATED';
    pin: string | null;
    session_id?: string;
    device_name?: string;
}

export function useSession() {
    // Host sees all sessions
    const [sessions, setSessions] = useState<SessionState[]>([]);

    // Client (Mobile) only cares about its own session
    const [mySession, setMySession] = useState<SessionState | null>(null);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        setIsMobile(mobile);

        // If mobile and has ID param, auto-init (old logic, maybe keep?)
        // Actually, if we want isolation, user should tap "Initialize" manually usually.
        // But for convenience let's keep it if param exists.
        if (mobile && window.location.search.includes('start=1')) {
            // We can auto-init here if needed, but better to let UI handle it
        }

        const interval = setInterval(checkStatus, POLL_INTERVAL_SESSION);
        return () => clearInterval(interval);
    }, []);

    const checkStatus = async () => {
        try {
            // Backend now returns { sessions: [...] }
            const data = await api.get<{ sessions: SessionState[] }>('/session/status');
            setSessions(data.sessions || []);

            // If we are a mobile client with an active session, update our local state from the server list
            if (mySession && mySession.session_id) {
                const serverSession = data.sessions.find(s => s.session_id === mySession.session_id);
                if (serverSession) {
                    setMySession(serverSession);
                } else {
                    // Session might have been cleared on server
                    // setMySession(null); // Optional: reset if server forgets us
                }
            }
        } catch (e) { console.error(e); }
    };

    const init = async (deviceName?: string) => {
        try {
            const query = deviceName ? `?device_name=${encodeURIComponent(deviceName)}` : '';
            const newSession = await api.get<SessionState>(`/session/init${query}`);
            setMySession(newSession);
            checkStatus(); // Refresh list immediately
        } catch (e) { console.error(e); }
    };

    const verify = async (pin: string) => {
        try {
            const result = await api.post<any>('/session/verify', { pin });
            if (result.status === 'AUTHENTICATED') {
                if (result.session) setMySession(result.session);
                checkStatus();
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    };

    const reset = async () => {
        try {
            await api.post<any>('/session/reset', {});
            setSessions([]);
            setMySession(null);
        } catch (e) { console.error(e); }
    };

    const blockSession = async (sessionId: string) => {
        try {
            await api.post<any>(`/session/block/${sessionId}`, {});
            checkStatus();
        } catch (e) { console.error(e); }
    };

    const disconnectSession = async (sessionId: string) => {
        try {
            await api.post<any>(`/session/disconnect/${sessionId}`, {});
            checkStatus();
        } catch (e) { console.error(e); }
    };

    return {
        sessions,       // For Host 
        mySession,      // For Mobile Context
        isMobile,
        init,
        verify,
        reset,
        blockSession,
        disconnectSession
    };
}
