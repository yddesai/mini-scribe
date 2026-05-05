# Mini-Scribe

Mini-Scribe is an AI-powered ambient medical scribe designed to streamline
clinical documentation. By listening to patient encounters, it automatically
generates accurate transcripts and synthesizes structured, high-quality SOAP
(Subjective, Objective, Assessment, and Plan) notes using Google's Gemini LLM.

The platform is built to assist healthcare professionals by reducing the
administrative burden of manual note-taking, featuring robust data persistence,
highly accurate audio-transcript synchronization, and a semantic search engine
for past encounters.

## Features

- **Ambient Audio Recording:** Capture patient-provider conversations directly
  through the web interface.
- **Accurate Transcription:** Leverages Speech-to-Text (STT) models to
  transcribe audio with precise wall-clock timestamp synchronization for easy
  playback and review.
- **Automated SOAP Notes:** Integrates with the Gemini API to automatically
  generate comprehensive and structured SOAP notes from the raw conversation
  transcript.
- **Semantic Similarity Search:** A dedicated FAISS-powered Python service
  enables intelligent similarity search across past historical notes and
  sessions.
- **Persistent Storage:** Reliable storage of audio metadata, transcripts, and
  clinical notes in MongoDB.

## Architecture

![alt text](image.png)

## Local Development

If you wish to run the services locally for development:

1. **Frontend:** Navigate to `/frontend` and use `npm install` followed by
   `npm run dev`.
2. **Backend:** Navigate to `/backend`, set up your `.env` (including
   `GEMINI_API_KEY` and Google credentials), and run `npm run dev`.
3. **Similarity Service:** Navigate to `/similarity_service`, install
   requirements via `pip install -r requirements.txt`, and run the FastAPI
   server.
4. **Database:** Ensure a local MongoDB instance is running on port `27017`.
