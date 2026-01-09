import { API_BASE } from '../constants/constants';

export interface ApiClient {
    get<T>(endpoint: string): Promise<T>;
    post<T>(endpoint: string, body: any): Promise<T>;
    upload<T>(endpoint: string, file: File, onProgress?: (p: number) => void): Promise<T>;
}

export const api: ApiClient = {
    async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) throw new Error('API Error');
        return response.json() as Promise<T>;
    },

    async post<T>(endpoint: string, body: any): Promise<T> {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error('API Error');
        return response.json() as Promise<T>;
    },

    upload<T>(endpoint: string, file: File, onProgress?: (p: number) => void): Promise<T> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE}${endpoint}`, true);
            xhr.setRequestHeader('x-filename', file.name);
            xhr.setRequestHeader('x-filesize', file.size.toString());

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) resolve(JSON.parse(xhr.response) as T);
                else reject(new Error('Upload failed'));
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
        });
    }
};
