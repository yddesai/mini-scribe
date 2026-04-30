import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TranscriptPanel } from './components/transcript/TranscriptPanel';
import { ReportPanel } from './components/report/ReportPanel';
import { List, FileText, Settings, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from './lib/api';
import { useAudioRecorder } from './lib/useAudioRecorder';
import { io, Socket } from 'socket.io-client';
import { Session, SOAPReport } from './lib/types';

export default function App() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [report, setReport] = useState<SOAPReport | null>(null);
  
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reportMode, setReportMode] = useState<'short' | 'long'>('long');
  const [groundingEnabled, setGroundingEnabled] = useState(true);
  const [mobileTab, setMobileTab] = useState<'sessions' | 'transcript' | 'report'>('transcript');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io('http://localhost:3000');
    
    socketRef.current.on('transcript_update', (data: { text: string; isFinal: boolean }) => {
      // In a real app, you would handle interim results differently.
      // For this MVP, we'll just append final sentences.
      if (data.isFinal && data.text.trim()) {
        setTranscriptLines((prev) => {
           const newLines = [...prev, data.text];
           // Auto-scroll logic or update active index if not playing
           setActiveLineIndex(newLines.length - 1);
           return newLines;
        });
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Initialize a session on load
  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await api.createSession();
        setActiveSession(session);
      } catch (err) {
        console.error("Failed to create session", err);
      }
    };
    initSession();
  }, []);

  const handleAudioChunk = (base64Data: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('audio_chunk', { payload: base64Data });
    }
  };

  const { isRecording, startRecording, stopRecording } = useAudioRecorder(handleAudioChunk);

  const handleStartRecording = () => {
    socketRef.current?.emit('audio_stream_start');
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    socketRef.current?.emit('audio_stream_stop');
  };

  const handleRegenerateReport = async () => {
    if (!activeSession) return;
    try {
      const res = await api.regenerateReport(activeSession.id);
      setReport(res.report);
    } catch (err) {
      console.error("Failed to regenerate report", err);
    }
  };

  // UI Handlers
  const handleRefClick = (lineIndex: number) => {
    setIsPlaying(false);
    setActiveLineIndex(lineIndex);
    if (window.innerWidth < 768) {
      setMobileTab('transcript');
    }
  };
  const handleTogglePlay = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setIsPlaying(false);
    setActiveLineIndex(0);
  };

  return (
    <div className="flex h-screen w-full bg-[#141414] overflow-hidden font-sans text-white border border-white/10">
      <div className="hidden lg:block w-[240px] shrink-0">
        <Sidebar 
          activeSessionId={activeSession?.id || ''} 
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
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
              onTogglePlay={handleTogglePlay}
              onReset={handleReset}
              onRegenerate={handleRegenerateReport}
            />
          </div>

          <div className={`
            ${mobileTab === 'report' ? 'block' : 'hidden md:block'} 
            flex-1 min-w-0
          `}>
            <ReportPanel
              report={report}
              mode={reportMode}
              onModeChange={setReportMode}
              groundingEnabled={groundingEnabled}
              onGroundingChange={setGroundingEnabled}
              onRefClick={handleRefClick}
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
                activeSessionId={activeSession?.id || ''}
                isRecording={isRecording}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
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
                activeSessionId={activeSession?.id || ''}
                isRecording={isRecording}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
