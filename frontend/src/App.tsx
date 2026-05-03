import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TranscriptPanel } from './components/transcript/TranscriptPanel';
import { ReportPanel } from './components/report/ReportPanel';
import { List, FileText, Settings, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ApiError, api } from './lib/api';
import { useAudioRecorder } from './lib/useAudioRecorder';
import { io, Socket } from 'socket.io-client';
import { Session, SimilarSession, StoredSOAPReport, TranscriptLine } from './lib/types';

const buildTranscriptFingerprint = (line: TranscriptLine) => {
  const normalizedText = line.text.trim().replace(/\s+/g, ' ').toLowerCase();
  const roundedStart = Math.round(line.startTimeSec * 100);
  const roundedEnd = Math.round(line.endTimeSec * 100);

  return `${normalizedText}|${roundedStart}|${roundedEnd}|${line.speaker}`;
};

const normalizeTranscriptLines = (lines: TranscriptLine[]) => {
  const seenLineIndexes = new Set<number>();
  const seenFingerprints = new Set<string>();

  return [...lines]
    .sort((a, b) => a.lineIndex - b.lineIndex || a.startTimeSec - b.startTimeSec)
    .filter((line) => {
      const fingerprint = buildTranscriptFingerprint(line);
      if (seenLineIndexes.has(line.lineIndex) || seenFingerprints.has(fingerprint)) {
        return false;
      }

      seenLineIndexes.add(line.lineIndex);
      seenFingerprints.add(fingerprint);
      return true;
    });
};

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [report, setReport] = useState<StoredSOAPReport | null>(null);
  const [similarSessions, setSimilarSessions] = useState<SimilarSession[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reportMode, setReportMode] = useState<'short' | 'long'>('long');
  const [groundingEnabled, setGroundingEnabled] = useState(true);
  const [mobileTab, setMobileTab] = useState<'sessions' | 'transcript' | 'report'>('transcript');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_URL || '/');
    
    socketRef.current.on('transcript_update', (data: TranscriptLine) => {
      if (data.isFinal && data.text.trim()) {
        setTranscriptLines((prev) => {
           const newLines = normalizeTranscriptLines([...prev, data]);
           setActiveLineIndex(newLines.length - 1);
           return newLines;
        });
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const resetSessionView = () => {
    setTranscriptLines([]);
    setReport(null);
    setSimilarSessions([]);
    setReportError(null);
    setAudioUrl(null);
    setActiveLineIndex(0);
    setIsPlaying(false);
  };

  const mergeSessionIntoList = (session: Session) => {
    setSessions((prev) => {
      const next = prev.filter((item) => item._id !== session._id);
      return [session, ...next];
    });
  };

  const fetchSessions = async (preserveActive = true) => {
    setIsLoadingSessions(true);
    try {
      const data = await api.getSessions();
      setSessions(data);
      setActiveSession((prev) => {
        if (preserveActive && prev) {
          const updated = data.find((session: Session) => session._id === prev._id);
          return updated ?? prev;
        }
        return data[0] ?? null;
      });
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    void fetchSessions(false);
  }, []);

  // Load transcript/report/audio when switching sessions
  useEffect(() => {
    if (!activeSession?._id) {
      resetSessionView();
      return;
    }
    const loadSession = async () => {
      try {
        const full = await api.getSession(activeSession._id);
        const transcript = Array.isArray(full.transcript)
          ? normalizeTranscriptLines(full.transcript as TranscriptLine[])
          : [];
        setTranscriptLines(transcript);
        setActiveLineIndex(transcript.length > 0 ? transcript.length - 1 : 0);
        setReport(full.report ?? null);
        setSimilarSessions(full.similarity?.similarSessions ?? []);
        setAudioUrl(full.audioPath ? api.getAudioUrl(activeSession._id) : null);
        setActiveSession((prev) => prev ? ({
          ...prev,
          title: full.title ?? prev.title,
          status: full.status ?? prev.status,
          createdAt: full.createdAt ?? prev.createdAt,
          duration: full.duration ?? prev.duration,
        }) : prev);
      } catch (err) {
        console.error('Failed to load session data', err);
      }
    };
    resetSessionView();
    void loadSession();
  }, [activeSession?._id]);

  const handleAudioChunk = (base64Data: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('audio_chunk', { payload: base64Data });
    }
  };

  const { isRecording, startRecording, stopRecording } = useAudioRecorder(handleAudioChunk);

  const createSession = async () => {
    const session = await api.createSession();
    mergeSessionIntoList(session);
    setActiveSession(session);
    return session;
  };

  const handleStartRecording = async () => {
    let session = activeSession;
    if (!session || session.status === 'completed') {
      try {
        session = await createSession();
      } catch (err) {
        console.error('Failed to create session for recording', err);
        return;
      }
    }

    resetSessionView();
    recordingStartedAtRef.current = Date.now();
    socketRef.current?.emit('audio_stream_start', { sessionId: session._id });
    void startRecording();
  };

  const handleStopRecording = async () => {
    const audioBlob = await stopRecording();
    socketRef.current?.emit('audio_stream_stop');
    const completedSessionId = activeSession?._id;

    const durationSec = recordingStartedAtRef.current
      ? Math.max(0, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
      : undefined;
    recordingStartedAtRef.current = null;
    
    // Upload audio to backend for persistent playback
    if (completedSessionId) {
      try {
        await api.completeSession(completedSessionId, durationSec);
        if (audioBlob) {
          await api.uploadAudio(completedSessionId, audioBlob);
          setAudioUrl(api.getAudioUrl(completedSessionId));
        }
        await fetchSessions();
        setActiveSession((prev) => prev ? {
          ...prev,
          status: 'completed',
          duration: durationSec ?? prev.duration,
        } : prev);
      } catch (err) {
        console.error('Failed to finalize session:', err);
      }
    }
  };

  const handleRegenerateReport = async () => {
    if (!activeSession || isGeneratingReport) return;
    setIsGeneratingReport(true);
    setReportError(null);

    if (window.innerWidth < 768) {
      setMobileTab('report');
    }

    try {
      const res = await api.regenerateReport(activeSession._id);
      setReport(res.report);
      setSimilarSessions(Array.isArray(res.similarSessions) ? res.similarSessions : []);
      await fetchSessions();
    } catch (err) {
      console.error("Failed to regenerate report", err);
      if (err instanceof ApiError) {
        setReportError(err.message);
      } else if (err instanceof Error) {
        setReportError(err.message);
      } else {
        setReportError('Failed to generate report');
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // UI Handlers
  const handleSelectSession = (session: Session) => {
    setActiveSession(session);
    setSidebarOpen(false);
    if (window.innerWidth < 768) {
      setMobileTab('transcript');
    }
  };

  const handleSelectSimilarSession = (similarSession: SimilarSession) => {
    const existingSession = sessions.find((session) => session._id === similarSession.sessionId);
    if (existingSession) {
      handleSelectSession(existingSession);
      return;
    }

    setActiveSession({
      _id: similarSession.sessionId,
      title: similarSession.title,
      createdAt: similarSession.createdAt,
    });
    setSidebarOpen(false);
    if (window.innerWidth < 768) {
      setMobileTab('report');
    }
  };
  const handleRefClick = (lineIndex: number) => {
    setIsPlaying(false);
    setActiveLineIndex(lineIndex);
    if (window.innerWidth < 768) {
      setMobileTab('transcript');
    }
  };
  const handleTogglePlay = () => setIsPlaying(!isPlaying);
  const handlePlaybackChange = (playing: boolean) => setIsPlaying(playing);
  const handleReset = () => {
    setIsPlaying(false);
    setActiveLineIndex(0);
  };

  const handleCreateSession = async () => {
    try {
      resetSessionView();
      await createSession();
    } catch (err) {
      console.error('Failed to create session', err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#141414] overflow-hidden font-sans text-white border border-white/10">
      <div className="hidden lg:block w-[240px] shrink-0">
        <Sidebar 
          activeSessionId={activeSession?._id || ''} 
          sessions={sessions}
          isLoadingSessions={isLoadingSessions}
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onSelectSession={handleSelectSession}
          onNewSession={handleCreateSession}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-white/10">
          <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-white/5 rounded-md">
            <Menu className="w-6 h-6" />
          </button>
          <div className="text-sm font-bold truncate px-4">Current Session</div>
          <button className="p-1 hover:bg-white/5 rounded-md">
            <Settings className="w-5 h-5 opacity-50" />
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className={`
            ${mobileTab === 'transcript' ? 'block' : 'hidden'} 
            md:block md:w-1/2 lg:w-1/2 xl:w-1/2 shrink-0
          `}>
            <TranscriptPanel
              lines={transcriptLines}
              activeLineIndex={activeLineIndex}
              isPlaying={isPlaying}
              hasReport={report !== null}
              isGeneratingReport={isGeneratingReport}
              reportError={reportError}
              audioUrl={audioUrl}
              onTogglePlay={handleTogglePlay}
              onPlaybackChange={handlePlaybackChange}
              onReset={handleReset}
              onRegenerate={handleRegenerateReport}
              onActiveLineChange={setActiveLineIndex}
            />
          </div>

          <div className={`
            ${mobileTab === 'report' ? 'block' : 'hidden md:block'} 
            flex-1 min-w-0
          `}>
            <ReportPanel
              report={report}
              similarSessions={similarSessions}
              isGeneratingReport={isGeneratingReport}
              errorMessage={reportError}
              mode={reportMode}
              onModeChange={setReportMode}
              groundingEnabled={groundingEnabled}
              onGroundingChange={setGroundingEnabled}
              onRefClick={handleRefClick}
              onSelectSimilarSession={handleSelectSimilarSession}
            />
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <nav className="md:hidden flex items-center justify-around bg-[#1a1a1a] border-t border-white/10 h-16 pb-safe">
          <button onClick={() => setMobileTab('sessions')} className={`flex flex-col items-center gap-1 ${mobileTab === 'sessions' ? 'text-blue-500' : 'text-white/40'}`}>
            <List className="w-5 h-5" />
            <span className="text-[10px] font-bold">Sessions</span>
          </button>
          <button onClick={() => setMobileTab('transcript')} className={`flex flex-col items-center gap-1 ${mobileTab === 'transcript' ? 'text-blue-500' : 'text-white/40'}`}>
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-bold">Transcript</span>
          </button>
          <button onClick={() => setMobileTab('report')} className={`flex flex-col items-center gap-1 ${mobileTab === 'report' ? 'text-blue-500' : 'text-white/40'}`}>
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-bold">Report</span>
          </button>
        </nav>
      </main>

      <AnimatePresence>
        {mobileTab === 'sessions' && window.innerWidth < 768 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setMobileTab('transcript')}>
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-[280px] h-full" onClick={(e) => e.stopPropagation()}>
              <Sidebar 
                activeSessionId={activeSession?._id || ''}
                sessions={sessions}
                isLoadingSessions={isLoadingSessions}
                isRecording={isRecording}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onSelectSession={handleSelectSession}
                onNewSession={handleCreateSession}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 hidden md:block lg:hidden" onClick={() => setSidebarOpen(false)}>
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-[280px] h-full relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 z-10 p-1 bg-white/5 rounded-md lg:hidden"><X className="w-5 h-5" /></button>
              <Sidebar 
                activeSessionId={activeSession?._id || ''}
                sessions={sessions}
                isLoadingSessions={isLoadingSessions}
                isRecording={isRecording}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onSelectSession={handleSelectSession}
                onNewSession={handleCreateSession}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
