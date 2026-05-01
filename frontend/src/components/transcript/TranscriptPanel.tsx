import React, { useRef, useEffect, useState, useMemo } from 'react';
import { LoaderCircle, Play, Pause, RotateCcw } from 'lucide-react';
import { TranscriptLine } from './TranscriptLine';
import { TranscriptLine as TranscriptLineItem } from '../../lib/types';

interface TranscriptPanelProps {
  lines: TranscriptLineItem[];
  activeLineIndex: number;
  isPlaying: boolean;
  hasReport: boolean;
  isGeneratingReport: boolean;
  reportError: string | null;
  audioUrl: string | null;
  onTogglePlay: () => void;
  onPlaybackChange: (playing: boolean) => void;
  onReset: () => void;
  onRegenerate: () => void;
  onActiveLineChange: (index: number) => void;
}

const formatTime = (seconds: number) => {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  lines,
  activeLineIndex,
  isPlaying,
  hasReport,
  isGeneratingReport,
  reportError,
  audioUrl,
  onTogglePlay,
  onPlaybackChange,
  onReset,
  onRegenerate,
  onActiveLineChange,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const lineEndOffsets = useMemo(() => lines.map((line) => line.endTimeSec), [lines]);
  const hasSeekableAudio = Boolean(audioUrl && duration > 0);
  const progressPercent = hasSeekableAudio
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : lines.length > 1
      ? (activeLineIndex / (lines.length - 1)) * 100
      : 0;

  const getLineIndexForTime = (time: number) => {
    if (lineEndOffsets.length === 0) {
      return 0;
    }

    const index = lineEndOffsets.findIndex((endTimeSec) => time < endTimeSec);
    return index === -1 ? lineEndOffsets.length - 1 : index;
  };

  // Sync audio element with play/pause state
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioUrl]);

  // Handle audio time updates — sync transcript highlighting using real timestamps
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    const dur = audioRef.current.duration;
    if (dur && isFinite(dur) && dur > 0) {
      setDuration(dur);
    }

    if (lineEndOffsets.length > 0) {
      onActiveLineChange(getLineIndexForTime(time));
    }
  };

  // WebM files from MediaRecorder don't have duration in the header.
  // Workaround: seek to a huge time to force browser to calculate it.
  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (!isFinite(audio.duration) || audio.duration === 0) {
      // Force duration calculation by seeking to end
      audio.currentTime = 1e10;
      const onSeeked = () => {
        if (isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
        audio.currentTime = 0;
        audio.removeEventListener('seeked', onSeeked);
      };
      audio.addEventListener('seeked', onSeeked);
    } else {
      setDuration(audio.duration);
    }
  };

  const handleAudioEnded = () => {
    if (audioRef.current && audioRef.current.currentTime > 0) {
      setDuration(audioRef.current.currentTime);
    }
    onPlaybackChange(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);

    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
      onActiveLineChange(getLineIndexForTime(value));
      return;
    }

    const nextLineIndex = Math.max(0, Math.min(lines.length - 1, Math.round(value)));
    onActiveLineChange(nextLineIndex);

    if (audioRef.current && lines[nextLineIndex]) {
      audioRef.current.currentTime = lines[nextLineIndex].startTimeSec;
      setCurrentTime(lines[nextLineIndex].startTimeSec);
    }
  };

  const handleReset = () => {
    onReset();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] border-r border-white/10 overflow-hidden">
      <header className="h-12 border-b border-white/10 flex items-center px-4 shrink-0">
        <h2 className="text-sm font-bold text-white">Transcript</h2>
        <span className="ml-2 text-[10px] text-white/30 tracking-tight">(live)</span>
      </header>

      <div className="px-4 py-3 bg-white/[0.02] border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            disabled={!audioUrl && lines.length === 0}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current text-white" /> : <Play className="w-4 h-4 fill-current text-white ml-0.5" />}
          </button>
          
          <span className="text-[11px] font-mono text-white/60 w-10">
            {audioUrl ? formatTime(currentTime) : formatTime(lines[activeLineIndex]?.startTimeSec ?? 0)}
          </span>
          
          <div className="flex-1 h-1 bg-white/10 rounded-full relative group p-0">
            <input
              type="range"
              min="0"
              max={hasSeekableAudio ? duration : Math.max(0, lines.length - 1)}
              step={hasSeekableAudio ? 0.1 : 1}
              value={hasSeekableAudio ? currentTime : activeLineIndex}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute left-0 top-0 h-full bg-blue-500 rounded-full" 
              style={{ width: `${progressPercent}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-blue-500"
              style={{ left: `calc(${progressPercent}% - 6px)` }}
            />
          </div>
          
          <span className="text-[11px] font-mono text-white/60 w-10 text-right">
            {audioUrl && duration > 0 ? formatTime(duration) : '--:--'}
          </span>

          <button
            onClick={handleReset}
            className="p-1.5 text-white/30 hover:text-white transition-colors"
            title="Reset playback"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hidden audio element for actual playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          preload="metadata"
        />
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {lines.length === 0 ? (
           <div className="text-white/40 text-center mt-10 text-sm">No transcript data yet. Start speaking!</div>
        ) : (
          lines.map((line, idx) => (
            <TranscriptLine
              key={idx}
              index={line.lineIndex}
              text={line.text}
              isActive={idx === activeLineIndex}
            />
          ))
        )}
      </div>

      <div className="p-4">
        {reportError && (
          <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
            {reportError}
          </div>
        )}
        <button
          onClick={onRegenerate}
          disabled={isGeneratingReport || lines.length === 0}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/20 text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGeneratingReport && <LoaderCircle className="w-4 h-4 animate-spin" />}
          <span>
            {isGeneratingReport
              ? 'Generating Report...'
              : hasReport
                ? 'Regenerate Report'
                : 'Generate Report'}
          </span>
        </button>
      </div>
    </div>
  );
};
