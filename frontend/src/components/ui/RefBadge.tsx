import React from 'react';

interface RefBadgeProps {
  index: number;
  onClick: (index: number) => void;
}

export const RefBadge: React.FC<RefBadgeProps> = ({ index, onClick }) => {
  return (
    <button
      onClick={() => onClick(index)}
      className="inline-block ml-1 bg-white/10 text-[10px] px-1.5 py-0.5 rounded text-white/50 cursor-pointer hover:bg-white/20 transition-all border border-transparent active:border-amber-400 active:text-amber-400"
      title={`Go to line ${index}`}
    >
      [{index}]
    </button>
  );
};
