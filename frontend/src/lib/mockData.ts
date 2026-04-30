import { Session, SOAPReport } from "./types";

export const MOCK_SESSION: Session = {
  id: "1",
  title: "Session Oct 24, 5:21 PM",
  date: "24 Oct 2025 at 17:21",
  duration: "5:24",
};

export const SESSIONS_LIST: Session[] = [
  MOCK_SESSION,
  { id: "2", title: "Session Oct 24, 2:15 PM", date: "24 Oct 2025 at 14:15", duration: "12:05" },
  { id: "3", title: "Follow-up: John Doe", date: "23 Oct 2025 at 09:30", duration: "08:45" },
  { id: "4", title: "New Patient Consultation", date: "22 Oct 2025 at 11:00", duration: "15:20" },
  { id: "5", title: "Evening Rounds", date: "21 Oct 2025 at 18:45", duration: "25:10" },
];

export const MOCK_TRANSCRIPT_LINES = [
  "Hi.",                                                            // 0
  "Hi there, it's Dr. Smith from Babylon.",                        // 1
  "Hi, thank you, thank you.",                                     // 2
  "Can you confirm your name, date of birth and your home address, please?", // 3
  "Yes, I can.",                                                   // 4
  "It's Mary Smith.",                                              // 5
  "Um, I'm 28 and I live at apartment 40590 Carcomwell Road.",      // 6
  "Okay, that's fine.",                                            // 7
  "Are you in a private place, you can have a consultation today.", // 8
  "Yes I am.",                                                     // 9
  "What can I do for you?",                                        // 10
  "Um, I keep having a headache.",                                 // 11
  "Okay, and when did it start?",                                  // 12
  "It started yesterday.",                                         // 13
  "Um, it's unusual for me to have a headache.",                   // 14
  "Okay, can you just tell me whereabouts in your head it is?",     // 15
  "It's on the left side at the back.",                            // 16
  "Sort of here.",                                                 // 17
  "Okay, just on the left side.",                                  // 18
  "Yes.",                                                          // 19
  "When did it start? What time of day did it start yesterday?",   // 20
  "About mid morning.",                                            // 21
  "And how did it feel when it first started?",                    // 22
  "Um, just quite intense and kind of quite throbbing.",           // 23
  "It kind of built up gradually over a short period of time.",     // 24
];

export const MOCK_SOAP: SOAPReport = {
  subjective: {
    chief_complaint: [{ text: "Headache", refs: [11] }],
    hpi: [
      { text: "Intense and throbbing from onset", refs: [23] },
      { text: "Started mid-morning yesterday", refs: [21] },
      { text: "Started yesterday", refs: [13] },
      { text: "On left side at back", refs: [16] },
      { text: "Began gradually over a short period", refs: [24] },
    ],
    ros: [
      { text: "No nausea, vomiting, tingling, numbness, blurred vision, pain over eyes, photophobia, fever, chills, sweats, rashes", refs: [7, 9, 10] },
      { text: "No recent sick or vomiting", refs: [8] },
    ],
    past_medical_history: [
      { text: "No other medical problems", refs: [12] },
    ],
    social_history: [
      { text: "Lives with partner", refs: [15] },
    ],
  },
  objective: {
    vitals: [{ text: "Not recorded", refs: [] }],
    physical_exam: [{ text: "Not performed", refs: [] }],
  },
  assessment: [
    { text: "Tension-type headache, likely. No red flag features identified.", refs: [13, 16, 23] },
  ],
  plan: [
    { text: "Advise paracetamol or ibuprofen as needed", refs: [] },
    { text: "Safety net: return if worsening, new neuro symptoms, or fever", refs: [] },
  ],
  flags: [
    { type: "uncertainty", text: "Duration of relief after onset unclear — clarify with patient." },
    { type: "missing", text: "Medication name for cholesterol unconfirmed." },
  ],
};
