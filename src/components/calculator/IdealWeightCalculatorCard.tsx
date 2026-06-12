import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Download, Check, Activity, ChevronDown, Target, AlertCircle, Info } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { BrandLogo } from '../BrandLogo';

type UnitSystem = 'metric' | 'us' | 'other';

const LBS_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;

export const IdealWeightCalculatorCard: React.FC = () => {
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

  const handleReset = () => {
    setWeight(''); setHeight(''); setFeet(''); setInches(''); setAge(''); setGender('');
    setName(''); setNameError('');
  };

  const { idealWeight, healthyRange, comparison, waterIntake, recommendations, statusColor, isInvalidInput } = useMemo(() => {
    const defaultResult = { 
      idealWeight: 0, 
      healthyRange: { low: 0, high: 0 }, 
      comparison: { text: '', diff: 0, status: 'healthy' as 'under' | 'healthy' | 'over' },
      waterIntake: 0, 
      recommendations: [] as string[],
      statusColor: 'text-status-healthy',
      isInvalidInput: false
    };

    const wVal = parseFloat(weight) || 0;
    let hCm = 0;
    if (system === 'metric') {
      hCm = parseFloat(height) || 0;
      if (weight.trim() !== '' && (wVal < 17 || wVal > 635)) return { ...defaultResult, isInvalidInput: true };
      if (height.trim() !== '' && (hCm < 54 || hCm > 272)) return { ...defaultResult, isInvalidInput: true };
    } else if (system === 'us') {
      hCm = ((parseFloat(feet) || 0) * 12 + (parseFloat(inches) || 0)) * IN_TO_CM;
      if (weight.trim() !== '' && (wVal < 37 || wVal > 1400)) return { ...defaultResult, isInvalidInput: true };
      if ((feet.trim() !== '' || inches.trim() !== '') && (hCm < 21 * IN_TO_CM || hCm > 107 * IN_TO_CM)) return { ...defaultResult, isInvalidInput: true };
    } else {
      if (weight.trim() !== '') {
        if (weightUnitOther === 'kg' && (wVal < 17 || wVal > 635)) return { ...defaultResult, isInvalidInput: true };
        if (weightUnitOther === 'lb' && (wVal < 37 || wVal > 1400)) return { ...defaultResult, isInvalidInput: true };
      }
      if (heightUnitOther === 'cm') hCm = parseFloat(height) || 0;
      else if (heightUnitOther === 'm') hCm = (parseFloat(height) || 0) * 100;
      else if (heightUnitOther === 'in') hCm = (parseFloat(height) || 0) * IN_TO_CM;
      else if (heightUnitOther === 'ft+in') hCm = ((parseFloat(feet) || 0) * 12 + (parseFloat(inches) || 0)) * IN_TO_CM;

      if ((height.trim() !== '' || feet.trim() !== '' || inches.trim() !== '') && (hCm < 21 * IN_TO_CM || hCm > 272)) return { ...defaultResult, isInvalidInput: true };
    }

    if (!weight || (!height && !feet && !inches) || !gender) {
      return { ...defaultResult, isInvalidInput: false };
    }

    let wKg = system === 'metric' ? wVal : system === 'us' ? wVal * LBS_TO_KG : (weightUnitOther === 'kg' ? wVal : wVal * LBS_TO_KG);

    if (wKg <= 0 || hCm <= 0) return defaultResult;


    // Devine Formula
    // Male: 50 + 2.3 kg per inch over 5 feet
    // Female: 45.5 + 2.3 kg per inch over 5 feet
    const hInches = hCm / IN_TO_CM;
    const inchesOver5ft = Math.max(0, hInches - 60);
    const baseWeight = gender === 'male' ? 50 : 45.5;
    const iwValue = baseWeight + (2.3 * inchesOver5ft);

    // Healthy Range based on BMI 18.5 - 24.9
    const hMeters = hCm / 100;
    const rangeLow = 18.5 * (hMeters * hMeters);
    const rangeHigh = 24.9 * (hMeters * hMeters);

    const water = (wKg * 35) / 1000;

    let comp = { text: 'Your weight is within a healthy range', diff: 0, status: 'healthy' as 'under' | 'healthy' | 'over' };
    let sColor = 'text-status-healthy';
    let recs = [
      'Maintain your current healthy routine',
      'Focus on a balanced diet',
      'Stay consistent with daily activity'
    ];

    if (wKg > rangeHigh) {
      const diff = wKg - rangeHigh;
      comp = { text: `You are ~${diff.toFixed(1)} kg above your healthy range`, diff, status: 'over' };
      sColor = 'text-red-500';
      recs = [
        'Focus on gradual fat loss',
        'Maintain balanced nutrition',
        'Incorporate daily physical activity'
      ];
    } else if (wKg < rangeLow) {
      const diff = rangeLow - wKg;
      comp = { text: `You are ~${diff.toFixed(1)} kg below your healthy range`, diff, status: 'under' };
      sColor = 'text-blue-500';
      recs = [
        'Aim for a healthy calorie surplus',
        'Focus on protein-rich foods',
        'Include strength training in your routine'
      ];
    }

    return { 
      idealWeight: iwValue, 
      healthyRange: { low: rangeLow, high: rangeHigh }, 
      comparison: comp,
      waterIntake: water, 
      recommendations: recs,
      statusColor: sColor
    };
  }, [system, weight, height, feet, inches, gender, heightUnitOther, weightUnitOther]);

  const handleExport = async () => {
    if (idealWeight <= 0) return;
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setNameError('Min 2 characters required for export');
      return;
    }

    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      const drawHeader = (title: string, yPos: number) => {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(150, 150, 150);
        pdf.text(title.toUpperCase(), margin, yPos);
        return yPos + 6;
      };

      // 1. HEADER
      pdf.setFillColor(23, 23, 23);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('QuickBMI', margin, 22);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Ideal Weight & Healthy Range Analysis', margin, 28);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(name.toUpperCase(), margin, 35);
      pdf.setFontSize(8);
      pdf.text(`REPORT ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, pageWidth - margin - 40, 22);
      pdf.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, 26);
      y = 50;

      // 2. PROFILE
      y = drawHeader('Your Profile', y);
      pdf.setDrawColor(240, 240, 240);
      pdf.setFillColor(252, 252, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'FD');
      const colW = (pageWidth - (margin * 2)) / 3;
      pdf.setFontSize(7); pdf.setTextColor(100, 100, 100); pdf.setFont('helvetica', 'normal');
      pdf.text('AGE', margin + 8, y + 6);
      pdf.text('GENDER', margin + 8 + colW, y + 6);
      pdf.text('CURRENT WEIGHT', margin + 8 + (colW * 2), y + 6);
      pdf.setFontSize(9); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
      pdf.text(age || '--', margin + 8, y + 14);
      pdf.text((gender || '--').toUpperCase(), margin + 8 + colW, y + 14);
      pdf.text(`${weight} ${system === 'us' ? 'lb' : weightUnitOther}`, margin + 8 + (colW * 2), y + 14);
      y += 28;

      // 3. MAIN RESULT
      y = drawHeader('Ideal Weight Estimate', y);
      pdf.setDrawColor(235, 235, 235);
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'D');
      pdf.setTextColor(100, 100, 100); pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      pdf.text('CALCULATED IDEAL WEIGHT (DEVINE FORMULA)', margin + 8, y + 8);
      pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
      pdf.text(`${idealWeight.toFixed(1)} kg / ${(idealWeight / LBS_TO_KG).toFixed(1)} lb`, margin + 8, y + 16);
      y += 28;

      // 4. HEALTHY RANGE
      y = drawHeader('Healthy Weight Range', y);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'F');
      pdf.setFontSize(7); pdf.setTextColor(100, 100, 100);
      pdf.text('BMI 18.5 - 24.9 RANGE', margin + 8, y + 6);
      pdf.setFontSize(9); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
      pdf.text(`${healthyRange.low.toFixed(1)} kg - ${healthyRange.high.toFixed(1)} kg`, margin + 8, y + 14);
      y += 26;

      // 4.5 WEIGHT SPECTRUM GRAPH (Enhanced Visibility Fix)
      const barHeight = 8;
      const barWidth = pageWidth - (margin * 2);
      
      // Reset Draw State
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
      pdf.setLineWidth(0.1);
      
      // Draw Zones (BMI scale mapped to width)
      // Underweight (15%) - #0070f3
      pdf.setFillColor(0, 112, 243); pdf.setDrawColor(0, 112, 243);
      pdf.rect(margin, y, barWidth * 0.15, barHeight, 'FD');
      // Healthy (25%) - #00dfd8
      pdf.setFillColor(0, 223, 216); pdf.setDrawColor(0, 223, 216);
      pdf.rect(margin + (barWidth * 0.15), y, barWidth * 0.25, barHeight, 'FD');
      // Overweight (20%) - #f5a623
      pdf.setFillColor(245, 166, 35); pdf.setDrawColor(245, 166, 35);
      pdf.rect(margin + (barWidth * 0.40), y, barWidth * 0.20, barHeight, 'FD');
      // Obese (40%) - #ff0000
      pdf.setFillColor(255, 0, 0); pdf.setDrawColor(255, 0, 0);
      pdf.rect(margin + (barWidth * 0.60), y, barWidth * 0.40, barHeight, 'FD');

      // Helper to get X position for a weight (via BMI)
      const getXForWeight = (w: number) => {
        const hM = (system === 'metric' ? (parseFloat(height) || 0) : system === 'us' ? (((parseFloat(feet) || 0) * 12 + (parseFloat(inches) || 0)) * IN_TO_CM) : (heightUnitOther === 'cm' ? (parseFloat(height) || 0) : heightUnitOther === 'm' ? (parseFloat(height) || 0) * 100 : ((parseFloat(feet) || 0) * 12 + (parseFloat(inches) || 0)) * IN_TO_CM)) / 100;
        if (hM <= 0) return margin;
        const b = w / (hM * hM);
        const minB = 15; const maxB = 40;
        const p = Math.min(Math.max(((b - minB) / (maxB - minB)) * 100, 0), 100);
        return margin + (barWidth * (p / 100));
      };

      const wKg = system === 'us' ? parseFloat(weight) * LBS_TO_KG : (system === 'other' && weightUnitOther === 'lb' ? parseFloat(weight) * LBS_TO_KG : parseFloat(weight));
      const currentX = getXForWeight(wKg);
      const idealX = getXForWeight(idealWeight);

      // Current Weight Marker (Strong Contrast)
      pdf.setDrawColor(23, 23, 23); 
      pdf.setFillColor(23, 23, 23);
      pdf.setLineWidth(0.8);
      pdf.line(currentX, y - 2, currentX, y + barHeight + 2);
      pdf.circle(currentX, y - 3, 1.2, 'FD');
      pdf.setFontSize(6); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
      pdf.text('CURRENT', currentX, y - 5, { align: 'center' });

      // Ideal Weight Marker (Strong Contrast Fix)
      pdf.setDrawColor(23, 23, 23); 
      pdf.setLineWidth(0.8);
      pdf.line(idealX, y - 2, idealX, y + barHeight + 2);
      pdf.setFontSize(6); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
      pdf.text('IDEAL', idealX, y + barHeight + 9, { align: 'center' });

      pdf.setFontSize(7); pdf.setTextColor(150, 150, 150); pdf.setFont('helvetica', 'normal');
      pdf.text('UNDERWEIGHT', margin, y + barHeight + 5);
      pdf.text('HEALTHY', margin + (barWidth * 0.15), y + barHeight + 5);
      pdf.text('OVERWEIGHT', margin + (barWidth * 0.40), y + barHeight + 5);
      pdf.text('OBESE', margin + (barWidth * 0.60), y + barHeight + 5);
      y += barHeight + 15;

      // 5. INSIGHTS
      y = drawHeader('Weight Comparison', y);
      pdf.setDrawColor(240, 240, 240);
      pdf.setFillColor(252, 252, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'FD');
      pdf.setFontSize(7); pdf.setTextColor(100, 100, 100);
      pdf.text('ANALYSIS', margin + 8, y + 6);
      pdf.setFontSize(9); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
      pdf.text(comparison.text, margin + 8, y + 14);
      y += 26;

      // 6. GUIDANCE
      y = drawHeader('Hydration Recommendation', y);
      pdf.setDrawColor(240, 240, 240);
      pdf.setFillColor(252, 252, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'FD');
      pdf.setFontSize(7); pdf.setTextColor(100, 100, 100);
      pdf.text('DAILY WATER INTAKE', margin + 8, y + 6);
      pdf.setFontSize(9); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
      pdf.text(`${waterIntake.toFixed(1)} L / day`, margin + 8, y + 14);
      y += 28;

      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(150, 150, 150);
      pdf.text('RECOMMENDATIONS', margin, y);
      y += 4;
      recommendations.forEach((rec, i) => {
        const recY = y + (i * 4.5);
        pdf.setDrawColor(0, 223, 216);
        pdf.setLineWidth(0.3);
        pdf.line(margin, recY + 3, margin + 1, recY + 4);
        pdf.line(margin + 1, recY + 4, margin + 3, recY + 1.5);
        pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(50, 50, 50);
        pdf.text(rec, margin + 5, recY + 3.5);
      });

      // 7. FOOTER & DISCLAIMER (Surgical Overlap Fix)
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      const disclaimer = "DISCLAIMER: This report is for informational purposes only. Results are estimates based on the Devine formula and standard BMI ranges. Consult a healthcare professional for medical advice.";
      const splitDisclaimer = pdf.splitTextToSize(disclaimer, pageWidth - (margin * 2));
      const disclaimerHeight = (splitDisclaimer.length * 3.5);
      const footerHeight = 10;
      const totalNeeded = disclaimerHeight + footerHeight;

      if (y + totalNeeded > pageHeight - 15) {
        pdf.addPage();
        y = 20;
      } else {
        y = Math.max(y + 10, pageHeight - totalNeeded - 15);
      }

      pdf.text(splitDisclaimer, margin, y);
      const footerY = y + disclaimerHeight + 2;
      pdf.setFont('helvetica', 'bold');
      pdf.text('quickbmicalculator.com', margin, footerY);

      const dateStr = new Date().toLocaleDateString('en-GB').split('/').join('-');
      const safeName = name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
      pdf.save(`Ideal-Weight-Report-${safeName}-${dateStr}.pdf`);
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

  const isWeightFilled = weight.trim() !== '';
  const isHeightFilled = system === 'metric' ? height.trim() !== '' : system === 'us' ? (feet.trim() !== '' || inches.trim() !== '') : (['cm', 'm', 'in'].includes(heightUnitOther) ? height.trim() !== '' : (feet.trim() !== '' || inches.trim() !== ''));
  const isGenderFilled = gender !== '';

  const hasStarted = isWeightFilled || isHeightFilled || isGenderFilled;
  const hasAllRequired = isWeightFilled && isHeightFilled && isGenderFilled;

  const isFresh = !hasStarted;
  const isInvalid = isInvalidInput;
  const isIncomplete = hasStarted && !hasAllRequired && !isInvalid;
  const isValid = hasAllRequired && !isInvalid;

  const isFaded = !isValid;

  return (
    <motion.div 
      className="card max-w-6xl mx-auto overflow-hidden relative p-0 shadow-premium-xl border-hairline/50 dark:bg-canvas"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 items-start min-h-fit">
        
        {/* LEFT: Command Panel (Inputs) */}
        <div className="lg:col-span-5 p-6 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-hairline bg-canvas relative z-20 h-full overflow-y-auto">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex items-center justify-between border-b border-hairline pb-8">
              <div className="flex items-center gap-4">
                <BrandLogo className="w-12 h-12" variant="ink" />
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Ideal Weight</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    Height-to-Weight Logic
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

              <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Name (PDF Export)</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="ideal-weight-name"
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

                <InputGroup id="ideal-weight-age" label="Age" value={age} onChange={setAge} unit="YRS" placeholder="25" min={18} max={120} step="1" />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
                    <InputGroup key="h-cm" id="height" label="Height" value={height} onChange={setHeight} unit="CM" placeholder="180" min={54} max={272} />
                    <InputGroup key="w-kg" id="weight" label="Weight" value={weight} onChange={setWeight} unit="KG" placeholder="80" min={17} max={635} />
                  </div>
                ) : system === 'us' ? (
                  <div className="space-y-6 lg:space-y-8">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">
                      <InputGroup key="h-ft" id="feet" label="Feet" value={feet} onChange={setFeet} unit="FT" placeholder="5" min={1} max={8} step="1" />
                      <InputGroup key="h-in" id="inches" label="Inches" value={inches} onChange={setInches} unit="IN" placeholder="11" min={0} max={11} step="1" />
                    </div>
                    <InputGroup key="w-lb" id="weight-lb" label="Weight" value={weight} onChange={setWeight} unit="LB" placeholder="175" min={37} max={1400} />
                  </div>
                ) : (
                  <div className="space-y-6 lg:space-y-8">
                    {heightUnitOther === 'ft+in' ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">
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
            </div>
          </div>
        </div>

        {/* RIGHT: Intelligence Panel (Results) */}
        <div className="lg:col-span-7 bg-canvas-soft/40 p-6 sm:p-10 lg:p-12 relative border-t lg:border-t-0 border-hairline h-full overflow-y-auto">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex items-center justify-between border-b border-hairline/50 pb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shadow-premium-sm">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Ideal Weight</h2>
                  <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Calculated Estimates</p>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={isExporting || idealWeight <= 0 || name.trim().length < 2}
                className="px-5 py-3 bg-canvas border border-hairline hover:bg-canvas-soft rounded-xl transition-all text-ink font-bold text-xs uppercase tracking-widest shadow-premium-md flex items-center gap-2 group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export Results to PDF"
              >
                {copied ? <Check className="w-4 h-4 text-status-healthy" /> : (isExporting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><RotateCcw className="w-4 h-4 text-mute" /></motion.div> : <Download className="w-4 h-4 text-mute group-hover:text-ink transition-colors" />)}
                <span>{copied ? 'Success' : (isExporting ? 'Downloading...' : 'Download')}</span>
              </button>
              {exportError && (
                <p className="text-red-500 font-mono font-bold text-xs mt-2 text-right">
                  {exportError}
                </p>
              )}
            </div>

            <div className="space-y-8 lg:space-y-10">
              {isFresh ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-mute font-mono font-bold text-[10px] uppercase tracking-widest text-center">Enter your details to see results</p>
                </div>
              ) : isInvalid ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-amber-500 font-mono font-bold text-[10px] uppercase tracking-widest text-center">Fix invalid inputs to see results</p>
                </div>
              ) : isIncomplete ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-amber-500/80 font-mono font-bold text-[10px] uppercase tracking-widest text-center">Please fill all details</p>
                </div>
              ) : (
                <>
              {/* HERO RESULT: IDEAL WEIGHT */}
              <div id="ideal-weight-hero-export" className="flex flex-col gap-8 py-8 px-6 sm:py-10 sm:px-8 bg-canvas border border-hairline rounded-marketing shadow-premium-lg relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-64 h-64 opacity-5 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors duration-1000 ${!isFaded ? statusColor.replace('text-', 'bg-') : 'bg-mute'}`}></div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8 relative z-10">
                  <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-mute uppercase tracking-[0.3em] mb-2">Ideal Weight Estimate</span>
                    <div className="flex items-baseline gap-2 sm:gap-3">
                      <motion.span 
                        className="text-5xl xs:text-6xl sm:text-8xl font-black tracking-[-0.08em] text-ink"
                        initial={false}
                        animate={{ scale: idealWeight > 0 ? [1, 1.02, 1] : 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        {idealWeight > 0 ? idealWeight.toFixed(1) : '--'}
                      </motion.span>
                      <span className="text-lg sm:text-xl font-bold text-mute/60 tracking-tighter">kg</span>
                    </div>
                    {idealWeight > 0 && (
                      <span className="text-sm sm:text-base font-bold text-mute/60 tracking-tighter mt-1">
                        ~ {(idealWeight / LBS_TO_KG).toFixed(1)} lb
                      </span>
                    )}
                  </div>

                  <div className="h-16 w-px bg-hairline hidden sm:block"></div>

                  <div className="text-center sm:text-right">
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-mute uppercase tracking-[0.3em] mb-2 sm:mb-3 block">Analysis</span>
                    <div className={`text-xl xs:text-2xl sm:text-3xl font-black tracking-tight ${statusColor}`}>
                      {isFaded ? 'Awaiting Data' : (comparison.status === 'healthy' ? 'Healthy' : comparison.status === 'over' ? 'Above Range' : 'Below Range')}
                    </div>
                    {idealWeight > 0 && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-canvas border border-hairline shadow-premium-sm">
                         <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${statusColor.replace('text-', 'bg-')} animate-pulse`}></div>
                         <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase text-ink">Live Calculation</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SUPPORTING METRICS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
                <div className="card glass border-hairline p-6 sm:p-8 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] group hover:border-hairline-strong transition-all">
                  <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-ink text-canvas flex items-center justify-center shadow-premium-md group-hover:scale-110 transition-transform">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] bg-canvas-soft px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-hairline">Healthy Range</div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1">
                      <span className="text-xl sm:text-2xl font-black tracking-tight text-ink">
                        {isFaded ? '--' : `${healthyRange.low.toFixed(1)} - ${healthyRange.high.toFixed(1)}`}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-mute uppercase font-mono tracking-widest">{isFaded ? '' : 'kg'}</span>
                    </div>
                    <p className="text-body text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60">BMI 18.5 - 24.9 Range</p>
                  </div>
                </div>

                <div className="card glass border-hairline p-6 sm:p-8 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] group hover:border-hairline-strong transition-all">
                  <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/5 text-status-healthy flex items-center justify-center border border-status-healthy/20 group-hover:scale-110 transition-transform">
                      <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] bg-canvas-soft px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-hairline">Comparison</div>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black tracking-tight text-ink leading-tight mb-1">
                      {isFaded ? '--' : comparison.text}
                    </div>
                    <p className="text-body text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60">Vs. Healthy Range</p>
                  </div>
                </div>
              </div>

              {/* RECOMMENDATIONS */}
              <AnimatePresence>
                {!isFaded && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 lg:space-y-8"
                  >
                    <div className="card glass border border-status-healthy/30 p-6 sm:p-8">
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.4em]">
                          Next Steps
                        </div>
                        <span className="text-xs font-black text-status-healthy">v</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {recommendations.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[10px] font-black mt-0.5 shrink-0 text-status-healthy"> - </span>
                            <p className="text-[11px] sm:text-xs font-medium text-ink/80 leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card glass border-hairline p-6 sm:p-8">
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.4em]">
                          Daily Water Intake
                        </div>
                        <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest bg-canvas-soft px-2 py-1 rounded-full border border-hairline">
                          Weight x 35ml
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 mb-4 sm:mb-5">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight text-ink">
                          {waterIntake.toFixed(1)}
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold text-mute uppercase font-mono tracking-widest">
                          L / DAY
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-hairline rounded-full overflow-hidden">
                        <div
                          className="h-full bg-status-under rounded-full transition-all duration-1000"
                          style={{ width: Math.min((waterIntake / 4) * 100, 100) + '%' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-6 sm:pt-8 border-t border-hairline/50">
                <p className="text-[10px] leading-relaxed text-mute font-medium text-center sm:text-left">
                  <span className="font-bold text-ink/70 uppercase tracking-widest text-[9px] mr-1.5">Medical Disclaimer:</span> 
                  The Ideal Weight results provided by this calculator are estimates based on the Devine equation and standard BMI healthy ranges. Please consult a healthcare professional for medical advice.
                </p>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
