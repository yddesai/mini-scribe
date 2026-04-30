import React from 'react';
import { SOAPReport } from '../../lib/types';
import { ReportSection } from './ReportSection';
import { Toggle } from '../ui/Toggle';
import { ExportMenu } from '../ui/ExportMenu';
import { AlertCircle, Diamond } from 'lucide-react';

interface ReportPanelProps {
  report: SOAPReport | null;
  mode: 'short' | 'long';
  onModeChange: (mode: 'short' | 'long') => void;
  groundingEnabled: boolean;
  onGroundingChange: (enabled: boolean) => void;
  onRefClick: (lineIndex: number) => void;
}

export const ReportPanel: React.FC<ReportPanelProps> = ({
  report,
  mode,
  onModeChange,
  groundingEnabled,
  onGroundingChange,
  onRefClick,
}) => {
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
        {!report ? (
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
                <ReportSection title="Chief Complaint" items={report.subjective?.chief_complaint || []} onRefClick={onRefClick} isNested />
                <ReportSection title="HPI" items={report.subjective?.hpi || []} onRefClick={onRefClick} isNested />
                <ReportSection title="ROS" items={report.subjective?.ros || []} onRefClick={onRefClick} isNested />
                <ReportSection title="Past Medical History" items={report.subjective?.past_medical_history || []} onRefClick={onRefClick} isNested />
                <ReportSection title="Social History" items={report.subjective?.social_history || []} onRefClick={onRefClick} isNested />
              </div>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-1">Objective</h3>
              <hr className="border-white/10 mb-4" />
              <div className="space-y-4 text-[13px]">
                <ReportSection title="Vitals" items={report.objective?.vitals || []} onRefClick={onRefClick} isNested />
                <ReportSection title="Physical Exam" items={report.objective?.physical_exam || []} onRefClick={onRefClick} isNested />
              </div>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-1">Assessment</h3>
              <hr className="border-white/10 mb-4" />
              <div className="text-[13px] text-white/70">
                <ReportSection title="" items={report.assessment || []} onRefClick={onRefClick} isNested />
              </div>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-1">Plan</h3>
              <hr className="border-white/10 mb-4" />
              <div className="text-[13px] text-white/70">
                <ReportSection title="" items={report.plan || []} onRefClick={onRefClick} isNested />
              </div>
            </section>

            {/* Flags Section */}
            {report.flags && report.flags.length > 0 && (
              <div className="space-y-2 pt-4">
                {report.flags.map((flag, idx) => (
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
        <ExportMenu mockSoap={report} />
      </div>
    </div>
  );
};
