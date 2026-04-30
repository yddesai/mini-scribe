import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RecorderProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const Recorder: React.FC<RecorderProps> = ({ isRecording, onStart, onStop }) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        {!isRecording ? (
          <motion.button
            key="start"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={onStart}
            className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-white transition-colors shadow-lg shadow-blue-900/20"
            title="Start Recording"
          >
            <Mic className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.div
            key="recording"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-2 py-1"
          >
            <div className="flex items-center gap-1.5 mr-1">
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-1.5 h-1.5 rounded-full bg-red-500"
              />
              <span className="text-[10px] font-mono font-bold text-red-500 min-w-[28px]">
                {formatTime(recordingTime)}
              </span>
            </div>
            <button
              onClick={onStop}
              className="p-1 bg-red-500 hover:bg-red-400 rounded text-white transition-colors"
              title="Stop Recording"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
