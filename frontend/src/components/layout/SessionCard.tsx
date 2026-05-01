import React from 'react';
import { MoreVertical } from 'lucide-react';
import { Session } from '../../lib/types';

interface SessionCardProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) 
    + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (seconds?: number | string) => {
  if (!seconds) return '--:--';
  const s = typeof seconds === 'string' ? parseInt(seconds) : seconds;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SessionCard: React.FC<SessionCardProps> = ({ session, isActive, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block w-full p-3 rounded-lg cursor-pointer text-left transition-all ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 overflow-hidden">
          <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-white/70'}`}>
            {session.title}
          </p>
          <div className={`mt-1 flex items-center justify-between text-[10px] ${isActive ? 'text-blue-100' : 'text-white/30'}`}>
            <span>{session.date || formatDate(session.createdAt)}</span>
            <span>{formatDuration(session.duration)}</span>
          </div>
        </div>
        
        <span className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-1 rounded-md">
          <MoreVertical className="w-4 h-4 text-inherit" />
        </span>
      </div>
    </button>
  );
};
