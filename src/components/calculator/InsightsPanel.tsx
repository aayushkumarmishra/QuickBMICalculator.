import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Target, AlertCircle } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

interface InsightsPanelProps {
  bmi: number;
  category: string;
  idealWeightRange: { min: number; max: number };
  unit: string;
  age?: string;
  gender?: string;
  ponderalIndex?: number;
  bmr?: number;
  tdee?: number;
  goal?: 'maintenance' | 'loss' | 'gain';
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  bmi,
  category,
  idealWeightRange,
  unit,
  age,
  gender,
  ponderalIndex,
  bmr,
  tdee,
  goal,
}) => {
  const isFaded = !bmi || bmi === 0 || isNaN(bmi);
  const numericAge = parseInt(age || '0');
  const isPediatric = numericAge > 0 && numericAge < 20;

  const getInsightText = () => {
    if (isFaded) return "Enter your height and weight in the command panel to generate your personalized health report.";
    let base = category === 'Normal Weight' 
      ? "Your weight is in a healthy range for your height. Maintaining a healthy weight helps lower the risk of chronic conditions."
      : `Classified as ${category.toLowerCase()} based on standard WHO guidelines.`;
    if (numericAge > 65) base += " Older adults may naturally have a slightly higher healthy BMI range.";
    return base;
  };

  const goalCalories = tdee ? (goal === 'loss' ? tdee - 500 : goal === 'gain' ? tdee + 500 : tdee) : null;

  const displayCategory = isFaded ? 'Awaiting Data' : category;
  const displayMin = idealWeightRange.min === 0 ? '--' : idealWeightRange.min.toFixed(1);
  const displayMax = idealWeightRange.max === 0 ? '--' : idealWeightRange.max.toFixed(1);
  const displayBMR = isFaded || !bmr ? '--' : bmr.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const displayTDEE = isFaded || !tdee ? '--' : tdee.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const displayGoalCals = isFaded || !goalCalories ? '--' : goalCalories.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6 lg:space-y-8 transition-all duration-700">
      <AnimatePresence>
        {isPediatric && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card glass border-status-over/20 bg-status-over/5 p-4 sm:p-5 flex gap-4 items-center mb-2">
              <AlertCircle className="w-5 h-5 text-status-over shrink-0" />
              <div className="text-[11px] sm:text-xs font-medium text-ink/80 leading-relaxed">
                <span className="font-bold block mb-0.5 text-ink">Pediatric BMI (under 20) may be inaccurate.</span>
                BMI interpretation for children and teens requires CDC percentile-based evaluation. This calculator is optimized for adult BMI estimation.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* High Contrast Metrics Stack */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <div className="card glass border-hairline p-6 sm:p-8 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] group hover:border-hairline-strong transition-all">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-ink text-canvas flex items-center justify-center shadow-premium-md group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] bg-canvas-soft px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-hairline">Status</div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-1 sm:mb-2 text-ink truncate">{displayCategory}</h3>
            <p className="text-body text-[10px] sm:text-xs leading-relaxed line-clamp-2 font-medium">{getInsightText()}</p>
          </div>
        </div>

        <div className="card glass border-hairline p-6 sm:p-8 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] group hover:border-hairline-strong transition-all">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/5 text-status-healthy flex items-center justify-center border border-status-healthy/20 group-hover:scale-110 transition-transform">
              <Target className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] bg-canvas-soft px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-hairline">Target</div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-ink">
                {displayMin} – {displayMax}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-mute uppercase font-mono tracking-widest">{idealWeightRange.min === 0 ? '' : unit}</span>
            </div>
            <p className="text-body text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60">Healthy Weight Range</p>
          </div>
        </div>
      </div>

      {/* Energy Plan - Massive Readability */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-[#1a1a1a] text-white p-6 sm:p-8 relative overflow-hidden shadow-premium-xl border border-white/10 dark:border-white/10"
      >
        <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10 pointer-events-none">
          <div className="dark:hidden">
            <BrandLogo className="w-16 h-16 sm:w-24 sm:h-24" variant="canvas" />
          </div>
          <div className="hidden dark:block">
            <BrandLogo className="w-16 h-16 sm:w-24 sm:h-24" variant="ink" />
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-5 sm:gap-6">
          <div className="text-center sm:text-left">
            <div className="text-[9px] sm:text-[10px] font-mono font-bold text-white/60 uppercase tracking-[0.4em] mb-2 sm:mb-3">Daily Calorie Estimate</div>
            <div className="text-3xl xs:text-4xl sm:text-5xl font-black tracking-[-0.06em] flex items-baseline justify-center sm:justify-start gap-2 sm:gap-3">
              {displayGoalCals}
              <span className="text-[10px] sm:text-sm font-mono text-white/60 uppercase tracking-[0.2em]">KCAL / DAY</span>
            </div>
          </div>
          <div className="flex justify-center sm:justify-start gap-6 sm:gap-8 pt-5 sm:pt-6 border-t border-white/20">
            <div>
              <div className="text-[8px] sm:text-[9px] font-mono font-bold text-white/50 uppercase tracking-widest mb-0.5 sm:mb-1">BMR Base</div>
              <div className="text-base sm:text-lg font-black tracking-tighter">{displayBMR}</div>
            </div>
            <div className="h-8 sm:h-10 w-px bg-white/20"></div>
            <div>
              <div className="text-[8px] sm:text-[9px] font-mono font-bold text-white/50 uppercase tracking-widest mb-0.5 sm:mb-1">TDEE Active</div>
              <div className="text-base sm:text-lg font-black tracking-tighter">{displayTDEE}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
