import React from 'react';
import { Button } from './Button.jsx';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-[#E8E4DC] shadow-xs">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center text-[#1C1D22] mb-4 shadow-xs">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-base font-black text-[#1C1D22] mb-1 tracking-tight">{title}</h3>
      <p className="text-xs font-medium text-[#8E9297] max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
