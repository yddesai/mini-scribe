import { Server, Socket } from 'socket.io';
import { STTService } from './services/sttService.js';

export const setupSockets = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);
        const sttService = new STTService();

        socket.on('audio_stream_start', () => {
            console.log('Starting audio stream for socket:', socket.id);
            sttService.startStream();
        });

        socket.on('audio_chunk', (data: { payload: string }) => {
            // payload is base64 string
            const buffer = Buffer.from(data.payload, 'base64');
            sttService.sendAudio(buffer);
        });

        socket.on('audio_stream_stop', () => {
            console.log('Stopping audio stream for socket:', socket.id);
            sttService.stopStream();
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            sttService.stopStream();
        });

        sttService.on('transcript', (data) => {
            socket.emit('transcript_update', data);
        });
        
        sttService.on('error', (error) => {
            socket.emit('error', 'STT Error occurred');
        });
    });
};
