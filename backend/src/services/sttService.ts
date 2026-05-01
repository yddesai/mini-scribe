import speech, { protos } from '@google-cloud/speech';
import { EventEmitter } from 'events';

// Create a singleton client. Ensure GOOGLE_APPLICATION_CREDENTIALS is set in env
const client = new speech.SpeechClient();

interface TranscriptEvent {
    text: string;
    isFinal: boolean;
    speaker: number;
    startTimeSec: number;
    endTimeSec: number;
}

export class STTService extends EventEmitter {
    private recognizeStream: any = null;
    private lastFinalEndTime: string = '';
    private seenFinalSignatures = new Set<string>();

    startStream() {
        if (this.recognizeStream) {
            this.stopStream();
        }

        this.lastFinalEndTime = '';
        this.seenFinalSignatures.clear();

        const request: protos.google.cloud.speech.v1.IStreamingRecognitionConfig = {
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: true,
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

    private handleStreamData(data: protos.google.cloud.speech.v1.IStreamingRecognizeResponse) {
        const result = data.results?.[0];
        if (!result || !result.alternatives || !result.alternatives[0]) {
            return;
        }

        const alternative = result.alternatives[0];
        const text = alternative.transcript?.trim();
        const isFinal = result.isFinal ?? false;
        if (!text) {
            return;
        }
        const words = alternative.words ?? [];
        const firstWord = words[0];
        const lastWord = words[words.length - 1];
        const endTimeSec = this.durationToSeconds(lastWord?.endTime ?? result.resultEndTime);
        const startTimeSec = this.durationToSeconds(firstWord?.startTime ?? result.resultEndTime);
        const speaker = lastWord?.speakerTag ?? 0;

        // Deduplicate: Google STT can re-send the same final result
        // across consecutive data events, especially when the stream closes.
        // Track both resultEndTime and a content signature to avoid duplicate lines.
        if (isFinal) {
            const endTime = JSON.stringify(result.resultEndTime || '');
            const signature = this.buildFinalSignature(text, startTimeSec, endTimeSec, speaker);

            if (endTime === this.lastFinalEndTime || this.seenFinalSignatures.has(signature)) {
                return; // Already emitted this result
            }

            this.lastFinalEndTime = endTime;
            this.seenFinalSignatures.add(signature);
        }

        const payload: TranscriptEvent = {
            text,
            isFinal,
            speaker,
            startTimeSec,
            endTimeSec,
        };

        this.emit('transcript', payload);
    }

    private durationToSeconds(
        duration?: protos.google.protobuf.IDuration | null,
    ): number {
        if (!duration) {
            return 0;
        }

        const seconds = Number(duration.seconds ?? 0);
        const nanos = Number(duration.nanos ?? 0);
        return seconds + nanos / 1_000_000_000;
    }

    private buildFinalSignature(
        text: string,
        startTimeSec: number,
        endTimeSec: number,
        speaker: number,
    ): string {
        const normalizedText = text.trim().replace(/\s+/g, ' ').toLowerCase();
        const roundedStart = Math.round(startTimeSec * 100);
        const roundedEnd = Math.round(endTimeSec * 100);

        return `${normalizedText}|${roundedStart}|${roundedEnd}|${speaker}`;
    }
}
