import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Download, Check, Activity, ChevronDown, Target, Info, AlertCircle, Lock, Save } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { BrandLogo } from '../BrandLogo';
import { ReportActions } from './ReportActions';

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

const GOAL_DATA = {
  loss: {
    recommendations: [
      'Aim for a 500 kcal daily deficit',
      'Prioritize protein (1.8g - 2.2g/kg)',
      'Focus on high-volume, low-calorie foods',
      'Mix strength training with cardio'
    ],
    activity: { walking: '45-60 min/day', steps: '10,000-12,000', progress: 95 }
  },
  maintenance: {
    recommendations: [
      'Eat at your TDEE calorie level',
      'Maintain protein intake (1.6g/kg)',
      'Balance your strength and cardio work',
      'Monitor weight weekly for stability'
    ],
    activity: { walking: '30-45 min/day', steps: '8,000-10,000', progress: 75 }
  },
  gain: {
    recommendations: [
      'Surplus of 250-500 kcal daily',
      'Focus on progressive weight lifting',
      'High carbohydrate intake for fuel',
      'Limit intense cardio sessions'
    ],
    activity: { walking: '15-25 min/day', steps: '5,000-7,000', progress: 45 }
  },
  default: {
    recommendations: [
      'Maintain protein intake (1.6g/kg)',
      'Track calories daily for goals',
      'Stay consistent with activity',
      'Monitor metabolism monthly'
    ],
    activity: { walking: '30-45 min/day', steps: '8,000-10,000', progress: 85 }
  }
};

const LBS_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;

export const BMRCalculatorCardV2: React.FC = () => {
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
    const saved = sessionStorage.getItem('bmr_calculator_state');
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
        if (state.activity !== undefined) setActivity(state.activity);
        if (state.goal !== undefined) setGoal(state.goal);
        if (state.heightUnitOther !== undefined) setHeightUnitOther(state.heightUnitOther);
        if (state.weightUnitOther !== undefined) setWeightUnitOther(state.weightUnitOther);

        // Clear state after restoration to prevent stale persistence
        sessionStorage.removeItem('bmr_calculator_state');
      } catch (e) {
        console.error('Failed to restore BMR state:', e);
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
    setGoal(''); setActivity(''); setName(''); setNameError('');
  };

  const { bmr, tdee, waterIntake, caloriesByGoal, bmrLevel, recommendations, suggestedActivity, isInvalidInput } = useMemo(() => {
    const defaultResult = { 
      bmr: 0, 
      tdee: 0, 
      waterIntake: 0, 
      caloriesByGoal: { loss: 0, maintenance: 0, gain: 0 },
      bmrLevel: 'Normal',
      recommendations: GOAL_DATA.default.recommendations,
      suggestedActivity: GOAL_DATA.default.activity,
      isInvalidInput: false
    };

    if (age.trim() !== '') {
      const a = parseInt(age);
      if (isNaN(a) || a < 18 || a > 120) return { ...defaultResult, isInvalidInput: true };
    }

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

    if (!weight || (!height && !feet && !inches) || !age || !gender || !activity) {
       return { ...defaultResult, isInvalidInput: false };
    }

    const a = parseInt(age);
    let wKg = system === 'metric' ? wVal : system === 'us' ? wVal * LBS_TO_KG : (weightUnitOther === 'kg' ? wVal : wVal * LBS_TO_KG);

    if (wKg <= 0 || hCm <= 0) return defaultResult;

    // Mifflin-St Jeor Equation
    const bmrValue = gender === 'male' 
      ? 10 * wKg + 6.25 * hCm - 5 * a + 5 
      : 10 * wKg + 6.25 * hCm - 5 * a - 161;

    const actMultiplier = parseFloat(activity) || 1.2;
    const tdeeValue = bmrValue * actMultiplier;

    const water = (wKg * 35) / 1000;

    const cals = {
      loss: tdeeValue - 500,
      maintenance: tdeeValue,
      gain: tdeeValue + 500
    };

    let level = 'Normal';
    if (bmrValue < 1500) level = 'Low';
    else if (bmrValue > 3125) level = 'High';
    else if (bmrValue > 2500) level = 'Active';

    const goalInfo = goal ? GOAL_DATA[goal as keyof typeof GOAL_DATA] : GOAL_DATA.default;

    return { 
      bmr: bmrValue, 
      tdee: tdeeValue, 
      waterIntake: water, 
      caloriesByGoal: cals,
      bmrLevel: level,
      recommendations: goalInfo.recommendations,
      suggestedActivity: goalInfo.activity,
      isInvalidInput: false
    };
  }, [system, weight, height, feet, inches, age, gender, activity, goal, heightUnitOther, weightUnitOther]);

  const handleExport = async () => {
    if (bmr <= 0) return;
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setNameError('Min 2 characters required for export');
      return;
    }

    setIsExporting(true);
    try {
      const { generateReportPDF } = await import('../../lib/pdf');
      
      const inputData = {
        age, gender, height, weight, feet, inches, activity, goal, system, heightUnitOther, weightUnitOther
      };

      const resultData = {
        bmr, tdee, caloriesByGoal, waterIntake, suggestedActivity, recommendations
      };

      await generateReportPDF({
        profileName: trimmedName,
        calculatorType: 'bmr',
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
  const statusColor = bmrLevel === 'Low' ? 'text-status-under' : bmrLevel === 'Normal' ? 'text-status-healthy' : bmrLevel === 'Active' ? 'text-status-over' : 'text-status-obese';

  const numericAge = parseInt(age || '0');
  const isPediatric = numericAge >= 18 && numericAge < 20;

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
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">BMR Engine</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    Mifflin-St Jeor Formula
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
                  <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="bmr-name"
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

                <InputGroup id="bmr-age" label="Age" value={age} onChange={setAge} unit="YRS" placeholder="25" min={18} max={120} step="1" />
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
                          {level.label.toUpperCase()} - {level.desc}
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
                hasResult={bmr > 0}
                isValidName={name.trim().length >= 2}
                calculatorType="bmr"
                inputData={{
                  name, age, gender, weight, height, feet, inches, 
                  system, activity, goal, heightUnitOther, weightUnitOther
                }}
                resultData={{
                  bmr, tdee, waterIntake, caloriesByGoal, bmrLevel,
                  recommendations, suggestedActivity
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
              {/* BMR GAUGE */}
              <div id="bmr-gauge-export" className="flex flex-col gap-8 py-8 px-6 sm:py-10 sm:px-8 bg-canvas border border-hairline rounded-marketing shadow-premium-lg relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-64 h-64 opacity-5 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors duration-1000 ${!isFaded ? statusColor.replace('text-', 'bg-') : 'bg-mute'}`}></div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8 relative z-10">
                  <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-mute uppercase tracking-[0.3em] mb-2">Metabolic Rate</span>
                    <div className="flex items-baseline gap-2 sm:gap-3">
                      <motion.span 
                        className="text-5xl xs:text-6xl sm:text-8xl font-black tracking-[-0.08em] text-ink"
                        initial={false}
                        animate={{ scale: bmr > 0 ? [1, 1.02, 1] : 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        {bmr > 0 ? Math.round(bmr).toLocaleString() : '--'}
                      </motion.span>
                      <span className="text-lg sm:text-xl font-bold text-mute/60 tracking-tighter">kcal</span>
                    </div>
                  </div>

                  <div className="h-16 w-px bg-hairline hidden sm:block"></div>

                  <div className="text-center sm:text-right">
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-mute uppercase tracking-[0.3em] mb-2 sm:mb-3 block">BMR Status</span>
                    <div className={`text-xl xs:text-2xl sm:text-3xl font-black tracking-tight ${statusColor}`}>
                      {isFaded ? 'Awaiting Data' : bmrLevel}
                    </div>
                    {bmr > 0 && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-canvas border border-hairline shadow-premium-sm">
                         <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${statusColor.replace('text-', 'bg-')} animate-pulse`}></div>
                         <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase text-ink">Live Calculation</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative pt-8 pb-4">
                  <div className="flex h-3 sm:h-4 w-full rounded-full overflow-hidden bg-hairline p-1">
                    <div className="bg-status-under h-full border-r-2 border-canvas rounded-sm opacity-80" style={{ width: '20%' }}></div>
                    <div className="bg-status-healthy h-full border-r-2 border-canvas rounded-sm opacity-80" style={{ width: '40%' }}></div>
                    <div className="bg-status-over h-full border-r-2 border-canvas rounded-sm opacity-80" style={{ width: '25%' }}></div>
                    <div className="bg-status-obese h-full rounded-sm opacity-80" style={{ width: '15%' }}></div>
                  </div>
                  {!isFaded && (() => {
                    const minBMR = 1000; const maxBMR = 3500;
                    const pct = Math.min(Math.max(((bmr - minBMR) / (maxBMR - minBMR)) * 100, 0), 100);
                    return (
                      <motion.div 
                        className="absolute top-0 bottom-0 flex flex-col items-center -ml-px pointer-events-none z-20"
                        initial={{ left: '0%' }}
                        animate={{ left: `${pct}%` }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                      >
                        <div className="h-[calc(100%-8px)] flex flex-col items-center">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-canvas border-2 border-ink shadow-premium-md flex items-center justify-center mb-1">
                            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${statusColor.replace('text-', 'bg-')} animate-pulse`}></div>
                          </div>
                          <div className="w-1 h-full bg-ink/20" />
                        </div>
                      </motion.div>
                    );
                  })()}
                  <div className="grid grid-cols-4 mt-6 gap-1 sm:gap-2">
                    {[
                      { label: 'Low', range: '< 1500' },
                      { label: 'Normal', range: '1500 - 2500' },
                      { label: 'Active', range: '2500 - 3125' },
                      { label: 'High', range: '> 3125' }
                    ].map((zone, i) => (
                      <div key={i} className="flex flex-col items-center sm:items-start text-center sm:text-left overflow-hidden">
                        <span className="text-[7px] sm:text-[9px] font-mono font-bold text-ink uppercase tracking-widest mb-1 leading-tight">{zone.label}</span>
                        <span className="text-[6px] sm:text-[8px] font-mono font-bold text-body leading-tight">{zone.range}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* BMR INSIGHTS */}
              <div className="space-y-6 lg:space-y-8 transition-all duration-700">
                <AnimatePresence>
                  {isPediatric && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="card glass border-status-over/20 bg-status-over/5 p-4 sm:p-5 flex gap-4 items-center mb-2">
                        <AlertCircle className="w-5 h-5 text-status-over shrink-0" />
                        <div className="text-[11px] sm:text-xs font-medium text-ink/80 leading-relaxed">
                          <span className="font-bold block mb-0.5 text-ink">BMR for adolescents (under 20) may vary.</span>
                          Metabolic rates during growth phases are higher. This calculator uses the adult Mifflin-St Jeor formula for estimation.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
                  <div className="card glass border-hairline p-6 sm:p-8 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] group hover:border-hairline-strong transition-all">
                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-ink text-canvas flex items-center justify-center shadow-premium-md group-hover:scale-110 transition-transform">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] bg-canvas-soft px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-hairline">Status</div>
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-1 sm:mb-2 text-ink truncate">{isFaded ? 'Awaiting Data' : bmrLevel + ' Metabolism'}</h3>
                      <p className="text-body text-[10px] sm:text-xs leading-relaxed line-clamp-2 font-medium">
                        {isFaded ? 'Enter your details to see your personalized metabolic report.' : `Your Basal Metabolic Rate of ${Math.round(bmr).toLocaleString()} kcal is the energy required for basic rest.`}
                      </p>
                    </div>
                  </div>

                  <div className="card glass border-hairline p-6 sm:p-8 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] group hover:border-hairline-strong transition-all">
                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/5 text-status-healthy flex items-center justify-center border border-status-healthy/20 group-hover:scale-110 transition-transform">
                        <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] bg-canvas-soft px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-hairline">TDEE</div>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1">
                        <span className="text-xl sm:text-2xl font-black tracking-tight text-ink">
                          {isFaded ? '--' : Math.round(tdee).toLocaleString()}
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold text-mute uppercase font-mono tracking-widest">{isFaded ? '' : 'kcal/day'}</span>
                      </div>
                      <p className="text-body text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60">Total Daily Energy Expenditure</p>
                    </div>
                  </div>
                </div>

                {!isFaded && (
                  <div className="card glass border border-status-healthy/30 p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4 sm:mb-5">
                      <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.4em]">
                        Recommendations
                      </div>
                      <span className="text-xs font-black text-status-healthy">v</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {recommendations.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[10px] font-black mt-0.5 shrink-0 text-status-healthy">-</span>
                          <p className="text-[11px] sm:text-xs font-medium text-ink/80 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isFaded && (
                  <div className="card glass border-hairline p-6 sm:p-8">
                    <div className="text-[9px] sm:text-[10px] font-mono font-bold text-mute uppercase tracking-[0.4em] mb-4 sm:mb-5">
                      Suggested Activity
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-5">
                      <div>
                        <div className="text-[8px] sm:text-[9px] font-mono font-bold text-mute uppercase tracking-widest mb-1">Walking</div>
                        <div className="text-base sm:text-lg font-black tracking-tight text-ink">{suggestedActivity.walking}</div>
                      </div>
                      <div>
                        <div className="text-[8px] sm:text-[9px] font-mono font-bold text-mute uppercase tracking-widest mb-1">Steps / Day</div>
                        <div className="text-base sm:text-lg font-black tracking-tight text-ink">{suggestedActivity.steps}</div>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-hairline rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-status-healthy rounded-full transition-all duration-1000" 
                        style={{ width: `${suggestedActivity.progress}%` }} 
                      />
                    </div>
                  </div>
                )}

                {!isFaded && (
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
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[8px] font-mono text-mute">0L</span>
                      <span className="text-[8px] font-mono text-mute">4L max</span>
                    </div>
                  </div>
                )}

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card bg-[#1a1a1a] text-white p-6 sm:p-8 relative overflow-hidden shadow-premium-xl border border-white/10 dark:border-white/10"
                >
                  <div className="relative z-10 flex flex-col gap-5 sm:gap-6">
                    <div className="text-left">
                      <div className="text-[9px] sm:text-[10px] font-mono font-bold text-white/60 uppercase tracking-[0.4em] mb-4">Daily Calorie Goals</div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 -mx-2">
                        <div className={`flex flex-col gap-1 p-2 rounded-ui transition-all duration-300 ${goal === 'maintenance' ? 'bg-white/10 ring-1 ring-white/20' : 'opacity-60'}`}>
                          <div className="text-[8px] sm:text-[9px] font-mono font-bold text-white/50 uppercase tracking-widest">Maintain</div>
                          <div className="text-lg sm:text-2xl font-black tracking-tight text-white">{isFaded ? '--' : Math.round(caloriesByGoal.maintenance).toLocaleString()}</div>
                          <div className="text-[8px] font-mono text-white/40 uppercase tracking-widest">kcal</div>
                        </div>
                        <div className={`flex flex-col gap-1 p-2 rounded-ui transition-all duration-300 ${goal === 'loss' ? 'bg-white/10 ring-1 ring-white/20' : 'opacity-60'}`}>
                          <div className="text-[8px] sm:text-[9px] font-mono font-bold text-white/50 uppercase tracking-widest">Fat Loss</div>
                          <div className="text-lg sm:text-2xl font-black tracking-tight text-red-400">{isFaded ? '--' : Math.round(caloriesByGoal.loss).toLocaleString()}</div>
                          <div className="text-[8px] font-mono text-white/40 uppercase tracking-widest">kcal</div>
                        </div>
                        <div className={`flex flex-col gap-1 p-2 rounded-ui transition-all duration-300 ${goal === 'gain' ? 'bg-white/10 ring-1 ring-white/20' : 'opacity-60'}`}>
                          <div className="text-[8px] sm:text-[9px] font-mono font-bold text-white/50 uppercase tracking-widest">Weight Gain</div>
                          <div className="text-lg sm:text-2xl font-black tracking-tight text-green-400">{isFaded ? '--' : Math.round(caloriesByGoal.gain).toLocaleString()}</div>
                          <div className="text-[8px] font-mono text-white/40 uppercase tracking-widest">kcal</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center sm:justify-start gap-6 sm:gap-8 pt-5 sm:pt-6 border-t border-white/20">
                      <div>
                        <div className="text-[8px] sm:text-[9px] font-mono font-bold text-white/50 uppercase tracking-widest mb-0.5 sm:mb-1">Metabolism</div>
                        <div className="text-base sm:text-lg font-black tracking-tighter">{isFaded ? '--' : bmrLevel}</div>
                      </div>
                      <div className="h-8 sm:h-10 w-px bg-white/20"></div>
                      <div>
                        <div className="text-[8px] sm:text-[9px] font-mono font-bold text-white/50 uppercase tracking-widest mb-0.5 sm:mb-1">Water Intake</div>
                        <div className="text-base sm:text-lg font-black tracking-tighter">{isFaded ? '--' : waterIntake.toFixed(1) + ' L/day'}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="pt-6 sm:pt-8 border-t border-hairline/50">
                  <p className="text-[10px] leading-relaxed text-mute font-medium text-center sm:text-left">
                    <span className="font-bold text-ink/70 uppercase tracking-widest text-[9px] mr-1.5">Medical Disclaimer:</span> 
                    The BMR results provided by this calculator are estimates for informational purposes only. Please consult a healthcare professional for medical advice.
                  </p>
                </div>
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
