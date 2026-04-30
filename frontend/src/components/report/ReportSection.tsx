import React from 'react';
import { SOAPItem } from '../../lib/types';
import { RefBadge } from '../ui/RefBadge';

interface ReportSectionProps {
  title: string;
  items: SOAPItem[];
  onRefClick: (lineIndex: number) => void;
  isNested?: boolean;
}

export const ReportSection: React.FC<ReportSectionProps> = ({ title, items, onRefClick, isNested }) => {
  if (items.length === 0) return null;

  return (
    <div className={isNested ? 'mb-2' : 'mb-6'}>
      {title && (
        <p className="font-bold text-white/90 mb-1">{title}:</p>
      )}
      
      <ul className={`space-y-1 text-white/60 ${title ? 'pl-2 list-disc list-inside' : ''}`}>
        {items.map((item, idx) => (
          <li key={idx} className="text-[13px]">
            {item.text}
            {item.refs.map((ref) => (
              <RefBadge key={ref} index={ref} onClick={onRefClick} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
};
