import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface InputGroupProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  unit: string;
  placeholder?: string;
  id: string;
  min?: number;
  max?: number;
  step?: string;
  unitOptions?: string[];
  onUnitChange?: (unit: string) => void;
}

export const InputGroup: React.FC<InputGroupProps> = ({
  label,
  value,
  onChange,
  unit,
  placeholder,
  id,
  min,
  max,
  step = "any",
  unitOptions,
  onUnitChange
}) => {
  const [error, setError] = useState<string>('');

  return (
    <div className="flex flex-col gap-2.5 group">
      <label 
        htmlFor={id} 
        className={`text-[10px] font-mono font-bold text-mute uppercase tracking-[0.25em] ml-1 group-focus-within:text-ink transition-all duration-300 dark:group-focus-within:text-white/90 ${label === 'Inches' ? 'invisible' : ''}`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          id={id}
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              setError('');
              onChange(val);
              return;
            }
            const num = parseFloat(val);
            if (isNaN(num)) {
              setError('Invalid number');
              return;
            }
            if (min !== undefined && num < min) {
              if (id === 'age' && min === 18) {
                setError('Min value is 18');
              } else {
                setError(`Min value is ${min}`);
              }
              onChange(val);
              return;
            }
            if (max !== undefined && num > max) {
              setError(`Max value is ${max}`);
              onChange(val);
              return;
            }
            setError('');
            onChange(val);
          }}
          onBlur={() => { if (!value) setError(''); }}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          inputMode={step === "1" ? "numeric" : "decimal"}
          className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-canvas border border-hairline dark:border-white/[0.08] rounded-ui h-14 px-5 pr-16 text-xl font-bold tracking-tighter text-ink dark:text-[#f5f5f5] [color:var(--color-ink)] [-webkit-text-fill-color:var(--color-ink)] transition-all duration-300 placeholder:text-mute/30 focus:outline-none focus:ring-[6px] focus:ring-primary/[0.03] focus:border-ink dark:focus:border-white/20 shadow-premium-sm hover:border-hairline-strong dark:hover:border-white/15 focus:bg-canvas"
        />
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center ${unitOptions ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {unitOptions ? (
            <div className="relative flex items-center">
              <select
                value={unit}
                onChange={(e) => onUnitChange?.(e.target.value)}
                className="appearance-none bg-canvas-soft hover:bg-surface dark:bg-white/[0.02] dark:hover:bg-white/[0.05] pl-2.5 pr-7 py-2 rounded-sm border border-hairline dark:border-white/[0.08] text-[9px] font-mono font-bold text-mute dark:text-mute/90 uppercase tracking-widest focus:outline-none focus:border-ink dark:focus:border-white/20 focus:text-ink dark:focus:text-white transition-all cursor-pointer shadow-premium-sm"
              >
                {unitOptions.map(opt => (
                  <option key={opt} value={opt} className="bg-canvas dark:bg-[#1a1a1a]">{opt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-mute pointer-events-none" />
            </div>
          ) : (
            <span className="text-[9px] font-mono font-bold text-mute dark:text-mute/90 uppercase tracking-widest bg-canvas-soft dark:bg-white/[0.02] px-2.5 py-1.5 rounded-sm border border-hairline dark:border-white/[0.08] group-focus-within:text-ink dark:group-focus-within:text-white/90 group-focus-within:border-ink dark:group-focus-within:border-white/20 group-focus-within:bg-canvas transition-all shadow-premium-sm">
              {unit}
            </span>
          )}
        </div>
      </div>
      {error && (
        <span className="text-[10px] font-mono font-bold text-red-500 ml-1 mt-1">
          {error}
        </span>
      )}
    </div>
  );
};
