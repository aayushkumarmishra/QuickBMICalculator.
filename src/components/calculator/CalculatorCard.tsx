import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Download, Check, Activity, ChevronDown, Lock, Save } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { ResultGauge } from './ResultGauge';
import { InsightsPanel } from './InsightsPanel';
import { BrandLogo } from '../BrandLogo';
import { ReportActions } from './ReportActions';
import { Select } from './Select';

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

  // Persistent State Logic
  useEffect(() => {
    const saved = sessionStorage.getItem('bmi_calculator_state');
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
        if (state.goal !== undefined) setGoal(state.goal);
        if (state.activity !== undefined) setActivity(state.activity);
        
        // Clear state after restoration to prevent stale persistence
        sessionStorage.removeItem('bmi_calculator_state');
      } catch (e) {
        console.error('Failed to restore BMI state:', e);
      }
    }
  }, []);

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

  const { bmi, category, idealWeightRange, ponderalIndex, bmr, tdee, isInvalidInput } = useMemo(() => {
    const defaultResult = { bmi: 0, category: '', idealWeightRange: { min: 0, max: 0 }, ponderalIndex: 0, bmr: 0, tdee: 0, isInvalidInput: false };

    if (age.trim() !== '') {
      const a = parseInt(age);
      if (isNaN(a) || a < 18 || a > 120) return { ...defaultResult, isInvalidInput: true };
    }

    let w = parseFloat(weight) || 0; 
    let h = 0;

    if (system === 'metric') {
      h = parseFloat(height) || 0;
      if (weight.trim() !== '' && (w < 17 || w > 635)) return { ...defaultResult, isInvalidInput: true };
      if (height.trim() !== '' && (h < 54 || h > 272)) return { ...defaultResult, isInvalidInput: true };
    } else if (system === 'us') {
      const f = parseFloat(feet) || 0;
      const i = parseFloat(inches) || 0;
      h = f * 12 + i;
      if (weight.trim() !== '' && (w < 37 || w > 1400)) return { ...defaultResult, isInvalidInput: true };
      if ((feet.trim() !== '' || inches.trim() !== '') && (h < 21 || h > 107)) return { ...defaultResult, isInvalidInput: true };
    } else {
      const wVal = parseFloat(weight) || 0;
      if (weight.trim() !== '') {
        if (weightUnitOther === 'kg' && (wVal < 17 || wVal > 635)) return { ...defaultResult, isInvalidInput: true };
        if (weightUnitOther === 'lb' && (wVal < 37 || wVal > 1400)) return { ...defaultResult, isInvalidInput: true };
      }
      
      let hM = 0;
      if (heightUnitOther === 'cm') {
        const hVal = parseFloat(height) || 0;
        if (height.trim() !== '' && (hVal < 54 || hVal > 272)) return { ...defaultResult, isInvalidInput: true };
        hM = hVal / 100;
      } else if (heightUnitOther === 'm') {
        const hVal = parseFloat(height) || 0;
        if (height.trim() !== '' && (hVal < 0.54 || hVal > 2.72)) return { ...defaultResult, isInvalidInput: true };
        hM = hVal;
      } else if (heightUnitOther === 'in') {
        const hVal = parseFloat(height) || 0;
        if (height.trim() !== '' && (hVal < 21 || hVal > 107)) return { ...defaultResult, isInvalidInput: true };
        hM = hVal * IN_TO_CM / 100;
      } else if (heightUnitOther === 'ft+in') {
        const f = parseFloat(feet) || 0;
        const i = parseFloat(inches) || 0;
        const hTotalIn = f * 12 + i;
        if ((feet.trim() !== '' || inches.trim() !== '') && (hTotalIn < 21 || hTotalIn > 107)) return { ...defaultResult, isInvalidInput: true };
        hM = hTotalIn * IN_TO_CM / 100;
      }
      h = hM; // 'other' mode base
    }

    if (!weight || (!height && !feet && !inches) || !age) {
      return { ...defaultResult, isInvalidInput: false };
    }
    
    const a = parseInt(age);
    const hasFullInputs = !!gender && !!activity;

    let bmiValue = 0; let piValue = 0; let bmrValue = 0; let tdeeValue = 0;

    if (system === 'metric') {
      const hM = h / 100;
      bmiValue = w / Math.pow(hM, 2);
      piValue = w / Math.pow(hM, 3);
      if (hasFullInputs) {
        bmrValue = gender === 'male' 
          ? 10 * w + 6.25 * h - 5 * a + 5 
          : 10 * w + 6.25 * h - 5 * a - 161;
        tdeeValue = bmrValue * parseFloat(activity);
      }

    } else if (system === 'us') {
      bmiValue = (w * BMI_IMPERIAL_CONSTANT) / Math.pow(h, 2);
      const wKg = w * LBS_TO_KG; 
      const hCm = h * IN_TO_CM; 
      const hM = hCm / 100;
      piValue = wKg / Math.pow(hM, 3);
      if (hasFullInputs) {
        bmrValue = gender === 'male' 
          ? 10 * wKg + 6.25 * hCm - 5 * a + 5 
          : 10 * wKg + 6.25 * hCm - 5 * a - 161;
        tdeeValue = bmrValue * parseFloat(activity);
      }

    } else {
        let wKg = weightUnitOther === 'kg' ? w : w * LBS_TO_KG;
        const hM = h;
        bmiValue = wKg / Math.pow(hM, 2);
        piValue = wKg / Math.pow(hM, 3);
        const hCm = hM * 100;
        if (hasFullInputs) {
          bmrValue = gender === 'male' 
            ? 10 * wKg + 6.25 * hCm - 5 * a + 5 
            : 10 * wKg + 6.25 * hCm - 5 * a - 161;
          tdeeValue = bmrValue * parseFloat(activity);
        }
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

    return { bmi: bmiValue, category: cat, idealWeightRange: { min: minW, max: maxW }, ponderalIndex: piValue, bmr: bmrValue, tdee: tdeeValue, isInvalidInput: false };
  }, [system, weight, height, feet, inches, age, gender, activity, heightUnitOther, weightUnitOther, goal]);

  const isWeightFilled = weight.trim() !== '';
  const isHeightFilled = system === 'metric' ? height.trim() !== '' : system === 'us' ? (feet.trim() !== '' || inches.trim() !== '') : (['cm', 'm', 'in'].includes(heightUnitOther) ? height.trim() !== '' : (feet.trim() !== '' || inches.trim() !== ''));
  const isAgeFilled = age.trim() !== '';
  const isGenderFilled = gender !== '';
  const isActivityFilled = activity !== '';

  const hasStarted = isWeightFilled || isHeightFilled || isAgeFilled || isGenderFilled || isActivityFilled;
  const hasAllRequired = isWeightFilled && isHeightFilled && isAgeFilled && isGenderFilled && isActivityFilled;

  const isFresh = !hasStarted;
  const isInvalid = isInvalidInput;
  const isIncomplete = hasStarted && !hasAllRequired && !isInvalid;
  const isValid = hasAllRequired && !isInvalid;

  const isFaded = !isValid;

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
    try {
      const { generateReportPDF } = await import('../../lib/pdf');
      
      const inputData = {
        age, gender, height, weight, feet, inches, activity, goal, system, heightUnitOther, weightUnitOther
      };

      const resultData = {
        bmi, category, idealWeightRange, ponderalIndex, bmr, tdee
      };

      await generateReportPDF({
        profileName: name || 'Valued User',
        calculatorType: 'bmi',
        inputData,
        resultData,
        date: new Date().toLocaleDateString()
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      className="max-w-6xl mx-auto overflow-hidden relative p-0 border border-hairline rounded-marketing shadow-premium-xl dark:bg-canvas"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] items-stretch min-h-fit">
        
        {/* LEFT: Command Panel (Inputs) */}
        <div className="p-6 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-hairline bg-canvas relative z-20 h-full overflow-y-auto">
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
              <div className="space-y-3">
                <span className="text-xs font-mono text-mute uppercase tracking-[0.12em] ml-1">Standard</span>
                <div className="flex p-1 bg-surface-2 border border-hairline rounded-full gap-1">
                  {['us', 'metric', 'other'].map((s) => (
                    <button 
                      key={s} 
                      type="button"
                      onClick={() => { setSystem(s as UnitSystem); setWeight(''); }}
                      className={`flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.08em] transition-all duration-300 rounded-full focus-ring ${system === s ? 'bg-ink text-canvas dark:bg-canvas dark:text-ink shadow-premium-sm' : 'text-mute hover:text-ink'}`}
                    >
                      {s === 'us' ? 'US UNITS' : s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
                <div className="flex flex-col gap-2.5 col-span-2">
                  <label className="text-xs font-mono text-mute uppercase tracking-[0.12em] ml-1">Name</label>
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
                      className="w-full bg-canvas border-[1.5px] border-hairline rounded-ui h-14 px-5 text-xl font-bold tracking-tighter text-ink dark:text-[#f5f5f5] transition-all duration-300 placeholder:text-mute/20 dark:placeholder:text-mute/40 focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-wash shadow-premium-sm hover:border-hairline-strong focus:bg-canvas uppercase"
                    />
                  </div>
                  {nameError && <p className="text-red-500 text-[10px] font-mono font-bold">{nameError}</p>}
                </div>

                <InputGroup id="age" label="Age" value={age} onChange={setAge} unit="YRS" placeholder="25" min={18} max={120} step="1" />
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-mono text-mute uppercase tracking-[0.12em] ml-1">Gender</span>
                  <div className="flex p-1 bg-surface-2 border border-hairline rounded-full h-14 gap-1">
                    {['male', 'female'].map((g) => (
                      <button 
                        key={g} 
                        type="button"
                        onClick={() => setGender(g as 'male' | 'female')}
                        className={`flex-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-[0.08em] transition-all duration-300 focus-ring ${gender === g ? 'bg-ink text-canvas dark:bg-canvas dark:text-ink shadow-premium-sm' : 'text-mute hover:text-ink'}`}
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

              <div className="space-y-6 lg:space-y-8 pt-6 border-t border-hairline/50">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-mute uppercase tracking-[0.12em] ml-1">Body Goal</span>
                  <div className="flex p-1 bg-surface-2 border border-hairline rounded-full gap-1">
                    {['loss', 'maintenance', 'gain'].map((g) => (
                      <button 
                        key={g} 
                        type="button"
                        onClick={() => setGoal(g as Goal)}
                        className={`flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.08em] transition-all duration-300 rounded-full focus-ring ${goal === g ? 'bg-ink text-canvas dark:bg-canvas dark:text-ink shadow-premium-sm' : 'text-mute hover:text-ink'}`}
                      >
                        {g.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-mono text-mute uppercase tracking-[0.12em] ml-1">Physical Activity</span>
                  <Select 
                    value={activity}
                    onChange={setActivity}
                    options={ACTIVITY_LEVELS.map(level => ({
                      value: level.value,
                      label: level.label,
                      desc: level.desc
                    }))}
                    label="Physical Activity"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Intelligence Panel (Results) */}
        <div className="bg-canvas-soft/40 p-6 sm:p-10 lg:p-12 relative h-full overflow-y-auto">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex flex-col border-b border-hairline/50 pb-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shadow-premium-sm">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Your Results</h2>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Real-time Feedback</p>
                  </div>
                </div>
              </div>
              
              <ReportActions 
                onDownload={handleExport}
                isExporting={isExporting}
                hasResult={bmi > 0 && bmi >= 5 && bmi <= 120}
                isValidName={name.trim().length >= 2}
                calculatorType="bmi"
                inputData={{
                  name, age, gender, weight, height, feet, inches,
                  system, heightUnitOther, weightUnitOther, goal, activity
                }}
                resultData={{
                  bmi, category, idealWeightRange, ponderalIndex, bmr, tdee
                }}
              />
              
              {exportError && (
                <p className="text-red-500 font-mono font-bold text-xs mt-3">
                  {exportError}
                </p>
              )}
            </div>

            <div className="space-y-8 lg:space-y-10">
              {isHeightTooLowFtIn ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-red-500 font-mono font-bold text-sm text-center">
                    Height too low - minimum is 1 ft 9 in (world record)
                  </p>
                </div>
              ) : bmi > 0 && (bmi < 5 || bmi > 120) ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-red-500 font-mono font-bold text-sm text-center">
                    Please check your inputs - values seem unrealistic
                  </p>
                </div>
              ) : isFresh ? (
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
                <ResultGauge bmi={bmi} />
              )}
              
              {!isFaded && bmi >= 5 && bmi <= 120 && (
                <InsightsPanel 
                  bmi={bmi} category={category} idealWeightRange={idealWeightRange} 
                  unit={system === 'other' ? weightUnitOther : (system === 'metric' ? 'kg' : 'lb')}
                  age={age} gender={gender} ponderalIndex={ponderalIndex}
                  bmr={bmr} tdee={tdee} goal={goal} activity={activity}
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
