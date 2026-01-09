import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { POLL_INTERVAL_FILES } from '../constants/constants';

export interface FileItem {
    name: string;
    size: number;
    modified: number;
}

export interface TransferStatus {
    type: 'success' | 'error';
    message: string;
}

export function useFiles(isAuthenticated: boolean) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<TransferStatus | null>(null);

    const fetchFiles = async () => {
        try {
            const data = await api.get<FileItem[]>('/files/');
            setFiles(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchFiles();
            const interval = setInterval(fetchFiles, POLL_INTERVAL_FILES);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    const upload = async (file: File) => {
        setUploading(true);
        setProgress(0);
        setStatus(null);

        try {
            await api.upload<any>('/files/upload', file, setProgress);
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
