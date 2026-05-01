import React, { useState } from 'react';
import { Recorder } from './Recorder';
import { Search, Plus } from 'lucide-react';
import { SessionCard } from './SessionCard';
import { Session } from '../../lib/types';

interface SidebarProps {
  activeSessionId: string;
  sessions: Session[];
  isLoadingSessions?: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSelectSession: (session: Session) => void;
  onNewSession: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSessionId,
  sessions,
  isLoadingSessions = false,
  isRecording,
  onStartRecording,
  onStopRecording,
  onSelectSession,
  onNewSession,
}) => {
  const [search, setSearch] = useState('');

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="flex flex-col h-full bg-[#1a1a1a] border-r border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-bold tracking-tight text-white/90 uppercase">Sessions</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewSession}
              disabled={isRecording}
              className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="New Session"
            >
              <Plus className="w-4 h-4 text-white/70" />
            </button>
            <Recorder isRecording={isRecording} onStart={onStartRecording} onStop={onStopRecording} />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search sessions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-lg py-2 pl-9 pr-4 text-xs text-white/50 placeholder:text-white/20 focus:outline-none focus:border-white/10 transition-colors"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2 custom-scrollbar">
        {isLoadingSessions ? (
          <div className="text-white/30 text-xs text-center mt-8">Loading sessions...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-white/30 text-xs text-center mt-8">No sessions yet</div>
        ) : (
          filteredSessions.map((session) => (
            <SessionCard
              key={session._id}
              session={session}
              isActive={session._id === activeSessionId}
              onClick={() => onSelectSession(session)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 mt-auto">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Local-only</span>
        </div>
      </div>
    </aside>
  );
};
