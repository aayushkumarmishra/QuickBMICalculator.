import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Copy, Check, Activity, ChevronDown } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { ResultGauge } from './ResultGauge';
import { InsightsPanel } from './InsightsPanel';
import { BrandLogo } from '../BrandLogo';

type UnitSystem = 'metric' | 'us' | 'other';
type Goal = 'maintenance' | 'loss' | 'gain' | '';

const ACTIVITY_LEVELS = [
  { label: 'Select Activity Level', value: '', desc: 'Required' },
  { label: 'Sedentary', value: '1.2', desc: 'Minimal movement, office job' },
  { label: 'Lightly Active', value: '1.375', desc: '1-3 days of exercise/week' },
  { label: 'Moderately Active', value: '1.55', desc: '3-5 days of exercise/week' },
  { label: 'Very Active', value: '1.725', desc: '6-7 days of intense exercise/week' },
  { label: 'Extra Active', value: '1.9', desc: 'Intense training (2x/day)' },
];

export const CalculatorCard: React.FC = () => {
  const [system, setSystem] = useState<UnitSystem>('metric');
  const [heightUnitOther, setHeightUnitOther] = useState<'cm' | 'm' | 'ft+in' | 'in'>('cm');
  const [weightUnitOther, setWeightUnitOther] = useState<'kg' | 'lb'>('kg');
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [feet, setFeet] = useState<string>('');
  const [inches, setInches] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [goal, setGoal] = useState<Goal>('');
  const [activity, setActivity] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [nameError, setNameError] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetWithAnimation = () => {
    setIsResetting(true);
    handleReset();
    setTimeout(() => setIsResetting(false), 700);
  };

  // Constants
  const LBS_TO_KG = 0.45359237;
  const IN_TO_CM = 2.54;
  const BMI_IMPERIAL_CONSTANT = 703;

  const handleReset = () => {
    setWeight(''); setHeight(''); setFeet(''); setInches(''); setAge(''); setGender('');
    setGoal(''); setActivity(''); setName(''); setNameError('');
  };

  const { bmi, category, idealWeightRange, ponderalIndex, bmr, tdee } = useMemo(() => {
    const defaultResult = { bmi: 0, category: '', idealWeightRange: { min: 0, max: 0 }, ponderalIndex: 0, bmr: 0, tdee: 0 };

    // 1. Validate Name, Age and Gender
    const a = parseInt(age);
    if (!name || name.length < 2 || !age || isNaN(a) || a < 18 || a > 120 || !gender || !activity) return defaultResult;

    let bmiValue = 0; let piValue = 0; let bmrValue = 0; let tdeeValue = 0;
    let w = parseFloat(weight) || 0; let h = 0;

    if (system === 'metric') {
      h = parseFloat(height) || 0;
      if (w < 17 || w > 635 || h < 54 || h > 272) return defaultResult;
      
      const hM = h / 100;
      bmiValue = w / Math.pow(hM, 2);
      piValue = w / Math.pow(hM, 3);
      bmrValue = gender === 'male' 
        ? 10 * w + 6.25 * h - 5 * a + 5 
        : 10 * w + 6.25 * h - 5 * a - 161;
      tdeeValue = bmrValue * parseFloat(activity);

    } else if (system === 'us') {
      const f = parseFloat(feet) || 0;
      const i = parseFloat(inches) || 0;
      h = f * 12 + i;
      if (w < 37 || w > 1400 || h < 21 || h > 107) return defaultResult;

      bmiValue = (w * BMI_IMPERIAL_CONSTANT) / Math.pow(h, 2);
      const wKg = w * LBS_TO_KG; 
      const hCm = h * IN_TO_CM; 
      const hM = hCm / 100;
      piValue = wKg / Math.pow(hM, 3);
      bmrValue = gender === 'male' 
        ? 10 * wKg + 6.25 * hCm - 5 * a + 5 
        : 10 * wKg + 6.25 * hCm - 5 * a - 161;
      tdeeValue = bmrValue * parseFloat(activity);

    } else {
        // OTHER mode
        let wKg = 0;
        let hM = 0;

        const wVal = parseFloat(weight) || 0;
        if (weightUnitOther === 'kg') {
          if (wVal < 17 || wVal > 635) return defaultResult;
          wKg = wVal;
        } else {
          if (wVal < 37 || wVal > 1400) return defaultResult;
          wKg = wVal * LBS_TO_KG;
        }

        if (heightUnitOther === 'cm') {
          const hVal = parseFloat(height) || 0;
          if (hVal < 54 || hVal > 272) return defaultResult;
          hM = hVal / 100;
        } else if (heightUnitOther === 'm') {
          const hVal = parseFloat(height) || 0;
          if (hVal < 0.54 || hVal > 2.72) return defaultResult;
          hM = hVal;
        } else if (heightUnitOther === 'in') {
          const hVal = parseFloat(height) || 0;
          if (hVal < 21 || hVal > 107) return defaultResult;
          hM = hVal * IN_TO_CM / 100;
        } else if (heightUnitOther === 'ft+in') {
          const f = parseFloat(feet) || 0;
          const i = parseFloat(inches) || 0;
          const hTotalIn = f * 12 + i;
          if (hTotalIn < 21 || hTotalIn > 107) return defaultResult;
          hM = hTotalIn * IN_TO_CM / 100;
        }

        h = hM; // Use meters as base for 'other'
        bmiValue = wKg / Math.pow(hM, 2);
        piValue = wKg / Math.pow(hM, 3);
        const hCm = hM * 100;
        bmrValue = gender === 'male' 
          ? 10 * wKg + 6.25 * hCm - 5 * a + 5 
          : 10 * wKg + 6.25 * hCm - 5 * a - 161;
        tdeeValue = bmrValue * parseFloat(activity);
    }

    let cat = '';
    if (bmiValue > 0) {
      if (bmiValue < 18.5) cat = 'Underweight';
      else if (bmiValue < 25) cat = 'Normal Weight';
      else if (bmiValue < 30) cat = 'Overweight';
      else if (bmiValue < 35) cat = 'Obesity Class I';
      else if (bmiValue < 40) cat = 'Obesity Class II';
      else cat = 'Obesity Class III';
    }

    let minW = 0, maxW = 0;
    if (h > 0) {
      const hMValue = system === 'metric' ? h / 100 : system === 'us' ? (h * IN_TO_CM) / 100 : h;
      const factor = (system === 'us' || (system === 'other' && weightUnitOther === 'lb')) ? 1/LBS_TO_KG : 1;
      minW = 18.5 * Math.pow(hMValue, 2) * factor;
      maxW = 24.9 * Math.pow(hMValue, 2) * factor;
    }

    return { bmi: bmiValue, category: cat, idealWeightRange: { min: minW, max: maxW }, ponderalIndex: piValue, bmr: bmrValue, tdee: tdeeValue };
  }, [name, system, weight, height, feet, inches, age, gender, activity, heightUnitOther, weightUnitOther]);

  const isFaded = !bmi || bmi === 0 || isNaN(bmi);
  const totalInchesUS = (parseFloat(feet) || 0) * 12 + (parseFloat(inches) || 0);
  const isHeightTooLowFtIn = (system === 'us' || (system === 'other' && heightUnitOther === 'ft+in'))
    && (parseFloat(feet) > 0 || parseFloat(inches) > 0)
    && totalInchesUS < 21;
  const bmiPrime = isFaded ? 0 : bmi / 25;
  const displayPrime = isFaded ? '--' : bmiPrime.toFixed(2);
  const displayPI = isFaded || !ponderalIndex ? '--' : ponderalIndex.toFixed(1);

  const handleExport = async () => {
    if (bmi <= 0) return;
    setIsExporting(true);
    
    const element = document.getElementById('bmi-gauge-export');
    if (!element) {
      setIsExporting(false);
      return;
    }

    try {
      // Lazy load jsPDF
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;
      
      // Helper: Section Header
      const drawHeader = (title: string, yPos: number) => {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(150, 150, 150);
        pdf.text(title.toUpperCase(), margin, yPos);
        return yPos + 6;
      };

      // 1. HEADER & BRANDING
      pdf.setFillColor(23, 23, 23);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('QuickBMI', margin, 22);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Professional Biometric Analysis', margin, 28);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(name.toUpperCase(), margin, 35);
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text(`REPORT ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, pageWidth - margin - 40, 22);
      pdf.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, 26);
      
      y = 50;

      // 2. PATIENT METRICS SUMMARY
      y = drawHeader('Your Profile', y);
      pdf.setDrawColor(240, 240, 240);
      pdf.setFillColor(252, 252, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 30, 2, 2, 'FD');
      
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      const metricsY = y + 7;
      const colWidth = (pageWidth - (margin * 2)) / 3;
      
      // Row 1
      pdf.text('AGE', margin + 10, metricsY);
      pdf.text('GENDER', margin + 10 + colWidth, metricsY);
      pdf.text('ACTIVITY', margin + 10 + (colWidth * 2), metricsY);
      
      pdf.setTextColor(23, 23, 23);
      pdf.setFont('helvetica', 'bold');
      pdf.text(age || '--', margin + 10, metricsY + 5);
      pdf.text(gender?.toUpperCase() || '--', margin + 10 + colWidth, metricsY + 5);
      const actLabel = ACTIVITY_LEVELS.find(a => a.value === activity)?.label || 'Moderate';
      pdf.text(actLabel, margin + 10 + (colWidth * 2), metricsY + 5);
      
      // Row 2
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text('HEIGHT', margin + 10, metricsY + 13);
      pdf.text('WEIGHT', margin + 10 + colWidth, metricsY + 13);
      pdf.text('GOAL', margin + 10 + (colWidth * 2), metricsY + 13);
      
      pdf.setTextColor(23, 23, 23);
      pdf.setFont('helvetica', 'bold');
      let hStr = '';
      let wStr = '';
      if (system === 'us') {
        hStr = `${feet}ft ${inches}in`;
        wStr = `${weight} lb`;
      } else if (system === 'metric') {
        hStr = `${height}cm`;
        wStr = `${weight} kg`;
      } else {
        if (heightUnitOther === 'ft+in') {
          hStr = `${feet}ft ${inches}in`;
        } else {
          hStr = `${height} ${heightUnitOther}`;
        }
        wStr = `${weight} ${weightUnitOther}`;
      }
      pdf.text(hStr, margin + 10, metricsY + 18);
      pdf.text(wStr, margin + 10 + colWidth, metricsY + 18);
      pdf.text(goal.toUpperCase(), margin + 10 + (colWidth * 2), metricsY + 18);
      
      y += 34; // Card height + gap

      // 3. BMI RESULT & PROGRAMMATIC BAR
      y = drawHeader('Biometric Analysis', y);
      
      // Result Card
      pdf.setDrawColor(235, 235, 235);
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'D');
      
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('CURRENT BMI', margin + 10, y + 8);
      pdf.text('CLASSIFICATION', margin + 70, y + 8);
      
      pdf.setTextColor(23, 23, 23);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(bmi.toFixed(1), margin + 10, y + 16);
      pdf.setFontSize(13);
      pdf.text(category, margin + 70, y + 16);
      
      y += 28;

      // NEW: BMI Visual Bar (Programmatic replacement for gauge snapshot)
      const barHeight = 8;
      const barWidth = pageWidth - (margin * 2);

      // Draw Colored Segments (Matching UI zones)
      // Underweight (14%) - #0070f3
      pdf.setFillColor(0, 112, 243);
      pdf.rect(margin, y, barWidth * 0.14, barHeight, 'F');

      // Normal (26%) - #00dfd8
      pdf.setFillColor(0, 223, 216);
      pdf.rect(margin + (barWidth * 0.14), y, barWidth * 0.26, barHeight, 'F');

      // Overweight (20%) - #f5a623
      pdf.setFillColor(245, 166, 35);
      pdf.rect(margin + (barWidth * 0.40), y, barWidth * 0.20, barHeight, 'F');

      // Obese (40%) - #ff0000
      pdf.setFillColor(255, 0, 0);
      pdf.rect(margin + (barWidth * 0.60), y, barWidth * 0.40, barHeight, 'F');

      // Calculate Marker Position (Scale: 15 to 40)
      const minBMI = 15;
      const maxBMI = 40;
      const percentage = Math.min(Math.max(((bmi - minBMI) / (maxBMI - minBMI)) * 100, 0), 100);
      const markerX = margin + (barWidth * (percentage / 100));

      // Draw Marker Line & Pin
      pdf.setDrawColor(23, 23, 23);
      pdf.setLineWidth(0.6);
      pdf.line(markerX, y - 2, markerX, y + barHeight + 2);
      pdf.setFillColor(23, 23, 23);
      pdf.circle(markerX, y - 3, 1.2, 'FD');

      // Scale Labels
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text('15', margin, y + barHeight + 5);
      pdf.text('18.5', margin + (barWidth * 0.14), y + barHeight + 5, { align: 'center' });
      pdf.text('25', margin + (barWidth * 0.40), y + barHeight + 5, { align: 'center' });
      pdf.text('30', margin + (barWidth * 0.60), y + barHeight + 5, { align: 'center' });
      pdf.text('40+', margin + barWidth, y + barHeight + 5, { align: 'right' });

      y += barHeight + 15; // Gap after bar

      // 4. HEALTHY WEIGHT & INSIGHTS
      const leftColWidth = (pageWidth - (margin * 2) - 10) * 0.55;
      const rightColWidth = (pageWidth - (margin * 2) - 10) * 0.45;

      // Healthy Weight Range & Advanced Metrics side-by-side
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(150, 150, 150);
      pdf.text('HEALTHY WEIGHT RANGE', margin, y);
      pdf.text('ADVANCED ANALYTICS', margin + leftColWidth + 10, y);
      
      y += 6;
      pdf.setDrawColor(240, 240, 240);
      pdf.roundedRect(margin, y, leftColWidth, 22, 2, 2, 'D');
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 112, 243);
      const unit = (system === 'us' || (system === 'other' && weightUnitOther === 'lb')) ? 'lb' : 'kg';
      pdf.text(`${idealWeightRange.min.toFixed(1)} – ${idealWeightRange.max.toFixed(1)} ${unit}`, margin + 8, y + 10);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      const insightBase = category === 'Normal Weight' ? 'You are currently within the healthy range.' : `Target healthy range for your height.`;
      pdf.text(insightBase, margin + 8, y + 16);

      pdf.roundedRect(margin + leftColWidth + 10, y, rightColWidth, 22, 2, 2, 'D');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('BMI PRIME', margin + leftColWidth + 18, y + 8);
      pdf.text('PONDERAL INDEX', margin + leftColWidth + 18, y + 16);
      pdf.setTextColor(23, 23, 23);
      pdf.setFont('helvetica', 'bold');
      pdf.text((bmi / 25).toFixed(2), margin + leftColWidth + 55, y + 8);
      pdf.text(ponderalIndex?.toFixed(1) || '--', margin + leftColWidth + 55, y + 16);

      y += 28; // Card height + gap

      // 5. DAILY CALORIE ESTIMATE
      y = drawHeader('Energy Expenditure Plan', y);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'F');
      
      const calCol = (pageWidth - (margin * 2)) / 4;
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      pdf.text('BMR BASE', margin + 5, y + 6);
      pdf.text('MAINTENANCE', margin + 5 + calCol, y + 6);
      pdf.text('WEIGHT LOSS', margin + 5 + (calCol * 2), y + 6);
      pdf.text('WEIGHT GAIN', margin + 5 + (calCol * 3), y + 6);
      
      pdf.setFontSize(9);
      pdf.setTextColor(23, 23, 23);
      pdf.setFont('helvetica', 'bold');
      pdf.text(bmr ? `${Math.round(bmr).toLocaleString()} kcal` : '--', margin + 5, y + 14);
      pdf.text(tdee ? `${Math.round(tdee).toLocaleString()} kcal` : '--', margin + 5 + calCol, y + 14);
      pdf.setTextColor(235, 100, 100);
      pdf.text(tdee ? `${Math.round(tdee - 500).toLocaleString()} kcal` : '--', margin + 5 + (calCol * 2), y + 14);
      pdf.setTextColor(34, 197, 94);
      pdf.text(tdee ? `${Math.round(tdee + 500).toLocaleString()} kcal` : '--', margin + 5 + (calCol * 3), y + 14);
      
      y += 26; // Gap after calorie plan

      // 6. HEALTH INSIGHT & RECOMMENDATIONS
      const insights = {
        'Underweight': "Your BMI indicates lower body mass. Nutritional optimization may help support metabolic health.",
        'Normal Weight': "Your BMI is in the healthy range. Maintaining balanced nutrition and activity supports longevity.",
        'Overweight': "Your BMI suggests elevated mass. Regular activity and nutrition may help improve outcomes.",
        'Obesity Class I': "Your BMI indicates class I obesity. Consult a specialist for a tailored wellness plan.",
        'Obesity Class II': "Your BMI indicates class II obesity. Professional guidance is recommended for health management.",
        'Obesity Class III': "Your BMI indicates class III obesity. Immediate professional consultation is highly advised."
      };
      
      y = drawHeader('Personalized Insights', y);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(50, 50, 50);
      const splitInsight = pdf.splitTextToSize(insights[category as keyof typeof insights] || insights['Normal Weight'], pageWidth - (margin * 2));
      pdf.text(splitInsight, margin, y + 2);
      
      y += 10; // Move to table area

      // WHO Table & Recommendations
      const tableWidth = (pageWidth - (margin * 2)) * 0.45;
      const recX = margin + tableWidth + 15;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(150, 150, 150);
      pdf.text('WHO CATEGORY REFERENCE', margin, y);
      pdf.text('RECOMMENDATIONS', recX, y);
      
      y += 4;
      const tableRows = [
        ['Underweight', '< 18.5'],
        ['Normal Weight', '18.5 – 24.9'],
        ['Overweight', '25.0 – 29.9'],
        ['Obesity', '30.0+']
      ];
      
      tableRows.forEach((row, i) => {
        const rowY = y + (i * 4.5);
        pdf.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250);
        pdf.rect(margin, rowY, tableWidth, 4.5, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text(row[0], margin + 3, rowY + 3);
        pdf.text(row[1], margin + tableWidth - 15, rowY + 3);
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      const recs = [
        'Prioritize hydration (2-3L daily)',
        'Maintain consistent sleep patterns',
        'Focus on whole, nutrient-dense foods',
        'Engage in regular physical activity',
        'Track biometric trends monthly'
      ];
      recs.forEach((rec, i) => {
        const recY = y + (i * 4.5);
        // Draw custom checkmark
        pdf.setDrawColor(34, 197, 94);
        pdf.setLineWidth(0.3);
        pdf.line(recX, recY + 3, recX + 1, recY + 4);
        pdf.line(recX + 1, recY + 4, recX + 3, recY + 1.5);
        pdf.text(rec, recX + 5, recY + 3.5);
      });

      y += (tableRows.length * 4.5) + 8; // End of table + gap

      // 7. FOOTER & DISCLAIMER
      // Ensure we stay on the same page but at the bottom safely
      y = Math.max(y, 270); 
      
      pdf.setFontSize(7);
      pdf.setTextColor(180, 180, 180);
      const disclaimer = "DISCLAIMER: This report is for informational purposes only and does not constitute medical advice. BMI has limitations and does not account for muscle mass, bone density, or fat distribution. Always consult with a qualified healthcare professional before making health or diet changes.";
      const splitDisclaimer = pdf.splitTextToSize(disclaimer, pageWidth - (margin * 2));
      pdf.text(splitDisclaimer, margin, y);
      
      const disclaimerHeight = (splitDisclaimer.length * 3);
      const footerY = y + disclaimerHeight + 2;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('quickbmicalculator.com', margin, footerY);

      pdf.save(`QuickBMICalculator-Report-${bmi.toFixed(1)}.pdf`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Export failed:', error);
      setExportError('Export failed. Please try again.');
      setTimeout(() => setExportError(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };



  return (
    <motion.div 
      className="card max-w-6xl mx-auto overflow-hidden relative p-0 shadow-premium-xl border-hairline/50 dark:bg-canvas"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[700px]">
        
        {/* LEFT: Command Panel (Inputs) */}
        <div className="lg:col-span-5 p-6 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-hairline bg-canvas relative z-20">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex items-center justify-between border-b border-hairline pb-8">
              <div className="flex items-center gap-4">
                <BrandLogo className="w-12 h-12" variant="ink" />
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Analysis Engine</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    Live Processing
                  </div>
                </div>
              </div>
              <button onClick={handleResetWithAnimation} className={`p-3 bg-canvas-soft border border-hairline hover:bg-surface rounded-xl transition-all text-mute hover:text-ink shadow-premium-sm active:scale-95 ${isResetting ? 'ring-2 ring-primary/40 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : ''}`} title="Reset Data">
                <RotateCcw className={`w-5 h-5 transition-transform ${isResetting ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-6 lg:space-y-8">
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Standard</span>
                <div className="flex p-1 bg-canvas-soft border border-hairline rounded-ui gap-1">
                  {['us', 'metric', 'other'].map((s) => (
                    <button 
                      key={s} 
                      onClick={() => { setSystem(s as UnitSystem); setWeight(''); }}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 rounded-[4px] ${system === s ? 'bg-canvas text-ink shadow-premium-sm ring-1 ring-hairline' : 'text-mute hover:text-ink hover:bg-canvas/50'}`}
                    >
                      {s === 'us' ? 'US Units' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 lg:gap-8">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/[^a-zA-Z ]/g, '')
                          .replace(/^ /, '')
                          .replace(/ {2,}/g, ' ')
                          .toUpperCase();
                        if (val.length <= 50) setName(val);
                        setNameError(val.length < 2 && val.length > 0 ? 'Min 2 characters required' : '');
                      }}
                      placeholder="YOUR NAME"
                      maxLength={50}
                      className="w-full bg-canvas border border-hairline dark:border-white/[0.08] rounded-ui h-14 px-5 text-xl font-bold tracking-tighter text-ink dark:text-[#f5f5f5] transition-all duration-300 placeholder:text-mute/20 dark:placeholder:text-mute/40 focus:outline-none focus:ring-[6px] focus:ring-primary/[0.03] focus:border-ink dark:focus:border-white/20 shadow-premium-sm hover:border-hairline-strong dark:hover:border-white/15 focus:bg-canvas uppercase"
                    />
                  </div>
                  {nameError && <p className="text-red-500 text-[10px] font-mono font-bold">{nameError}</p>}
                </div>

                <InputGroup id="age" label="Age" value={age} onChange={setAge} unit="YRS" placeholder="25" min={18} max={120} step="1" />
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Gender</span>
                  <div className="flex p-1 bg-canvas-soft border border-hairline rounded-ui h-14 gap-1">
                    {['male', 'female'].map((g) => (
                      <button 
                        key={g} 
                        onClick={() => setGender(g as 'male' | 'female')}
                        className={`flex-1 rounded-[4px] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${gender === g ? 'bg-ink text-canvas shadow-premium-md' : 'text-mute hover:text-ink hover:bg-canvas/50'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6 lg:space-y-8">
                {system === 'metric' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
                    <InputGroup key="h-cm" id="height" label="Height" value={height} onChange={setHeight} unit="CM" placeholder="180" min={54} max={272} />
                    <InputGroup key="w-kg" id="weight" label="Weight" value={weight} onChange={setWeight} unit="KG" placeholder="80" min={17} max={635} />
                  </div>
                ) : system === 'us' ? (
                  <div className="space-y-6 lg:space-y-8">
                    <div className="grid grid-cols-2 gap-4 lg:gap-6">
                      <InputGroup key="h-ft" id="feet" label="Feet" value={feet} onChange={setFeet} unit="FT" placeholder="5" min={1} max={8} step="1" />
                      <InputGroup key="h-in" id="inches" label="Inches" value={inches} onChange={setInches} unit="IN" placeholder="11" min={0} max={11} step="1" />
                    </div>
                    <InputGroup key="w-lb" id="weight-lb" label="Weight" value={weight} onChange={setWeight} unit="LB" placeholder="175" min={37} max={1400} />
                  </div>
                ) : (
                  <div className="space-y-6 lg:space-y-8">
                    {heightUnitOther === 'ft+in' ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 lg:gap-6">
                          <InputGroup key="h-ft-other" id="feet-other" label="Height" value={feet} onChange={setFeet} unit="FT" placeholder="5" min={1} max={8} step="1" />
                          <InputGroup key="h-in-other" id="inches-other" label="Inches" value={inches} onChange={setInches} unit="IN" placeholder="8" min={0} max={11} step="1" />
                        </div>
                        <div className="flex justify-end">
                           <div className="relative flex items-center">
                              <select
                                value={heightUnitOther}
                                onChange={(e) => { setHeightUnitOther(e.target.value as any); setHeight(''); setFeet(''); setInches(''); }}
                                className="appearance-none bg-canvas-soft pl-2 pr-6 py-1 rounded border border-hairline text-[9px] font-mono font-bold text-mute uppercase tracking-widest focus:outline-none focus:border-ink focus:text-ink transition-colors cursor-pointer hover:bg-surface"
                              >
                                {['cm', 'm', 'ft+in', 'in'].map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-1.5 w-2.5 h-2.5 text-mute pointer-events-none" />
                            </div>
                        </div>
                      </div>
                    ) : (
                      <InputGroup 
                        key="h-other" 
                        id="height-other" 
                        label="Height" 
                        value={height} 
                        onChange={setHeight} 
                        unit={heightUnitOther} 
                        unitOptions={['cm', 'm', 'ft+in', 'in']}
                        onUnitChange={(val) => { setHeightUnitOther(val as any); setHeight(''); setFeet(''); setInches(''); }}
                        placeholder={heightUnitOther === 'm' ? "1.8" : heightUnitOther === 'cm' ? "180" : "68"} 
                        min={heightUnitOther === 'm' ? 0.54 : heightUnitOther === 'cm' ? 54 : 21} 
                        max={heightUnitOther === 'm' ? 2.72 : heightUnitOther === 'cm' ? 272 : 107} 
                        step={heightUnitOther === 'm' ? "0.01" : "1"} 
                      />
                    )}
                    <InputGroup 
                      key="w-other" 
                      id="weight-other" 
                      label="Weight" 
                      value={weight} 
                      onChange={setWeight} 
                      unit={weightUnitOther} 
                      unitOptions={['kg', 'lb']}
                      onUnitChange={(val) => { setWeightUnitOther(val as any); setWeight(''); }}
                      placeholder={weightUnitOther === 'kg' ? "80" : "175"} 
                      min={weightUnitOther === 'kg' ? 17 : 37} 
                      max={weightUnitOther === 'kg' ? 635 : 1400} 
                    />
                  </div>
                )}
              </div>

              <div className="space-y-6 lg:space-y-8 pt-6 border-t border-hairline/50">
                <div className="space-y-4">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Body Goal</span>
                  <div className="flex p-1 bg-canvas-soft border border-hairline rounded-ui gap-1">
                    {['loss', 'maintenance', 'gain'].map((g) => (
                      <button 
                        key={g} 
                        onClick={() => setGoal(g as Goal)}
                        className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 rounded-[4px] ${goal === g ? 'bg-ink text-canvas shadow-premium-md' : 'text-mute hover:text-ink hover:bg-canvas/50'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Physical Activity</span>
                  <div className="relative group">
                    <select 
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      className="w-full bg-canvas-soft border border-hairline rounded-ui h-14 px-5 pr-10 text-[11px] font-black uppercase tracking-widest text-ink focus:outline-none appearance-none cursor-pointer hover:border-hairline-strong transition-all shadow-inset focus:ring-4 focus:ring-primary/5 focus:border-ink"
                    >
                      {ACTIVITY_LEVELS.map((level) => (
                        <option key={level.value} value={level.value} className="bg-canvas text-ink font-sans text-sm font-medium">
                          {level.label.toUpperCase()} — {level.desc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mute pointer-events-none group-hover:text-ink transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Intelligence Panel (Results) */}
        <div className="lg:col-span-7 bg-canvas-soft/40 p-6 sm:p-10 lg:p-12 relative border-t lg:border-t-0 border-hairline">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex items-center justify-between border-b border-hairline/50 pb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shadow-premium-sm">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Your Results</h2>
                  <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Real-time Feedback</p>
                </div>
              </div>
              <button 
                onClick={handleExport} 
                disabled={isExporting || bmi <= 0}
                className="px-5 py-3 bg-canvas border border-hairline hover:bg-canvas-soft rounded-xl transition-all text-ink font-bold text-xs uppercase tracking-widest shadow-premium-md flex items-center gap-2 group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" 
                title="Export Results to PDF"
              >
                {copied ? <Check className="w-4 h-4 text-status-healthy" /> : (isExporting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><RotateCcw className="w-4 h-4 text-mute" /></motion.div> : <Copy className="w-4 h-4 text-mute group-hover:text-ink transition-colors" />)}
                <span>{copied ? 'Success' : (isExporting ? 'Downloading...' : 'Download')}</span>
              </button>
              {exportError && (
                <p className="text-red-500 font-mono font-bold text-xs mt-2 text-right">
                  {exportError}
                </p>
              )}
            </div>

            <div className="space-y-8 lg:space-y-10">
              {isHeightTooLowFtIn ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-red-500 font-mono font-bold text-sm text-center">
                    Height too low — minimum is 1 ft 9 in (world record)
                  </p>
                </div>
              ) : bmi > 0 && (bmi < 10 || bmi > 70) ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-red-500 font-mono font-bold text-sm text-center">
                    Please check your inputs — values seem unrealistic
                  </p>
                </div>
              ) : (
                <ResultGauge bmi={bmi} />
              )}
              
              {bmi >= 10 && bmi <= 70 && (
                <InsightsPanel 
                  bmi={bmi} category={category} idealWeightRange={idealWeightRange} 
                  unit={system === 'other' ? weightUnitOther : (system === 'metric' ? 'kg' : 'lb')}
                  age={age} gender={gender} ponderalIndex={ponderalIndex}
                  bmr={bmr} tdee={tdee} goal={goal}
                  weight={weight}
                  height={
                    system === 'us' 
                      ? feet 
                      : (system === 'other' && heightUnitOther === 'ft+in') 
                        ? feet 
                        : height
                  }
                  displayPrime={displayPrime}
                  bmiPrime={bmiPrime}
                  displayPI={displayPI}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
