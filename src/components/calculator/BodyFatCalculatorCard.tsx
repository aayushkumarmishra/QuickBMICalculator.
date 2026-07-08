import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Activity, ChevronDown, Check, Droplets } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { BrandLogo } from '../BrandLogo';
import { ReportActions } from './ReportActions';
import { Select } from './Select';

type UnitSystem = 'metric' | 'us' | 'other';
type Gender = 'male' | 'female' | '';

export const BodyFatCalculatorCard: React.FC = () => {
  const [system, setSystem] = useState<UnitSystem>('metric');
  const [heightUnitOther, setHeightUnitOther] = useState<'cm' | 'm' | 'ft+in' | 'in'>('cm');
  const [weightUnitOther, setWeightUnitOther] = useState<'kg' | 'lb'>('kg');
  const [circumferenceUnitOther, setCircumferenceUnitOther] = useState<'cm' | 'in'>('cm');
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<Gender>('');
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [feet, setFeet] = useState<string>('');
  const [inches, setInches] = useState<string>('');
  
  // Circumferences
  const [neck, setNeck] = useState<string>('');
  const [waist, setWaist] = useState<string>('');
  const [hips, setHips] = useState<string>(''); // For women only

  const [nameError, setNameError] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);

  // Restore State on Mount
  useEffect(() => {
    const saved = sessionStorage.getItem('body_fat_calculator_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.name !== undefined) setName(state.name);
        if (state.age !== undefined) setAge(state.age);
        if (state.gender !== undefined) setGender(state.gender);
        if (state.weight !== undefined) setWeight(state.weight);
        if (state.height !== undefined) setHeight(state.height);
        if (state.feet !== undefined) setFeet(state.feet);
        if (state.inches !== undefined) setInches(state.inches);
        if (state.neck !== undefined) setNeck(state.neck);
        if (state.waist !== undefined) setWaist(state.waist);
        if (state.hips !== undefined) setHips(state.hips);
        if (state.system !== undefined) setSystem(state.system);
        if (state.heightUnitOther !== undefined) setHeightUnitOther(state.heightUnitOther);
        if (state.weightUnitOther !== undefined) setWeightUnitOther(state.weightUnitOther);
        if (state.circumferenceUnitOther !== undefined) setCircumferenceUnitOther(state.circumferenceUnitOther);
        
        sessionStorage.removeItem('body_fat_calculator_state');
      } catch (e) {
        console.error('Failed to restore body fat calculator state:', e);
      }
    }
  }, []);

  const handleReset = () => {
    setName('');
    setAge('');
    setGender('');
    setWeight('');
    setHeight('');
    setFeet('');
    setInches('');
    setNeck('');
    setWaist('');
    setHips('');
    setNameError('');
    setExportError('');
  };

  const handleResetWithAnimation = () => {
    setIsResetting(true);
    handleReset();
    setTimeout(() => setIsResetting(false), 700);
  };

  const handleExport = async () => {
    if (bodyFat <= 0) return;
    setIsExporting(true);
    try {
      const { generateReportPDF } = await import('../../lib/pdf');
      
      const inputData = {
        name, age, gender, weight, height, feet, inches, neck, waist, hips, system,
        heightUnitOther, weightUnitOther, circumferenceUnitOther
      };

      const resultData = {
        bodyFat, fatMass, leanMass, category
      };

      await generateReportPDF({
        profileName: name || 'Valued User',
        calculatorType: 'body_fat',
        inputData,
        resultData,
        date: new Date().toLocaleDateString()
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      setExportError('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Live calculation results
  const { bodyFat, leanMass, fatMass, category, isInvalidInput } = useMemo(() => {
    const defaultResult = { bodyFat: 0, leanMass: 0, fatMass: 0, category: '', isInvalidInput: false };

    if (!gender || !age || !weight) {
      return defaultResult;
    }

    const a = parseInt(age);
    if (isNaN(a) || a < 18 || a > 120) return { ...defaultResult, isInvalidInput: true };

    const wVal = parseFloat(weight) || 0;
    if (wVal <= 0) return defaultResult;

    // Convert dimensions
    let wKg = 0;
    if (system === 'metric') {
      wKg = wVal;
    } else if (system === 'us') {
      wKg = wVal * 0.45359237;
    } else {
      wKg = weightUnitOther === 'kg' ? wVal : wVal * 0.45359237;
    }

    let hCm = 0;
    if (system === 'metric') {
      hCm = parseFloat(height) || 0;
    } else if (system === 'us') {
      const f = parseFloat(feet) || 0;
      const i = parseFloat(inches) || 0;
      hCm = (f * 12 + i) * 2.54;
    } else {
      if (heightUnitOther === 'cm') {
        hCm = parseFloat(height) || 0;
      } else if (heightUnitOther === 'm') {
        hCm = (parseFloat(height) || 0) * 100;
      } else if (heightUnitOther === 'in') {
        hCm = (parseFloat(height) || 0) * 2.54;
      } else if (heightUnitOther === 'ft+in') {
        const f = parseFloat(feet) || 0;
        const i = parseFloat(inches) || 0;
        hCm = (f * 12 + i) * 2.54;
      }
    }

    let neckVal = parseFloat(neck) || 0;
    let waistVal = parseFloat(waist) || 0;
    let hipsVal = parseFloat(hips) || 0;

    const isCircumferenceMetric = system === 'metric' || (system === 'other' && circumferenceUnitOther === 'cm');
    if (!isCircumferenceMetric) {
      neckVal = neckVal * 2.54;
      waistVal = waistVal * 2.54;
      hipsVal = hipsVal * 2.54;
    }

    if (hCm <= 0 || neckVal <= 0 || waistVal <= 0) return defaultResult;
    if (gender === 'female' && hipsVal <= 0) return defaultResult;

    let bfp = 0;
    try {
      if (gender === 'male') {
        if (waistVal <= neckVal) return { ...defaultResult, isInvalidInput: true };
        // Metric Navy Formula for Men
        bfp = 495 / (1.0324 - 0.19077 * Math.log10(waistVal - neckVal) + 0.15456 * Math.log10(hCm)) - 450;
      } else {
        if (waistVal + hipsVal <= neckVal) return { ...defaultResult, isInvalidInput: true };
        // Metric Navy Formula for Women
        bfp = 495 / (1.29579 - 0.35004 * Math.log10(waistVal + hipsVal - neckVal) + 0.22100 * Math.log10(hCm)) - 450;
      }
    } catch (e) {
      return { ...defaultResult, isInvalidInput: true };
    }

    if (isNaN(bfp) || bfp <= 2 || bfp > 80) {
      return { ...defaultResult, isInvalidInput: true };
    }

    const calculatedFatMassKg = wKg * (bfp / 100);
    const calculatedLeanMassKg = wKg - calculatedFatMassKg;

    // Convert output masses back to standard display values based on selected unit system
    const fatMassVal = system === 'metric' ? calculatedFatMassKg : calculatedFatMassKg / 0.45359237;
    const leanMassVal = system === 'metric' ? calculatedLeanMassKg : calculatedLeanMassKg / 0.45359237;

    // ACE guidelines categories for Body Fat
    let cat = '';
    if (gender === 'male') {
      if (bfp < 6) cat = 'Essential Fat';
      else if (bfp < 14) cat = 'Athletes';
      else if (bfp < 18) cat = 'Fitness';
      else if (bfp < 25) cat = 'Acceptable';
      else cat = 'Obese';
    } else {
      if (bfp < 14) cat = 'Essential Fat';
      else if (bfp < 21) cat = 'Athletes';
      else if (bfp < 25) cat = 'Fitness';
      else if (bfp < 32) cat = 'Acceptable';
      else cat = 'Obese';
    }

    return {
      bodyFat: bfp,
      fatMass: fatMassVal,
      leanMass: leanMassVal,
      category: cat,
      isInvalidInput: false
    };
  }, [system, name, age, gender, weight, height, feet, inches, neck, waist, hips]);

  // Validation checks
  const isNameFilled = name.trim().length >= 2;
  const isAgeFilled = age.trim() !== '';
  const isGenderFilled = gender !== '';
  const isWeightFilled = weight.trim() !== '';
  const isHeightFilled = system === 'metric'
    ? height.trim() !== ''
    : system === 'us'
      ? (feet.trim() !== '' || inches.trim() !== '')
      : (['cm', 'm', 'in'].includes(heightUnitOther) ? height.trim() !== '' : (feet.trim() !== '' || inches.trim() !== ''));
  const isCircumferencesFilled = gender === 'male' 
    ? neck.trim() !== '' && waist.trim() !== '' 
    : neck.trim() !== '' && waist.trim() !== '' && hips.trim() !== '';

  const hasStarted = isNameFilled || isAgeFilled || isGenderFilled || isWeightFilled || isHeightFilled || isCircumferencesFilled;
  const hasAllRequired = isAgeFilled && isGenderFilled && isWeightFilled && isHeightFilled && isCircumferencesFilled;

  const isFresh = !hasStarted;
  const isInvalid = isInvalidInput;
  const isIncomplete = hasStarted && !hasAllRequired && !isInvalid;
  const isValid = hasAllRequired && !isInvalid;

  // Render ACE classifications chart
  const categories = gender === 'female' 
    ? [
        { label: 'Essential', range: '10–13%', color: 'bg-[#3b82f6]', bfpRange: [10, 13] },
        { label: 'Athletes', range: '14–20%', color: 'bg-[#10b981]', bfpRange: [14, 20] },
        { label: 'Fitness', range: '21–24%', color: 'bg-[#84cc16]', bfpRange: [21, 24] },
        { label: 'Acceptable', range: '25–31%', color: 'bg-[#f59e0b]', bfpRange: [25, 31] },
        { label: 'Obese', range: '32%+', color: 'bg-[#ef4444]', bfpRange: [32, 60] }
      ]
    : [
        { label: 'Essential', range: '2–5%', color: 'bg-[#3b82f6]', bfpRange: [2, 5] },
        { label: 'Athletes', range: '6–13%', color: 'bg-[#10b981]', bfpRange: [6, 13] },
        { label: 'Fitness', range: '14–17%', color: 'bg-[#84cc16]', bfpRange: [14, 17] },
        { label: 'Acceptable', range: '18–24%', color: 'bg-[#f59e0b]', bfpRange: [18, 24] },
        { label: 'Obese', range: '25%+', color: 'bg-[#ef4444]', bfpRange: [25, 60] }
      ];

  const getMarkerPosition = () => {
    if (bodyFat <= 0) return 0;
    const minVal = gender === 'female' ? 8 : 2;
    const maxVal = gender === 'female' ? 40 : 35;
    const pct = ((bodyFat - minVal) / (maxVal - minVal)) * 100;
    return Math.min(Math.max(pct, 0), 100);
  };

  const getStatusColor = () => {
    if (category === 'Obese') return 'text-red-500';
    if (category === 'Acceptable') return 'text-amber-500';
    if (category === 'Fitness') return 'text-lime-500';
    if (category === 'Athletes') return 'text-green-500';
    return 'text-blue-500';
  };

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
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Composition</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    Navy Estimator
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
                      onClick={() => { setSystem(s as UnitSystem); handleReset(); }}
                      className={`flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.08em] transition-all duration-300 rounded-full focus-ring ${system === s ? 'bg-ink text-canvas dark:bg-canvas dark:text-ink shadow-premium-sm' : 'text-mute hover:text-ink'}`}
                    >
                      {s === 'us' ? 'US' : s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Name</label>
                  <input
                    type="text"
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
                    className="w-full bg-canvas border border-hairline rounded-ui h-14 px-5 text-xl font-bold tracking-tighter text-ink focus:outline-none focus:ring-[6px] focus:ring-primary/[0.03] focus:border-ink shadow-premium-sm uppercase"
                  />
                  {nameError && <p className="text-red-500 text-[10px] font-mono font-bold">{nameError}</p>}
                </div>

                <InputGroup id="age" label="Age" value={age} onChange={setAge} unit="YRS" placeholder="25" min={18} max={120} />
                
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Gender</span>
                  <div className="flex p-1 bg-surface-2 border border-hairline rounded-full gap-1">
                    {['male', 'female'].map((g) => (
                      <button 
                        key={g} 
                        type="button"
                        onClick={() => { setGender(g as Gender); setHips(''); }}
                        className={`flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.08em] transition-all duration-300 rounded-full focus-ring ${gender === g ? 'bg-ink text-canvas dark:bg-canvas dark:text-ink shadow-premium-sm' : 'text-mute hover:text-ink'}`}
                      >
                        {g.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  {system === 'metric' ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                      <InputGroup id="height" label="Height" value={height} onChange={setHeight} unit="CM" placeholder="180" min={100} max={250} />
                      <InputGroup id="weight" label="Weight" value={weight} onChange={setWeight} unit="KG" placeholder="80" min={30} max={250} />
                    </div>
                  ) : system === 'us' ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <InputGroup id="feet" label="Height (Ft)" value={feet} onChange={setFeet} unit="FT" placeholder="5" min={3} max={8} />
                        <InputGroup id="inches" label="Height (In)" value={inches} onChange={setInches} unit="IN" placeholder="8" min={0} max={11} />
                      </div>
                      <InputGroup id="weight" label="Weight" value={weight} onChange={setWeight} unit="LB" placeholder="175" min={60} max={600} />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {heightUnitOther === 'ft+in' ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-2 sm:gap-4">
                            <InputGroup id="feet" label="Height" value={feet} onChange={setFeet} unit="FT" placeholder="5" min={3} max={8} />
                            <InputGroup id="inches" label="Inches" value={inches} onChange={setInches} unit="IN" placeholder="8" min={0} max={11} />
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
                          id="height" 
                          label="Height" 
                          value={height} 
                          onChange={setHeight} 
                          unit={heightUnitOther} 
                          unitOptions={['cm', 'm', 'ft+in', 'in']}
                          onUnitChange={(val) => { setHeightUnitOther(val as any); setHeight(''); setFeet(''); setInches(''); }}
                          placeholder={heightUnitOther === 'm' ? "1.8" : "180"} 
                          min={heightUnitOther === 'm' ? 1.0 : 100} 
                          max={heightUnitOther === 'm' ? 2.5 : 250} 
                        />
                      )}
                      <InputGroup 
                        id="weight" 
                        label="Weight" 
                        value={weight} 
                        onChange={setWeight} 
                        unit={weightUnitOther} 
                        unitOptions={['kg', 'lb']}
                        onUnitChange={(val) => { setWeightUnitOther(val as any); setWeight(''); }}
                        placeholder={weightUnitOther === 'kg' ? "80" : "175"} 
                        min={weightUnitOther === 'kg' ? 30 : 60} 
                        max={weightUnitOther === 'kg' ? 250 : 600} 
                      />
                    </div>
                  )}
                </div>

                <div className="col-span-2 border-t border-hairline pt-6 mt-2 space-y-4">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] block ml-1">Circumferences</span>
                  <div className="grid grid-cols-2 gap-3 sm:gap-6">
                    <InputGroup 
                      id="neck" 
                      label="Neck" 
                      value={neck} 
                      onChange={setNeck} 
                      unit={system === 'metric' ? 'CM' : system === 'us' ? 'IN' : circumferenceUnitOther} 
                      unitOptions={system === 'other' ? ['cm', 'in'] : undefined}
                      onUnitChange={system === 'other' ? (val) => setCircumferenceUnitOther(val as any) : undefined}
                      placeholder={system === 'metric' || (system === 'other' && circumferenceUnitOther === 'cm') ? '38' : '15'} 
                      min={10} 
                      max={80} 
                    />
                    <InputGroup 
                      id="waist" 
                      label="Waist" 
                      value={waist} 
                      onChange={setWaist} 
                      unit={system === 'metric' ? 'CM' : system === 'us' ? 'IN' : circumferenceUnitOther} 
                      unitOptions={system === 'other' ? ['cm', 'in'] : undefined}
                      onUnitChange={system === 'other' ? (val) => setCircumferenceUnitOther(val as any) : undefined}
                      placeholder={system === 'metric' || (system === 'other' && circumferenceUnitOther === 'cm') ? '88' : '34'} 
                      min={20} 
                      max={200} 
                    />
                    {gender === 'female' && (
                      <div className="col-span-2">
                        <InputGroup 
                          id="hips" 
                          label="Hips" 
                          value={hips} 
                          onChange={setHips} 
                          unit={system === 'metric' ? 'CM' : system === 'us' ? 'IN' : circumferenceUnitOther} 
                          unitOptions={system === 'other' ? ['cm', 'in'] : undefined}
                          onUnitChange={system === 'other' ? (val) => setCircumferenceUnitOther(val as any) : undefined}
                          placeholder={system === 'metric' || (system === 'other' && circumferenceUnitOther === 'cm') ? '96' : '38'} 
                          min={20} 
                          max={200} 
                        />
                      </div>
                    )}
                  </div>
                </div>
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
                    <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Fat Percentage</h2>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Navy Method Outcome</p>
                  </div>
                </div>
              </div>
              
              <ReportActions 
                onDownload={handleExport}
                isExporting={isExporting}
                hasResult={bodyFat > 0}
                isValidName={name.trim().length >= 2}
                calculatorType="body_fat"
                inputData={{
                  name, age, gender, weight, height, feet, inches, neck, waist, hips, system
                }}
                resultData={{
                  bodyFat, fatMass, leanMass, category
                }}
              />
              
              {exportError && (
                <p className="text-red-500 font-mono font-bold text-xs mt-3">{exportError}</p>
              )}
            </div>

            <div className="space-y-8 lg:space-y-10">
              {isFresh ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-mute font-mono font-bold text-[10px] uppercase tracking-widest text-center">Enter your details to calculate body fat</p>
                </div>
              ) : isInvalid ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-red-500 font-mono font-bold text-[10px] uppercase tracking-widest text-center">Unrealistic input metrics. Check waist & neck values.</p>
                </div>
              ) : isIncomplete ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-amber-500/80 font-mono font-bold text-[10px] uppercase tracking-widest text-center">Please fill all details including circumferences</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Gauge */}
                  <div id="body-fat-gauge-export" className="flex flex-col gap-8 py-8 px-6 sm:py-10 sm:px-8 bg-ink dark:bg-canvas border border-hairline/10 dark:border-hairline rounded-marketing shadow-premium-lg text-canvas dark:text-ink relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 w-full relative z-10">
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Body Fat %</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-6xl sm:text-7xl font-black tracking-[-0.03em] text-canvas dark:text-ink leading-none">
                            {bodyFat.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start sm:items-end text-left sm:text-right min-w-0">
                        <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">ACE Category</span>
                        <span className={`text-xl sm:text-2xl font-black tracking-tight break-words max-w-full ${getStatusColor()}`}>
                          {category}
                        </span>
                      </div>
                    </div>

                    <div className="relative pt-6">
                      {/* Bar */}
                      <div className="flex h-2 sm:h-2.5 w-full rounded-full overflow-hidden bg-canvas-soft/20 dark:bg-canvas-soft/10 p-0">
                        {categories.map((c, i) => (
                          <div key={i} className={`${c.color} h-full border-r border-canvas dark:border-canvas last:border-r-0 transition-all`} style={{ width: `${100 / categories.length}%` }} />
                        ))}
                      </div>

                      {/* Needle */}
                      <motion.div 
                        className="absolute top-1 bottom-0 flex flex-col items-center -ml-2 pointer-events-none"
                        initial={{ left: '0%' }}
                        animate={{ left: `${getMarkerPosition()}%` }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                      >
                        <div className="w-4 h-4 rounded-full bg-canvas border-[1.5px] border-ink dark:border-canvas shadow-premium-md" />
                      </motion.div>

                      {/* Scale */}
                      <div className="flex justify-between text-[8px] font-mono font-bold text-canvas-soft/60 dark:text-mute mt-4 uppercase tracking-wider">
                        {categories.map((c, i) => (
                          <span key={i} className="text-center w-20 overflow-hidden leading-tight">{c.label}<br/>({c.range})</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Composition Card Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-2 border border-hairline rounded-ui p-5 space-y-1">
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">Lean Body Mass</span>
                      <p className="text-xl sm:text-2xl font-mono font-bold text-ink">
                        {leanMass.toFixed(1)} {system === 'metric' ? 'kg' : 'lb'}
                      </p>
                      <p className="text-[10px] font-semibold text-mute">
                        {((leanMass / (parseFloat(weight) || 1)) * 100).toFixed(1)}% of weight
                      </p>
                    </div>

                    <div className="bg-surface-2 border border-hairline rounded-ui p-5 space-y-1">
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">Fat Body Mass</span>
                      <p className="text-xl sm:text-2xl font-mono font-bold text-ink">
                        {fatMass.toFixed(1)} {system === 'metric' ? 'kg' : 'lb'}
                      </p>
                      <p className="text-[10px] font-semibold text-mute">
                        {bodyFat.toFixed(1)}% of weight
                      </p>
                    </div>
                  </div>

                  {/* Description Info */}
                  <div className="bg-canvas border border-hairline rounded-ui p-6 space-y-3">
                    <h4 className="text-[10px] font-mono font-black text-ink uppercase tracking-widest">Composition Insights</h4>
                    <p className="text-xs text-body leading-relaxed font-medium">
                      Based on your biological sex and measurements, your body fat is estimated at <strong>{bodyFat.toFixed(1)}%</strong>, putting you in the <strong>{category}</strong> category. Lean mass represents active muscle, bone, and organs, which burn more resting energy. Preserving LBM during fitness regimes is vital for maintaining high metabolic activity.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
