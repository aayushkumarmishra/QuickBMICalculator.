import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Download, Check, Activity, ChevronDown, Target, Droplets, Sun, Clock, AlertCircle, Lock, Save } from 'lucide-react';
import { InputGroup } from './InputGroup';
import { BrandLogo } from '../BrandLogo';
import { ReportActions } from './ReportActions';
import { Select } from './Select';



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
      const { generateDataDrivenReport } = await import('../../lib/pdf');

      const activityLabel = ACTIVITY_LEVELS.find((a) => a.value === activity)?.label || activity;
      const climateLabel = CLIMATE_TYPES.find((c) => c.value === climate)?.label || climate;

      const weightStr = `${weight} ${weightUnit}`;

      await generateDataDrivenReport({
        profileName: trimmedName,
        calculatorType: 'water_intake',
        date: new Date().toLocaleDateString(),
        unitSystem: weightUnit === 'lb' ? 'US' : 'METRIC',

        profileRows: [
          { label: 'AGE', value: `${age} YRS` },
          { label: 'GENDER', value: (gender || '--').toUpperCase() },
          { label: 'WEIGHT', value: weightStr },
          { label: 'ACTIVITY', value: activityLabel.toUpperCase() },
          { label: 'CLIMATE', value: climateLabel.toUpperCase() },
        ],

        heroRows: [
          { label: 'DAILY WATER REQUIREMENT', value: `${waterGoal.toFixed(1)} Liters` },
          { label: 'HYDRATION STATUS', value: hydrationStatus },
        ],

        barSegments: [
          { color: [0, 112, 243], widthPct: 30 },
          { color: [0, 223, 216], widthPct: 40 },
          { color: [245, 166, 35], widthPct: 30 },
        ],
        barMarkerPct: Math.min(Math.max(((waterGoal - 1) / (5 - 1)) * 100, 0), 100),
        barLabels: [
          { text: 'LOW INTAKE', pct: 0, align: 'left' },
          { text: 'NORMAL TARGET', pct: 30, align: 'left' },
          { text: 'HIGH HYDRATION', pct: 70, align: 'left' },
        ],

        sections: [
          {
            title: 'CLIMATE & ACTIVITY ADJUSTMENT',
            rows: [
              { label: 'ACTIVITY', value: `${activityLabel.toUpperCase()} (+${activity || 0}ml)` },
              { label: 'CLIMATE', value: `${climateLabel.toUpperCase()} (+${climate || 0}ml)` },
            ],
            columns: 2,
          },
          {
            title: 'DAILY HYDRATION TIMINGS',
            rows: [
              { label: 'MORNING (25%)', value: `${timings.morning.toFixed(1)} L` },
              { label: 'AFTERNOON (40%)', value: `${timings.afternoon.toFixed(1)} L` },
              { label: 'EVENING (20%)', value: `${timings.night.toFixed(1)} L` },
              { label: 'WORKOUT (15%)', value: `${timings.workout.toFixed(1)} L` },
            ],
            columns: 2,
          },
        ],

        recommendations,
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
    >      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] items-stretch">
        
        {/* LEFT: Command Panel (Inputs) */}
        <div className="p-6 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-hairline bg-canvas relative z-20 h-full overflow-y-auto">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex items-center justify-between border-b border-hairline pb-8">
              <div className="flex items-center gap-4">
                <BrandLogo className="w-12 h-12" variant="ink" />
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Water Intake</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    Hydration Goal
                  </div>
                </div>
              </div>
              <button onClick={handleResetWithAnimation} className={`p-3 bg-canvas-soft border border-hairline hover:bg-surface rounded-xl transition-all text-mute hover:text-ink shadow-premium-sm active:scale-95 ${isResetting ? 'ring-2 ring-primary/40' : ''}`} title="Reset Data">
                <RotateCcw className={`w-5 h-5 ${isResetting ? 'animate-spin' : ''}`} />
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
                      className="w-full bg-canvas border border-hairline rounded-ui h-14 px-5 text-xl font-bold tracking-tighter text-ink dark:text-[#f5f5f5] transition-all duration-300 placeholder:text-mute/20 dark:placeholder:text-mute/40 focus:outline-none focus:ring-[6px] focus:ring-primary/[0.03] focus:border-ink dark:focus:border-white/20 shadow-premium-sm hover:border-hairline-strong focus:bg-canvas uppercase"
                    />
                  </div>
                  {nameError && <p className="text-red-500 text-[10px] font-mono font-bold">{nameError}</p>}
                </div>

                <InputGroup id="water-age" label="Age" value={age} onChange={setAge} unit="YRS" placeholder="25" min={1} max={120} step="1" />
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
                <div className="space-y-3">
                  <span className="text-xs font-mono text-mute uppercase tracking-[0.12em] ml-1">Activity Level</span>
                  <Select 
                    value={activity}
                    onChange={setActivity}
                    options={ACTIVITY_LEVELS.map(level => ({
                      value: level.value,
                      label: level.label,
                      desc: level.desc
                    }))}
                    label="Activity Level"
                  />
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-mono text-mute uppercase tracking-[0.12em] ml-1">Climate</span>
                  <Select 
                    value={climate}
                    onChange={setClimate}
                    options={CLIMATE_TYPES.map(c => ({
                      value: c.value,
                      label: c.label,
                      desc: c.desc
                    }))}
                    label="Climate"
                  />
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
              <div id="water-hero-export" className="flex flex-col gap-8 py-8 px-6 sm:py-10 sm:px-8 bg-ink dark:bg-canvas border border-hairline/10 dark:border-hairline rounded-marketing shadow-premium-lg text-canvas dark:text-ink relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-64 h-64 opacity-10 dark:opacity-5 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors duration-1000 ${!isFaded ? waterGoal < 2.0 ? 'bg-status-under' : waterGoal > 3.5 ? 'bg-status-over' : 'bg-status-healthy' : 'bg-mute'}`}></div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 w-full relative z-10">
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Daily Intake Goal</span>
                    <div className="flex items-baseline gap-2">
                      <motion.span 
                        className="text-6xl sm:text-7xl font-black tracking-[-0.03em] text-canvas dark:text-ink leading-none"
                        animate={{ scale: waterGoal > 0 ? [1, 1.02, 1] : 1 }}
                      >
                        {waterGoal > 0 ? waterGoal.toFixed(1) : '--'}
                      </motion.span>
                      <span className="text-xs font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">Liters</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end text-left sm:text-right min-w-0">
                    <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Hydration Status</span>
                    <div className={`text-xl sm:text-2xl font-black tracking-tight break-words max-w-full leading-tight ${!isFaded ? (waterGoal < 2.0 ? 'text-status-under' : waterGoal > 3.5 ? 'text-status-over' : 'text-status-healthy') : 'text-mute'}`}>
                      {hydrationStatus}
                    </div>
                    {waterGoal > 0 && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas/10 border border-canvas/20 shadow-premium-sm dark:bg-ink/10 dark:border-ink/20">
                         <div className={`w-1.5 h-1.5 rounded-full ${waterGoal < 2.0 ? 'bg-status-under' : waterGoal > 3.5 ? 'bg-status-over' : 'bg-status-healthy'} animate-pulse`}></div>
                         <span className="text-[9px] font-mono font-bold uppercase text-canvas dark:text-ink">Calculated Intake</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative pt-6 pb-2">
                  <div className="flex h-2 w-full rounded-full overflow-hidden bg-canvas-soft/20 dark:bg-canvas-soft/10 p-0">
                    <div className="bg-status-under h-full opacity-80" style={{ width: '30%' }}></div>
                    <div className="bg-status-healthy h-full opacity-80" style={{ width: '40%' }}></div>
                    <div className="bg-status-over h-full opacity-80" style={{ width: '30%' }}></div>
                  </div>
                  {!isFaded && (() => {
                    const pct = Math.min(Math.max(((waterGoal - 1) / (5 - 1)) * 100, 0), 100);
                    return (
                      <motion.div 
                        className="absolute top-[18px] bottom-0 flex flex-col items-center -ml-px pointer-events-none z-20"
                        initial={{ left: '0%' }}
                        animate={{ left: `${pct}%` }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                      >
                        <div className="h-4 flex flex-col items-center">
                          <div className="w-3.5 h-3.5 rounded-full bg-canvas border-2 border-ink shadow-premium-md flex items-center justify-center">
                            <div className={`w-1 h-1 rounded-full ${waterGoal < 2.0 ? 'bg-status-under' : waterGoal > 3.5 ? 'bg-status-over' : 'bg-status-healthy'} animate-pulse`}></div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                  <div className="grid grid-cols-3 mt-4 gap-2">
                    {[
                      { label: 'Low Intake', range: '< 2.2L' },
                      { label: 'Normal Target', range: '2.2 - 3.8L' },
                      { label: 'High Hydration', range: '> 3.8L' }
                    ].map((zone, i) => (
                      <div key={i} className="flex flex-col items-center sm:items-start text-center sm:text-left overflow-hidden">
                        <span className="text-[8px] font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest mb-1 leading-tight">{zone.label}</span>
                        <span className="text-[9px] font-mono font-bold text-canvas-soft/70 dark:text-mute/70 leading-tight">{zone.range}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4-Cell Timing Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Cell 1: Morning */}
                <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Morning Timing</div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                      {isFaded ? '--' : timings.morning.toFixed(2)}
                      <span className="text-[10px] font-sans font-medium text-mute ml-1">L</span>
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Before noon baseline</div>
                  </div>
                </div>

                {/* Cell 2: Afternoon */}
                <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Afternoon Intake</div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                      {isFaded ? '--' : timings.afternoon.toFixed(2)}
                      <span className="text-[10px] font-sans font-medium text-mute ml-1">L</span>
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Midday hydration target</div>
                  </div>
                </div>

                {/* Cell 3: Night */}
                <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Night Intake</div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                      {isFaded ? '--' : timings.night.toFixed(2)}
                      <span className="text-[10px] font-sans font-medium text-mute ml-1">L</span>
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Rest and recover baseline</div>
                  </div>
                </div>

                {/* Cell 4: Workout */}
                <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-3">Workout Intake</div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                      {isFaded ? '--' : timings.workout.toFixed(2)}
                      <span className="text-[10px] font-sans font-medium text-mute ml-1">L</span>
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="text-[8px] font-mono text-mute uppercase tracking-wider">Hydration booster timing</div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="card bg-canvas border border-hairline p-6 sm:p-8 rounded-ui space-y-6">
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
