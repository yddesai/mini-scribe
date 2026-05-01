import React from 'react';
import { SimilarSession, SOAPReport, StoredSOAPReport } from '../../lib/types';
import { ReportSection } from './ReportSection';
import { Toggle } from '../ui/Toggle';
import { ExportMenu } from '../ui/ExportMenu';
import { AlertCircle, LoaderCircle } from 'lucide-react';

interface ReportPanelProps {
  report: StoredSOAPReport | null;
  similarSessions: SimilarSession[];
  isGeneratingReport: boolean;
  errorMessage: string | null;
  mode: 'short' | 'long';
  onModeChange: (mode: 'short' | 'long') => void;
  groundingEnabled: boolean;
  onGroundingChange: (enabled: boolean) => void;
  onRefClick: (lineIndex: number) => void;
  onSelectSimilarSession: (session: SimilarSession) => void;
}

export const ReportPanel: React.FC<ReportPanelProps> = ({
  report,
  similarSessions,
  isGeneratingReport,
  errorMessage,
  mode,
  onModeChange,
  groundingEnabled,
  onGroundingChange,
  onRefClick,
  onSelectSimilarSession,
}) => {
  const activeReport: SOAPReport | null = report
    ? ('long' in report && 'short' in report
      ? report[mode] ?? report.long
      : report)
    : null;

  const formatSimilarDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] overflow-hidden">
      <header className="h-12 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
        <h2 className="text-sm font-bold text-white">Report</h2>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
            <button
              onClick={() => onModeChange('long')}
              className={`px-3 py-1 text-[10px] rounded-full font-medium transition-all ${
                mode === 'long' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Long SOAP
            </button>
            <button
              onClick={() => onModeChange('short')}
              className={`px-3 py-1 text-[10px] rounded-full font-medium transition-all ${
                mode === 'short' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Short
            </button>
          </div>
          
          <div className="flex items-center gap-2 ml-2 border-l border-white/10 pl-2">
            <span className="text-[10px] text-white/40">Grounding</span>
            <div 
              onClick={() => onGroundingChange(!groundingEnabled)}
              className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${groundingEnabled ? 'bg-blue-600' : 'bg-white/10'}`}
            >
              <div 
                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${groundingEnabled ? 'right-0.5' : 'left-0.5'}`} 
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-12">
        {isGeneratingReport ? (
          <div className="h-full flex flex-col items-center justify-center text-white/60 space-y-4 pt-20">
             <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
               <LoaderCircle className="w-6 h-6 text-blue-400 animate-spin" />
             </div>
             <p className="text-sm font-medium text-white/80">Generating SOAP report...</p>
             <p className="text-xs text-center max-w-[280px] text-white/40">
               The transcript is being processed and structured into a clinical note.
             </p>
          </div>
        ) : errorMessage ? (
          <div className="h-full flex flex-col items-center justify-center text-white/60 space-y-4 pt-20">
             <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
               <AlertCircle className="w-6 h-6 text-amber-400" />
             </div>
             <p className="text-sm font-medium text-white/85">Report generation failed</p>
             <p className="text-xs text-center max-w-[320px] text-white/50">
               {errorMessage}
             </p>
          </div>
        ) : !activeReport ? (
          <div className="h-full flex flex-col items-center justify-center text-white/40 space-y-4 pt-20">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
               <AlertCircle className="w-6 h-6" />
             </div>
             <p className="text-sm">No report generated yet.</p>
             <p className="text-xs text-center max-w-[250px]">Start capturing a transcript and click "Regenerate Report" to view the clinical summary.</p>
          </div>
        ) : (
          <>
            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-1">Subjective</h3>
              <hr className="border-white/10 mb-4" />
              
              <div className="space-y-4 text-[13px]">
                <ReportSection title="Chief Complaint" items={activeReport.subjective?.chief_complaint || []} onRefClick={onRefClick} isNested />
                <ReportSection title="HPI" items={activeReport.subjective?.hpi || []} onRefClick={onRefClick} isNested />
                <ReportSection title="ROS" items={activeReport.subjective?.ros || []} onRefClick={onRefClick} isNested />
                <ReportSection title="Past Medical History" items={activeReport.subjective?.past_medical_history || []} onRefClick={onRefClick} isNested />
                <ReportSection title="Social History" items={activeReport.subjective?.social_history || []} onRefClick={onRefClick} isNested />
              </div>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-1">Objective</h3>
              <hr className="border-white/10 mb-4" />
              <div className="space-y-4 text-[13px]">
                <ReportSection title="Vitals" items={activeReport.objective?.vitals || []} onRefClick={onRefClick} isNested />
                <ReportSection title="Physical Exam" items={activeReport.objective?.physical_exam || []} onRefClick={onRefClick} isNested />
              </div>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-1">Assessment</h3>
              <hr className="border-white/10 mb-4" />
              <div className="text-[13px] text-white/70">
                <ReportSection title="" items={activeReport.assessment || []} onRefClick={onRefClick} isNested />
              </div>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-1">Similar Sessions</h3>
              <hr className="border-white/10 mb-4" />
              {similarSessions.length === 0 ? (
                <p className="text-[13px] text-white/40">No similar sessions found yet.</p>
              ) : (
                <div className="space-y-3">
                  {similarSessions.map((session) => (
                    <button
                      key={session.sessionId}
                      type="button"
                      onClick={() => onSelectSimilarSession(session)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white/90">{session.title}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-white/35">
                            {formatSimilarDate(session.createdAt)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-300">
                          {(session.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-white/55">
                        {session.preview}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-1">Plan</h3>
              <hr className="border-white/10 mb-4" />
              <div className="text-[13px] text-white/70">
                <ReportSection title="" items={activeReport.plan || []} onRefClick={onRefClick} isNested />
              </div>
            </section>

            {/* Flags Section */}
            {activeReport.flags && activeReport.flags.length > 0 && (
              <div className="space-y-2 pt-4">
                {activeReport.flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg flex items-start gap-3 border text-[11px] leading-relaxed ${
                      flag.type === 'uncertainty'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200/80'
                        : 'bg-purple-500/10 border-purple-500/30 text-purple-200/80'
                    }`}
                  >
                    <div className={flag.type === 'uncertainty' ? 'text-amber-500' : 'text-purple-500'}>
                      {flag.type === 'uncertainty' ? <span>⚠</span> : <span>◈</span>}
                    </div>
                    <span>{flag.type === 'uncertainty' ? 'Uncertainty: ' : 'Missing: '}{flag.text}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-white/10 flex justify-end">
        <ExportMenu mockSoap={activeReport} />
      </div>
    </div>
  );
};
