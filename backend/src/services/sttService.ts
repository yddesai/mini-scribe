import speech, { protos } from '@google-cloud/speech';
import { EventEmitter } from 'events';

// Create a singleton client. Ensure GOOGLE_APPLICATION_CREDENTIALS is set in env
const client = new speech.SpeechClient();

export class STTService extends EventEmitter {
    private recognizeStream: any = null;

    startStream() {
        if (this.recognizeStream) {
            this.stopStream();
        }

        const request: protos.google.cloud.speech.v1.IStreamingRecognitionConfig = {
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true,
                diarizationConfig: {
                    enableSpeakerDiarization: true,
                    minSpeakerCount: 2,
                    maxSpeakerCount: 2,
                },
                model: 'medical_conversation', // Or 'latest_long'
            },
            interimResults: true,
        };

        this.recognizeStream = client.streamingRecognize(request)
            .on('error', (error) => {
                console.error('STT Stream Error:', error);
                this.emit('error', error);
            })
            .on('data', (data) => {
                this.handleStreamData(data);
            });
    }

    sendAudio(audioBuffer: Buffer) {
        if (this.recognizeStream) {
            this.recognizeStream.write(audioBuffer);
        }
    }

    stopStream() {
        if (this.recognizeStream) {
            this.recognizeStream.end();
            this.recognizeStream = null;
        }
    }

    private handleStreamData(data: any) {
        // Emit processed transcript data
        const result = data.results[0];
        if (!result || !result.alternatives || !result.alternatives[0]) {
            return;
        }
        
        const text = result.alternatives[0].transcript;
        const isFinal = result.isFinal;
        
        this.emit('transcript', {
            text,
            isFinal
        });
    }
}
