import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Activity, ChevronDown } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { BrandLogo } from '../BrandLogo';
import { ReportActions } from './ReportActions';

type UnitSystem = 'metric' | 'us' | 'other';
type Gender = 'male' | 'female' | '';
type Goal = 'loss' | 'maintenance' | 'gain' | '';
type Rate = '0.25' | '0.5' | '1.0'; // kg per week (or 0.5, 1, 2 lbs per week)

const ACTIVITY_LEVELS = [
  { label: 'Select Activity Level', value: '', multiplier: 1.2, desc: 'Required' },
  { label: 'Sedentary', value: '1.2', multiplier: 1.2, desc: 'Desk job, little to no exercise' },
  { label: 'Lightly Active', value: '1.375', multiplier: 1.375, desc: '1-3 days of light exercise/week' },
  { label: 'Moderately Active', value: '1.55', multiplier: 1.55, desc: '3-5 days of moderate exercise/week' },
  { label: 'Very Active', value: '1.725', multiplier: 1.725, desc: '6-7 days of intense exercise/week' },
  { label: 'Extra Active', value: '1.9', multiplier: 1.9, desc: 'Intense training/physical labor daily' },
];

export const DailyNutritionCalculatorCard: React.FC = () => {
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
  const [activity, setActivity] = useState<string>('');
  const [goal, setGoal] = useState<Goal>('');
  const [rate, setRate] = useState<Rate>('0.5');

  const [nameError, setNameError] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);

  // Restore State on Mount
  useEffect(() => {
    const saved = sessionStorage.getItem('daily_nutrition_calculator_state');
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
        if (state.activity !== undefined) setActivity(state.activity);
        if (state.goal !== undefined) setGoal(state.goal);
        if (state.rate !== undefined) setRate(state.rate);
        if (state.system !== undefined) setSystem(state.system);
        if (state.heightUnitOther !== undefined) setHeightUnitOther(state.heightUnitOther);
        if (state.weightUnitOther !== undefined) setWeightUnitOther(state.weightUnitOther);
        
        sessionStorage.removeItem('daily_nutrition_calculator_state');
      } catch (e) {
        console.error('Failed to restore daily nutrition calculator state:', e);
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
    setActivity('');
    setGoal('');
    setRate('0.5');
    setNameError('');
    setExportError('');
  };

  const handleResetWithAnimation = () => {
    setIsResetting(true);
    handleReset();
    setTimeout(() => setIsResetting(false), 700);
  };

  const handleExport = async () => {
    if (targetCalories <= 0) return;
    setIsExporting(true);
    try {
      const { generateReportPDF } = await import('../../lib/pdf');
      
      const inputData = {
        name, age, gender, weight, height, feet, inches, activity, goal, rate, system,
        heightUnitOther, weightUnitOther
      };

      const resultData = {
        bmr, tdee, targetCalories, dailyAdjustment, carbsGrams, proteinGrams, fatGrams, isFloorTriggered
      };

      await generateReportPDF({
        profileName: name || 'Valued User',
        calculatorType: 'daily_nutrition',
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
  const { bmr, tdee, targetCalories, dailyAdjustment, carbsGrams, proteinGrams, fatGrams, isFloorTriggered, isInvalidInput } = useMemo(() => {
    const defaultResult = { bmr: 0, tdee: 0, targetCalories: 0, dailyAdjustment: 0, carbsGrams: 0, proteinGrams: 0, fatGrams: 0, isFloorTriggered: false, isInvalidInput: false };

    if (!age || !gender || !weight || !activity || !goal) {
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

    // BMR (Mifflin-St Jeor Equation)
    const bmrValue = gender === 'male' 
      ? 10 * wKg + 6.25 * hCm - 5 * a + 5 
      : 10 * wKg + 6.25 * hCm - 5 * a - 161;

    // Activity multiplier
    const actObj = ACTIVITY_LEVELS.find(lvl => lvl.value === activity);
    const multiplier = actObj ? actObj.multiplier : 1.2;
    const tdeeValue = bmrValue * multiplier;

    // Deficit / Surplus adjustment (1 kg = 7700 kcal)
    const weeklyRate = parseFloat(rate);
    const calorieAdjustment = (weeklyRate * 7700) / 7; // e.g. 0.5kg/week = ~550 kcal/day

    let finalCals = tdeeValue;
    let adjustment = 0;
    let floorTriggered = false;

    if (goal === 'loss') {
      finalCals = tdeeValue - calorieAdjustment;
      adjustment = -calorieAdjustment;
      
      // Safety limits (1200 kcal/day for women, 1500 kcal/day for men)
      const calorieFloor = gender === 'female' ? 1200 : 1500;
      if (finalCals < calorieFloor) {
        finalCals = calorieFloor;
        floorTriggered = true;
      }
    } else if (goal === 'gain') {
      finalCals = tdeeValue + calorieAdjustment;
      adjustment = calorieAdjustment;
    }

    // Macro breakdowns: Balanced split (40% carbs, 30% protein, 30% fat)
    const carbsG = (finalCals * 0.40) / 4;
    const proteinG = (finalCals * 0.30) / 4;
    const fatG = (finalCals * 0.30) / 9;

    return {
      bmr: bmrValue,
      tdee: tdeeValue,
      targetCalories: finalCals,
      dailyAdjustment: adjustment,
      carbsGrams: carbsG,
      proteinGrams: proteinG,
      fatGrams: fatG,
      isFloorTriggered: floorTriggered,
      isInvalidInput: false
    };
  }, [system, age, gender, weight, height, feet, inches, activity, goal, rate]);

  const isNameFilled = name.trim().length >= 2;
  const isAgeFilled = age.trim() !== '';
  const isGenderFilled = gender !== '';
  const isWeightFilled = weight.trim() !== '';
  const isHeightFilled = system === 'metric'
    ? height.trim() !== ''
    : system === 'us'
      ? (feet.trim() !== '' || inches.trim() !== '')
      : (['cm', 'm', 'in'].includes(heightUnitOther) ? height.trim() !== '' : (feet.trim() !== '' || inches.trim() !== ''));
  const isActivityFilled = activity !== '';
  const isGoalFilled = goal !== '';

  const hasStarted = isNameFilled || isAgeFilled || isGenderFilled || isWeightFilled || isHeightFilled || isActivityFilled || isGoalFilled;
  const hasAllRequired = isAgeFilled && isGenderFilled && isWeightFilled && isHeightFilled && isActivityFilled && isGoalFilled;

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
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Nutrition</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    Caloric Blueprint
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

                <div className="col-span-2 space-y-4">
                  <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Goal</span>
                  <div className="flex p-1 bg-canvas-soft border border-hairline rounded-ui gap-1">
                    {[
                      { value: 'loss', label: 'Loss' },
                      { value: 'maintenance', label: 'Maintain' },
                      { value: 'gain', label: 'Gain' }
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

                {goal !== 'maintenance' && goal !== '' && (
                  <div className="col-span-2 space-y-4">
                    <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1">Weekly Target Rate</span>
                    <div className="flex p-1 bg-canvas-soft border border-hairline rounded-ui gap-1">
                      {[
                        { value: '0.25', label: (system === 'metric' || (system === 'other' && weightUnitOther === 'kg')) ? '0.25 kg' : '0.5 lb' },
                        { value: '0.5', label: (system === 'metric' || (system === 'other' && weightUnitOther === 'kg')) ? '0.50 kg' : '1.0 lb' },
                        { value: '1.0', label: (system === 'metric' || (system === 'other' && weightUnitOther === 'kg')) ? '1.00 kg' : '2.0 lb' }
                      ].map((item) => (
                        <button 
                          key={item.value} 
                          onClick={() => setRate(item.value as Rate)}
                          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 rounded-[4px] ${rate === item.value ? 'bg-ink text-canvas shadow-premium-md' : 'text-mute hover:text-ink hover:bg-canvas/50'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                    <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Nutritional Target</h2>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">TDEE Intake Analysis</p>
                  </div>
                </div>
              </div>
              
              <ReportActions 
                onDownload={handleExport}
                isExporting={isExporting}
                hasResult={targetCalories > 0}
                isValidName={name.trim().length >= 2}
                calculatorType="daily_nutrition"
                inputData={{
                  name, age, gender, weight, height, feet, inches, activity, goal, rate, system
                }}
                resultData={{
                  bmr, tdee, targetCalories, dailyAdjustment, carbsGrams, proteinGrams, fatGrams, isFloorTriggered
                }}
              />
              
              {exportError && (
                <p className="text-red-500 font-mono font-bold text-xs mt-3">{exportError}</p>
              )}
            </div>

            <div className="space-y-8 lg:space-y-10">
              {isFresh ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-mute font-mono font-bold text-[10px] uppercase tracking-widest text-center">Enter your details to calculate nutrition needs</p>
                </div>
              ) : isInvalid ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-red-500 font-mono font-bold text-[10px] uppercase tracking-widest text-center">Unrealistic metric inputs. Verify height & weight.</p>
                </div>
              ) : isIncomplete ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-amber-500/80 font-mono font-bold text-[10px] uppercase tracking-widest text-center">Please enter height, weight, age, activity & goal</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Calorie Card */}
                  <div className="bg-canvas border border-hairline rounded-marketing p-6 space-y-4 shadow-premium-lg relative overflow-hidden">
                    {isFloorTriggered && (
                      <div className="absolute top-0 inset-x-0 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between">
                        <span className="text-[8px] font-mono font-bold text-amber-600 uppercase tracking-wider">⚠ Calorie Safety Floor Applied (Minimum Limit)</span>
                      </div>
                    )}
                    <div className="flex justify-between items-end pt-4">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest mb-1 block">Recommended Target Calories</span>
                        <p className="text-5xl font-black text-ink">{Math.round(targetCalories)} <span className="text-lg font-bold text-mute">kcal/day</span></p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest mb-1 block">TDEE (Maintenance)</span>
                        <span className="text-lg font-black text-ink">{Math.round(tdee)} kcal</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-canvas border border-hairline rounded-ui p-4 space-y-1">
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest block opacity-60">Protein</span>
                      <p className="text-xl font-black text-ink">{Math.round(proteinGrams)}g</p>
                      <span className="text-[8px] font-mono text-mute">{Math.round(proteinGrams * 4)} kcal (30%)</span>
                    </div>

                    <div className="bg-canvas border border-hairline rounded-ui p-4 space-y-1">
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest block opacity-60">Carbohydrates</span>
                      <p className="text-xl font-black text-ink">{Math.round(carbsGrams)}g</p>
                      <span className="text-[8px] font-mono text-mute">{Math.round(carbsGrams * 4)} kcal (40%)</span>
                    </div>

                    <div className="bg-canvas border border-hairline rounded-ui p-4 space-y-1">
                      <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest block opacity-60">Fats</span>
                      <p className="text-xl font-black text-ink">{Math.round(fatGrams)}g</p>
                      <span className="text-[8px] font-mono text-mute">{Math.round(fatGrams * 9)} kcal (30%)</span>
                    </div>
                  </div>

                  {/* Projections info */}
                  <div className="bg-canvas border border-hairline rounded-ui p-6 space-y-3">
                    <h4 className="text-[10px] font-mono font-black text-ink uppercase tracking-widest">Weight projection</h4>
                    <p className="text-xs text-body leading-relaxed font-medium">
                      Based on your TDEE of <strong>{Math.round(tdee)} calories</strong> and selection, your target intake is adjusted by <strong>{dailyAdjustment > 0 ? '+' : ''}{Math.round(dailyAdjustment)} kcal</strong> daily.
                      {goal === 'loss' && ` Adhering to this target should result in a weight loss of approximately ${rate} kg (${(parseFloat(rate) * 2.2).toFixed(1)} lbs) per week, projecting to a reduction of around ${(parseFloat(rate) * 4).toFixed(1)} kg within one month.`}
                      {goal === 'gain' && ` Eating at this surplus should result in a healthy weight gain of approximately ${rate} kg (${(parseFloat(rate) * 2.2).toFixed(1)} lbs) per week, supporting lean mass synthesis when paired with weightlifting.`}
                      {goal === 'maintenance' && " Eating at maintenance calories balances daily expenditures, keeping your weight stable and sustaining day-to-day energetic outputs."}
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
