import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Activity } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { ReportActions } from './ReportActions';
import { Select } from './Select';

type PresetType = 'balanced' | 'lowcarb' | 'highprotein' | 'keto' | 'custom';

interface Preset {
  label: string;
  protein: number;
  carbs: number;
  fat: number;
}

const PRESETS: Record<Exclude<PresetType, 'custom'>, Preset> = {
  balanced: { label: 'Balanced (40/30/30)', carbs: 40, protein: 30, fat: 30 },
  lowcarb: { label: 'Low Carb (20/30/50)', carbs: 20, protein: 30, fat: 50 },
  highprotein: { label: 'High Protein (30/40/30)', carbs: 30, protein: 40, fat: 30 },
  keto: { label: 'Ketogenic (5/20/75)', carbs: 5, protein: 20, fat: 75 },
};

export const MacroCalculatorCard: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [preset, setPreset] = useState<PresetType | ''>('');
  
  // Custom sliders
  const [customCarbs, setCustomCarbs] = useState<number>(40);
  const [customProtein, setCustomProtein] = useState<number>(30);
  const [customFat, setCustomFat] = useState<number>(30);

  const [nameError, setNameError] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);

  // Restore State on Mount
  useEffect(() => {
    const saved = sessionStorage.getItem('macro_calculator_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.name !== undefined) setName(state.name);
        if (state.calories !== undefined) setCalories(state.calories);
        if (state.preset !== undefined) setPreset(state.preset);
        if (state.customCarbs !== undefined) setCustomCarbs(state.customCarbs);
        if (state.customProtein !== undefined) setCustomProtein(state.customProtein);
        if (state.customFat !== undefined) setCustomFat(state.customFat);
        
        sessionStorage.removeItem('macro_calculator_state');
      } catch (e) {
        console.error('Failed to restore macro calculator state:', e);
      }
    }
  }, []);

  const handleReset = () => {
    setName('');
    setCalories('');
    setPreset('');
    setCustomCarbs(40);
    setCustomProtein(30);
    setCustomFat(30);
    setNameError('');
    setExportError('');
  };

  const handleResetWithAnimation = () => {
    setIsResetting(true);
    handleReset();
    setTimeout(() => setIsResetting(false), 700);
  };

  const handleExport = async () => {
    if (proteinGrams <= 0) return;
    setIsExporting(true);
    try {
      const { generateDataDrivenReport } = await import('../../lib/pdf');

      const presetLabel = preset ? (preset === 'custom' ? 'CUSTOM' : preset.toUpperCase()) : '--';

      await generateDataDrivenReport({
        profileName: name || 'Valued User',
        calculatorType: 'macro',
        date: new Date().toLocaleDateString(),
        unitSystem: '--',

        profileRows: [
          { label: 'CALORIES', value: `${parseInt(calories).toLocaleString()} kcal` },
          { label: 'PRESET', value: presetLabel },
        ],

        heroRows: [
          { label: 'MACRONUTRIENTS (C/P/F)', value: `${Math.round(carbsGrams)}g / ${Math.round(proteinGrams)}g / ${Math.round(fatGrams)}g` },
          { label: 'DIET PROFILE', value: presetLabel },
        ],

        barSegments: [
          { color: [251, 191, 36], widthPct: carbsPct },
          { color: [52, 211, 153], widthPct: proteinPct },
          { color: [248, 113, 113], widthPct: fatPct },
        ],
        barMarkerPct: carbsPct,
        barLabels: [
          { text: `CARBS ${carbsPct}%`, pct: carbsPct / 2, align: 'center' },
          { text: `PROTEIN ${proteinPct}%`, pct: carbsPct + proteinPct / 2, align: 'center' },
          { text: `FAT ${fatPct}%`, pct: carbsPct + proteinPct + fatPct / 2, align: 'center' },
        ],
        sections: [
          {
            title: 'CALORIE BREAKDOWN',
            rows: [
              { label: 'CARBS', value: `${Math.round(carbsCalories)} kcal` },
              { label: 'PROTEIN', value: `${Math.round(proteinCalories)} kcal` },
              { label: 'FAT', value: `${Math.round(fatCalories)} kcal` },
            ],
            columns: 3,
          },
          {
            title: 'PERCENTAGE SPLIT',
            rows: [
              { label: 'CARBS', value: `${carbsPct}%` },
              { label: 'PROTEIN', value: `${proteinPct}%` },
              { label: 'FAT', value: `${fatPct}%` },
            ],
            columns: 3,
          },
        ],
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      setExportError('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Live Calculations
  const { 
    carbsGrams, proteinGrams, fatGrams,
    carbsCalories, proteinCalories, fatCalories,
    carbsPct, proteinPct, fatPct, sumPct,
    isInvalidInput 
  } = useMemo(() => {
    const defaultResult = { carbsGrams: 0, proteinGrams: 0, fatGrams: 0, carbsCalories: 0, proteinCalories: 0, fatCalories: 0, carbsPct: 0, proteinPct: 0, fatPct: 0, sumPct: 100, isInvalidInput: false };

    if (!preset) {
      return defaultResult;
    }

    if (calories.trim() === '') {
      return defaultResult;
    }
    const cals = parseFloat(calories);
    if (isNaN(cals) || cals <= 0 || cals > 10000) return { ...defaultResult, isInvalidInput: true };

    let cPct = 0;
    let pPct = 0;
    let fPct = 0;

    if (preset === 'custom') {
      cPct = customCarbs;
      pPct = customProtein;
      fPct = customFat;
    } else {
      const p = PRESETS[preset];
      cPct = p.carbs;
      pPct = p.protein;
      fPct = p.fat;
    }

    const sum = cPct + pPct + fPct;

    // Macro calorie targets
    const cCal = cals * (cPct / 100);
    const pCal = cals * (pPct / 100);
    const fCal = cals * (fPct / 100);

    // Grams (4 kcal/g for carbs & protein, 9 kcal/g for fat)
    const cGrams = cCal / 4;
    const pGrams = pCal / 4;
    const fGrams = fCal / 9;

    return {
      carbsGrams: cGrams,
      proteinGrams: pGrams,
      fatGrams: fGrams,
      carbsCalories: cCal,
      proteinCalories: pCal,
      fatCalories: fCal,
      carbsPct: cPct,
      proteinPct: pPct,
      fatPct: fPct,
      sumPct: sum,
      isInvalidInput: sum !== 100
    };
  }, [calories, preset, customCarbs, customProtein, customFat]);

  const isNameFilled = name.trim().length >= 2;
  const isCaloriesFilled = calories.trim() !== '';
  const hasStarted = isNameFilled || isCaloriesFilled || (preset !== '' && preset !== 'balanced');
  const hasAllRequired = isCaloriesFilled && !!preset;

  const isFresh = !hasStarted;
  const isInvalid = isInvalidInput;
  const isIncomplete = hasStarted && !hasAllRequired && !isInvalid;
  const isValid = hasAllRequired && !isInvalid;

  // Custom sliders adjustment helper
  const handleSliderChange = (type: 'carbs' | 'protein' | 'fat', value: number) => {
    if (type === 'carbs') {
      setCustomCarbs(value);
      // Adjust protein/fat proportionally to sum close to 100 if simple tweak,
      // but let the user balance it.
    } else if (type === 'protein') {
      setCustomProtein(value);
    } else {
      setCustomFat(value);
    }
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
                  <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Macro Split</h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-mute uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                    Calorie Balancer
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

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Daily Calorie Target</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="2000"
                    min="500"
                    max="10000"
                    className="w-full bg-canvas border border-hairline rounded-ui h-14 px-5 text-xl font-bold tracking-tighter text-ink focus:outline-none focus:ring-[6px] focus:ring-primary/[0.03] focus:border-ink shadow-premium-sm"
                  />
                </div>

                <div className="col-span-2 space-y-3 pt-4 border-t border-hairline">
                  <span className="text-xs font-mono text-mute uppercase tracking-[0.12em] ml-1">Diet Profile Preset</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['balanced', 'lowcarb', 'highprotein', 'keto', 'custom'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPreset(type)}
                        className={`py-3 text-[10px] font-mono font-bold uppercase tracking-[0.08em] transition-all rounded-full border focus-ring ${preset === type ? 'bg-[var(--color-accent)] text-[oklch(16%_0.02_262)] border-[var(--color-accent)] shadow-premium-sm' : 'bg-canvas text-mute border-hairline hover:text-ink hover:bg-canvas-soft'}`}
                      >
                        {type === 'lowcarb' ? 'Low Carb' : type === 'highprotein' ? 'High Protein' : type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {preset === 'custom' && (
                  <div className="col-span-2 pt-6 border-t border-hairline space-y-5">
                    <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.3em] ml-1 block">Adjust Ratios</span>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono font-bold uppercase">
                        <span>Carbohydrates</span>
                        <span>{customCarbs}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={customCarbs}
                        onChange={(e) => handleSliderChange('carbs', parseInt(e.target.value))}
                        className="w-full accent-ink bg-canvas border border-hairline rounded"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono font-bold uppercase">
                        <span>Protein</span>
                        <span>{customProtein}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={customProtein}
                        onChange={(e) => handleSliderChange('protein', parseInt(e.target.value))}
                        className="w-full accent-ink bg-canvas border border-hairline rounded"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono font-bold uppercase">
                        <span>Fats</span>
                        <span>{customFat}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={customFat}
                        onChange={(e) => handleSliderChange('fat', parseInt(e.target.value))}
                        className="w-full accent-ink bg-canvas border border-hairline rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-hairline/50">
                      <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Total Sum</span>
                      <span className={`text-sm font-black font-mono ${sumPct === 100 ? 'text-green-500' : 'text-red-500'}`}>
                        {sumPct}% / 100%
                      </span>
                    </div>
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
                    <h2 className="text-2xl font-black tracking-tighter text-ink leading-none mb-2">Macro Profile</h2>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Target Nutrient Splits</p>
                  </div>
                </div>
              </div>
              
              <ReportActions 
                onDownload={handleExport}
                isExporting={isExporting}
                hasResult={proteinGrams > 0 && sumPct === 100}
                isValidName={name.trim().length >= 2}
                calculatorType="macro"
                inputData={{
                  name, calories, preset, customCarbs, customProtein, customFat
                }}
                resultData={{
                  carbsGrams, proteinGrams, fatGrams, carbsCalories, proteinCalories, fatCalories, carbsPct, proteinPct, fatPct, sumPct
                }}
              />
              
              {exportError && (
                <p className="text-red-500 font-mono font-bold text-xs mt-3">{exportError}</p>
              )}
            </div>

            <div className="space-y-8 lg:space-y-10">
              {isFresh ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-mute font-mono font-bold text-[10px] uppercase tracking-widest text-center">Enter a daily calorie target to calculate macros</p>
                </div>
              ) : isInvalid ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-red-500 font-mono font-bold text-[10px] uppercase tracking-widest text-center">
                    {sumPct !== 100 ? "Custom sliders must equal exactly 100%" : "Check calorie target parameters"}
                  </p>
                </div>
              ) : isIncomplete ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-amber-500/80 font-mono font-bold text-[10px] uppercase tracking-widest text-center">
                    {!preset ? "Please select a diet profile" : "Please enter a valid calorie target"}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Gauge */}
                  <div id="macro-gauge-export" className="flex flex-col gap-8 py-8 px-6 sm:py-10 sm:px-8 bg-ink dark:bg-canvas border border-hairline/10 dark:border-hairline rounded-marketing shadow-premium-lg text-canvas dark:text-ink relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 w-full relative z-10">
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Daily Calorie Target</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-6xl sm:text-7xl font-black tracking-[-0.03em] text-canvas dark:text-ink leading-none">
                            {Math.round(parseFloat(calories)).toLocaleString()}
                          </span>
                          <span className="text-xs font-mono font-bold text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">kcal</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end text-left sm:text-right min-w-0">
                        <span className="text-[10px] font-mono font-bold text-canvas-soft/60 dark:text-mute uppercase tracking-[0.35em] mb-2">Diet Profile</span>
                        <span className="text-xl sm:text-2xl font-black tracking-tight break-words max-w-full text-canvas dark:text-ink leading-tight">
                          {preset.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="relative pt-4">
                      {/* Visual Bar Breakdown */}
                      <div className="h-3 w-full rounded-full overflow-hidden flex bg-canvas-soft/20 p-0">
                        <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${carbsPct}%` }} title={`Carbs: ${carbsPct}%`} />
                        <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${proteinPct}%` }} title={`Protein: ${proteinPct}%`} />
                        <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${fatPct}%` }} title={`Fat: ${fatPct}%`} />
                      </div>
                      <div className="flex justify-between mt-2 text-[8px] font-mono text-canvas-soft/50 dark:text-mute/50 uppercase tracking-widest">
                        <span>Carbs {carbsPct}%</span>
                        <span>Protein {proteinPct}%</span>
                        <span>Fats {fatPct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 3-Cell Grid of Secondary Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Protein */}
                    <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="inline-block w-2 h-2 rounded bg-emerald-400" />
                          <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em]">Protein</div>
                        </div>
                        <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                          {Math.round(proteinGrams)}g
                        </div>
                      </div>
                      <div className="w-full">
                        <div className="text-[8px] font-mono text-mute uppercase tracking-wider">{Math.round(proteinCalories)} kcal ({proteinPct}%)</div>
                      </div>
                    </div>

                    {/* Carbs */}
                    <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="inline-block w-2 h-2 rounded bg-amber-400" />
                          <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em]">Carbohydrates</div>
                        </div>
                        <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                          {Math.round(carbsGrams)}g
                        </div>
                      </div>
                      <div className="w-full">
                        <div className="text-[8px] font-mono text-mute uppercase tracking-wider">{Math.round(carbsCalories)} kcal ({carbsPct}%)</div>
                      </div>
                    </div>

                    {/* Fats */}
                    <div className="bg-surface-2 p-5 border border-hairline rounded-ui group hover:border-hairline-strong transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="inline-block w-2 h-2 rounded bg-red-400" />
                          <div className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em]">Dietary Fats</div>
                        </div>
                        <div className="text-xl sm:text-2xl font-mono font-bold text-ink tracking-tight mb-2">
                          {Math.round(fatGrams)}g
                        </div>
                      </div>
                      <div className="w-full">
                        <div className="text-[8px] font-mono text-mute uppercase tracking-wider">{Math.round(fatCalories)} kcal ({fatPct}%)</div>
                      </div>
                    </div>
                  </div>

                  {/* Informational Guidelines */}
                  <div className="bg-canvas border border-hairline rounded-ui p-6 space-y-3">
                    <h4 className="text-[10px] font-mono font-black text-ink uppercase tracking-widest">Nutrient Strategy</h4>
                    <p className="text-xs text-body leading-relaxed font-medium">
                      Your caloric budget is divided to support your select diet scheme: 
                      {preset === 'balanced' && " A Balanced ratio supplies steady carbohydrate glycogen energy, moderate amino acids for muscle upkeep, and healthy fats for hormone processing."}
                      {preset === 'lowcarb' && " A Low Carbohydrate intake targets fat oxidation and insulin control, keeping proteins high and raising healthy fat calories for satiety."}
                      {preset === 'highprotein' && " High Protein split maximizes thermogenesis, recovery, and hypertrophy, excellent for body recomp and intense training."}
                      {preset === 'keto' && " Ketogenic ratio keeps carbs under 5% to prompt liver ketone production, burning fat stores directly for daily fuel."}
                      {preset === 'custom' && " Custom macro split allows you to match unique macro ratios recommended by nutritional coaches or personal physiologists."}
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
