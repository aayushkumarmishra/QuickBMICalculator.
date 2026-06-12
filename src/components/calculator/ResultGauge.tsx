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
    <div id="bmi-gauge-export" className="flex flex-col gap-8 py-8 px-6 sm:py-10 sm:px-8 bg-canvas border border-hairline rounded-marketing shadow-premium-lg relative overflow-hidden">
      {/* Dynamic Background Glow Based on Status */}
      <div className={`absolute top-0 right-0 w-64 h-64 opacity-5 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors duration-1000 ${bmi > 0 ? status.color.replace('text-', 'bg-') : 'bg-mute'}`}></div>
      
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8 relative z-10">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-mute uppercase tracking-[0.3em] mb-2">Biometric Index</span>
          <div className="flex items-baseline gap-2 sm:gap-3">
            <motion.span 
              className="text-5xl xs:text-6xl sm:text-8xl font-black tracking-[-0.08em] text-ink"
              initial={false}
              animate={{ scale: bmi > 0 ? [1, 1.02, 1] : 1 }}
              transition={{ duration: 0.4 }}
              style={{ WebkitTextFillColor: 'var(--color-ink)', color: 'var(--color-ink)' }}
            >
              {bmi > 0 ? bmi.toFixed(1) : '--'}
            </motion.span>
            <span className="text-lg sm:text-xl font-bold text-mute/60 tracking-tighter">kg/m<sup>2</sup></span>
          </div>
        </div>

        <div className="h-16 w-px bg-hairline hidden sm:block"></div>

        <div className="text-center sm:text-right">
          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-mute uppercase tracking-[0.3em] mb-2 sm:mb-3 block">Classification</span>
          <div className={`text-xl xs:text-2xl sm:text-3xl font-black tracking-tight ${status.color}`}>
            {status.label}
          </div>
          {bmi > 0 && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-canvas border border-hairline shadow-premium-sm">
               <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${status.color.replace('text-', 'bg-')} animate-pulse`}></div>
               <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase text-ink">Live Result</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative pt-8 pb-4">
        {/* Segmented Gauge */}
        <div className="flex h-3 sm:h-4 w-full rounded-full overflow-hidden bg-hairline p-1">
          {zones.map((zone, i) => (
            <div 
              key={i} 
              className={`${zone.color} h-full border-r-2 border-canvas last:border-r-0 rounded-sm opacity-80 transition-all hover:opacity-100`} 
              style={{ width: zone.width }}
            />
          ))}
        </div>

        {/* Needle Marker */}
        {bmi > 0 && (
          <motion.div 
            className="absolute top-0 bottom-0 flex flex-col items-center -ml-px pointer-events-none z-20"
            initial={{ left: '0%' }}
            animate={{ left: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          >
            <div className="h-[calc(100%-8px)] flex flex-col items-center">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-canvas border-2 border-ink shadow-premium-md flex items-center justify-center mb-1">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${status.color.replace('text-', 'bg-')} animate-pulse`}></div>
              </div>
              <div className="w-1 h-full bg-ink/20" />
            </div>
          </motion.div>
        )}

        {/* Scale Labels */}
        <div className="grid grid-cols-4 mt-6 gap-1 sm:gap-2">
          {zones.map((zone, i) => (
            <div key={i} className="flex flex-col items-center sm:items-start text-center sm:text-left overflow-hidden">
              <span className="text-[7px] sm:text-[9px] font-mono font-bold text-ink uppercase tracking-widest mb-1 leading-tight w-full overflow-hidden">{zone.label}</span>
              <span className="text-[6px] sm:text-[8px] font-mono font-bold text-body leading-tight w-full overflow-hidden">{zone.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
