import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Select } from './Select';

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
        className={`text-xs font-mono text-mute uppercase tracking-[0.12em] ml-1 group-focus-within:text-ink transition-all duration-300 dark:group-focus-within:text-white/90 ${label === 'Inches' ? 'invisible' : ''}`}
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
          className={`w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-canvas border-[1.5px] border-hairline rounded-ui h-14 pl-5 ${unitOptions ? 'pr-20 sm:pr-24' : 'pr-16 sm:pr-18'} text-xl font-mono font-bold text-ink dark:text-[#f5f5f5] transition-all duration-300 placeholder:text-mute/20 dark:placeholder:text-mute/40 focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-wash shadow-premium-sm hover:border-hairline-strong focus:bg-canvas`}
        />
        <div className={`absolute right-0 top-0 bottom-0 flex items-center border-l border-hairline bg-surface-2 px-4 rounded-r-[9px] ${unitOptions ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {unitOptions ? (
            <div className="relative flex items-center h-full w-20">
              <Select
                value={unit}
                onChange={onUnitChange || (() => {})}
                options={unitOptions.map(opt => ({ value: opt, label: opt }))}
                variant="chip"
                label="Unit Selector"
              />
            </div>
          ) : (
            <span className="text-[10px] font-mono font-bold text-mute dark:text-mute/90 uppercase tracking-widest">
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
