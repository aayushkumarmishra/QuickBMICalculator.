import { motion } from 'framer-motion';

interface ResultGaugeProps {
  bmi: number;
}

export const ResultGauge: React.FC<ResultGaugeProps> = ({ bmi }) => {
  const minBMI = 15;
  const maxBMI = 40;
  
  const percentage = Math.min(Math.max(((bmi - minBMI) / (maxBMI - minBMI)) * 100, 0), 100);

  const zones = [
    { label: 'Under', color: 'bg-status-under', width: '14%', range: '< 18.5' },
    { label: 'Normal', color: 'bg-status-healthy', width: '26%', range: '18.5 - 25' },
    { label: 'Over', color: 'bg-status-over', width: '20%', range: '25 - 30' },
    { label: 'Obese', color: 'bg-status-obese', width: '40%', range: '> 30' },
  ];

  const getStatus = () => {
    if (bmi === 0) return { label: 'Pending', color: 'text-mute' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-status-under' };
    if (bmi < 25) return { label: 'Normal Weight', color: 'text-status-healthy' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-status-over' };
    if (bmi < 35) return { label: 'Obesity Class I', color: 'text-status-obese' };
    if (bmi < 40) return { label: 'Obesity Class II', color: 'text-status-obese' };
    return { label: 'Obesity Class III', color: 'text-status-obese' };
  };

  const status = getStatus();

  return (
    <div id="bmi-gauge-export" className="flex flex-col gap-8 py-8 px-6 sm:py-10 sm:px-8 bg-ink dark:bg-canvas border border-hairline/10 dark:border-hairline rounded-marketing shadow-premium-lg text-canvas dark:text-ink relative overflow-hidden">
      {/* Dynamic Background Glow Based on Status */}
      <div className={`absolute top-0 right-0 w-64 h-64 opacity-10 dark:opacity-5 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors duration-1000 ${bmi > 0 ? status.color.replace('text-', 'bg-') : 'bg-mute'}`}></div>
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 w-full relative z-10">
        {/* Left: BMI Value */}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Biometric Index</span>
          <div className="flex items-baseline gap-2">
            <motion.span 
              className="text-6xl sm:text-7xl font-black tracking-[-0.03em] text-canvas dark:text-ink leading-none"
              initial={false}
              animate={{ scale: bmi > 0 ? [1, 1.02, 1] : 1 }}
              transition={{ duration: 0.4 }}
            >
              {bmi > 0 ? bmi.toFixed(1) : '--'}
            </motion.span>
            <span className="text-xs font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">kg/m²</span>
          </div>
        </div>

        {/* Right: Classification + Live Pill */}
        <div className="flex flex-col items-start sm:items-end text-left sm:text-right min-w-0">
          <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Classification</span>
          <div className={`text-xl sm:text-2xl font-black tracking-tight break-words max-w-full ${status.color}`}>
            {status.label}
          </div>
          {bmi > 0 && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas/10 border border-canvas/20 shadow-premium-sm dark:bg-ink/10 dark:border-ink/20">
               <div className={`w-1.5 h-1.5 rounded-full ${status.color.replace('text-', 'bg-')} animate-pulse`}></div>
               <span className="text-[9px] font-mono font-bold uppercase text-canvas dark:text-ink">Live Result</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative pt-8 pb-4">
        {/* Segmented Gauge Track */}
        <div className="flex h-2 sm:h-2.5 w-full rounded-full overflow-hidden bg-canvas-soft/20 dark:bg-canvas-soft/10 p-0">
          {zones.map((zone, i) => (
            <div 
              key={i} 
              className={`${zone.color} h-full border-r border-canvas dark:border-canvas last:border-r-0 transition-all`} 
              style={{ width: zone.width }}
            />
          ))}
        </div>

        {/* Needle Marker */}
        {bmi > 0 && (
          <motion.div 
            className="absolute top-0 bottom-0 flex flex-col items-center -ml-2 pointer-events-none z-20"
            initial={{ left: '0%' }}
            animate={{ left: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          >
            <div className="h-[calc(100%-4px)] flex flex-col items-center">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-canvas border-[1.5px] border-ink dark:border-canvas shadow-premium-md flex items-center justify-center mb-1">
                <div className={`w-1.5 h-1.5 rounded-full ${status.color.replace('text-', 'bg-')}`}></div>
              </div>
              <div className="w-0.5 h-full bg-canvas/20 dark:bg-ink/20" />
            </div>
          </motion.div>
        )}

        {/* Scale Labels */}
        <div className="grid grid-cols-4 mt-6 gap-1 sm:gap-2">
          {zones.map((zone, i) => (
            <div key={i} className="flex flex-col items-center sm:items-start text-center sm:text-left overflow-hidden">
              <span className="text-[7px] sm:text-[9px] font-mono font-bold text-canvas dark:text-ink uppercase tracking-widest mb-1 leading-tight w-full overflow-hidden">{zone.label}</span>
              <span className="text-[6px] sm:text-[8px] font-mono font-bold text-canvas-soft/60 dark:text-mute leading-tight w-full overflow-hidden">{zone.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
