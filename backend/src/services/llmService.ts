const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
const GEMINI_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_GEMINI_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
type SoapMode = 'long' | 'short';

// JSON Schema that enforces the exact SOAPReport structure
const SOAP_RESPONSE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        subjective: {
            type: 'OBJECT',
            properties: {
                chief_complaint: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            text: { type: 'STRING' },
                            refs: { type: 'ARRAY', items: { type: 'INTEGER' } }
                        },
                        required: ['text', 'refs']
                    }
                },
                hpi: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            text: { type: 'STRING' },
                            refs: { type: 'ARRAY', items: { type: 'INTEGER' } }
                        },
                        required: ['text', 'refs']
                    }
                },
                ros: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            text: { type: 'STRING' },
                            refs: { type: 'ARRAY', items: { type: 'INTEGER' } }
                        },
                        required: ['text', 'refs']
                    }
                },
                past_medical_history: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            text: { type: 'STRING' },
                            refs: { type: 'ARRAY', items: { type: 'INTEGER' } }
                        },
                        required: ['text', 'refs']
                    }
                },
                social_history: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            text: { type: 'STRING' },
                            refs: { type: 'ARRAY', items: { type: 'INTEGER' } }
                        },
                        required: ['text', 'refs']
                    }
                }
            },
            required: ['chief_complaint', 'hpi', 'ros', 'past_medical_history', 'social_history']
        },
        objective: {
            type: 'OBJECT',
            properties: {
                vitals: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            text: { type: 'STRING' },
                            refs: { type: 'ARRAY', items: { type: 'INTEGER' } }
                        },
                        required: ['text', 'refs']
                    }
                },
                physical_exam: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            text: { type: 'STRING' },
                            refs: { type: 'ARRAY', items: { type: 'INTEGER' } }
                        },
                        required: ['text', 'refs']
                    }
                }
            },
            required: ['vitals', 'physical_exam']
        },
        assessment: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    text: { type: 'STRING' },
                    refs: { type: 'ARRAY', items: { type: 'INTEGER' } }
                },
                required: ['text', 'refs']
            }
        },
        plan: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    text: { type: 'STRING' },
                    refs: { type: 'ARRAY', items: { type: 'INTEGER' } }
                },
                required: ['text', 'refs']
            }
        },
        flags: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    type: { type: 'STRING', enum: ['uncertainty', 'missing'] },
                    text: { type: 'STRING' }
                },
                required: ['type', 'text']
            }
        }
    },
    required: ['subjective', 'objective', 'assessment', 'plan', 'flags']
};

const SOAP_SYSTEM_PROMPT = `You are a clinical documentation AI assistant. Given a numbered transcript of a medical encounter, generate a structured SOAP note.

RULES:
1. For every item, include "refs" — an array of zero-indexed line numbers from the transcript that support that statement.
2. If information is not mentioned in the transcript, use an empty array for refs and note it as "Not discussed".
3. Identify any uncertainties or missing critical information as flags.
4. Be thorough, clinically accurate, and concise.
5. If the transcript is very short or lacks medical content, still produce appropriate entries and flag what's missing.`;

const SOAP_MODE_INSTRUCTIONS: Record<SoapMode, string> = {
    long: `STYLE:
- Generate a comprehensive SOAP note.
- Include all clinically relevant details from the transcript.
- Multiple bullet items per subsection are allowed when supported by the transcript.
- Preserve nuance, differential considerations, and follow-up details when present.`,
    short: `STYLE:
- Generate a concise SOAP note for quick review.
- Prefer only the highest-signal points.
- Keep each subsection brief, usually 0-2 items.
- Collapse repetitive detail into a single concise statement when possible.
- Do not omit clinically important safety, assessment, or plan items.`,
};

interface TranscriptLineInput {
    lineIndex?: number;
    text?: string;
}

export class GeminiApiError extends Error {
    statusCode: number;
    retryable: boolean;

    constructor(message: string, statusCode: number, retryable: boolean) {
        super(message);
        this.name = 'GeminiApiError';
        this.statusCode = statusCode;
        this.retryable = retryable;
    }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelayMs = (attempt: number) => {
    const jitter = Math.floor(Math.random() * 250);
    return BASE_RETRY_DELAY_MS * 2 ** (attempt - 1) + jitter;
};

const buildNumberedTranscript = (transcriptLines: TranscriptLineInput[]) => {
    return transcriptLines
        .map((line, index) => ({
            lineIndex: typeof line.lineIndex === 'number' ? line.lineIndex : index,
            text: line.text?.trim() ?? '',
        }))
        .filter((line) => line.text)
        .sort((a, b) => a.lineIndex - b.lineIndex)
        .map((line) => `[${line.lineIndex}] ${line.text}`)
        .join('\n');
};

const generateSoapNoteForMode = async (
    numberedTranscript: string,
    apiKey: string,
    mode: SoapMode,
) => {
    const userPrompt = `Here is the medical encounter transcript:\n\n${numberedTranscript}\n\nGenerate the ${mode} SOAP note.`;

    console.log(`Calling Gemini API for ${mode} SOAP generation...`);

    for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt += 1) {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: `${SOAP_SYSTEM_PROMPT}\n\n${SOAP_MODE_INSTRUCTIONS[mode]}\n\n${userPrompt}` }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: 'application/json',
                    responseSchema: SOAP_RESPONSE_SCHEMA,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            const retryable = GEMINI_RETRYABLE_STATUS_CODES.has(response.status);

            console.error(
                `Gemini API error for ${mode} SOAP on attempt ${attempt}/${MAX_GEMINI_ATTEMPTS}:`,
                response.status,
                errorText,
            );

            if (retryable && attempt < MAX_GEMINI_ATTEMPTS) {
                const retryDelayMs = getRetryDelayMs(attempt);
                console.log(`Retrying ${mode} SOAP request in ${retryDelayMs}ms`);
                await sleep(retryDelayMs);
                continue;
            }

            throw new GeminiApiError(
                retryable
                    ? 'Gemini is temporarily unavailable due to high demand. Please try again shortly.'
                    : `Gemini API returned ${response.status}`,
                response.status,
                retryable,
            );
        }

        const data: any = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
            console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
            throw new Error('No text in Gemini response');
        }

        const soapReport = JSON.parse(rawText);
        console.log(`${mode} SOAP note generated successfully on attempt ${attempt}`);
        return soapReport;
    }

    throw new Error(`${mode} SOAP generation failed unexpectedly`);
};

export const generateSoapNotes = async (transcriptLines: TranscriptLineInput[]) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        console.error('GEMINI_API_KEY not set in .env');
        throw new Error('Gemini API key not configured');
    }

    const numberedTranscript = buildNumberedTranscript(transcriptLines);

    if (!numberedTranscript) {
        throw new Error('Transcript is empty');
    }

    const long = await generateSoapNoteForMode(numberedTranscript, apiKey, 'long');
    const short = await generateSoapNoteForMode(numberedTranscript, apiKey, 'short');

    return { long, short };
};
