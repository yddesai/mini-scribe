import React, { useState, useRef, useEffect } from 'react';
import { Share, Copy, FileText, FileDown, ChevronDown } from 'lucide-react';
import { SOAPReport } from '../../lib/types';
import { motion, AnimatePresence } from 'motion/react';

interface ExportMenuProps {
  mockSoap: SOAPReport | null;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ mockSoap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    const text = JSON.stringify(mockSoap, null, 2);
    navigator.clipboard.writeText(text);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 flex items-center gap-2 transition-all text-white/90"
      >
        Export
        <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full mb-2 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-sm text-left"
            >
              <Copy className="w-4 h-4" />
              Copy to clipboard
            </button>
            <button
              onClick={() => { console.log("PDF export — coming soon"); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-sm text-left border-t border-white/5"
            >
              <FileDown className="w-4 h-4" />
              Export as PDF
            </button>
            <button
              onClick={() => { console.log("DOCX export — coming soon"); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-sm text-left border-t border-white/5"
            >
              <FileText className="w-4 h-4" />
              Export as DOCX
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
