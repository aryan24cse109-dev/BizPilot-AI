import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1C1D22]/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Content */}
      <div className={`relative w-full ${maxWidth} bg-white border border-[#E8E4DC] rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col text-[#1C1D22]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4DC] bg-[#FAF8F5]">
          <h3 className="text-base font-black text-[#1C1D22] tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-[#1C1D22] p-1.5 rounded-xl hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};
