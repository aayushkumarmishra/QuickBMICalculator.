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
  onClose: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, onClose }) => {
  if (!report) return null;

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
        processedData.push([key.replace(/_/g, ' ').toUpperCase(), value]);
      }
    });

    return processedData.map(([label, value]: [string, any], index) => {
      // Format value
      let displayValue = value;
      
      // Special formatting for known objects
      if (typeof value === 'object' && value !== null) {
        if ('min' in value && 'max' in value) {
          displayValue = formatRange(value.min, value.max, 'kg');
        } else if ('low' in value && 'high' in value) {
          displayValue = formatRange(value.low, value.high, 'kg');
        } else if ('text' in value) {
          displayValue = value.text;
        } else if (Array.isArray(value)) {
          displayValue = value.join(', ');
        } else {
          displayValue = JSON.stringify(value);
        }
      } else if (typeof value === 'number') {
        // Semantic formatting based on label
        const upperLabel = label.toUpperCase();
        if (upperLabel.includes('BMI')) displayValue = formatBMI(value);
        else if (upperLabel.includes('WEIGHT')) displayValue = formatWeight(value);
        else if (upperLabel.includes('CALORIE') || upperLabel.includes('BMR') || upperLabel.includes('BURN')) displayValue = formatKcal(value);
        else if (upperLabel.includes('WATER')) displayValue = formatWater(value);
        else if (upperLabel.includes('PERCENT')) displayValue = formatPercent(value);
        else displayValue = formatNumber(value, 1);
      }

      return (
        <div key={`${label}-${index}`} className="flex justify-between items-start py-3 border-b border-hairline last:border-0 gap-4">
          <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest pt-1 shrink-0">{label}</span>
          <span className="text-sm font-bold text-ink text-right break-words max-w-[60%]">{String(displayValue)}</span>
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
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
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
