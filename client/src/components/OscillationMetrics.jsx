import React from 'react';
import { Activity, Clock, Repeat, Zap, Compass, Info, ArrowUpCircle, GitMerge, Layers } from 'lucide-react';

export default function OscillationMetrics({ 
  fluid, 
  physics, 
  liveMetrics, 
  springConfig,
  fluidMode = 'single',
  onTriggerReplay 
}) {
  if (!physics || !fluid) return null;

  const {
    regime,
    dampingRatio,
    frequency_Hz,
    timePeriod_s,
    totalOscillations,
    settlingTime_s,
    criticalDampingCoeff,
    dampingCoeff,
    qualityFactor,
    logDecrement,
    springNetInfo
  } = physics;

  const isOverdampedOrCritical = (regime === 'overdamped' || regime === 'critically_damped') && fluidMode === 'single';

  // Badge styling according to regime
  const getRegimeBadge = () => {
    switch (regime) {
      case 'undamped':
        return {
          label: 'Undamped (Ideal SHM)',
          color: 'text-sky-300 bg-sky-950/70 border-sky-500/50',
          desc: 'Energy is conserved; oscillations continue perpetually without loss.'
        };
      case 'underdamped':
        return {
          label: 'Underdamped (ζ < 1.0)',
          color: 'text-cyan-300 bg-cyan-950/70 border-cyan-500/50',
          desc: 'Oscillates back and forth with exponentially decaying amplitude envelope.'
        };
      case 'critically_damped':
        return {
          label: 'Critically Damped (ζ = 1.0)',
          color: 'text-emerald-300 bg-emerald-950/70 border-emerald-500/50',
          desc: 'Returns to equilibrium in minimum possible time with zero overshoot and 0 oscillations.'
        };
      case 'overdamped':
      default:
        return {
          label: 'Overdamped (ζ > 1.0)',
          color: 'text-amber-300 bg-amber-950/70 border-amber-500/50',
          desc: 'Heavy viscous resistance suppresses oscillation entirely; slow monotonic creep back to 0.'
        };
    }
  };

  const badge = getRegimeBadge();

  return (
    <div className="flex flex-col gap-4">
      {/* Regime Alert Banner */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl border ${badge.color} backdrop-blur-md gap-2`}>
        <div className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 flex-shrink-0" />
          <div>
            <span className="font-semibold text-sm tracking-wide">{badge.label}</span>
            <p className="text-xs text-slate-300/80 mt-0.5">{badge.desc}</p>
          </div>
        </div>
        <div className="text-xs font-mono px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/60 self-end sm:self-auto">
          Damping Ratio: <span className="font-bold text-white">{dampingRatio}</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Oscillations to 1% */}
        <div className="flex flex-col p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Oscillations to 1%</span>
            <Repeat className="w-4 h-4 text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-cyan-300 font-mono-num">
              {totalOscillations === 'Infinite' ? '∞' : totalOscillations}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {isOverdampedOrCritical ? 'cycles (None)' : 'cycles'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-auto">
            {isOverdampedOrCritical ? (
              <span className="text-amber-400 font-semibold">Non-oscillatory creep</span>
            ) : (
              <>Live: <strong className="text-cyan-400 font-bold">{liveMetrics?.cyclesCompleted ?? 0}</strong> executed</>
            )}
          </span>
        </div>

        {/* Metric 2: Damped Frequency */}
        <div className="flex flex-col p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Frequency (fd)</span>
            <Activity className="w-4 h-4 text-emerald-400 group-hover:scale-125 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-mono-num">
              {frequency_Hz}
            </span>
            <span className="text-xs text-slate-400 font-mono">Hz</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-auto">
            {isOverdampedOrCritical ? 'Aperiodic motion' : `ωd = ${physics.dampedAngularFreq_rad_s} rad/s`}
          </span>
        </div>

        {/* Metric 3: Time Period */}
        <div className="flex flex-col p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Time Period (Td)</span>
            <Clock className="w-4 h-4 text-amber-400 group-hover:scale-125 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono-num">
              {timePeriod_s ? timePeriod_s : '—'}
            </span>
            <span className="text-xs text-slate-400 font-mono">{timePeriod_s ? 's' : 'No cycle'}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-auto">
            Settling Time: <strong className="text-amber-400">{settlingTime_s}s</strong>
          </span>
        </div>

        {/* Metric 4: Damping Coefficient */}
        <div className="flex flex-col p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Damping Coeff (b)</span>
            <Compass className="w-4 h-4 text-purple-400 group-hover:scale-125 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-300 font-mono-num">
              {liveMetrics?.effectiveB ?? dampingCoeff}
            </span>
            <span className="text-xs text-slate-400 font-mono">N·s/m</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-auto">
            Critical bc = {criticalDampingCoeff} N·s/m
          </span>
        </div>
      </div>

      {/* Spring & Attachment Active Network Card */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div>
            <span className="text-slate-400">Spring Mode: </span>
            <span className="text-cyan-300 font-bold uppercase">{springConfig?.mode?.replace('_', ' + ')}</span>
            <span className="text-slate-500 ml-2">({springNetInfo?.description})</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold">
            k_eq = {springNetInfo?.k_eq ?? physics.springConstant} N/m
          </span>
        </div>
      </div>

      {/* Physics Clarification Banner for Overdamped Liquids */}
      {isOverdampedOrCritical && (
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-800/60 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-slate-300 leading-relaxed">
              <span className="font-semibold text-cyan-300">Why does this liquid show 0 Oscillations? </span>
              In high-viscosity liquids (Honey, Shampoo, Slime, Molasses, Glycerin), viscous shear damping ($b$) exceeds the critical threshold ($2\sqrt{km}$). Energy is dissipated so rapidly that the mass creeps directly to rest without oscillating.
            </div>
          </div>
          {onTriggerReplay && (
            <button
              onClick={onTriggerReplay}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors shadow-md"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Watch Creep (+12cm)</span>
            </button>
          )}
        </div>
      )}

      {/* Secondary Physics Diagnostics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-mono text-slate-400">
        <div>
          <span className="text-slate-500 block">Dynamic Viscosity (η):</span>
          <span className="text-slate-200 font-semibold">{fluid.viscosity_cP} cP ({fluid.viscosity_Pa_s} Pa·s)</span>
        </div>
        <div>
          <span className="text-slate-500 block">Quality Factor (Q):</span>
          <span className="text-cyan-300 font-semibold">{qualityFactor}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Log Decrement (δ):</span>
          <span className="text-emerald-300 font-semibold">{logDecrement}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Natural Freq (f₀):</span>
          <span className="text-amber-300 font-semibold">{physics.naturalFrequency_Hz} Hz</span>
        </div>
      </div>
    </div>
  );
}
