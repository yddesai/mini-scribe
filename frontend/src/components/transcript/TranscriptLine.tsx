import React, { useEffect, useRef } from 'react';

interface TranscriptLineProps {
  text: string;
  isActive: boolean;
  index: number;
}

export const TranscriptLine: React.FC<TranscriptLineProps> = ({ text, isActive, index }) => {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && lineRef.current) {
      lineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isActive]);

  return (
    <div
      ref={lineRef}
      className={`transition-all duration-300 font-mono text-sm leading-relaxed ${
        isActive
          ? 'bg-amber-500/20 border-l-2 border-amber-400 p-2 text-white/90'
          : 'text-white/70'
      }`}
    >
      {text}
    </div>
  );
};
