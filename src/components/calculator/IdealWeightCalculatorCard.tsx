import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Download, Check, Activity, ChevronDown, Target, AlertCircle, Info, Lock, Save } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { BrandLogo } from '../BrandLogo';
import { ReportActions } from './ReportActions';
import { Select } from './Select';

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

  // Persistent State Logic
  useEffect(() => {
    const saved = sessionStorage.getItem('ideal_weight_calculator_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.weight !== undefined) setWeight(state.weight);
        if (state.height !== undefined) setHeight(state.height);
        if (state.feet !== undefined) setFeet(state.feet);
        if (state.inches !== undefined) setInches(state.inches);
        if (state.name !== undefined) setName(state.name);
        if (state.age !== undefined) setAge(state.age);
        if (state.gender !== undefined) setGender(state.gender);
        if (state.system !== undefined) setSystem(state.system);
        if (state.heightUnitOther !== undefined) setHeightUnitOther(state.heightUnitOther);
        if (state.weightUnitOther !== undefined) setWeightUnitOther(state.weightUnitOther);

        // Clear state after restoration to prevent stale persistence
        sessionStorage.removeItem('ideal_weight_calculator_state');
      } catch (e) {
        console.error('Failed to restore Ideal Weight state:', e);
      }
    }
  }, []);

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

    const displayUnit = system === 'us' || (system === 'other' && weightUnitOther === 'lb') ? 'lb' : 'kg';

    if (wKg > rangeHigh) {
      const diff = wKg - rangeHigh;
      const displayDiff = displayUnit === 'lb' ? (diff / LBS_TO_KG).toFixed(1) : diff.toFixed(1);
      comp = { text: `You are ~${displayDiff} ${displayUnit} above your healthy range`, diff, status: 'over' };
      sColor = 'text-red-500';
      recs = [
        'Focus on gradual fat loss',
        'Maintain balanced nutrition',
        'Incorporate daily physical activity'
      ];
    } else if (wKg < rangeLow) {
      const diff = rangeLow - wKg;
      const displayDiff = displayUnit === 'lb' ? (diff / LBS_TO_KG).toFixed(1) : diff.toFixed(1);
      comp = { text: `You are ~${displayDiff} ${displayUnit} below your healthy range`, diff, status: 'under' };
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
      const { generateDataDrivenReport } = await import('../../lib/pdf');

      const heightStr = (() => {
        if (system === 'us' || (system === 'other' && heightUnitOther === 'ft+in')) {
          return `${feet || 0}ft ${inches || 0}in`;
        }
        if (system === 'metric') return `${height}cm`;
        if (heightUnitOther === 'm') return `${height}m`;
        if (heightUnitOther === 'in') return `${height}in`;
        return height ? `${height}${heightUnitOther || 'cm'}` : '--';
      })();

      const weightStr = (() => {
        if (system === 'us') return `${weight} lb`;
        if (system === 'metric') return `${weight} kg`;
        return `${weight} ${weightUnitOther || 'kg'}`;
      })();

      const idealLb = idealWeight / 0.45359237;

      const rangeUnit = system === 'us' || (system === 'other' && weightUnitOther === 'lb') ? 'lb' : 'kg';
      const rangeLow = rangeUnit === 'lb' ? healthyRange.low / 0.45359237 : healthyRange.low;
      const rangeHigh = rangeUnit === 'lb' ? healthyRange.high / 0.45359237 : healthyRange.high;

      await generateDataDrivenReport({
        profileName: trimmedName,
        calculatorType: 'ideal_weight',
        date: new Date().toLocaleDateString(),
        unitSystem: system.toUpperCase(),

        profileRows: [
          { label: 'AGE', value: `${age} YRS` },
          { label: 'GENDER', value: (gender || '--').toUpperCase() },
          { label: 'HEIGHT', value: heightStr },
          { label: 'WEIGHT', value: weightStr },
        ],

        heroRows: [
          { label: 'IDEAL WEIGHT (DEVINE)', value: `${idealWeight.toFixed(1)} kg / ${idealLb.toFixed(1)} lb` },
        ],

        sections: [
          {
            title: 'DAILY WATER INTAKE',
            rows: [
              { label: 'WATER', value: `${waterIntake.toFixed(1)} L / day` },
            ],
            columns: 1,
          },
        ],

        splitSection: {
          leftTitle: 'HEALTHY WEIGHT RANGE',
          leftRows: [{ label: `Recommended range for your height`, value: `${rangeLow.toFixed(1)} - ${rangeHigh.toFixed(1)} ${rangeUnit}` }],
        },

        recommendations,
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
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
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] items-stretch">
        
        {/* LEFT: Command Panel (Inputs) */}
        <div className="p-6 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-hairline bg-canvas relative z-20 h-full overflow-y-auto">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex items-center justify-between border-b border-hairline pb-8">
              <div className="flex items-center gap-4">
                <BrandLogo className="w-12 h-12" variant="ink" />
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Ideal Weight</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    Devine Index
                  </div>
                </div>
              </div>
              <button onClick={handleResetWithAnimation} className={`p-3 bg-canvas-soft border border-hairline hover:bg-surface rounded-xl transition-all text-mute hover:text-ink shadow-premium-sm active:scale-95 ${isResetting ? 'ring-2 ring-primary/40' : ''}`} title="Reset Data">
                <RotateCcw className={`w-5 h-5 ${isResetting ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-6 lg:space-y-8">
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Standard</span>
                <div className="flex p-1 bg-surface-2 border border-hairline rounded-full gap-1">
                  {['us', 'metric', 'other'].map((s) => (
                    <button 
                      key={s} 
                      type="button"
                      onClick={() => { setSystem(s as UnitSystem); setWeight(''); }}
                      className={`flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.08em] transition-all duration-300 rounded-full focus-ring ${system === s ? 'bg-[var(--color-accent)] text-[oklch(16%_0.02_262)] shadow-premium-sm' : 'text-mute hover:text-ink'}`}
                    >
                      {s === 'us' ? 'US' : s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Name</label>
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
                      className="w-full bg-canvas border border-hairline rounded-ui h-14 px-5 text-xl font-bold tracking-tighter text-ink dark:text-[#f5f5f5] transition-all duration-300 placeholder:text-mute/20 dark:placeholder:text-mute/40 focus:outline-none focus:ring-[6px] focus:ring-primary/[0.03] focus:border-ink dark:focus:border-white/20 shadow-premium-sm hover:border-hairline-strong focus:bg-canvas uppercase"
                    />
                  </div>
                  {nameError && <p className="text-red-500 text-[10px] font-mono font-bold">{nameError}</p>}
                </div>

                <InputGroup id="ideal-weight-age" label="Age" value={age} onChange={setAge} unit="YRS" placeholder="25" min={18} max={120} step="1" />
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Gender</span>
                  <div className="flex p-1 bg-surface-2 border border-hairline rounded-full gap-1">
                    {['male', 'female'].map((g) => (
                      <button 
                        key={g} 
                        type="button"
                        onClick={() => setGender(g as 'male' | 'female')}
                        className={`flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.08em] transition-all duration-300 rounded-full focus-ring ${gender === g ? 'bg-[var(--color-accent)] text-[oklch(16%_0.02_262)] shadow-premium-sm' : 'text-mute hover:text-ink'}`}
                      >
                        {g.toUpperCase()}
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
                          <div className="flex justify-end w-full">
                            <Select
                              value={heightUnitOther}
                              onChange={(val) => { setHeightUnitOther(val as any); setHeight(''); setFeet(''); setInches(''); }}
                              options={['cm', 'm', 'ft+in', 'in'].map(opt => ({ value: opt, label: opt.toUpperCase() }))}
                              label="Height Unit"
                            />
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

        {/* RIGHT: Results Panel */}
        <div className="bg-canvas-soft/40 p-6 sm:p-10 lg:p-12 relative h-full overflow-y-auto">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex flex-col border-b border-hairline/50 pb-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shadow-premium-sm">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Ideal Weight</h2>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Calculated Estimates</p>
                  </div>
                </div>
              </div>
              
              <ReportActions 
                onDownload={handleExport}
                isExporting={isExporting}
                hasResult={idealWeight > 0}
                isValidName={name.trim().length >= 2}
                calculatorType="ideal_weight"
                inputData={{
                  name, age, gender, weight, height, feet, inches,
                  system, heightUnitOther, weightUnitOther
                }}
                resultData={{
                  idealWeight, healthyRange, comparison, waterIntake, recommendations
                }}
              />
              
              {exportError && (
                <p className="text-red-500 font-mono font-bold text-xs mt-3">
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
              <div id="ideal-weight-hero-export" className="flex flex-col gap-8 py-8 px-6 sm:py-10 sm:px-8 bg-ink dark:bg-canvas border border-hairline/10 dark:border-hairline rounded-marketing shadow-premium-lg text-canvas dark:text-ink relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-64 h-64 opacity-10 dark:opacity-5 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors duration-1000 ${!isFaded ? statusColor.replace('text-', 'bg-') : 'bg-mute'}`}></div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 w-full relative z-10">
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Ideal Weight Estimate</span>
                    <div className="flex items-baseline gap-2">
                      <motion.span 
                        className="text-6xl sm:text-7xl font-black tracking-[-0.03em] text-canvas dark:text-ink leading-none"
                        initial={false}
                        animate={{ scale: idealWeight > 0 ? [1, 1.02, 1] : 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        {idealWeight > 0 ? idealWeight.toFixed(1) : '--'}
                      </motion.span>
                      <span className="text-xs font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">kg</span>
                    </div>
                    {idealWeight > 0 && (
                      <span className="text-[10px] font-mono font-bold text-canvas-soft/40 dark:text-mute/45 uppercase tracking-widest mt-1.5 block">
                        ~ {(idealWeight / LBS_TO_KG).toFixed(1)} lb
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-start sm:items-end text-left sm:text-right min-w-0">
                    <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Analysis</span>
                    <div className={`text-xl sm:text-2xl font-black tracking-tight break-words max-w-full ${statusColor}`}>
                      {isFaded ? 'Awaiting Data' : (comparison.status === 'healthy' ? 'Healthy Weight' : comparison.status === 'over' ? 'Above Range' : 'Below Range')}
                    </div>
                    {idealWeight > 0 && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas/10 border border-canvas/20 shadow-premium-sm dark:bg-ink/10 dark:border-ink/20">
                         <div className={`w-1.5 h-1.5 rounded-full ${statusColor.replace('text-', 'bg-')} animate-pulse`}></div>
                         <span className="text-[9px] font-mono font-bold uppercase text-canvas dark:text-ink">Live Calculation</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Supporting Metrics: 3-Cell Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cell 1: Current Weight */}
                <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Current Weight</div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                      {isFaded ? '--' : parseFloat(weight).toFixed(1)}
                      <span className="text-[10px] font-sans font-medium text-mute ml-1">
                        {system === 'metric' ? 'KG' : system === 'us' ? 'LB' : weightUnitOther.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="text-[8px] font-mono text-mute uppercase tracking-wider">User Input baseline</div>
                  </div>
                </div>

                {/* Cell 2: Comparison vs. Range */}
                <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Vs. Healthy Range</div>
                    <div className="text-sm font-mono font-bold text-ink tracking-tight mb-2 leading-snug">
                      {isFaded ? '--' : comparison.text}
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Standard Range comparison</div>
                  </div>
                </div>

                {/* Cell 3: Daily Water Intake */}
                <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Daily Water Intake</div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                      {isFaded ? '--' : waterIntake.toFixed(1)}
                      <span className="text-[10px] font-sans font-medium text-mute ml-1">L</span>
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="h-1 w-full bg-hairline rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-status-under rounded-full transition-all duration-1000" style={{ width: isFaded ? '0%' : Math.min((waterIntake / 4) * 100, 100) + '%' }} />
                    </div>
                    <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Weight x 35ml</div>
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
                    <div className="card bg-canvas border border-hairline p-6 sm:p-8 rounded-ui">
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.4em]">
                          Next Steps
                        </div>
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
