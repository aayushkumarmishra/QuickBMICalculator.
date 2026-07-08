import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Download, Check, Activity, ChevronDown, Target, AlertCircle, Lock, Save } from 'lucide-react';
import { InputGroup } from './InputGroup';
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

const GOAL_DATA = {
  loss: {
    recommendations: [
      'Mild calorie deficit (approx. 500 kcal)',
      'Protein priority (1.8g - 2.2g/kg)',
      'Avoid liquid calories and sugary drinks',
      'Focus on high-volume, low-calorie foods'
    ],
    activity: { walking: '45-60 min/day', steps: '10,000-12,000', progress: 95 }
  },
  maintenance: {
    recommendations: [
      'Balanced intake matching your TDEE',
      'Consistent daily physical activity',
      'Maintain routine and monitor weight',
      'Balance your strength and cardio work'
    ],
    activity: { walking: '30-45 min/day', steps: '8,000-10,000', progress: 75 }
  },
  gain: {
    recommendations: [
      'Calorie surplus (approx. 250-500 kcal)',
      'Strength training focus for muscle growth',
      'Protein focus (1.6g - 2.0g/kg)',
      'High carbohydrate intake for fuel'
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

export const CalorieCalculatorCard: React.FC = () => {
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
    const saved = sessionStorage.getItem('calorie_calculator_state');
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
        sessionStorage.removeItem('calorie_calculator_state');
      } catch (e) {
        console.error('Failed to restore Calorie state:', e);
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

  const { bmr, tdee, waterIntake, caloriesByGoal, targetCalories, recommendations, suggestedActivity, isInvalidInput } = useMemo(() => {
    const defaultResult = { 
      bmr: 0, 
      tdee: 0, 
      waterIntake: 0, 
      caloriesByGoal: { loss: 0, maintenance: 0, gain: 0 },
      targetCalories: 0,
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

    const goalInfo = goal ? GOAL_DATA[goal as keyof typeof GOAL_DATA] : GOAL_DATA.default;
    const target = goal ? cals[goal] : tdeeValue;

    return { 
      bmr: bmrValue, 
      tdee: tdeeValue, 
      waterIntake: water, 
      caloriesByGoal: cals,
      targetCalories: target,
      recommendations: goalInfo.recommendations,
      suggestedActivity: goalInfo.activity,
      isInvalidInput: false
    };
  }, [system, weight, height, feet, inches, age, gender, activity, goal, heightUnitOther, weightUnitOther]);

  const handleExport = async () => {
    if (tdee <= 0) return;
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
        bmr, tdee, targetCalories, caloriesByGoal, recommendations
      };

      await generateReportPDF({
        profileName: trimmedName,
        calculatorType: 'calorie',
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
  const statusColor = goal === 'loss' ? 'text-red-500' : goal === 'gain' ? 'text-green-500' : 'text-status-healthy';

  const numericAge = parseInt(age || '0');
  const isPediatric = numericAge >= 18 && numericAge < 20;

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
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Calorie Engine</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    Goal-Based Precision
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
                <div className="flex p-1 bg-surface-2 border border-hairline rounded-full gap-1">
                  {['us', 'metric', 'other'].map((s) => (
                    <button 
                      key={s} 
                      type="button"
                      onClick={() => { setSystem(s as UnitSystem); setWeight(''); }}
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
                  <div className="relative">
                    <input
                      type="text"
                      id="calorie-name"
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

                <InputGroup id="calorie-age" label="Age" value={age} onChange={setAge} unit="YRS" placeholder="25" min={18} max={120} step="1" />
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Gender</span>
                  <div className="flex p-1 bg-surface-2 border border-hairline rounded-full gap-1">
                    {['male', 'female'].map((g) => (
                      <button 
                        key={g} 
                        type="button"
                        onClick={() => setGender(g as 'male' | 'female')}
                        className={`flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.08em] transition-all duration-300 rounded-full focus-ring ${gender === g ? 'bg-ink text-canvas dark:bg-canvas dark:text-ink shadow-premium-sm' : 'text-mute hover:text-ink'}`}
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
                          </div></div>
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
                    <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Daily Intake</h2>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Selected Goal Calories</p>
                  </div>
                </div>
              </div>
              
              <ReportActions 
                onDownload={handleExport}
                isExporting={isExporting}
                hasResult={tdee > 0}
                isValidName={name.trim().length >= 2}
                calculatorType="calorie"
                inputData={{
                  name, age, gender, weight, height, feet, inches,
                  system, activity, goal, heightUnitOther, weightUnitOther
                }}
                resultData={{
                  bmr, tdee, waterIntake, caloriesByGoal, targetCalories,
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
              {/* HERO RESULT: TARGET CALORIES */}
              <div id="calorie-hero-export" className="flex flex-col gap-8 py-8 px-6 sm:py-10 sm:px-8 bg-ink dark:bg-canvas border border-hairline/10 dark:border-hairline rounded-marketing shadow-premium-lg text-canvas dark:text-ink relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-64 h-64 opacity-10 dark:opacity-5 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors duration-1000 ${!isFaded ? statusColor.replace('text-', 'bg-') : 'bg-mute'}`}></div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 w-full relative z-10">
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Target Daily Calories</span>
                    <div className="flex items-baseline gap-2">
                      <motion.span 
                        className="text-6xl sm:text-7xl font-black tracking-[-0.03em] text-canvas dark:text-ink leading-none"
                        initial={false}
                        animate={{ scale: targetCalories > 0 ? [1, 1.02, 1] : 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        {targetCalories > 0 ? Math.round(targetCalories).toLocaleString() : '--'}
                      </motion.span>
                      <span className="text-xs font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">kcal</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end text-left sm:text-right min-w-0">
                    <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Goal Strategy</span>
                    <div className={`text-xl sm:text-2xl font-black tracking-tight break-words max-w-full ${statusColor}`}>
                      {isFaded ? 'Awaiting Data' : (goal || 'Maintenance').charAt(0).toUpperCase() + (goal || 'Maintenance').slice(1)}
                    </div>
                    {targetCalories > 0 && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas/10 border border-canvas/20 shadow-premium-sm dark:bg-ink/10 dark:border-ink/20">
                         <div className={`w-1.5 h-1.5 rounded-full ${statusColor.replace('text-', 'bg-')} animate-pulse`}></div>
                         <span className="text-[9px] font-mono font-bold uppercase text-canvas dark:text-ink">Live Calculation</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2x2 Grid of Secondary Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {/* Metric 1: Steps */}
                <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Daily Steps</div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                      {isFaded ? '--' : suggestedActivity.steps}
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="h-1 w-full bg-hairline rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-status-healthy rounded-full transition-all duration-1000" style={{ width: isFaded ? '0%' : `${suggestedActivity.progress}%` }} />
                    </div>
                    <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Target Activity</div>
                  </div>
                </div>

                {/* Metric 2: Walking */}
                <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Daily Walking</div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                      {isFaded ? '--' : suggestedActivity.walking}
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Recommended Duration</div>
                  </div>
                </div>

                {/* Metric 3: Basal Metabolism (BMR) */}
                <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Basal Metabolic Rate</div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                      {isFaded ? '--' : Math.round(bmr).toLocaleString()}
                      <span className="text-[10px] font-sans font-medium text-mute ml-1">KCAL</span>
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Base Resting Energy</div>
                  </div>
                </div>

                {/* Metric 4: Daily Water Intake */}
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

              {/* DAILY CALORIE GOALS */}
              <div className="card bg-ink dark:bg-canvas text-canvas dark:text-ink p-6 sm:p-8 relative overflow-hidden shadow-premium-xl border border-hairline/10 dark:border-hairline">
                <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10 pointer-events-none">
                  <BrandLogo className="w-16 h-16 sm:w-24 sm:h-24" variant="canvas" />
                </div>
                <div className="relative z-10 flex flex-col gap-5 sm:gap-6">
                  <div className="text-left">
                    <div className="text-[9px] sm:text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.4em] mb-4">Daily Calorie Strategy</div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 -mx-2">
                      <div className={`flex flex-col gap-1 p-2 rounded-ui transition-all duration-300 ${goal === 'maintenance' || !goal ? 'bg-canvas/10 ring-1 ring-canvas/20 dark:bg-ink/10 dark:ring-ink/20' : 'opacity-60'}`}>
                        <div className="text-[8px] sm:text-[9px] font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">Maintain</div>
                        <div className="text-lg sm:text-2xl font-mono font-bold tracking-tight text-canvas dark:text-ink">{isFaded ? '--' : Math.round(caloriesByGoal.maintenance).toLocaleString()}</div>
                        <div className="text-[8px] font-mono text-canvas-soft/45 dark:text-mute/40 uppercase tracking-widest">kcal</div>
                      </div>
                      <div className={`flex flex-col gap-1 p-2 rounded-ui transition-all duration-300 ${goal === 'loss' ? 'bg-canvas/10 ring-1 ring-canvas/20 dark:bg-ink/10 dark:ring-ink/20' : 'opacity-60'}`}>
                        <div className="text-[8px] sm:text-[9px] font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">Fat Loss</div>
                        <div className="text-lg sm:text-2xl font-mono font-bold tracking-tight text-status-over">{isFaded ? '--' : Math.round(caloriesByGoal.loss).toLocaleString()}</div>
                        <div className="text-[8px] font-mono text-canvas-soft/45 dark:text-mute/40 uppercase tracking-widest">kcal</div>
                      </div>
                      <div className={`flex flex-col gap-1 p-2 rounded-ui transition-all duration-300 ${goal === 'gain' ? 'bg-canvas/10 ring-1 ring-canvas/20 dark:bg-ink/10 dark:ring-ink/20' : 'opacity-60'}`}>
                        <div className="text-[8px] sm:text-[9px] font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">Weight Gain</div>
                        <div className="text-lg sm:text-2xl font-mono font-bold tracking-tight text-status-healthy">{isFaded ? '--' : Math.round(caloriesByGoal.gain).toLocaleString()}</div>
                        <div className="text-[8px] font-mono text-canvas-soft/45 dark:text-mute/40 uppercase tracking-widest">kcal</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* NUTRITION RECOMMENDATIONS */}
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
                          Nutrition Tips
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
                  The Calorie results provided by this calculator are estimates based on the Mifflin-St Jeor equation for informational purposes only. Please consult a healthcare professional for medical advice.
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
