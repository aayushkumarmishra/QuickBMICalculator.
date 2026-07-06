import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Download, Check, Activity, ChevronDown, Target, Droplets, Sun, Clock, AlertCircle, Lock, Save } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { BrandLogo } from '../BrandLogo';
import { ReportActions } from './ReportActions';



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
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
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

  // Persistent State Logic
  useEffect(() => {
    const saved = sessionStorage.getItem('water_intake_calculator_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.weight !== undefined) setWeight(state.weight);
        if (state.name !== undefined) setName(state.name);
        if (state.age !== undefined) setAge(state.age);
        if (state.gender !== undefined) setGender(state.gender);
        if (state.activity !== undefined) setActivity(state.activity);
        if (state.climate !== undefined) setClimate(state.climate);
        if (state.weightUnit !== undefined) {
          setWeightUnit(state.weightUnit);
        } else if (state.system === 'us' || state.weightUnitOther === 'lb') {
          setWeightUnit('lb');
        }

        // Clear state after restoration to prevent stale persistence
        sessionStorage.removeItem('water_intake_calculator_state');
      } catch (e) {
        console.error('Failed to restore Water Intake state:', e);
      }
    }
  }, []);

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
       let weightVal = parseFloat(weight);
       if (isNaN(weightVal)) return { ...defaultResult, isInvalidInput: true };
       
       if (weightUnit === 'kg') {
          if (weightVal < 17 || weightVal > 635) return { ...defaultResult, isInvalidInput: true };
       } else {
          if (weightVal < 37 || weightVal > 1400) return { ...defaultResult, isInvalidInput: true };
       }
    }

    if (!weight || !activity || !climate) {
       return { ...defaultResult, isInvalidInput: false };
    }

    let weightKg = parseFloat(weight);

    if (weightUnit === 'lb') weightKg = weightKg * LBS_TO_KG;

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
  }, [weightUnit, weight, activity, climate, age]);

  const handleExport = async () => {
    if (waterGoal <= 0) return;
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setNameError('Min 2 characters required for export');
      return;
    }

    setIsExporting(true);
    try {
      const { generateReportPDF } = await import('../../lib/pdf');
      
      const inputData = {
        age,
        gender,
        weight,
        activity,
        climate,
        system: weightUnit === 'lb' ? 'us' : 'metric',
        weightUnitOther: weightUnit
      };

      const resultData = {
        waterGoal, waterIntake: waterGoal, timings, recommendations
      };

      await generateReportPDF({
        profileName: trimmedName,
        calculatorType: 'water_intake',
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
              <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Name</label>
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
                <InputGroup 
                  id="weight" 
                  label="Weight" 
                  value={weight} 
                  onChange={setWeight} 
                  unit={weightUnit} 
                  unitOptions={['kg', 'lb']}
                  onUnitChange={(val) => { setWeightUnit(val as 'kg' | 'lb'); setWeight(''); }}
                  placeholder={weightUnit === 'kg' ? "80" : "175"} 
                  min={1} 
                  max={weightUnit === 'kg' ? 635 : 1400} 
                />
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
            <div className="flex flex-col border-b border-hairline/50 pb-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shadow-premium-sm">
                    <Droplets className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Daily Intake</h2>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Hydration Goal Analysis</p>
                  </div>
                </div>
              </div>
              
              <ReportActions 
                onDownload={handleExport}
                isExporting={isExporting}
                hasResult={waterGoal > 0}
                isValidName={name.trim().length >= 2}
                calculatorType="water_intake"
                inputData={{
                  name, age, gender, weight, activity, climate, weightUnit
                }}
                resultData={{
                  waterGoal, hydrationStatus, timings, recommendations
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
