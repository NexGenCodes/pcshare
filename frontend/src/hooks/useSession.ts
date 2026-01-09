import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { POLL_INTERVAL_SESSION } from '../constants/constants';

export interface SessionState {
    status: 'IDLE' | 'PENDING_VERIFICATION' | 'AUTHENTICATED';
    pin: string | null;
    session_id?: string | null;
}

export function useSession() {
    const [session, setSession] = useState<SessionState>({ status: 'IDLE', pin: null });
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        setIsMobile(mobile);

        if (mobile && window.location.search.includes('id=')) {
            init();
        }

        const interval = setInterval(checkStatus, POLL_INTERVAL_SESSION);
        return () => clearInterval(interval);
    }, []);

    const checkStatus = async () => {
        try {
            const data = await api.get<SessionState>('/session/status');
            setSession(data);
        } catch (e) { console.error(e); }
    };

    const init = async () => {
        try {
            await api.get<SessionState>('/session/init');
            checkStatus();
        } catch (e) { console.error(e); }
    };

    const verify = async (pin: string) => {
        try {
            await api.post<any>('/session/verify', { pin });
            checkStatus();
            return true;
        } catch (e) {
            return false;
        }
    };

    const reset = async () => {
        try {
            await api.post<SessionState>('/session/reset', {});
            checkStatus();
        } catch (e) { console.error(e); }
    };

    return { session, isMobile, init, verify, reset };
}
