const API_URL = 'http://localhost:3000/api';

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
        if (!res.ok) throw new Error('Failed to regenerate report');
        return res.json();
    }
};
