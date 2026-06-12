import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Download, Check, Activity, ChevronDown, Target, Droplets, Sun, Clock, AlertCircle } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { BrandLogo } from '../BrandLogo';

type UnitSystem = 'metric' | 'us' | 'other';

const ACTIVITY_LEVELS = [
  { label: 'Select Activity Level', value: '', desc: 'Required' },
  { label: 'Sedentary', value: '0', desc: 'Minimal movement, office job' },
  { label: 'Lightly Active', value: '200', desc: '1-3 days of exercise/week' },
  { label: 'Moderately Active', value: '300', desc: '3-5 days of exercise/week' },
  { label: 'Very Active', value: '450', desc: '6-7 days of intense exercise/week' },
  { label: 'Extra Active', value: '600', desc: 'Intense training (2x/day)' },
];

const CLIMATE_TYPES = [
  { label: 'Select Climate', value: '', desc: 'Required' },
  { label: 'Normal', value: '0', desc: 'Temperate or cool climate' },
  { label: 'Hot Climate', value: '500', desc: 'High temperature or humidity' },
];

const LBS_TO_KG = 0.45359237;

export const WaterIntakeCalculatorCard: React.FC = () => {
  const [system, setSystem] = useState<UnitSystem>('metric');
  const [weightUnitOther, setWeightUnitOther] = useState<'kg' | 'lb'>('kg');
  const [weight, setWeight] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [activity, setActivity] = useState<string>('');
  const [climate, setClimate] = useState<string>('');
  
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
    setWeight(''); setAge(''); setGender('');
    setActivity(''); setClimate(''); setName(''); setNameError('');
  };

  const { waterGoal, hydrationStatus, timings, recommendations, statusColor, isInvalidInput } = useMemo(() => {
    const defaultResult = {
      waterGoal: 0,
      hydrationStatus: 'Awaiting Data',
      statusColor: 'text-mute',
      timings: { morning: 0, afternoon: 0, night: 0, workout: 0 },
      recommendations: [
        'Drink a glass of water right after waking up.',
        'Carry a reusable water bottle everywhere.',
        'Set reminders to drink every 2 hours.',
        'Eat water-rich fruits like watermelon.'
      ],
      isInvalidInput: false
    };

    if (age.trim() !== '') {
      const a = parseInt(age);
      if (isNaN(a) || a < 1 || a > 120) return { ...defaultResult, isInvalidInput: true };
    }

    if (weight.trim() !== '') {
       let weightKg = parseFloat(weight);
       if (isNaN(weightKg)) return { ...defaultResult, isInvalidInput: true };
       
       if (system === 'metric') {
          if (weightKg < 17 || weightKg > 635) return { ...defaultResult, isInvalidInput: true };
       } else if (system === 'us') {
          if (weightKg < 37 || weightKg > 1400) return { ...defaultResult, isInvalidInput: true };
       } else {
          if (weightUnitOther === 'kg') {
             if (weightKg < 17 || weightKg > 635) return { ...defaultResult, isInvalidInput: true };
          } else {
             if (weightKg < 37 || weightKg > 1400) return { ...defaultResult, isInvalidInput: true };
          }
       }
    }

    if (!weight || !activity || !climate) {
       return { ...defaultResult, isInvalidInput: false };
    }

    let weightKg = parseFloat(weight);

    if (system === 'us') weightKg = weightKg * LBS_TO_KG;
    else if (system === 'other' && weightUnitOther === 'lb') weightKg = weightKg * LBS_TO_KG;

    // Daily Water Intake = Weight (kg) × 35 ml
    let goalMl = weightKg * 35;

    // Adjustments
    goalMl += parseFloat(activity);
    goalMl += parseFloat(climate);

    const goalL = goalMl / 1000;

    let status = 'Normal';
    let statusColor = 'text-status-healthy';
    if (goalL < 2.0) {
      status = 'Low';
      statusColor = 'text-status-under';
    } else if (goalL > 3.5) {
      status = 'High';
      statusColor = 'text-status-over';
    }

    return {
      waterGoal: goalL,
      hydrationStatus: status,
      statusColor,
      timings: {
        morning: goalL * 0.25,
        afternoon: goalL * 0.40,
        night: goalL * 0.20,
        workout: goalL * 0.15
      },
      recommendations: [
        'Drink a glass of water right after waking up.',
        'Keep a bottle at your desk to sip throughout the day.',
        'Increase intake during and after physical activity.',
        'Monitor urine color - it should be pale yellow.'
      ]
    };
  }, [system, weight, weightUnitOther, activity, climate, age]);

  const handleExport = async () => {
    if (waterGoal <= 0) return;
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
      pdf.text('Water Intake & Hydration Report', margin, 28);
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
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'FD');
      const colW = (pageWidth - (margin * 2)) / 4;
      pdf.setFontSize(7); pdf.setTextColor(100, 100, 100); pdf.setFont('helvetica', 'normal');
      pdf.text('AGE', margin + 8, y + 6);
      pdf.text('GENDER', margin + 8 + colW, y + 6);
      pdf.text('ACTIVITY', margin + 8 + (colW * 2), y + 6);
      pdf.text('CLIMATE', margin + 8 + (colW * 3), y + 6);
      pdf.setFontSize(9); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
      pdf.text(age || '--', margin + 8, y + 14);
      pdf.text((gender || '--').toUpperCase(), margin + 8 + colW, y + 14);
      const actLabel = ACTIVITY_LEVELS.find(a => a.value === activity)?.label || '--';
      const climLabel = CLIMATE_TYPES.find(c => c.value === climate)?.label || '--';
      pdf.text(actLabel, margin + 8 + (colW * 2), y + 14);
      pdf.text(climLabel, margin + 8 + (colW * 3), y + 14);
      y += 28;

      // 3. MAIN RESULT
      y = drawHeader('Hydration Goal', y);
      pdf.setDrawColor(235, 235, 235);
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'D');
      pdf.setTextColor(100, 100, 100); pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      pdf.text('DAILY WATER INTAKE GOAL', margin + 8, y + 8);
      pdf.text('STATUS', margin + 90, y + 8);
      pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
      pdf.text(`${waterGoal.toFixed(1)} Liters / day`, margin + 8, y + 16);
      pdf.setFontSize(13);
      pdf.text(hydrationStatus.toUpperCase(), margin + 90, y + 16);
      y += 28;

      // 4. HYDRATION VISUAL BAR (Enhanced Visibility Fix)
      const barHeight = 8;
      const barWidth = pageWidth - (margin * 2);
      
      // Reset Draw State
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
      pdf.setLineWidth(0.1);
      
      // Low (30%) - #0070f3
      pdf.setFillColor(0, 112, 243);
      pdf.setDrawColor(0, 112, 243);
      pdf.rect(margin, y, barWidth * 0.30, barHeight, 'FD');
      
      // Normal (40%) - #00dfd8
      pdf.setFillColor(0, 223, 216);
      pdf.setDrawColor(0, 223, 216);
      pdf.rect(margin + (barWidth * 0.30), y, barWidth * 0.40, barHeight, 'FD');
      
      // High (30%) - #f5a623
      pdf.setFillColor(245, 166, 35);
      pdf.setDrawColor(245, 166, 35);
      pdf.rect(margin + (barWidth * 0.70), y, barWidth * 0.30, barHeight, 'FD');

      // Marker Position (Scale 1L to 5L)
      const minW = 1;
      const maxW = 5;
      const pct = Math.min(Math.max(((waterGoal - minW) / (maxW - minW)) * 100, 0), 100);
      const markerX = margin + (barWidth * (pct / 100));

      pdf.setDrawColor(23, 23, 23); 
      pdf.setFillColor(23, 23, 23);
      pdf.setLineWidth(0.8);
      pdf.line(markerX, y - 2, markerX, y + barHeight + 2);
      pdf.circle(markerX, y - 3, 1.2, 'FD');

      pdf.setFontSize(7); pdf.setTextColor(100, 100, 100); pdf.setFont('helvetica', 'bold');
      pdf.text('LOW', margin, y + barHeight + 5);
      pdf.text('NORMAL', margin + (barWidth * 0.30), y + barHeight + 5);
      pdf.text('HIGH', margin + (barWidth * 0.70), y + barHeight + 5);
      y += barHeight + 15;

      // 5. TIMING
      y = drawHeader('Suggested Intake Timing', y);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'F');
      const timeCol = (pageWidth - (margin * 2)) / 4;
      pdf.setFontSize(7); pdf.setTextColor(100, 100, 100);
      pdf.text('MORNING', margin + 8, y + 6);
      pdf.text('AFTERNOON', margin + 8 + timeCol, y + 6);
      pdf.text('NIGHT', margin + 8 + (timeCol * 2), y + 6);
      pdf.text('WORKOUT', margin + 8 + (timeCol * 3), y + 6);
      pdf.setFontSize(9); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
      pdf.text(`${timings.morning.toFixed(2)} L`, margin + 8, y + 14);
      pdf.text(`${timings.afternoon.toFixed(2)} L`, margin + 8 + timeCol, y + 14);
      pdf.text(`${timings.night.toFixed(2)} L`, margin + 8 + (timeCol * 2), y + 14);
      pdf.text(`${timings.workout.toFixed(2)} L`, margin + 8 + (timeCol * 3), y + 14);
      y += 30;

      // 5. RECOMMENDATIONS
      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(150, 150, 150);
      pdf.text('HYDRATION RECOMMENDATIONS', margin, y);
      y += 6;
      recommendations.forEach((rec, i) => {
        const recY = y + (i * 6);
        pdf.setDrawColor(0, 223, 216);
        pdf.setLineWidth(0.3);
        pdf.line(margin, recY + 3, margin + 1, recY + 4);
        pdf.line(margin + 1, recY + 4, margin + 3, recY + 1.5);
        pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(50, 50, 50);
        pdf.text(rec, margin + 5, recY + 3.5);
      });

      // 6. FOOTER & DISCLAIMER (Surgical Overlap Fix)
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      const disclaimer = "DISCLAIMER: This report is for informational purposes only. Water intake results are estimates based on body weight, activity level, and environmental conditions. Consult a healthcare professional for personalized hydration advice.";
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
      pdf.save(`Water-Intake-Report-${safeName}-${dateStr}.pdf`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('PDF Export Error:', error);
      setExportError('Export failed. Please try again.');
      setTimeout(() => setExportError(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const isWeightFilled = weight.trim() !== '';
  const isActivityFilled = activity !== '';
  const isClimateFilled = climate !== '';

  const hasStarted = isWeightFilled || isActivityFilled || isClimateFilled;
  const hasAllRequired = isWeightFilled && isActivityFilled && isClimateFilled;

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
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Hydration Engine</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    Live Calculation
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
                      id="water-name"
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

                <InputGroup id="water-age" label="Age" value={age} onChange={setAge} unit="YRS" placeholder="25" min={1} max={120} step="1" />
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
                  <InputGroup key="w-kg" id="weight" label="Weight" value={weight} onChange={setWeight} unit="KG" placeholder="80" min={1} max={635} />
                ) : system === 'us' ? (
                  <InputGroup key="w-lb" id="weight-lb" label="Weight" value={weight} onChange={setWeight} unit="LB" placeholder="175" min={1} max={1400} />
                ) : (
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
                    min={1} 
                    max={weightUnitOther === 'kg' ? 635 : 1400} 
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8 pt-6 border-t border-hairline/50">
                <div className="space-y-4">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Activity Level</span>
                  <div className="relative group">
                    <select 
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      className="w-full bg-canvas-soft border border-hairline rounded-ui h-14 px-5 pr-10 text-[11px] font-black uppercase tracking-widest text-ink focus:outline-none appearance-none cursor-pointer hover:border-hairline-strong transition-all shadow-inset focus:ring-4 focus:ring-primary/5 focus:border-ink"
                    >
                      {ACTIVITY_LEVELS.map((level) => (
                        <option key={level.value} value={level.value} className="bg-canvas text-ink font-sans text-sm font-medium">
                          {level.label.toUpperCase()}  -  {level.desc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mute pointer-events-none group-hover:text-ink transition-colors" />
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Climate</span>
                  <div className="relative group">
                    <select 
                      value={climate}
                      onChange={(e) => setClimate(e.target.value)}
                      className="w-full bg-canvas-soft border border-hairline rounded-ui h-14 px-5 pr-10 text-[11px] font-black uppercase tracking-widest text-ink focus:outline-none appearance-none cursor-pointer hover:border-hairline-strong transition-all shadow-inset focus:ring-4 focus:ring-primary/5 focus:border-ink"
                    >
                      {CLIMATE_TYPES.map((c) => (
                        <option key={c.value} value={c.value} className="bg-canvas text-ink font-sans text-sm font-medium">
                          {c.label.toUpperCase()}  -  {c.desc}
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
        <div className="lg:col-span-7 bg-canvas-soft/40 p-6 sm:p-10 lg:p-12 relative border-t lg:border-t-0 border-hairline h-full overflow-y-auto">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex items-center justify-between border-b border-hairline/50 pb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shadow-premium-sm">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Daily Intake</h2>
                  <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Hydration Goal Analysis</p>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={isExporting || waterGoal <= 0 || name.trim().length < 2}
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
              <div id="water-hero-export" className="flex flex-col gap-8 py-8 px-6 sm:py-10 sm:px-8 bg-canvas border border-hairline rounded-marketing shadow-premium-lg relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-64 h-64 opacity-5 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors duration-1000 ${!isFaded ? waterGoal < 2.0 ? 'bg-status-under' : waterGoal > 3.5 ? 'bg-status-over' : 'bg-status-healthy' : 'bg-mute'}`}></div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8 relative z-10">
                  <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-mute uppercase tracking-[0.3em] mb-2">Daily Intake Goal</span>
                    <div className="flex items-baseline gap-2 sm:gap-3">
                      <motion.span 
                        className="text-5xl xs:text-6xl sm:text-8xl font-black tracking-[-0.08em] text-ink"
                        animate={{ scale: waterGoal > 0 ? [1, 1.02, 1] : 1 }}
                      >
                        {waterGoal > 0 ? waterGoal.toFixed(1) : '--'}
                      </motion.span>
                      <span className="text-lg sm:text-xl font-bold text-mute/60 tracking-tighter">Liters</span>
                    </div>
                  </div>

                  <div className="h-16 w-px bg-hairline hidden sm:block"></div>

                  <div className="text-center sm:text-right">
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-mute uppercase tracking-[0.3em] mb-2 sm:mb-3 block">Hydration Status</span>
                    <div className={`text-xl xs:text-2xl sm:text-3xl font-black tracking-tight ${!isFaded ? (waterGoal < 2.0 ? 'text-status-under' : waterGoal > 3.5 ? 'text-status-over' : 'text-status-healthy') : 'text-mute'}`}>
                      {hydrationStatus}
                    </div>
                    {waterGoal > 0 && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-canvas border border-hairline shadow-premium-sm">
                         <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${waterGoal < 2.0 ? 'bg-status-under' : waterGoal > 3.5 ? 'bg-status-over' : 'bg-status-healthy'} animate-pulse`}></div>
                         <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase text-ink">Calculated Intake</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative pt-8 pb-4">
                  <div className="flex h-3 sm:h-4 w-full rounded-full overflow-hidden bg-hairline p-1">
                    <div className="bg-status-under h-full border-r-2 border-canvas rounded-sm opacity-80" style={{ width: '30%' }}></div>
                    <div className="bg-status-healthy h-full border-r-2 border-canvas rounded-sm opacity-80" style={{ width: '40%' }}></div>
                    <div className="bg-status-over h-full rounded-sm opacity-80" style={{ width: '30%' }}></div>
                  </div>
                  {!isFaded && (() => {
                    const pct = Math.min(Math.max(((waterGoal - 1) / (5 - 1)) * 100, 0), 100);
                    return (
                      <motion.div 
                        className="absolute top-0 bottom-0 flex flex-col items-center -ml-px pointer-events-none z-20"
                        initial={{ left: '0%' }}
                        animate={{ left: `${pct}%` }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                      >
                        <div className="h-[calc(100%-8px)] flex flex-col items-center">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-canvas border-2 border-ink shadow-premium-md flex items-center justify-center mb-1">
                            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${waterGoal < 2.0 ? 'bg-status-under' : waterGoal > 3.5 ? 'bg-status-over' : 'bg-status-healthy'} animate-pulse`}></div>
                          </div>
                          <div className="w-1 h-full bg-ink/20" />
                        </div>
                      </motion.div>
                    );
                  })()}
                  <div className="grid grid-cols-3 mt-6 gap-1 sm:gap-2">
                    {[
                      { label: 'Low', range: '< 2.2L' },
                      { label: 'Normal', range: '2.2 - 3.8L' },
                      { label: 'High', range: '> 3.8L' }
                    ].map((zone, i) => (
                      <div key={i} className="flex flex-col items-center sm:items-start text-center sm:text-left overflow-hidden">
                        <span className="text-[7px] sm:text-[9px] font-mono font-bold text-ink uppercase tracking-widest mb-1 leading-tight">{zone.label}</span>
                        <span className="text-[6px] sm:text-[8px] font-mono font-bold text-body leading-tight">{zone.range}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="card glass border-hairline p-6 sm:p-8 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] group hover:border-hairline-strong transition-all">
                  <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-ink text-canvas flex items-center justify-center shadow-premium-md group-hover:scale-110 transition-transform">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] bg-canvas-soft px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-hairline">Timing</div>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-1 sm:mb-2 text-ink truncate">Suggested Intake</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono font-bold text-mute uppercase tracking-widest">Morning</span>
                        <span className="text-sm font-bold text-ink">{isFaded ? '--' : timings.morning.toFixed(2)} L</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono font-bold text-mute uppercase tracking-widest">Afternoon</span>
                        <span className="text-sm font-bold text-ink">{isFaded ? '--' : timings.afternoon.toFixed(2)} L</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono font-bold text-mute uppercase tracking-widest">Night</span>
                        <span className="text-sm font-bold text-ink">{isFaded ? '--' : timings.night.toFixed(2)} L</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono font-bold text-mute uppercase tracking-widest">Workout</span>
                        <span className="text-sm font-bold text-ink">{isFaded ? '--' : timings.workout.toFixed(2)} L</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card glass border-hairline p-6 sm:p-8 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] group hover:border-hairline-strong transition-all">
                  <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/5 text-status-healthy flex items-center justify-center border border-status-healthy/20 group-hover:scale-110 transition-transform">
                      <Droplets className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] bg-canvas-soft px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-hairline">Guidance</div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1">
                      <span className="text-xl sm:text-2xl font-black tracking-tight text-ink">
                        {isFaded ? '--' : waterGoal.toFixed(1)}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-mute uppercase font-mono tracking-widest">{isFaded ? '' : 'Liters/Day'}</span>
                    </div>
                    <p className="text-body text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60">Ideal daily hydration goal</p>
                  </div>
                </div>
              </div>

              <div className="card glass border-hairline p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.4em]">
                    Recommendations
                  </div>
                  <Droplets className="w-4 h-4 text-status-healthy" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-3 items-start group">
                      <div className="mt-1 w-5 h-5 rounded-lg bg-status-healthy/10 flex items-center justify-center shrink-0 group-hover:bg-status-healthy/20 transition-colors">
                        <Check className="w-3 h-3 text-status-healthy" />
                      </div>
                      <p className="text-xs sm:text-sm text-body font-medium leading-relaxed group-hover:text-ink transition-colors">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 sm:pt-8 border-t border-hairline/50">
                <p className="text-[10px] leading-relaxed text-mute font-medium text-center sm:text-left">
                  <span className="font-bold text-ink/70 uppercase tracking-widest text-[9px] mr-1.5">Medical Disclaimer:</span> 
                  The Water Intake results provided by this calculator are estimates for informational purposes only. Please consult a healthcare professional for medical advice.
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
