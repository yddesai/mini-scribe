export interface Session {
  _id: string;
  id?: string;
  title: string;
  date?: string;
  duration?: string | number;
  status?: 'recording' | 'completed';
  createdAt?: string;
  similarity?: SimilarityState | null;
}

export interface TranscriptLine {
  lineIndex: number;
  text: string;
  speaker: number;
  startTimeSec: number;
  endTimeSec: number;
  isFinal: boolean;
}

export interface SOAPItem {
  text: string;
  refs: number[];
}

export interface SOAPSection {
  chief_complaint?: SOAPItem[];
  hpi?: SOAPItem[];
  ros?: SOAPItem[];
  past_medical_history?: SOAPItem[];
  social_history?: SOAPItem[];
  vitals?: SOAPItem[];
  physical_exam?: SOAPItem[];
}

export interface Flag {
  type: "uncertainty" | "missing";
  text: string;
}

export interface SOAPReport {
  subjective: {
    chief_complaint: SOAPItem[];
    hpi: SOAPItem[];
    ros: SOAPItem[];
    past_medical_history: SOAPItem[];
    social_history: SOAPItem[];
  };
  objective: {
    vitals: SOAPItem[];
    physical_exam: SOAPItem[];
  };
  assessment: SOAPItem[];
  plan: SOAPItem[];
  flags: Flag[];
}

export interface SOAPReportVariants {
  long: SOAPReport;
  short: SOAPReport;
}

export type StoredSOAPReport = SOAPReport | SOAPReportVariants;

export interface SimilarSession {
  sessionId: string;
  score: number;
  title: string;
  createdAt: string;
  preview: string;
}

export interface SimilarityState {
  sourceText?: string;
  embeddingModel?: string | null;
  embeddingUpdatedAt?: string | null;
  similarSessions?: SimilarSession[];
}
