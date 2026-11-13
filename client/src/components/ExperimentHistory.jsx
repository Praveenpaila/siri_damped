import React, { useState } from 'react';
import { Database, Trash2, RotateCcw, Download, Calendar, Tag } from 'lucide-react';
import { deleteExperiment } from '../services/api';

export default function ExperimentHistory({
  experiments = [],
  onReloadExperiment,
  onDeleteExperiment,
  source = 'mongodb'
}) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    setDeletingId(id);
    const res = await deleteExperiment(id);
    setDeletingId(null);
    if (res.success && onDeleteExperiment) {
      onDeleteExperiment(id);
    }
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(experiments, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `damped_oscillator_trials_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-100">Saved Experiments Log (MongoDB)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persisted simulation runs and comparative trials recorded in the database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-cyan-950/70 border border-cyan-800/80 text-cyan-300">
            Source: {source.toUpperCase()}
          </span>

          {experiments.length > 0 && (
            <button
              onClick={exportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Experiment Cards / Empty State */}
      {experiments.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
          <Database className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Saved Experiments Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Run a simulation with any liquid (e.g. Shampoo or Honey), adjust parameters, and click "Save Trial to MongoDB" to record it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {experiments.map((exp) => (
            <div
              key={exp._id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col gap-3 shadow-lg"
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{exp.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-cyan-400 font-medium">{exp.fluidName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {exp.regime}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(exp._id)}
                  disabled={deletingId === exp._id}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Delete from MongoDB"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Mass (m):</span>
                  <span className="text-slate-200">{exp.mass_kg} kg</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Spring (k):</span>
                  <span className="text-slate-200">{exp.springConstant_k} N/m</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Oscillations:</span>
                  <span className="text-cyan-300 font-bold">{exp.totalOscillations} cycles</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Frequency:</span>
                  <span className="text-emerald-300">{exp.frequency_Hz} Hz</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Damping (b):</span>
                  <span className="text-purple-300">{exp.dampingCoeff_b} N·s/m</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Damping Ratio:</span>
                  <span className="text-amber-300">ζ = {exp.dampingRatio_zeta}</span>
                </div>
              </div>

              {/* Notes */}
              {exp.notes && (
                <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/40">
                  "{exp.notes}"
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono mt-auto">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(exp.createdAt || exp.timestamp).toLocaleDateString()}</span>
                </span>

                <button
                  onClick={() => onReloadExperiment && onReloadExperiment(exp)}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-sans font-semibold transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Load Settings</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

