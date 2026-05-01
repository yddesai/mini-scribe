import { Server, Socket } from 'socket.io';
import { STTService } from './services/sttService.js';
import { Session } from './models/Session.js';

interface TranscriptPayload {
    text: string;
    isFinal: boolean;
    speaker: number;
    startTimeSec: number;
    endTimeSec: number;
}

export const setupSockets = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);
        const sttService = new STTService();
        let currentSessionId: string | null = null;
        let nextLineIndex = 0;

        socket.on('audio_stream_start', async (data?: { sessionId?: string }) => {
            currentSessionId = data?.sessionId || null;
            nextLineIndex = 0;

            if (currentSessionId) {
                try {
                    const session = await Session.findById(currentSessionId)
                        .select('transcript')
                        .lean();
                    nextLineIndex = session?.transcript?.length ?? 0;
                } catch (err) {
                    console.error('Error loading transcript state for stream start:', err);
                }
            }

            console.log(`Starting audio stream for socket: ${socket.id}, session: ${currentSessionId}`);
            sttService.startStream();
        });

        socket.on('audio_chunk', (data: { payload: string }) => {
            // payload is base64 string
            const buffer = Buffer.from(data.payload, 'base64');
            sttService.sendAudio(buffer);
        });

        socket.on('audio_stream_stop', async () => {
            console.log('Stopping audio stream for socket:', socket.id);
            sttService.stopStream();
            
            // Mark session as completed
            if (currentSessionId) {
                try {
                    await Session.findByIdAndUpdate(currentSessionId, { status: 'completed' });
                } catch (err) {
                    console.error('Error completing session:', err);
                }
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            sttService.stopStream();
        });

        sttService.on('transcript', async (data: TranscriptPayload) => {
            // Persist final transcript lines to MongoDB
            if (data.isFinal && data.text?.trim() && currentSessionId) {
                const lineIndex = nextLineIndex;
                nextLineIndex += 1;

                const transcriptLine = {
                    lineIndex,
                    text: data.text.trim(),
                    speaker: data.speaker || 0,
                    startTimeSec: data.startTimeSec,
                    endTimeSec: data.endTimeSec,
                    isFinal: true,
                };

                socket.emit('transcript_update', transcriptLine);

                try {
                    await Session.findByIdAndUpdate(currentSessionId, {
                        $push: {
                            transcript: transcriptLine
                        }
                    });
                } catch (err) {
                    console.error('Error persisting transcript line:', err);
                }
            }
        });
        
        sttService.on('error', (error) => {
            socket.emit('error', 'STT Error occurred');
        });
    });
};
