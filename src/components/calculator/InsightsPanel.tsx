import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Target, AlertCircle, Info } from 'lucide-react';
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
  activity?: string;
  weight?: string;
  height?: string;
  displayPrime: string;
  bmiPrime: number;
  displayPI: string;
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
  activity,
  weight,
  height,
  displayPrime,
  bmiPrime,
  displayPI,
}) => {
  const isFaded = !bmi || bmi === 0 || isNaN(bmi);

  // Shared Source of Truth for Recommendations & Suggested Activity
  const activityData: Record<string, { walking: string; steps: string; stepsNum: number }> = {
    'Underweight':     { walking: '20-30 min/day', steps: '5,000-7,000 steps/day', stepsNum: 6000 },
    'Normal Weight':   { walking: '30 min/day',    steps: '7,000-8,000 steps/day', stepsNum: 7500 },
    'Overweight':      { walking: '30-45 min/day', steps: '7,000-9,000 steps/day', stepsNum: 8000 },
    'Obesity Class I': { walking: '30-45 min/day', steps: '9,000+ steps/day',      stepsNum: 9000 },
    'Obesity Class II':  { walking: '30-45 min/day', steps: '9,000+ steps/day',    stepsNum: 9000 },
    'Obesity Class III': { walking: '30-45 min/day', steps: '9,000+ steps/day',    stepsNum: 9000 },
  };
  const activeRec = { ...(activityData[category] || activityData['Normal Weight']) };

  if (!isFaded && goal === 'loss') {
    activeRec.walking = activity === '1.2' ? '30-45 min/day' : '45 min/day';
    activeRec.steps = '9,000-10,000 steps/day';
    activeRec.stepsNum = 9500;
  } else if (!isFaded && goal === 'gain') {
    activeRec.walking = '20 min/day';
    activeRec.steps = '5,000-6,000 steps/day';
    activeRec.stepsNum = 5500;
  }

  const numericAge = parseInt(age || '0');
  const isPediatric = numericAge >= 18 && numericAge < 20;

  const getInsightText = () => {
    if (isFaded) return "Enter your details to see your personalized health report.";
    let base = category === 'Normal Weight' 
      ? "Your weight is in a healthy range for your height. Maintaining a healthy weight helps lower the risk of chronic conditions."
      : `Your result falls into ${category.toLowerCase()} based on standard WHO guidelines.`;
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

  const progressPct = Math.min((activeRec.stepsNum / 10000) * 100, 100);

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

      {/* Executive Status Card */}
      <div className="card bg-canvas border border-hairline p-6 sm:p-8 flex flex-col justify-between min-h-[120px] group hover:border-hairline-strong transition-all">
        <div className="flex justify-between items-start mb-3">
          <div className="w-8 h-8 rounded-xl bg-surface border border-hairline flex items-center justify-center shadow-premium-sm group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4 text-ink" />
          </div>
          <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] bg-canvas-soft px-2.5 py-1 rounded-full border border-hairline">Status</div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-1 text-ink">{displayCategory}</h3>
          <p className="text-body text-[11px] sm:text-xs leading-relaxed font-medium">{getInsightText()}</p>
        </div>
      </div>

      {/* 2x2 Grid of Secondary Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Metric 1: Healthy Range */}
        <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
          <div>
            <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Healthy Range</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
              {displayMin} - {displayMax}
              <span className="text-[10px] font-sans font-medium text-mute ml-1">{idealWeightRange.min === 0 ? '' : unit.toUpperCase()}</span>
            </div>
          </div>
          <div className="w-full">
            <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Optimal Weight Span</div>
          </div>
        </div>

        {/* Metric 2: Steps */}
        <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
          <div>
            <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Daily Steps</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
              {isFaded ? '--' : activeRec.steps.replace(' steps/day', '').toUpperCase()}
            </div>
          </div>
          <div className="w-full">
            <div className="h-1 w-full bg-hairline rounded-full overflow-hidden mb-1">
              <div className="h-full bg-status-over rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Target Activity</div>
          </div>
        </div>

        {/* Metric 3: Basal Metabolism (BMR) */}
        <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
          <div>
            <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Basal Metabolic Rate</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
              {displayBMR}
              <span className="text-[10px] font-sans font-medium text-mute ml-1">KCAL</span>
            </div>
          </div>
          <div className="w-full">
            <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Base Resting Energy</div>
          </div>
        </div>

        {/* Metric 4: Active Metabolism (TDEE) */}
        <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
          <div>
            <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Active Expenditure</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
              {displayTDEE}
              <span className="text-[10px] font-sans font-medium text-mute ml-1">KCAL</span>
            </div>
          </div>
          <div className="w-full">
            <div className="h-1 w-full bg-hairline rounded-full overflow-hidden mb-1">
              <div className="h-full bg-status-healthy rounded-full transition-all duration-1000" style={{ width: bmr && tdee ? `${Math.min((bmr / tdee) * 100, 100)}%` : '0%' }} />
            </div>
            <div className="text-[8px] font-mono text-mute uppercase tracking-wider">TDEE / Maintenance</div>
          </div>
        </div>
      </div>

      {/* Smart Recommendation Card */}
      {!isFaded && (() => {
        const rec: Record<string, { icon: string; tips: string[] }> = {
          'Underweight': {
            icon: '↑',
            tips: ['Focus on protein-rich foods', 'Add strength training 3x/week', 
                   'Increase daily calorie intake', 'Eat 5-6 smaller meals/day']
          },
          'Normal Weight': {
            icon: 'v',
            tips: ['Maintain balanced nutrition', `Stay active ${activeRec.walking}`, 
                   'Keep consistent sleep schedule', 'Track progress monthly']
          },
          'Overweight': {
            icon: '↓',
            tips: [`Walk ${activeRec.walking} daily`, `Target ${activeRec.steps}`, 
                   'Aim for calorie deficit', 'Reduce processed foods']
          },
          'Obesity Class I': {
            icon: '↓',
            tips: [`Walk ${activeRec.walking} daily`, `Target ${activeRec.steps}`, 
                   'Consult a nutritionist', 'Track calories daily']
          },
          'Obesity Class II': {
            icon: '↓',
            tips: ['Start with light walking', 'Consult a healthcare professional', 
                   'Focus on dietary changes', 'Monitor progress weekly']
          },
          'Obesity Class III': {
            icon: '!',
            tips: ['Seek medical guidance immediately', 'Work with a specialist', 
                   'Gradual lifestyle changes', 'Monitor health markers regularly']
          },
        };
        const current = rec[category] || rec['Normal Weight'];
        const borderColor = category === 'Normal Weight' 
          ? 'border-status-healthy/30' 
          : category === 'Underweight' 
            ? 'border-status-under/30' 
            : category === 'Overweight' 
              ? 'border-status-over/30' 
              : 'border-status-obese/30';
        const iconColor = category === 'Normal Weight' 
          ? 'text-status-healthy' 
          : category === 'Underweight' 
            ? 'text-status-under' 
            : category === 'Overweight' 
              ? 'text-status-over' 
              : 'text-status-obese';

        return (
          <div className={`card bg-canvas border ${borderColor} p-6 sm:p-8`}>
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.4em]">
                Recommendations
              </div>
              <span className={`text-xs font-black ${iconColor}`}>{current.icon}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {current.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`text-[10px] font-black mt-0.5 shrink-0 ${iconColor}`}> - </span>
                  <p className="text-[11px] sm:text-xs font-medium text-ink/80 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Energy Plan - Massive Readability */}
      {!isFaded && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-ink dark:bg-canvas text-canvas dark:text-ink p-6 sm:p-8 relative overflow-hidden shadow-premium-xl border border-hairline/10 dark:border-hairline"
        >
          <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10 pointer-events-none">
            <BrandLogo className="w-16 h-16 sm:w-24 sm:h-24" variant="canvas" />
          </div>
          <div className="relative z-10 flex flex-col gap-5 sm:gap-6">
            <div className="text-left">
              <div className="text-[9px] sm:text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.4em] mb-4">Daily Calorie Goals</div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 -mx-2">
                <div className={`flex flex-col gap-1 p-2 rounded-ui transition-all duration-300 ${goal === 'maintenance' ? 'bg-canvas/10 ring-1 ring-canvas/20 dark:bg-ink/10 dark:ring-ink/20' : 'opacity-60'}`}>
                  <div className="text-[8px] sm:text-[9px] font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">Maintain</div>
                  <div className="text-lg sm:text-2xl font-mono font-bold tracking-tight text-canvas dark:text-ink">{displayTDEE}</div>
                  <div className="text-[8px] font-mono text-canvas-soft/40 dark:text-mute/40 uppercase tracking-widest">kcal</div>
                </div>
                <div className={`flex flex-col gap-1 p-2 rounded-ui transition-all duration-300 ${goal === 'loss' ? 'bg-canvas/10 ring-1 ring-canvas/20 dark:bg-ink/10 dark:ring-ink/20' : 'opacity-60'}`}>
                  <div className="text-[8px] sm:text-[9px] font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">Fat Loss</div>
                  <div className="text-lg sm:text-2xl font-mono font-bold tracking-tight text-status-over">{isFaded || !tdee ? '--' : Math.round(tdee - 500).toLocaleString()}</div>
                  <div className="text-[8px] font-mono text-canvas-soft/40 dark:text-mute/40 uppercase tracking-widest">kcal</div>
                </div>
                <div className={`flex flex-col gap-1 p-2 rounded-ui transition-all duration-300 ${goal === 'gain' ? 'bg-canvas/10 ring-1 ring-canvas/20 dark:bg-ink/10 dark:ring-ink/20' : 'opacity-60'}`}>
                  <div className="text-[8px] sm:text-[9px] font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">Weight Gain</div>
                  <div className="text-lg sm:text-2xl font-mono font-bold tracking-tight text-status-healthy">{isFaded || !tdee ? '--' : Math.round(tdee + 500).toLocaleString()}</div>
                  <div className="text-[8px] font-mono text-canvas-soft/40 dark:text-mute/40 uppercase tracking-widest">kcal</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center sm:justify-start gap-6 sm:gap-8 pt-5 sm:pt-6 border-t border-canvas/10 dark:border-hairline">
              <div>
                <div className="text-[8px] sm:text-[9px] font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest mb-0.5 sm:mb-1">BMR Base</div>
                <div className="text-base sm:text-lg font-mono font-bold tracking-tighter">{displayBMR}</div>
              </div>
              <div className="h-8 sm:h-10 w-px bg-canvas/10 dark:bg-hairline"></div>
              <div>
                <div className="text-[8px] sm:text-[9px] font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest mb-0.5 sm:mb-1">TDEE Active</div>
                <div className="text-base sm:text-lg font-mono font-bold tracking-tighter">{displayTDEE}</div>
              </div>
            </div>
            {(() => {
              const missingFields: string[] = [];
              if (!age || age === '') missingFields.push('Age');
              if (!gender || gender === '') missingFields.push('Gender');
              if (!weight || weight === '') missingFields.push('Weight');
              if (!height || height === '') missingFields.push('Height');

              const hasUserStarted = !!(
                (age && age !== '') || 
                (gender && gender !== '') || 
                (weight && weight !== '') || 
                (height && height !== '')
              );

              if (!bmr && hasUserStarted && missingFields.length > 0) {
                return (
                  <p className="text-[11px] font-mono font-bold text-red-500 
                  text-center mt-2 tracking-widest uppercase">
                    To see calorie estimates, please add: {missingFields.join(' & ')}
                  </p>
                );
              }
              return null;
            })()}
          </div>
        </motion.div>
      )}

      {/* Advanced Biometrics Card */}
      <div className="pt-2">
        <div className="card bg-ink dark:bg-canvas text-canvas dark:text-ink p-6 sm:p-8 relative overflow-hidden shadow-premium-xl border border-hairline/10 dark:border-hairline">
          <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10 pointer-events-none">
            <BrandLogo className="w-16 h-16 sm:w-24 sm:h-24" variant="canvas" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="text-[10px] sm:text-[11px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.4em]">Advanced Biometrics</div>
            
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="p-4 sm:p-5 bg-canvas/5 border border-canvas/10 dark:bg-ink/5 dark:border-hairline rounded-ui backdrop-blur-sm group hover:bg-canvas/10 dark:hover:bg-ink/10 transition-all">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-canvas-soft/50 dark:text-mute uppercase tracking-widest">BMI Prime</span>
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-canvas-soft/40 dark:text-mute/40" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tighter text-canvas dark:text-ink">{displayPrime}</div>
                <div className="mt-3 sm:mt-4 h-1 w-full bg-canvas/10 dark:bg-hairline rounded-full overflow-hidden">
                  <div className="h-full bg-status-healthy transition-all duration-1000" style={{ width: `${Math.min(bmiPrime * 50, 100)}%` }} />
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-canvas/5 border border-canvas/10 dark:bg-ink/5 dark:border-hairline rounded-ui backdrop-blur-sm group hover:bg-canvas/10 dark:hover:bg-ink/10 transition-all">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-canvas-soft/50 dark:text-mute uppercase tracking-widest">Ponderal</span>
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-canvas-soft/40 dark:text-mute/40" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tighter text-canvas dark:text-ink">{displayPI}</div>
                <p className="mt-3 sm:mt-4 text-[8px] sm:text-[9px] font-bold text-canvas-soft/40 dark:text-mute/40 uppercase tracking-widest">Alternative Index</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Disclaimer */}
      <div className="pt-6 sm:pt-8 border-t border-hairline/50">
        <p className="text-[10px] leading-relaxed text-mute font-medium text-center sm:text-left">
          <span className="font-bold text-ink/70 uppercase tracking-widest text-[9px] mr-1.5">Medical Disclaimer:</span> 
          The BMI results provided by this calculator are for informational and educational purposes only and should not be considered medical advice, diagnosis, or treatment. Please consult a healthcare professional for medical guidance.
        </p>
      </div>
    </div>
  );
};
