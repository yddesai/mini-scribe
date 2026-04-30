export interface Session {
  id: string;
  title: string;
  date: string;
  duration: string;
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
