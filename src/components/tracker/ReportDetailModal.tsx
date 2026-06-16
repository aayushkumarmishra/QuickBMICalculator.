import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Activity, Info } from 'lucide-react';
import { 
  formatNumber, 
  formatBMI, 
  formatWeight, 
  formatKcal, 
  formatWater, 
  formatPercent,
  formatRange
} from '../../lib/format';

interface ReportDetailModalProps {
  report: any | null;
  profile?: {
    profile_name: string;
    relation_type: string;
    nickname?: string;
  } | null;
  onClose: () => void;
}

const FormattedValue: React.FC<{ 
  value: any; 
  label: string; 
  parentLabel?: string; 
  depth?: number 
}> = ({ value, label, parentLabel = '', depth = 0 }) => {
  if (value === null || value === undefined) return <span className="text-mute opacity-50">N/A</span>;

  const upperLabel = label.toUpperCase();
  const upperParentLabel = parentLabel.toUpperCase();
  const contextLabel = `${upperLabel} ${upperParentLabel}`;

  // 1. Primitive Handling
  if (typeof value !== 'object') {
    if (typeof value === 'number') {
      // Smart formatting based on context
      if (contextLabel.includes('BMI')) return <span>{formatBMI(value)}</span>;
      if (contextLabel.includes('WEIGHT')) return <span>{formatWeight(value)}</span>;
      if (
        contextLabel.includes('CALORIE') || 
        contextLabel.includes('BMR') || 
        contextLabel.includes('BURN') || 
        contextLabel.includes('GOAL') || 
        contextLabel.includes('MAINTENANCE') ||
        contextLabel.includes('GAIN') ||
        contextLabel.includes('LOSS')
      ) {
        // Double check it's likely a calorie value (avoid formatting weight loss as kcal)
        if (value > 300 || contextLabel.includes('CALORIE') || contextLabel.includes('BMR')) {
          return <span>{formatKcal(value)}</span>;
        }
      }
      if (contextLabel.includes('WATER')) return <span>{formatWater(value)}</span>;
      if (contextLabel.includes('PERCENT')) return <span>{formatPercent(value)}</span>;
      return <span>{formatNumber(value, 1)}</span>;
    }
    if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
    if (typeof value === 'string') return <span>{value.replace('-', '–')}</span>;
    return <span>{String(value)}</span>;
  }

  // 2. Array Handling
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-mute opacity-50">None</span>;
    return <span className="text-ink">{value.join(', ')}</span>;
  }

  // 3. Object Handling (Recursive)
  // Check for specific known shapes first
  if ('min' in value && 'max' in value) {
    const unit = contextLabel.includes('WEIGHT') ? 'kg' : '';
    return <span>{formatRange(value.min, value.max, unit)}</span>;
  }
  if ('low' in value && 'high' in value) {
    return <span>{formatRange(value.low, value.high, 'kg')}</span>;
  }
  if ('text' in value) return <span>{value.text}</span>;

  const entries = Object.entries(value);
  if (entries.length === 0) return <span className="text-mute opacity-50">Empty</span>;

  // Semantic mapping for common internal keys
  const keyMap: Record<string, string> = {
    gain: 'Gain Weight',
    loss: 'Weight Loss',
    maintenance: 'Maintenance',
    walking: 'Walking',
    steps: 'Steps',
    strength: 'Strength Training',
    cardio: 'Cardio',
    other: 'Other Activity'
  };

  return (
    <div className={`flex flex-col gap-2 ${depth === 0 ? 'items-end' : 'items-start w-full'}`}>
      {entries
        .sort((a, b) => {
          // Sort calories descending, others alphabetical
          if (typeof a[1] === 'number' && typeof b[1] === 'number' && contextLabel.includes('CALORIE')) {
            return b[1] - a[1];
          }
          return 0;
        })
        .map(([k, v]) => {
          const displaySubLabel = keyMap[k.toLowerCase()] || 
            k.replace(/([A-Z])/g, ' $1')
             .replace(/_/g, ' ')
             .trim()
             .replace(/^\w/, (c) => c.toUpperCase());
          
          return (
            <div key={k} className="flex items-start gap-2 group/val justify-end">
              <span className="text-[10px] font-medium text-mute whitespace-nowrap pt-0.5 opacity-70">
                {displaySubLabel} →
              </span>
              <div className="text-[13px] font-bold text-ink text-right">
                <FormattedValue value={v} label={k} parentLabel={label} depth={depth + 1} />
              </div>
            </div>
          );
        })}
    </div>
  );
};

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, profile, onClose }) => {
  if (!report) return null;

  const profileDisplayName = profile ? (
    profile.nickname ? `${profile.profile_name} (${profile.nickname})` : profile.profile_name
  ) : null;

  const renderData = (data: any, type?: string) => {
    // Process data to be more human-readable
    const processedData: [string, any][] = [];
    
    // Consolidate specific metrics for better UX
    const hasHeight = data.height || data.height_cm || (data.feet && data.inches);
    const hasWeight = data.weight || data.weight_kg || data.weight_lb;

    if (hasHeight) {
      let heightDisplay = '';
      if (data.system === 'us' || data.heightUnitOther === 'ft+in') {
        heightDisplay = `${data.feet || 0}'${data.inches || 0}"`;
      } else {
        const hVal = data.height || data.height_cm;
        const hUnit = data.system === 'metric' ? 'cm' : (data.heightUnitOther || 'cm');
        heightDisplay = `${hVal} ${hUnit}`;
      }
      processedData.push(['HEIGHT', heightDisplay]);
    }

    if (hasWeight) {
      const wVal = data.weight || data.weight_kg || data.weight_lb;
      const wUnit = data.system === 'metric' ? 'kg' : (data.weightUnitOther || (data.system === 'us' ? 'lb' : 'kg'));
      processedData.push(['WEIGHT', `${wVal} ${wUnit}`]);
    }

    if (data.activity) {
      const activityLabels: Record<string, string> = {
        '1.2': 'Sedentary',
        '1.375': 'Lightly Active',
        '1.55': 'Moderately Active',
        '1.725': 'Very Active',
        '1.9': 'Extra Active',
        'sedentary': 'Sedentary',
        'light': 'Lightly Active',
        'moderate': 'Moderately Active',
        'active': 'Very Active',
        'very_active': 'Extra Active'
      };
      processedData.push(['ACTIVITY', activityLabels[data.activity] || data.activity.replace(/_/g, ' ').toUpperCase()]);
    }

    // Add remaining fields, avoiding duplicates and internal state
    const skipKeys = [
      'height', 'height_cm', 'feet', 'inches', 'weight', 'weight_kg', 'weight_lb', 
      'activity', 'system', 'heightUnitOther', 'weightUnitOther', 'name'
    ];

    Object.entries(data).forEach(([key, value]) => {
      if (!skipKeys.includes(key)) {
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .trim()
          .toUpperCase();
        processedData.push([label, value]);
      }
    });

    return processedData.map(([label, value]: [string, any], index) => {
      return (
        <div key={`${label}-${index}`} className="flex justify-between items-start py-3 border-b border-hairline last:border-0 gap-4">
          <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest pt-1 shrink-0">{label}</span>
          <div className="text-sm font-bold text-ink text-right break-words max-w-[70%]">
            <FormattedValue value={value} label={label} />
          </div>
        </div>
      );
    });
  };

  return (
    <AnimatePresence>
      {report && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
          />
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[151] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-canvas border border-hairline rounded-[2.5rem] shadow-premium-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-hairline flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center">
                    <FileText className="w-5 h-5 text-ink" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-xl font-black tracking-tighter text-ink leading-tight uppercase truncate">
                      {report.calculator_type.replace(/_/g, ' ')} Report
                    </h3>
                    <div className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                      {profileDisplayName && (
                        <>
                          <span className="text-ink">{profileDisplayName}</span>
                          <span className="opacity-30">•</span>
                          <span>{profile?.relation_type}</span>
                          <span className="opacity-30">•</span>
                        </>
                      )}
                      <span>{new Date(report.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-canvas-soft rounded-full transition-colors text-mute hover:text-ink shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 overflow-x-hidden">
                <div className="space-y-10">
                  {/* Results Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-black uppercase tracking-widest text-ink">Analysis Results</h4>
                    </div>
                    <div className="bg-canvas-soft/50 rounded-2xl p-6 border border-hairline overflow-hidden">
                      {renderData(report.result_data, 'result')}
                    </div>
                  </section>

                  {/* Inputs Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-4 h-4 text-mute" />
                      <h4 className="text-xs font-black uppercase tracking-widest text-ink">Input Parameters</h4>
                    </div>
                    <div className="bg-canvas-soft/50 rounded-2xl p-6 border border-hairline overflow-hidden">
                      {renderData(report.input_data, 'input')}
                    </div>
                  </section>
                </div>
              </div>

              <div className="p-6 sm:p-8 border-t border-hairline bg-canvas-soft/30">
                <button
                  onClick={onClose}
                  className="w-full h-12 bg-ink text-canvas rounded-pill font-bold text-[10px] uppercase tracking-widest shadow-premium-lg"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
