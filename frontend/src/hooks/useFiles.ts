import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { POLL_INTERVAL_FILES } from '../constants/constants';

export interface FileItem {
    name: string;
    size: number;
    modified: number;
    direction?: 'sent' | 'received';
    session_id?: string;
    is_dir?: boolean;
    has_thumbnail?: boolean;
}

export interface TransferStatus {
    type: 'success' | 'error';
    message: string;
}

export function useFiles(isAuthenticated: boolean, sessionId?: string | null, isHost: boolean = false, deviceName?: string) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<TransferStatus | null>(null);

    const getHeaders = (): Record<string, string> => {
        const h: Record<string, string> = {};
        if (sessionId) h['x-session-id'] = sessionId;
        if (isHost) h['x-is-host'] = 'true';
        if (deviceName) h['x-device-name'] = deviceName;
        return h;
    };

    const fetchFiles = async () => {
        try {
            const data = await api.get<FileItem[]>('/files/', getHeaders());
            setFiles(data);
        } catch (e) {
            console.error('Fetch error:', e);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchFiles();
            const interval = setInterval(fetchFiles, POLL_INTERVAL_FILES);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, sessionId, deviceName, isHost]);

    const upload = async (file: File) => {
        setUploading(true);
        setProgress(0);
        setStatus(null);

        try {
            await api.upload<any>('/files/upload', file, setProgress, getHeaders());
            setStatus({ type: 'success', message: `Successfully transferred ${file.name}` });
            fetchFiles();
        } catch (e) {
            setStatus({ type: 'error', message: 'Transfer failed. Connection interrupted.' });
        } finally {
            setUploading(false);
        }
    };

    return { files, uploading, progress, status, upload, fetchFiles };
}
