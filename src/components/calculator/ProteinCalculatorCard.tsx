import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Activity, ChevronDown } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { BrandLogo } from '../BrandLogo';
import { ReportActions } from './ReportActions';

type Gender = 'male' | 'female' | '';
type Goal = 'loss' | 'maintenance' | 'gain' | '';

const ACTIVITY_LEVELS = [
  { label: 'Select Activity Level', value: '', desc: 'Required' },
  { label: 'Sedentary', value: '1.2', factor: 0.85, desc: 'Desk job, little to no exercise' },
  { label: 'Lightly Active', value: '1.375', factor: 1.15, desc: '1-3 days of light exercise/week' },
  { label: 'Moderately Active', value: '1.55', factor: 1.45, desc: '3-5 days of moderate exercise/week' },
  { label: 'Very Active', value: '1.725', factor: 1.80, desc: '6-7 days of intense exercise/week' },
  { label: 'Extra Active', value: '1.9', factor: 2.20, desc: 'Intense training/physical labor daily' },
];

export const ProteinCalculatorCard: React.FC = () => {
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<Gender>('');
  const [weight, setWeight] = useState<string>('');
  const [activity, setActivity] = useState<string>('');
  const [goal, setGoal] = useState<Goal>('');

  const [nameError, setNameError] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);

  // Restore State on Mount
  useEffect(() => {
    const saved = sessionStorage.getItem('protein_intake_calculator_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.name !== undefined) setName(state.name);
        if (state.age !== undefined) setAge(state.age);
        if (state.gender !== undefined) setGender(state.gender);
        if (state.weight !== undefined) setWeight(state.weight);
        if (state.activity !== undefined) setActivity(state.activity);
        if (state.goal !== undefined) setGoal(state.goal);
        if (state.weightUnit !== undefined) {
          setWeightUnit(state.weightUnit);
        } else if (state.system === 'us' || state.weightUnitOther === 'lb') {
          setWeightUnit('lb');
        }
        
        sessionStorage.removeItem('protein_intake_calculator_state');
      } catch (e) {
        console.error('Failed to restore protein calculator state:', e);
      }
    }
  }, []);

  const handleReset = () => {
    setName('');
    setAge('');
    setGender('');
    setWeight('');
    setActivity('');
    setGoal('');
    setNameError('');
    setExportError('');
  };

  const handleResetWithAnimation = () => {
    setIsResetting(true);
    handleReset();
    setTimeout(() => setIsResetting(false), 700);
  };

  const handleExport = async () => {
    if (proteinGoal <= 0) return;
    setIsExporting(true);
    try {
      const { generateReportPDF } = await import('../../lib/pdf');
      
      const inputData = {
        name,
        age,
        gender,
        weight,
        activity,
        goal,
        system: weightUnit === 'lb' ? 'us' : 'metric',
        weightUnitOther: weightUnit
      };

      const resultData = {
        proteinGoal, proteinRange, proteinCalories, multiplier
      };

      await generateReportPDF({
        profileName: name || 'Valued User',
        calculatorType: 'protein_intake',
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
  const { proteinGoal, proteinRange, proteinCalories, multiplier, isInvalidInput } = useMemo(() => {
    const defaultResult = { proteinGoal: 0, proteinRange: { min: 0, max: 0 }, proteinCalories: 0, multiplier: 0.8, isInvalidInput: false };

    if (!age || !gender || !weight || !activity || !goal) {
      return defaultResult;
    }

    const a = parseInt(age);
    if (isNaN(a) || a < 18 || a > 120) return { ...defaultResult, isInvalidInput: true };

    const wVal = parseFloat(weight) || 0;
    if (wVal <= 0) return defaultResult;

    let wKg = weightUnit === 'kg' ? wVal : wVal * 0.45359237;

    // Retrieve baseline multiplier based on activity
    const actObj = ACTIVITY_LEVELS.find(lvl => lvl.value === activity);
    let baseFactor = actObj ? actObj.factor : 0.8;

    // Adjust factor based on Goal
    let goalAdjustment = 0;
    if (goal === 'gain') {
      goalAdjustment = 0.2; // Gain muscle
    } else if (goal === 'loss') {
      goalAdjustment = 0.35; // Preserve muscle in cut
    }

    const finalMultiplier = baseFactor + goalAdjustment;

    // Recommended Protein Daily in grams
    const recommendedProtein = wKg * finalMultiplier;
    const minProtein = wKg * Math.max(finalMultiplier - 0.2, 0.8);
    const maxProtein = wKg * Math.min(finalMultiplier + 0.2, 2.8);

    return {
      proteinGoal: recommendedProtein,
      proteinRange: {
        min: minProtein,
        max: maxProtein
      },
      proteinCalories: recommendedProtein * 4,
      multiplier: finalMultiplier,
      isInvalidInput: false
    };
  }, [weightUnit, age, gender, weight, activity, goal]);

  const isNameFilled = name.trim().length >= 2;
  const isAgeFilled = age.trim() !== '';
  const isGenderFilled = gender !== '';
  const isWeightFilled = weight.trim() !== '';
  const isActivityFilled = activity !== '';
  const isGoalFilled = goal !== '';

  const hasStarted = isNameFilled || isAgeFilled || isGenderFilled || isWeightFilled || isActivityFilled || isGoalFilled;
  const hasAllRequired = isAgeFilled && isGenderFilled && isWeightFilled && isActivityFilled && isGoalFilled;

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
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Protein Intake</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    RDA Estimator
                  </div>
                </div>
              </div>
              <button onClick={handleResetWithAnimation} className="p-3 bg-canvas-soft border border-hairline hover:bg-surface rounded-xl transition-all text-mute hover:text-ink shadow-premium-sm active:scale-95">
                <RotateCcw className={`w-5 h-5 ${isResetting ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-6 lg:space-y-8">
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
                  <InputGroup 
                    id="weight" 
                    label="Weight" 
                    value={weight} 
                    onChange={setWeight} 
                    unit={weightUnit} 
                    unitOptions={['kg', 'lb']}
                    onUnitChange={(val) => { setWeightUnit(val as 'kg' | 'lb'); setWeight(''); }}
                    placeholder={weightUnit === 'kg' ? "80" : "175"} 
                    min={weightUnit === 'kg' ? 30 : 60} 
                    max={weightUnit === 'kg' ? 250 : 600} 
                  />
                </div>

                <div className="col-span-2 space-y-4">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Goal</span>
                  <div className="flex p-1 bg-canvas-soft border border-hairline rounded-ui gap-1">
                    {[
                      { value: 'loss', label: 'Loss / Cut' },
                      { value: 'maintenance', label: 'Maintain' },
                      { value: 'gain', label: 'Muscle Gain' }
                    ].map((item) => (
                      <button 
                        key={item.value} 
                        onClick={() => setGoal(item.value as Goal)}
                        className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 rounded-[4px] ${goal === item.value ? 'bg-ink text-canvas shadow-premium-md' : 'text-mute hover:text-ink hover:bg-canvas/50'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 space-y-4">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Physical Activity</span>
                  <div className="relative group">
                    <select 
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      className="w-full bg-canvas-soft border border-hairline rounded-ui h-14 px-5 pr-10 text-[11px] font-black uppercase tracking-widest text-ink focus:outline-none appearance-none cursor-pointer hover:border-hairline-strong transition-all shadow-inset"
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
                    <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Protein Goal</h2>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Calculated Targets</p>
                  </div>
                </div>
              </div>
              
              <ReportActions 
                onDownload={handleExport}
                isExporting={isExporting}
                hasResult={proteinGoal > 0}
                isValidName={name.trim().length >= 2}
                calculatorType="protein_intake"
                inputData={{
                  name, age, gender, weight, activity, goal, weightUnit
                }}
                resultData={{
                  proteinGoal, proteinRange, proteinCalories, multiplier
                }}
              />
              
              {exportError && (
                <p className="text-red-500 font-mono font-bold text-xs mt-3">{exportError}</p>
              )}
            </div>

            <div className="space-y-8 lg:space-y-10">
              {isFresh ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-mute font-mono font-bold text-[10px] uppercase tracking-widest text-center">Enter your details to calculate protein targets</p>
                </div>
              ) : isInvalid ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-red-500 font-mono font-bold text-[10px] uppercase tracking-widest text-center">Invalid parameters. Verify weight inputs.</p>
                </div>
              ) : isIncomplete ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-amber-500/80 font-mono font-bold text-[10px] uppercase tracking-widest text-center">Please enter age, weight, activity & goal</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Summary metric card */}
                  <div className="bg-canvas border border-hairline rounded-marketing p-6 space-y-2 relative overflow-hidden shadow-premium-sm flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest mb-1 block">Daily Target</span>
                      <p className="text-5xl font-black text-ink">{Math.round(proteinGoal)} <span className="text-lg font-bold text-mute">g/day</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest mb-1 block">RDA Multiplier</span>
                      <span className="inline-flex px-3 py-1 bg-ink text-canvas text-[10px] font-black uppercase tracking-wider rounded-full">
                        {multiplier.toFixed(2)} g/kg
                      </span>
                    </div>
                  </div>

                  {/* Recommendations Ranges */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-canvas border border-hairline rounded-ui p-5 space-y-1">
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">Optimal Range</span>
                      <p className="text-xl font-black text-ink">
                        {Math.round(proteinRange.min)}–{Math.round(proteinRange.max)} g
                      </p>
                      <p className="text-[9px] text-mute font-medium leading-tight mt-1">Flexible daily spectrum depending on training load</p>
                    </div>

                    <div className="bg-canvas border border-hairline rounded-ui p-5 space-y-1">
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">Protein Energy</span>
                      <p className="text-xl font-black text-ink">{Math.round(proteinCalories)} kcal</p>
                      <p className="text-[9px] text-mute font-medium leading-tight mt-1">Calories derived purely from protein (4 kcal/g)</p>
                    </div>
                  </div>

                  {/* Educational insight card */}
                  <div className="bg-canvas border border-hairline rounded-ui p-6 space-y-3">
                    <h4 className="text-[10px] font-mono font-black text-ink uppercase tracking-widest">Protein Intake Guidelines</h4>
                    <p className="text-xs text-body leading-relaxed font-medium">
                      Based on your weight and physical goals, your optimal daily protein target is <strong>{Math.round(proteinGoal)} grams</strong>. 
                      {goal === 'loss' && " Since your goal is body fat reduction, a slightly elevated protein factor helps prevent the body from utilizing skeletal muscle as fuel, safeguarding metabolic health during calorie deficits."}
                      {goal === 'gain' && " Since your objective is lean mass hypertrophy, ample protein supplies essential amino acids needed to build and repair skeletal muscle fibers activated during physical exercise."}
                      {goal === 'maintenance' && " For weight maintenance, this level of protein keeps your body operating efficiently, supports muscular balance, and keeps satiety levels stable throughout the day."}
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
