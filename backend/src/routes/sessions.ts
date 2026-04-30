import { Router } from 'express';
import { generateSoapNote } from '../services/llmService.js';

export const sessionsRouter = Router();

// In-memory store for MVP
const sessions: Record<string, any> = {};

sessionsRouter.post('/', (req, res) => {
    const sessionId = Date.now().toString();
    sessions[sessionId] = {
        id: sessionId,
        transcript: [],
        report: null,
        createdAt: new Date().toISOString()
    };
    res.json(sessions[sessionId]);
});

sessionsRouter.get('/', (req, res) => {
    res.json(Object.values(sessions));
});

sessionsRouter.get('/:id', (req, res) => {
    const session = sessions[req.params.id];
    if (!session) {
         res.status(404).json({ error: 'Not found' });
         return;
    }
    res.json(session);
});

// Endpoint to manually regenerate report
sessionsRouter.post('/:id/report', async (req, res) => {
    const session = sessions[req.params.id];
    if (!session) {
         res.status(404).json({ error: 'Not found' });
         return;
    }
    
    const combinedTranscript = session.transcript.map((t: any) => t.text).join(' ');
    const report = await generateSoapNote(combinedTranscript);
    
    session.report = report;
    res.json({ report });
});
