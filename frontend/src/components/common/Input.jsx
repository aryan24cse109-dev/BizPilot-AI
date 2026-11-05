import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-[#1C1D22]">
          {label}
        </label>
      )}
      <div className="relative rounded-2xl shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`w-full bg-white border ${
            error ? 'border-rose-500 focus:ring-rose-500' : 'border-[#E8E4DC] focus:border-slate-500 focus:ring-slate-200'
          } rounded-xl px-3.5 py-2.5 text-xs text-[#1C1D22] placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
            Icon ? 'pl-10' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-[#8E9297]">{helperText}</p>}
    </div>
  );
});
