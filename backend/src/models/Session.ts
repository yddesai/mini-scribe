import mongoose, { Schema, Document } from 'mongoose';

export interface ITranscriptLine {
    lineIndex: number;
    text: string;
    speaker: number;
    startTimeSec: number;
    endTimeSec: number;
    isFinal: boolean;
}

export interface ISession extends Document {
    title: string;
    status: 'recording' | 'completed';
    transcript: ITranscriptLine[];
    report: any; // Flexible Mixed type — LLM output shape can change
    similarity?: {
        sourceText?: string;
        embeddingModel?: string;
        embeddingUpdatedAt?: Date | null;
        similarSessions?: Array<{
            sessionId: string;
            score: number;
            title: string;
            createdAt: Date;
            preview: string;
        }>;
    } | null;
    audioPath: string | null;
    duration: number;
    createdAt: Date;
    updatedAt: Date;
}

const TranscriptLineSchema = new Schema({
    lineIndex: { type: Number, required: true },
    text: { type: String, required: true },
    speaker: { type: Number, default: 0 },
    startTimeSec: { type: Number, required: true },
    endTimeSec: { type: Number, required: true },
    isFinal: { type: Boolean, default: true },
}, { _id: false });

const SimilarSessionSchema = new Schema({
    sessionId: { type: String, required: true },
    score: { type: Number, required: true },
    title: { type: String, required: true },
    createdAt: { type: Date, required: true },
    preview: { type: String, required: true },
}, { _id: false });

const SimilaritySchema = new Schema({
    sourceText: { type: String, default: '' },
    embeddingModel: { type: String, default: null },
    embeddingUpdatedAt: { type: Date, default: null },
    similarSessions: { type: [SimilarSessionSchema], default: [] },
}, { _id: false });

const SessionSchema = new Schema({
    title: { type: String, required: true },
    status: { type: String, enum: ['recording', 'completed'], default: 'recording' },
    transcript: { type: [TranscriptLineSchema], default: [] },
    report: { type: Schema.Types.Mixed, default: null },
    similarity: { type: SimilaritySchema, default: null },
    audioPath: { type: String, default: null },
    duration: { type: Number, default: 0 },
}, { timestamps: true });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
