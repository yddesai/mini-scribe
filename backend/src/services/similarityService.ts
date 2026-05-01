const DEFAULT_SIMILARITY_SERVICE_URL = 'http://localhost:8000';
const SIMILARITY_SERVICE_URL = (
    process.env.SIMILARITY_SERVICE_URL || DEFAULT_SIMILARITY_SERVICE_URL
).replace(/\/$/, '');

const DEFAULT_EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

export interface SimilaritySearchMatch {
    sessionId: string;
    score: number;
}

interface SimilarityUpsertResponse {
    session_id: string;
    indexed_count: number;
    embedding_model: string;
}

interface SimilaritySearchResponse {
    matches: Array<{
        session_id: string;
        score: number;
    }>;
}

const isSoapItemArray = (value: unknown): value is Array<{ text?: string }> => {
    return Array.isArray(value);
};

const extractSoapTexts = (value: unknown) => {
    if (!isSoapItemArray(value)) {
        return [];
    }

    return value
        .map((item) => item?.text?.trim())
        .filter((item): item is string => Boolean(item));
};

export const buildSimilaritySourceText = (report: any) => {
    const longReport = report && typeof report === 'object' && 'long' in report
        ? report.long
        : report;

    if (!longReport || typeof longReport !== 'object') {
        return '';
    }

    const sections = [
        {
            label: 'Chief Complaint',
            values: extractSoapTexts(longReport.subjective?.chief_complaint),
        },
        {
            label: 'HPI',
            values: extractSoapTexts(longReport.subjective?.hpi),
        },
        {
            label: 'Assessment',
            values: extractSoapTexts(longReport.assessment),
        },
        {
            label: 'Plan',
            values: extractSoapTexts(longReport.plan),
        },
    ].filter((section) => section.values.length > 0);

    return sections
        .map((section) => `${section.label}: ${section.values.join(' | ')}`)
        .join('\n');
};

const postJson = async <TResponse>(
    path: string,
    body: object,
): Promise<TResponse> => {
    const response = await fetch(`${SIMILARITY_SERVICE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Similarity service error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<TResponse>;
};

export const upsertSessionSimilarityVector = async (
    sessionId: string,
    text: string,
    metadata?: Record<string, unknown>,
) => {
    if (!text.trim()) {
        return {
            embeddingModel: DEFAULT_EMBEDDING_MODEL,
            indexedCount: 0,
        };
    }

    const response = await postJson<SimilarityUpsertResponse>('/sessions/upsert', {
        session_id: sessionId,
        text,
        metadata,
    });

    return {
        embeddingModel: response.embedding_model,
        indexedCount: response.indexed_count,
    };
};

export const searchSimilarSessionVectors = async (
    sessionId: string,
    text: string,
    topK = 3,
) => {
    if (!text.trim()) {
        return [] as SimilaritySearchMatch[];
    }

    const response = await postJson<SimilaritySearchResponse>('/sessions/search', {
        session_id: sessionId,
        text,
        top_k: topK,
    });

    return response.matches.map((match) => ({
        sessionId: match.session_id,
        score: match.score,
    }));
};

