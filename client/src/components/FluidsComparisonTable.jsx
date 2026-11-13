import React, { useState } from 'react';
import { Droplet, Search, ArrowUpDown, Play, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export default function FluidsComparisonTable({ fluids = [], onSelectFluid, selectedFluid }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegime, setFilterRegime] = useState('all'); // 'all', 'underdamped', 'critically_damped', 'overdamped'
  const [sortBy, setSortBy] = useState('dampingCoeff_b'); // 'oscillations', 'dampingCoeff_b', 'viscosity_cP', 'frequency_Hz'
  const [sortAsc, setSortAsc] = useState(true);

  // Filter & Search
  const filteredFluids = fluids.filter(fluid => {
    const matchesSearch = fluid.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fluid.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fluid.description.toLowerCase().includes(searchTerm.toLowerCase());
    const regime = fluid.calculated?.regime || 'underdamped';
    const matchesRegime = filterRegime === 'all' || regime === filterRegime;
    return matchesSearch && matchesRegime;
  });

  // Sort
  const sortedFluids = [...filteredFluids].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'oscillations') {
      valA = a.calculated?.totalOscillations === 'Infinite' ? 999999 : (Number(a.calculated?.totalOscillations) || 0);
      valB = b.calculated?.totalOscillations === 'Infinite' ? 999999 : (Number(b.calculated?.totalOscillations) || 0);
    } else if (sortBy === 'dampingCoeff_b') {
      valA = a.dampingCoeff_b;
      valB = b.dampingCoeff_b;
    } else if (sortBy === 'viscosity_cP') {
      valA = a.viscosity_cP;
      valB = b.viscosity_cP;
    } else if (sortBy === 'frequency_Hz') {
      valA = a.calculated?.dampedFrequency_Hz || 0;
      valB = b.calculated?.dampedFrequency_Hz || 0;
    } else {
      valA = a.name;
      valB = b.name;
    }
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  // Helper for regime badge styling
  const getRegimeTag = (regime) => {
    if (regime === 'undamped') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950 border border-sky-800 text-sky-300">Undamped</span>;
    }
    if (regime === 'underdamped') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 border border-cyan-800 text-cyan-300">Underdamped</span>;
    }
    if (regime === 'critically_damped') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300">Critically Damped</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 border border-amber-800 text-amber-300">Overdamped</span>;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-100">14+ Fluids Comparative Physics Matrix</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Recorded benchmark of 14 distinct mediums (Air, Water, Milk, Kerosene, Olive Oil, Motor Oil, Castor Oil, Glycerin, Shampoo, Honey, Molasses, Mercury, Polymer Gel, Vacuum) under standard benchmark configuration (<code className="text-cyan-300">m = 1.0 kg, k = 40.0 N/m, x₀ = 10 cm</code>).
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search fluids (e.g. honey, shampoo)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          {/* Regime Filter Dropdown */}
          <select
            value={filterRegime}
            onChange={(e) => setFilterRegime(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
          >
            <option value="all">All Regimes ({fluids.length})</option>
            <option value="underdamped">Underdamped</option>
            <option value="critically_damped">Critically Damped</option>
            <option value="overdamped">Overdamped</option>
          </select>
        </div>
      </div>

      {/* Visual Bar Comparison Chart (Number of Oscillations) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>📊 Number of Oscillations to 1% Amplitude Across Fluids</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Higher bar = longer oscillation ringing before rest
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {fluids.map((f) => {
            const rawOsc = f.calculated?.totalOscillations;
            const osc = rawOsc === 'Infinite' ? 120 : (Number(rawOsc) || 0);
            const isSelected = selectedFluid?.id === f.id;
            const barHeightPct = Math.min(100, Math.max(4, (osc / 120) * 100));

            return (
              <div
                key={f.id}
                onClick={() => onSelectFluid(f)}
                className={`flex flex-col items-center p-2.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-400 shadow-md shadow-cyan-500/10 scale-105'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* Bar representation */}
                <div className="w-full h-20 flex items-end justify-center my-1">
                  <div
                    className="w-4 rounded-t-md transition-all duration-500 shadow-sm"
                    style={{
                      height: `${barHeightPct}%`,
                      backgroundColor: f.color
                    }}
                  />
                </div>

                {/* Oscillations value */}
                <div className="flex items-center gap-1">
                  <span className="text-xs">{f.emoji || '💧'}</span>
                  <span className="font-mono text-xs font-bold text-slate-100">
                    {rawOsc === 'Infinite' ? '∞' : rawOsc}
                  </span>
                </div>

                {/* Name */}
                <span className="text-[10px] text-slate-400 text-center truncate w-full mt-0.5">
                  {f.name.split(' (')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
              <th className="p-3.5 font-medium">Liquid Medium</th>
              <th className="p-3.5 font-medium cursor-pointer hover:text-cyan-400" onClick={() => handleSort('viscosity_cP')}>
                <div className="flex items-center gap-1">
                  <span>Viscosity (η)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3.5 font-medium cursor-pointer hover:text-cyan-400" onClick={() => handleSort('dampingCoeff_b')}>
                <div className="flex items-center gap-1">
                  <span>Damping Coeff (b)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3.5 font-medium cursor-pointer hover:text-cyan-400" onClick={() => handleSort('oscillations')}>
                <div className="flex items-center gap-1">
                  <span>Oscillations to 1% (N)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3.5 font-medium cursor-pointer hover:text-cyan-400" onClick={() => handleSort('frequency_Hz')}>
                <div className="flex items-center gap-1">
                  <span>Frequency (fd)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3.5 font-medium">Time Period (Td)</th>
              <th className="p-3.5 font-medium">Regime (ζ)</th>
              <th className="p-3.5 font-medium text-right">Load Simulator</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {sortedFluids.map((fluid) => {
              const isSelected = selectedFluid?.id === fluid.id;
              const calc = fluid.calculated || {};

              return (
                <tr
                  key={fluid.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-cyan-950/30' : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Fluid Name and Color */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl flex-shrink-0">{fluid.emoji || '💧'}</span>
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20 shadow-sm"
                        style={{ backgroundColor: fluid.color }}
                      />
                      <div>
                        <span className="font-semibold text-slate-100 block text-xs font-sans">
                          {fluid.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {fluid.category}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Dynamic Viscosity */}
                  <td className="p-3.5 font-mono-num text-slate-300">
                    <div>{fluid.viscosity_cP} cP</div>
                    <div className="text-[10px] text-slate-500">{fluid.viscosity_Pa_s} Pa·s</div>
                  </td>

                  {/* Damping Coeff b */}
                  <td className="p-3.5 font-mono-num text-cyan-300 font-semibold">
                    {fluid.dampingCoeff_b} N·s/m
                  </td>

                  {/* Total Oscillations to 1% */}
                  <td className="p-3.5 font-mono-num">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      calc.totalOscillations === 0
                        ? 'bg-amber-950/50 text-amber-400 border border-amber-800/50'
                        : calc.totalOscillations === 'Infinite'
                        ? 'bg-sky-950/50 text-sky-300 border border-sky-800/50'
                        : 'bg-cyan-950/50 text-cyan-300 border border-cyan-800/50'
                    }`}>
                      {calc.totalOscillations === 'Infinite' ? '∞ perpetual' : `${calc.totalOscillations} cycles`}
                    </span>
                  </td>

                  {/* Frequency */}
                  <td className="p-3.5 font-mono-num text-emerald-300">
                    {calc.dampedFrequency_Hz ? `${calc.dampedFrequency_Hz} Hz` : '0 Hz (No Osc)'}
                  </td>

                  {/* Time Period */}
                  <td className="p-3.5 font-mono-num text-amber-300">
                    {calc.timePeriod_s ? `${calc.timePeriod_s} s` : '∞'}
                  </td>

                  {/* Regime Tag */}
                  <td className="p-3.5">
                    <div className="flex flex-col items-start gap-1">
                      {getRegimeTag(calc.regime)}
                      <span className="text-[10px] text-slate-500 font-mono">ζ = {calc.dampingRatio_zeta}</span>
                    </div>
                  </td>

                  {/* Action button */}
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => onSelectFluid(fluid)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-sans transition-all inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isSelected ? 'Active' : 'Load 3D'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

