import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { TranscriptLine } from './TranscriptLine';

interface TranscriptPanelProps {
  lines: string[];
  activeLineIndex: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onRegenerate: () => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  lines,
  activeLineIndex,
  isPlaying,
  onTogglePlay,
  onReset,
  onRegenerate,
}) => {
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
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current text-white" /> : <Play className="w-4 h-4 fill-current text-white ml-0.5" />}
          </button>
          
          <span className="text-[11px] font-mono text-white/60 w-8">
            0:{Math.floor(activeLineIndex * 1.5).toString().padStart(2, '0')}
          </span>
          
          <div className="flex-1 h-1 bg-white/10 rounded-full relative group p-0">
            <input
              type="range"
              min="0"
              max={Math.max(0, lines.length - 1)}
              value={activeLineIndex}
              readOnly
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute left-0 top-0 h-full bg-blue-500 rounded-full" 
              style={{ width: lines.length > 1 ? `${(activeLineIndex / (lines.length - 1)) * 100}%` : '0%' }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-blue-500"
              style={{ left: lines.length > 1 ? `calc(${(activeLineIndex / (lines.length - 1)) * 100}% - 6px)` : '0px' }}
            />
          </div>
          
          <span className="text-[11px] font-mono text-white/60 w-8 text-right">--:--</span>

          <button
            onClick={onReset}
            className="p-1.5 text-white/30 hover:text-white transition-colors"
            title="Reset playback"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {lines.length === 0 ? (
           <div className="text-white/40 text-center mt-10 text-sm">No transcript data yet. Start speaking!</div>
        ) : (
          lines.map((line, idx) => (
            <TranscriptLine
              key={idx}
              index={idx}
              text={line}
              isActive={idx === activeLineIndex}
            />
          ))
        )}
      </div>

      <div className="p-4">
        <button onClick={onRegenerate} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/20 text-white transition-all">
          Regenerate Report
        </button>
      </div>
    </div>
  );
};
