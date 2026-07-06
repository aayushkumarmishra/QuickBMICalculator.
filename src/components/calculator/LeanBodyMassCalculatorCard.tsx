import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Activity } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { BrandLogo } from '../BrandLogo';
import { ReportActions } from './ReportActions';

type UnitSystem = 'metric' | 'us' | 'other';
type Gender = 'male' | 'female' | '';

export const LeanBodyMassCalculatorCard: React.FC = () => {
  const [system, setSystem] = useState<UnitSystem>('metric');
  const [heightUnitOther, setHeightUnitOther] = useState<'cm' | 'm' | 'ft+in' | 'in'>('cm');
  const [weightUnitOther, setWeightUnitOther] = useState<'kg' | 'lb'>('kg');
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<Gender>('');
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [feet, setFeet] = useState<string>('');
  const [inches, setInches] = useState<string>('');
  const [customBodyFat, setCustomBodyFat] = useState<string>(''); // Override slider/value

  const [nameError, setNameError] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);

  // Restore state on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('lean_body_mass_calculator_state');
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
        if (state.customBodyFat !== undefined) setCustomBodyFat(state.customBodyFat);
        if (state.system !== undefined) setSystem(state.system);
        if (state.heightUnitOther !== undefined) setHeightUnitOther(state.heightUnitOther);
        if (state.weightUnitOther !== undefined) setWeightUnitOther(state.weightUnitOther);
        
        sessionStorage.removeItem('lean_body_mass_calculator_state');
      } catch (e) {
        console.error('Failed to restore LBM calculator state:', e);
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
    setCustomBodyFat('');
    setNameError('');
    setExportError('');
  };

  const handleResetWithAnimation = () => {
    setIsResetting(true);
    handleReset();
    setTimeout(() => setIsResetting(false), 700);
  };

  const handleExport = async () => {
    if (leanMass <= 0) return;
    setIsExporting(true);
    try {
      const { generateReportPDF } = await import('../../lib/pdf');
      
      const inputData = {
        name, age, gender, weight, height, feet, inches, customBodyFat, system,
        heightUnitOther, weightUnitOther
      };

      const resultData = {
        leanMass, fatMass, leanMassPct, fatMassPct, boerLBM, jamesLBM, humeLBM, method
      };

      await generateReportPDF({
        profileName: name || 'Valued User',
        calculatorType: 'lean_body_mass',
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

  // Calculations
  const { leanMass, fatMass, leanMassPct, fatMassPct, boerLBM, jamesLBM, humeLBM, method, isInvalidInput } = useMemo(() => {
    const defaultResult = { leanMass: 0, fatMass: 0, leanMassPct: 0, fatMassPct: 0, boerLBM: 0, jamesLBM: 0, humeLBM: 0, method: 'Boer', isInvalidInput: false };

    if (!gender || !age || !weight) {
      return defaultResult;
    }

    const a = parseInt(age);
    if (isNaN(a) || a < 18 || a > 120) return { ...defaultResult, isInvalidInput: true };

    const wVal = parseFloat(weight) || 0;
    if (wVal <= 0) return defaultResult;

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

    if (hCm <= 0) return defaultResult;

    // Standard LBM formulas (using Weight in kg and Height in cm)
    let boerVal = 0;
    let jamesVal = 0;
    let humeVal = 0;

    if (gender === 'male') {
      boerVal = 0.407 * wKg + 0.267 * hCm - 19.2;
      jamesVal = 1.1 * wKg - 128 * Math.pow(wKg / hCm, 2);
      humeVal = 0.32810 * wKg + 0.33929 * hCm - 29.5336;
    } else {
      boerVal = 0.252 * wKg + 0.473 * hCm - 48.3;
      jamesVal = 1.07 * wKg - 148 * Math.pow(wKg / hCm, 2);
      humeVal = 0.29569 * wKg + 0.41813 * hCm - 43.2933;
    }

    // Safety floors
    boerVal = Math.max(boerVal, wKg * 0.3);
    jamesVal = Math.max(jamesVal, wKg * 0.3);
    humeVal = Math.max(humeVal, wKg * 0.3);

    let finalLeanMassKg = 0;
    let calcMethod = '';
    const bodyFatOverride = parseFloat(customBodyFat);

    if (!isNaN(bodyFatOverride) && bodyFatOverride >= 2 && bodyFatOverride <= 80) {
      // Direct body fat override calculation
      finalLeanMassKg = wKg * (1 - bodyFatOverride / 100);
      calcMethod = 'Body Fat Override';
    } else {
      // Use Boer as default
      finalLeanMassKg = boerVal;
      calcMethod = 'Boer Formula';
    }

    const calculatedFatMassKg = wKg - finalLeanMassKg;

    // Convert values back to selected display units
    const displayLeanMass = system === 'metric' ? finalLeanMassKg : finalLeanMassKg / 0.45359237;
    const displayFatMass = system === 'metric' ? calculatedFatMassKg : calculatedFatMassKg / 0.45359237;
    const boerDisplay = system === 'metric' ? boerVal : boerVal / 0.45359237;
    const jamesDisplay = system === 'metric' ? jamesVal : jamesVal / 0.45359237;
    const humeDisplay = system === 'metric' ? humeVal : humeVal / 0.45359237;

    const leanPct = (finalLeanMassKg / wKg) * 100;
    const fatPct = 100 - leanPct;

    return {
      leanMass: displayLeanMass,
      fatMass: displayFatMass,
      leanMassPct: leanPct,
      fatMassPct: fatPct,
      boerLBM: boerDisplay,
      jamesLBM: jamesDisplay,
      humeLBM: humeDisplay,
      method: calcMethod,
      isInvalidInput: false
    };
  }, [system, age, gender, weight, height, feet, inches, customBodyFat]);

  const isNameFilled = name.trim().length >= 2;
  const isAgeFilled = age.trim() !== '';
  const isGenderFilled = gender !== '';
  const isWeightFilled = weight.trim() !== '';
  const isHeightFilled = system === 'metric'
    ? height.trim() !== ''
    : system === 'us'
      ? (feet.trim() !== '' || inches.trim() !== '')
      : (['cm', 'm', 'in'].includes(heightUnitOther) ? height.trim() !== '' : (feet.trim() !== '' || inches.trim() !== ''));

  const hasStarted = isNameFilled || isAgeFilled || isGenderFilled || isWeightFilled || isHeightFilled;
  const hasAllRequired = isAgeFilled && isGenderFilled && isWeightFilled && isHeightFilled;

  const isFresh = !hasStarted;
  const isInvalid = isInvalidInput;
  const isIncomplete = hasStarted && !hasAllRequired && !isInvalid;
  const isValid = hasAllRequired && !isInvalid;

  return (
    <motion.div 
      className="card max-w-6xl mx-auto overflow-hidden relative p-0 shadow-premium-xl border-hairline/50 dark:bg-canvas"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 items-start min-h-fit">
        
        {/* LEFT: Inputs */}
        <div className="lg:col-span-5 p-6 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-hairline bg-canvas relative z-20 h-full overflow-y-auto">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex items-center justify-between border-b border-hairline pb-8">
              <div className="flex items-center gap-4">
                <BrandLogo className="w-12 h-12" variant="ink" />
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Lean Mass</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    LBM Analyser
                  </div>
                </div>
              </div>
              <button onClick={handleResetWithAnimation} className="p-3 bg-canvas-soft border border-hairline hover:bg-surface rounded-xl transition-all text-mute hover:text-ink shadow-premium-sm active:scale-95">
                <RotateCcw className={`w-5 h-5 ${isResetting ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-6 lg:space-y-8">
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Standard</span>
                <div className="flex p-1 bg-canvas-soft border border-hairline rounded-ui gap-1">
                  {['us', 'metric', 'other'].map((s) => (
                    <button 
                      key={s} 
                      onClick={() => { setSystem(s as UnitSystem); handleReset(); }}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 rounded-[4px] ${system === s ? 'bg-canvas text-ink shadow-premium-sm ring-1 ring-hairline' : 'text-mute hover:text-ink hover:bg-canvas/50'}`}
                    >
                      {s === 'us' ? 'US Units' : s.charAt(0).toUpperCase() + s.slice(1)}
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
                  <div className="flex p-1 bg-canvas-soft border border-hairline rounded-ui h-14 gap-1">
                    {['male', 'female'].map((g) => (
                      <button 
                        key={g} 
                        onClick={() => setGender(g as Gender)}
                        className={`flex-1 rounded-[4px] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${gender === g ? 'bg-ink text-canvas shadow-premium-md' : 'text-mute hover:text-ink hover:bg-canvas/50'}`}
                      >
                        {g}
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
                            <InputGroup id="inches" label="Height (In)" value={inches} onChange={setInches} unit="IN" placeholder="8" min={0} max={11} />
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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] block ml-1">Body Fat (Optional)</span>
                    {customBodyFat && (
                      <span className="text-xs font-black text-ink">{customBodyFat}%</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="2"
                      max="80"
                      step="0.5"
                      value={customBodyFat || '22'}
                      onChange={(e) => setCustomBodyFat(e.target.value)}
                      className="w-full accent-ink cursor-pointer bg-canvas-soft border border-hairline rounded-ui"
                    />
                    <div className="flex justify-between text-[8px] font-mono font-bold text-mute uppercase tracking-widest px-1">
                      <span>Formula Mode (Slide to override)</span>
                      {customBodyFat && (
                        <button onClick={() => setCustomBodyFat('')} className="text-red-500 font-bold hover:underline">
                          Clear Override
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="lg:col-span-7 bg-canvas-soft/40 p-6 sm:p-10 lg:p-12 relative border-t lg:border-t-0 border-hairline h-full overflow-y-auto">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex flex-col border-b border-hairline/50 pb-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shadow-premium-sm">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Composition</h2>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">LBM Estimates Summary</p>
                  </div>
                </div>
              </div>
              
              <ReportActions 
                onDownload={handleExport}
                isExporting={isExporting}
                hasResult={leanMass > 0}
                isValidName={name.trim().length >= 2}
                calculatorType="lean_body_mass"
                inputData={{
                  name, age, gender, weight, height, feet, inches, customBodyFat, system
                }}
                resultData={{
                  leanMass, fatMass, leanMassPct, fatMassPct, boerLBM, jamesLBM, humeLBM, method
                }}
              />
              
              {exportError && (
                <p className="text-red-500 font-mono font-bold text-xs mt-3">{exportError}</p>
              )}
            </div>

            <div className="space-y-8 lg:space-y-10">
              {isFresh ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-mute font-mono font-bold text-[10px] uppercase tracking-widest text-center">Enter details to calculate lean body mass</p>
                </div>
              ) : isInvalid ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-red-500 font-mono font-bold text-[10px] uppercase tracking-widest text-center">Invalid height or weight parameters.</p>
                </div>
              ) : isIncomplete ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-amber-500/80 font-mono font-bold text-[10px] uppercase tracking-widest text-center">Please enter height, weight, age & gender</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Results metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-canvas border border-hairline rounded-marketing p-6 space-y-2 relative overflow-hidden shadow-premium-sm col-span-2 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest mb-1 block">Active Lean Mass</span>
                        <p className="text-5xl font-black text-ink">{leanMass.toFixed(1)} <span className="text-lg font-bold text-mute">{system === 'metric' ? 'kg' : 'lb'}</span></p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest mb-1 block">Calculation Method</span>
                        <span className="inline-flex px-3 py-1 bg-ink text-canvas text-[10px] font-black uppercase tracking-wider rounded-full">
                          {method}
                        </span>
                      </div>
                    </div>

                    <div className="bg-canvas border border-hairline rounded-ui p-5 space-y-1">
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">Lean Ratio</span>
                      <p className="text-2xl font-black text-ink">{leanMassPct.toFixed(1)}%</p>
                      <div className="h-1.5 w-full bg-hairline rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-lime-500 rounded-full" style={{ width: `${leanMassPct}%` }} />
                      </div>
                    </div>

                    <div className="bg-canvas border border-hairline rounded-ui p-5 space-y-1">
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">Fat Mass</span>
                      <p className="text-2xl font-black text-ink">{fatMass.toFixed(1)} {system === 'metric' ? 'kg' : 'lb'}</p>
                      <p className="text-[10px] font-semibold text-mute">{fatMassPct.toFixed(1)}% of total weight</p>
                    </div>
                  </div>

                  {/* Comparisons card */}
                  <div className="bg-canvas border border-hairline rounded-[1.5rem] p-6 space-y-4 shadow-premium-sm">
                    <h4 className="text-[10px] font-mono font-black text-ink uppercase tracking-widest">Formula Side-by-Side Comparison</h4>
                    <div className="space-y-4">
                      {[
                        { label: 'Boer (1984)', value: boerLBM, desc: 'Optimized for normal & overweight composition' },
                        { label: 'James (1976)', value: jamesLBM, desc: 'Widely used in clinical diagnostics' },
                        { label: 'Hume (1966)', value: humeLBM, desc: 'Classical pharmacological standard estimation' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-hairline last:border-b-0 pb-3 last:pb-0">
                          <div>
                            <span className="text-xs font-black text-ink block">{item.label}</span>
                            <span className="text-[9px] text-mute font-medium">{item.desc}</span>
                          </div>
                          <span className="text-sm font-mono font-black text-ink">{item.value.toFixed(1)} {system === 'metric' ? 'kg' : 'lb'}</span>
                        </div>
                      ))}
                    </div>
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
