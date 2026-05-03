import { Router } from 'express';
import { Session } from '../models/Session.js';
import { GeminiApiError, generateSoapNotes } from '../services/llmService.js';
import {
    buildSimilaritySourceText,
    searchSimilarSessionVectors,
    upsertSessionSimilarityVector,
} from '../services/similarityService.js';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const sessionsRouter = Router();

const UPLOADS_DIR = path.resolve('uploads');

const extractPreviewFromReport = (report: any) => {
    const longReport = report && typeof report === 'object' && 'long' in report
        ? report.long
        : report;

    const candidates = [
        longReport?.subjective?.chief_complaint,
        longReport?.subjective?.hpi,
        longReport?.assessment,
        longReport?.plan,
    ];

    for (const candidate of candidates) {
        if (!Array.isArray(candidate)) {
            continue;
        }

        const firstText = candidate
            .map((item) => item?.text?.trim())
            .find((text): text is string => Boolean(text));

        if (firstText) {
            return firstText.slice(0, 180);
        }
    }

    return 'No preview available';
};

const loadSimilarSessionSummaries = async (
    currentSessionId: string,
    matches: Array<{ sessionId: string; score: number }>,
) => {
    if (matches.length === 0) {
        return [];
    }

    const matchedIds = matches
        .map((match) => match.sessionId)
        .filter((sessionId) => sessionId !== currentSessionId);

    if (matchedIds.length === 0) {
        return [];
    }

    const sessions = await Session.find({
        _id: { $in: matchedIds },
    })
        .select('title createdAt report')
        .lean();

    const sessionMap = new Map(
        sessions.map((session) => [String(session._id), session]),
    );

    return matches
        .map((match) => {
            const session = sessionMap.get(match.sessionId);
            if (!session) {
                return null;
            }

            return {
                sessionId: String(session._id),
                score: Number(match.score.toFixed(4)),
                title: session.title,
                createdAt: session.createdAt,
                preview: extractPreviewFromReport(session.report),
            };
        })
        .filter((session): session is NonNullable<typeof session> => Boolean(session));
};

// Create a new session
sessionsRouter.post('/', async (req, res) => {
    try {
        const now = new Date();
        const title = `Session ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        
        const session = await Session.create({
            title,
            status: 'recording',
            transcript: [],
            report: null,
        });
        res.json(session);
    } catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// List all sessions (most recent first)
sessionsRouter.get('/', async (req, res) => {
    try {
        const sessions = await Session.find()
            .sort({ createdAt: -1 })
            .select('title status duration createdAt')
            .lean();
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Get a single session with full transcript and report
sessionsRouter.get('/:id', async (req, res) => {
    try {
        const session = await Session.findById(req.params.id).lean();
        if (!session) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// Regenerate SOAP report for a session
sessionsRouter.post('/:id/report', async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)
            .select('transcript title createdAt')
            .lean();
        if (!session) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        
        const report = await generateSoapNotes(session.transcript);
        const similaritySourceText = buildSimilaritySourceText(report);

        const reportUpdate: Record<string, unknown> = {
            report,
            similarity: { sourceText: similaritySourceText },
        };

        let similarSessions: Array<{
            sessionId: string;
            score: number;
            title: string;
            createdAt: Date;
            preview: string;
        }> = [];

        await Session.updateOne(
            { _id: req.params.id },
            { $set: reportUpdate },
        );

        try {
            const upsertResult = await upsertSessionSimilarityVector(
                req.params.id,
                similaritySourceText,
                {
                    title: session.title,
                    created_at: session.createdAt,
                },
            );

            const matches = await searchSimilarSessionVectors(
                req.params.id,
                similaritySourceText,
                3,
            );

            similarSessions = await loadSimilarSessionSummaries(req.params.id, matches);

            await Session.updateOne(
                { _id: req.params.id },
                {
                    $set: {
                        similarity: {
                            sourceText: similaritySourceText,
                            embeddingModel: upsertResult.embeddingModel,
                            embeddingUpdatedAt: new Date(),
                            similarSessions: similarSessions,
                        }
                    },
                },
            );
        } catch (similarityError) {
            console.error('Similarity indexing/search failed:', similarityError);
        }
        
        res.json({ report, similarSessions });
    } catch (err) {
        console.error('Error generating report:', err);
        if (err instanceof GeminiApiError) {
            res.status(err.statusCode).json({
                error: err.message,
                retryable: err.retryable,
            });
            return;
        }

        const message = err instanceof Error ? err.message : 'Failed to generate report';
        res.status(500).json({ error: message, retryable: false });
    }
});

// Mark session as completed
sessionsRouter.patch('/:id/complete', async (req, res) => {
    try {
        const duration = typeof req.body?.duration === 'number' && req.body.duration >= 0
            ? req.body.duration
            : undefined;
        const update: { status: 'completed'; duration?: number } = { status: 'completed' };
        if (duration !== undefined) {
            update.duration = duration;
        }

        const session = await Session.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true }
        );
        if (!session) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// Upload audio recording for a session
sessionsRouter.post('/:id/audio', async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) {
            res.status(404).json({ error: 'Not found' });
            return;
        }

        // Read raw body as buffer
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
            const audioBuffer = Buffer.concat(chunks);
            const filename = `${req.params.id}.webm`;
            const filepath = path.join(UPLOADS_DIR, filename);

            await mkdir(UPLOADS_DIR, { recursive: true });
            await writeFile(filepath, audioBuffer);
            
            session.audioPath = filename;
            await session.save();
            
            console.log(`Audio saved: ${filename} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
            res.json({ audioPath: filename });
        });
    } catch (err) {
        console.error('Error saving audio:', err);
        res.status(500).json({ error: 'Failed to save audio' });
    }
});

// Serve audio file for a session
sessionsRouter.get('/:id/audio', async (req, res) => {
    try {
        const session = await Session.findById(req.params.id).lean();
        if (!session || !session.audioPath) {
            res.status(404).json({ error: 'No audio found' });
            return;
        }

        const filepath = path.join(UPLOADS_DIR, session.audioPath);
        if (!existsSync(filepath)) {
            res.status(404).json({ error: 'Audio file missing' });
            return;
        }

        res.setHeader('Content-Type', 'audio/webm');
        res.sendFile(filepath);
    } catch (err) {
        res.status(500).json({ error: 'Failed to serve audio' });
    }
});
