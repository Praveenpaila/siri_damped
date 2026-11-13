import React, { useState } from 'react';
import { 
  Sliders, 
  Droplets, 
  Save, 
  Check, 
  ArrowUpCircle, 
  AlertCircle, 
  Layers, 
  GitMerge, 
  GitCommit, 
  Network, 
  Sparkles,
  Zap
} from 'lucide-react';
import { saveExperiment } from '../services/api';
import { calculateEquivalentSpringK } from '../utils/physicsEngine';

export default function PhysicsControls({
  fluids = [],
  selectedFluid,
  setSelectedFluid,
  fluidMode = 'single',
  setFluidMode,
  layeredFluids = { top: null, mid: null, bot: null },
  setLayeredFluids,
  fluidDampingType = 'oscillatory',
  setFluidDampingType,
  mass,
  setMass,
  springConfig = { mode: 'single', k1: 40.0, k2: 40.0, k3: 40.0 },
  setSpringConfig,
  initialX,
  setInitialX,
  simSpeed,
  setSimSpeed,
  calculatedPhysics,
  liveMetrics,
  onExperimentSaved,
  onTriggerReplay
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notes, setNotes] = useState('');
  const [experimentTitle, setExperimentTitle] = useState('');
  const [fluidCategory, setFluidCategory] = useState('all');

  const springNetInfo = calculateEquivalentSpringK(springConfig);

  const filteredFluids = fluids.filter(f => {
    if (fluidCategory === 'all') return true;
    if (fluidCategory === 'low') return ['vacuum', 'air', 'water', 'milk', 'kerosene'].includes(f.id);
    if (fluidCategory === 'medium') return ['olive_oil', 'motor_oil', 'mercury'].includes(f.id);
    if (fluidCategory === 'high') return ['castor_oil', 'glycerin', 'shampoo'].includes(f.id);
    if (fluidCategory === 'heavy') return ['honey', 'corn_syrup', 'polymer_gel'].includes(f.id);
    return true;
  });

  // Save experiment to MongoDB
  const handleSaveExperiment = async () => {
    if (!selectedFluid || !calculatedPhysics) return;
    setIsSaving(true);

    const title = experimentTitle.trim() || `${fluidMode === 'single' ? selectedFluid.name : `${fluidMode}-Fluid Column`} (${mass}kg, ${springConfig.mode}, k_eq=${springNetInfo.k_eq})`;
    const payload = {
      title,
      fluidId: selectedFluid.id,
      fluidName: fluidMode === 'single' ? selectedFluid.name : `${fluidMode.toUpperCase()} Column (${layeredFluids.top?.name || ''} / ${layeredFluids.bot?.name || ''})`,
      mass_kg: mass,
      springConstant_k: springNetInfo.k_eq,
      initialDisplacement_cm: initialX,
      dampingCoeff_b: selectedFluid.dampingCoeff_b,
      dampingRatio_zeta: calculatedPhysics.dampingRatio,
      regime: calculatedPhysics.regime,
      frequency_Hz: calculatedPhysics.frequency_Hz,
      timePeriod_s: calculatedPhysics.timePeriod_s || 0,
      totalOscillations: calculatedPhysics.totalOscillations === 'Infinite' ? 9999 : Number(calculatedPhysics.totalOscillations),
      settlingTime_s: calculatedPhysics.settlingTime_s === 'Infinite' ? 9999 : Number(calculatedPhysics.settlingTime_s),
      notes: notes.trim()
    };

    const res = await saveExperiment(payload);
    setIsSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      if (onExperimentSaved) onExperimentSaved(res.data);
      setTimeout(() => {
        setSaveSuccess(false);
        setExperimentTitle('');
        setNotes('');
      }, 3000);
    }
  };

  // Helper to select single fluid
  const handleFluidSelect = (targetFluid) => {
    if (!targetFluid) return;
    if (setFluidMode) setFluidMode('single');
    setSelectedFluid(targetFluid);
    if (onTriggerReplay) onTriggerReplay();
  };

  // Spring mode switcher
  const handleSpringModeChange = (mode) => {
    setSpringConfig(prev => ({ ...prev, mode }));
    if (onTriggerReplay) onTriggerReplay();
  };

  const updateSpringK = (key, val) => {
    setSpringConfig(prev => ({
      ...prev,
      [key]: parseFloat(val)
    }));
  };

  // Quick Presets for Multi-Fluid Density Columns
  const applyMultiFluidPreset = (presetKey) => {
    if (presetKey === 'oil_water') {
      setFluidMode('dual');
      const top = fluids.find(f => f.id === 'olive_oil') || fluids[5];
      const bot = fluids.find(f => f.id === 'water') || fluids[2];
      setLayeredFluids({ top, mid: null, bot });
    } else if (presetKey === 'water_honey') {
      setFluidMode('dual');
      const top = fluids.find(f => f.id === 'water') || fluids[2];
      const bot = fluids.find(f => f.id === 'honey') || fluids[10];
      setLayeredFluids({ top, mid: null, bot });
    } else if (presetKey === 'oil_water_honey') {
      setFluidMode('triple');
      const top = fluids.find(f => f.id === 'olive_oil') || fluids[5];
      const mid = fluids.find(f => f.id === 'water') || fluids[2];
      const bot = fluids.find(f => f.id === 'honey') || fluids[10];
      setLayeredFluids({ top, mid, bot });
    } else if (presetKey === 'kerosene_milk_glycerin') {
      setFluidMode('triple');
      const top = fluids.find(f => f.id === 'kerosene') || fluids[4];
      const mid = fluids.find(f => f.id === 'milk') || fluids[3];
      const bot = fluids.find(f => f.id === 'glycerin') || fluids[8];
      setLayeredFluids({ top, mid, bot });
    }
    if (onTriggerReplay) onTriggerReplay();
  };

  const isOverdampedOrCritical = (calculatedPhysics?.regime === 'overdamped' || calculatedPhysics?.regime === 'critically_damped') && fluidMode === 'single';

  return (
    <div className="flex flex-col gap-5 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-slate-100">Physics Laboratory Controls</h2>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800 text-cyan-300">
          MERN Connected
        </span>
      </div>

      {/* 1. DAMPING REGIME TOGGLE: VISIBLE OSCILLATIONS IN ALL FLUIDS VS THEORETICAL OVERDAMPING */}
      <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Fluid Damping Dynamics</span>
          </label>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
            {fluidDampingType === 'oscillatory' ? 'Visible in All 14 Fluids' : 'Theoretical Creep (N=0)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => { if (setFluidDampingType) setFluidDampingType('oscillatory'); if (onTriggerReplay) onTriggerReplay(); }}
            className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
              fluidDampingType === 'oscillatory'
                ? 'bg-cyan-500/20 text-cyan-100 border-cyan-400 shadow-md shadow-cyan-500/10'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-cyan-300">
              <span>🌊 Observable Oscillations</span>
              {fluidDampingType === 'oscillatory' && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
            </div>
            <div className="text-[11px] text-slate-300/80 mt-1 leading-snug">
              Calibrated so you can <strong>clearly see harmonic oscillations</strong> in every fluid (including Honey, Shampoo & Slime).
            </div>
          </button>

          <button
            onClick={() => { if (setFluidDampingType) setFluidDampingType('overdamped'); if (onTriggerReplay) onTriggerReplay(); }}
            className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
              fluidDampingType === 'overdamped'
                ? 'bg-amber-500/20 text-amber-100 border-amber-400 shadow-md shadow-amber-500/10'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <span>🍯 Theoretical Overdamping</span>
              {fluidDampingType === 'overdamped' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
            </div>
            <div className="text-[11px] text-slate-300/80 mt-1 leading-snug">
              Pure monotonic creep (ζ ≥ 1.0, 0 oscillations in viscous fluids). Bob oozes to center without swinging.
            </div>
          </button>
        </div>
      </div>

      {/* 2. SPRING & STRING CONFIGURATION SECTION */}
      <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-cyan-500/20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <GitMerge className="w-4 h-4 text-cyan-400" />
            <span>Spring & String Network</span>
          </label>
          <span className="text-xs font-mono font-bold text-emerald-400">
            k_eq = {springNetInfo.k_eq} N/m
          </span>
        </div>

        {/* Spring Mode Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => handleSpringModeChange('single')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
              springConfig.mode === 'single'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            1. Single Spring
          </button>

          <button
            onClick={() => handleSpringModeChange('series')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
              springConfig.mode === 'series'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            2. Series (2 Springs)
          </button>

          <button
            onClick={() => handleSpringModeChange('parallel')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
              springConfig.mode === 'parallel'
                ? 'bg-blue-500 text-slate-950 border-blue-400 font-bold shadow-md shadow-blue-500/20'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            3. Parallel (2 Springs)
          </button>

          <button
            onClick={() => handleSpringModeChange('series_parallel')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
              springConfig.mode === 'series_parallel'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            4. Series + Parallel
          </button>
        </div>

        {/* Dynamic Formula & Physics Explanation */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Formula:</span>
          <span className="text-cyan-300 font-bold">
            {springConfig.mode === 'single' && 'k_eq = k₁'}
            {springConfig.mode === 'series' && '1/k_eq = 1/k₁ + 1/k₂  ⇒  k_eq = (k₁·k₂)/(k₁+k₂)'}
            {springConfig.mode === 'parallel' && 'k_eq = k₁ + k₂'}
            {springConfig.mode === 'series_parallel' && 'k_eq = ((k₁+k₂)·k₃) / ((k₁+k₂)+k₃)'}
          </span>
        </div>

        {/* Sliders for Individual Spring Constants (k1, k2, k3) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {/* Spring 1 (k1) */}
          <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Spring 1 (k₁)</span>
              <span className="font-mono text-cyan-400 font-bold">{(springConfig.k1 || 40).toFixed(1)} N/m</span>
            </div>
            <input
              type="range"
              min="10.0"
              max="100.0"
              step="2.0"
              value={springConfig.k1 || 40}
              onChange={(e) => updateSpringK('k1', e.target.value)}
              className="w-full accent-cyan-400 cursor-pointer h-1.5"
            />
          </div>

          {/* Spring 2 (k2) - in Series, Parallel, or Series-Parallel */}
          {springConfig.mode !== 'single' && (
            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Spring 2 (k₂)</span>
                <span className="font-mono text-emerald-400 font-bold">{(springConfig.k2 || 40).toFixed(1)} N/m</span>
              </div>
              <input
                type="range"
                min="10.0"
                max="100.0"
                step="2.0"
                value={springConfig.k2 || 40}
                onChange={(e) => updateSpringK('k2', e.target.value)}
                className="w-full accent-emerald-400 cursor-pointer h-1.5"
              />
            </div>
          )}

          {/* Spring 3 (k3) - in Series-Parallel */}
          {springConfig.mode === 'series_parallel' && (
            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Series Spring (k₃)</span>
                <span className="font-mono text-amber-400 font-bold">{(springConfig.k3 || 40).toFixed(1)} N/m</span>
              </div>
              <input
                type="range"
                min="10.0"
                max="100.0"
                step="2.0"
                value={springConfig.k3 || 40}
                onChange={(e) => updateSpringK('k3', e.target.value)}
                className="w-full accent-amber-400 cursor-pointer h-1.5"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. FLUID MODE: SINGLE (14 FLUIDS) OR 2/3 FLUIDS LAYERED */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span>Fluid Simulation Mode</span>
          </label>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setFluidMode('single'); if (onTriggerReplay) onTriggerReplay(); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                fluidMode === 'single'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single Fluid (14)
            </button>
            <button
              onClick={() => { applyMultiFluidPreset('oil_water'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                fluidMode === 'dual'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2 Fluids Layered
            </button>
            <button
              onClick={() => { applyMultiFluidPreset('oil_water_honey'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                fluidMode === 'triple'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3 Fluids Column
            </button>
          </div>
        </div>

        {/* MULTI-FLUID LAYERED PICKERS */}
        {fluidMode !== 'single' && (
          <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-300">
                Density Stratification Stack:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                <button
                  onClick={() => applyMultiFluidPreset('oil_water_honey')}
                  className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono border border-slate-700"
                >
                  Oil + Water + Honey
                </button>
                <button
                  onClick={() => applyMultiFluidPreset('kerosene_milk_glycerin')}
                  className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono border border-slate-700"
                >
                  Kerosene + Milk + Glycerin
                </button>
              </div>
            </div>

            {/* Layer 1: Top Fluid */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layeredFluids.top?.color || '#84cc16' }} />
                <span className="font-mono text-slate-400">Top Layer:</span>
              </div>
              <select
                value={layeredFluids.top?.id || 'olive_oil'}
                onChange={(e) => {
                  const f = fluids.find(x => x.id === e.target.value);
                  setLayeredFluids(prev => ({ ...prev, top: f }));
                  if (onTriggerReplay) onTriggerReplay();
                }}
                className="bg-slate-800 text-slate-100 rounded px-2 py-1 text-xs border border-slate-700 outline-none"
              >
                {fluids.map(f => (
                  <option key={f.id} value={f.id}>{f.name} (ρ={f.density_kg_m3} kg/m³)</option>
                ))}
              </select>
            </div>

            {/* Layer 2: Middle Fluid (if Triple) */}
            {fluidMode === 'triple' && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layeredFluids.mid?.color || '#06b6d4' }} />
                  <span className="font-mono text-slate-400">Middle Layer:</span>
                </div>
                <select
                  value={layeredFluids.mid?.id || 'water'}
                  onChange={(e) => {
                    const f = fluids.find(x => x.id === e.target.value);
                    setLayeredFluids(prev => ({ ...prev, mid: f }));
                    if (onTriggerReplay) onTriggerReplay();
                  }}
                  className="bg-slate-800 text-slate-100 rounded px-2 py-1 text-xs border border-slate-700 outline-none"
                >
                  {fluids.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (ρ={f.density_kg_m3} kg/m³)</option>
                  ))}
                </select>
              </div>
            )}

            {/* Layer 3: Bottom Fluid */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layeredFluids.bot?.color || '#f59e0b' }} />
                <span className="font-mono text-slate-400">Bottom Layer:</span>
              </div>
              <select
                value={layeredFluids.bot?.id || (fluidMode === 'dual' ? 'water' : 'honey')}
                onChange={(e) => {
                  const f = fluids.find(x => x.id === e.target.value);
                  setLayeredFluids(prev => ({ ...prev, bot: f }));
                  if (onTriggerReplay) onTriggerReplay();
                }}
                className="bg-slate-800 text-slate-100 rounded px-2 py-1 text-xs border border-slate-700 outline-none"
              >
                {fluids.map(f => (
                  <option key={f.id} value={f.id}>{f.name} (ρ={f.density_kg_m3} kg/m³)</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* SINGLE FLUID PICKER */}
        {fluidMode === 'single' && (
          <div className="flex flex-col gap-2.5">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-mono">
              {[
                { id: 'all', label: `All (14)` },
                { id: 'low', label: 'Low Drag' },
                { id: 'medium', label: 'Oils & Hg' },
                { id: 'high', label: 'Viscous Dashpot' },
                { id: 'heavy', label: 'Honey & Slime' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFluidCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap ${
                    fluidCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Fluid Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {filteredFluids.map((fluid) => {
                const isSelected = selectedFluid?.id === fluid.id;
                const effB = fluidDampingType === 'overdamped' 
                  ? (fluid.overdamped_b ?? fluid.dampingCoeff_b)
                  : fluid.dampingCoeff_b;

                return (
                  <button
                    key={fluid.id}
                    onClick={() => handleFluidSelect(fluid)}
                    className={`flex flex-col p-2.5 rounded-xl text-left border transition-all relative ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-base flex-shrink-0">{fluid.emoji || '💧'}</span>
                        <span className="font-semibold text-xs truncate text-slate-100 font-sans">
                          {fluid.name.split(' (')[0]}
                        </span>
                      </div>
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20 ml-1"
                        style={{ backgroundColor: fluid.color }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-0.5">
                      <span>η: {fluid.viscosity_cP < 10 ? fluid.viscosity_cP : Math.round(fluid.viscosity_cP)} cP</span>
                      <span className={isSelected ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                        b: {effB}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="absolute top-1 right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Fluid High-Definition Feature Card */}
            {selectedFluid && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/30 animate-fadeIn">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl p-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow">
                      {selectedFluid.emoji || '💧'}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-100">{selectedFluid.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                          {selectedFluid.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ρ = {selectedFluid.density_kg_m3} kg/m³ · η = {selectedFluid.viscosity_cP} cP
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-amber-400 block">
                      b = {calculatedPhysics.dampingCoeff} N·s/m
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {calculatedPhysics.regime === 'overdamped' ? 'Creep (N=0)' : `~${calculatedPhysics.totalOscillations} cycles`}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-snug">
                  {selectedFluid.description}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
                  <span className="truncate max-w-[240px]">
                    🔬 <strong className="text-slate-300">Physics:</strong> {selectedFluid.molecularOrigin || selectedFluid.realWorldExample}
                  </span>
                  <button
                    onClick={() => { if (onTriggerReplay) onTriggerReplay(); }}
                    className="flex-shrink-0 px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 font-medium"
                  >
                    Re-Simulate ↺
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notice for Overdamped Liquids when in Theoretical Overdamping Mode */}
      {isOverdampedOrCritical && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-slate-300 leading-snug">
            <strong className="text-amber-300 block mb-0.5">
              Theoretical Overdamping Active ({selectedFluid?.name})
            </strong>
            Damping ratio ζ &gt; 1.0 creates non-oscillatory creep. To see the bob oscillate in this fluid, click <strong>"Observable Oscillations"</strong> above!
          </div>
        </div>
      )}

      {/* 4. MASS AND INITIAL DISPLACEMENT SLIDERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Mass Slider */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Bob Mass (m)</span>
            <span className="font-mono text-cyan-400 font-bold">{mass.toFixed(2)} kg</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="4.0"
            step="0.1"
            value={mass}
            onChange={(e) => setMass(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.2 kg</span>
            <span>2.0 kg</span>
            <span>4.0 kg</span>
          </div>
        </div>

        {/* Initial Displacement Slider */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Initial Pull (x₀)</span>
            <span className="font-mono text-amber-400 font-bold">{initialX.toFixed(1)} cm</span>
          </div>
          <input
            type="range"
            min="-15.0"
            max="15.0"
            step="0.5"
            value={initialX}
            onChange={(e) => setInitialX(parseFloat(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-15 cm</span>
            <span>0 cm</span>
            <span>+15 cm</span>
          </div>
        </div>
      </div>

      {/* Speed Controls & Save Button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Sim Speed:</span>
          {[0.25, 0.5, 1.0, 2.0].map((s) => (
            <button
              key={s}
              onClick={() => setSimSpeed(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                simSpeed === s
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Save to MongoDB Button */}
        <button
          onClick={handleSaveExperiment}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            saveSuccess
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60 hover:bg-cyan-900/80'
          }`}
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Saved to MongoDB!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-cyan-400" />
              <span>{isSaving ? 'Saving...' : 'Save Trial'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
