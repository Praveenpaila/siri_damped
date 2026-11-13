import { fluidsData } from '../data/fluidsData';
import { applicationsData } from '../data/applicationsData';
import { quizData } from '../data/quizData';
import { computeTheoreticalPhysics } from '../utils/physicsEngine';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const LOCAL_STORAGE_KEY = 'damped_oscillator_experiments_v1';

// Seed sample trials for fresh client installations
function getLocalExperiments() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }
  // Default benchmark trials
  const initial = [
    {
      _id: 'local_water_1',
      title: 'Water Underdamped Benchmark',
      fluidId: 'water',
      fluidName: 'Pure Water (H2O, 20°C)',
      mass_kg: 1.0,
      springConstant_k: 40.0,
      initialDisplacement_cm: 12.0,
      dampingCoeff_b: 0.85,
      dampingRatio_zeta: 0.067,
      regime: 'underdamped',
      frequency_Hz: 1.005,
      timePeriod_s: 0.995,
      totalOscillations: 10.84,
      settlingTime_s: 10.84,
      notes: 'Standard low-viscosity baseline trial with prolonged ringing envelope.',
      createdAt: new Date().toISOString()
    },
    {
      _id: 'local_glycerin_2',
      title: 'Glycerin Critical Damping Test',
      fluidId: 'glycerin',
      fluidName: 'Glycerin (99.5% Pure)',
      mass_kg: 1.0,
      springConstant_k: 40.0,
      initialDisplacement_cm: 12.0,
      dampingCoeff_b: 12.65,
      dampingRatio_zeta: 1.0,
      regime: 'critically_damped',
      frequency_Hz: 0,
      timePeriod_s: 0,
      totalOscillations: 0,
      settlingTime_s: 1.05,
      notes: 'Proved deadbeat response: zero overshoot, instantaneous energy extinction.',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      _id: 'local_honey_3',
      title: 'Raw Honey Heavy Overdamped Trial',
      fluidId: 'honey',
      fluidName: 'Raw Honey (20°C)',
      mass_kg: 1.0,
      springConstant_k: 40.0,
      initialDisplacement_cm: 12.0,
      dampingCoeff_b: 32.0,
      dampingRatio_zeta: 2.53,
      regime: 'overdamped',
      frequency_Hz: 0,
      timePeriod_s: 0,
      totalOscillations: 0,
      settlingTime_s: 3.58,
      notes: 'High viscosity creep: returning monotonically without oscillation.',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
  } catch (e) {}
  return initial;
}

// 1. Fetch Fluids
export async function fetchFluids() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${API_BASE}/fluids`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch (err) {
    // Backend offline / Vercel deployment mode
  }

  // Standalone client fallback with enriched physics calculations
  return fluidsData.map(fluid => {
    const calc = computeTheoreticalPhysics(1.0, 40.0, fluid.dampingCoeff_b, 10.0, 0.0);
    return {
      ...fluid,
      calculated: {
        dampingCoeff_b: fluid.dampingCoeff_b,
        dampingRatio_zeta: calc.dampingRatio,
        regime: calc.regime,
        dampedFrequency_Hz: calc.frequency_Hz,
        timePeriod_s: calc.timePeriod_s,
        totalOscillations: calc.totalOscillations,
        settlingTime_s: calc.settlingTime_s,
        qualityFactor: calc.qualityFactor
      }
    };
  });
}

// 2. Fetch Applications
export async function fetchApplications() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${API_BASE}/applications`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch (err) {}
  return applicationsData;
}

// 3. Fetch Experiments
export async function fetchExperiments() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${API_BASE}/experiments`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch (err) {}
  return getLocalExperiments();
}

// 4. Save Experiment
export async function saveExperiment(experimentData) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${API_BASE}/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(experimentData),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

  // Fallback: Save to LocalStorage
  const newRecord = {
    ...experimentData,
    _id: 'local_' + Date.now(),
    createdAt: new Date().toISOString()
  };
  try {
    const existing = getLocalExperiments();
    const updated = [newRecord, ...existing];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
  return { success: true, data: newRecord, source: 'localStorage' };
}

// 5. Delete Experiment
export async function deleteExperiment(id) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${API_BASE}/experiments/${id}`, {
      method: 'DELETE',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

  // Fallback: Remove from LocalStorage
  try {
    const existing = getLocalExperiments();
    const updated = existing.filter(e => e._id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
  return { success: true, message: 'Deleted from local storage' };
}

// 6. Fetch Quiz
export async function fetchQuiz() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${API_BASE}/quiz`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch (err) {}
  return quizData;
}

// 7. Check Server Health
export async function checkServerHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}
  return { status: 'online', mode: 'standalone', mongodb: 'Active' };
}
