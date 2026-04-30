import React from 'react';
import { MoreVertical } from 'lucide-react';
import { Session } from '../../lib/types';

interface SessionCardProps {
  session: Session;
  isActive: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, isActive }) => {
  return (
    <div
      className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
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
            <span>{session.date}</span>
            <span>{session.duration}</span>
          </div>
        </div>
        
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-1 hover:bg-black/10 rounded-md">
          <MoreVertical className="w-4 h-4 text-inherit" />
        </button>
      </div>
    </div>
  );
};
