import React from 'react';
import { motion } from 'framer-motion';

interface UnitToggleProps {
  system: 'metric' | 'imperial';
  onChange: (system: 'metric' | 'imperial') => void;
}

export const UnitToggle: React.FC<UnitToggleProps> = ({ system, onChange }) => {
  return (
    <div className="relative flex p-1 bg-canvas-soft border border-hairline rounded-pill w-fit mx-auto sm:mx-0">
      {/* Sliding Background */}
      <motion.div
        className="absolute inset-y-1 bg-primary rounded-pill shadow-sm"
        initial={false}
        animate={{
          left: system === 'metric' ? '4px' : 'calc(50% + 2px)',
          right: system === 'metric' ? 'calc(50% + 2px)' : '4px',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />

      <button
        type="button"
        onClick={() => onChange('metric')}
        className={`relative z-10 px-5 py-1.5 text-sm font-medium transition-colors duration-200 ${
          system === 'metric' ? 'text-white' : 'text-body hover:text-ink'
        }`}
      >
        Metric
      </button>
      <button
        type="button"
        onClick={() => onChange('imperial')}
        className={`relative z-10 px-5 py-1.5 text-sm font-medium transition-colors duration-200 ${
          system === 'imperial' ? 'text-white' : 'text-body hover:text-ink'
        }`}
      >
        Imperial
      </button>
    </div>
  );
};
