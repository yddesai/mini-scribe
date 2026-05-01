const API_URL = 'http://localhost:3000/api';

class ApiError extends Error {
    status: number;
    retryable: boolean;

    constructor(message: string, status: number, retryable = false) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.retryable = retryable;
    }
}

const parseJsonSafely = async (res: Response) => {
    try {
        return await res.json();
    } catch {
        return null;
    }
};

export const api = {
    createSession: async () => {
        const res = await fetch(`${API_URL}/sessions`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to create session');
        return res.json();
    },
    getSessions: async () => {
        const res = await fetch(`${API_URL}/sessions`);
        if (!res.ok) throw new Error('Failed to fetch sessions');
        return res.json();
    },
    getSession: async (id: string) => {
        const res = await fetch(`${API_URL}/sessions/${id}`);
        if (!res.ok) throw new Error('Failed to fetch session');
        return res.json();
    },
    regenerateReport: async (id: string) => {
        const res = await fetch(`${API_URL}/sessions/${id}/report`, { method: 'POST' });
        if (!res.ok) {
            const payload = await parseJsonSafely(res);
            throw new ApiError(
                payload?.error || 'Failed to regenerate report',
                res.status,
                payload?.retryable ?? false,
            );
        }
        return res.json();
    },
    completeSession: async (id: string, duration?: number) => {
        const res = await fetch(`${API_URL}/sessions/${id}/complete`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration }),
        });
        if (!res.ok) throw new Error('Failed to complete session');
        return res.json();
    },
    uploadAudio: async (id: string, audioBlob: Blob) => {
        const res = await fetch(`${API_URL}/sessions/${id}/audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'audio/webm' },
            body: audioBlob,
        });
        if (!res.ok) throw new Error('Failed to upload audio');
        return res.json();
    },
    getAudioUrl: (id: string) => `${API_URL}/sessions/${id}/audio`,
};

export { ApiError };
