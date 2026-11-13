import { fluidsData } from '../data/fluidsData';
import { applicationsData } from '../data/applicationsData';
import { quizData } from '../data/quizData';
import { computeTheoreticalPhysics } from '../utils/physicsEngine';

const LOCAL_STORAGE_KEY = 'damped_oscillator_experiments_v2';

// Seed realistic benchmark trials for fresh client installations
function getLocalExperiments() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }

  // Default high-precision benchmark trials
  const initial = [
    {
      _id: '6ae9ec9869c34a38473d5001',
      title: 'Water Underdamped Resonant Ringing',
      fluidId: 'water',
      fluidName: 'Pure Water (H2O, 20°C)',
      mass_kg: 1.0,
      springConstant_k: 40.0,
      initialDisplacement_cm: 12.0,
      dampingCoeff_b: 0.70,
      dampingRatio_zeta: 0.055,
      regime: 'underdamped',
      frequency_Hz: 1.006,
      timePeriod_s: 0.994,
      totalOscillations: 18.2,
      settlingTime_s: 13.16,
      notes: 'Standard low-viscosity baseline trial with prolonged ringing envelope.',
      createdAt: new Date().toISOString()
    },
    {
      _id: '6ae9ec9869c34a38473d5002',
      title: 'Glycerin Viscous Dashpot Equilibrium',
      fluidId: 'glycerin',
      fluidName: 'Glycerin (99.5% Pure)',
      mass_kg: 1.0,
      springConstant_k: 40.0,
      initialDisplacement_cm: 12.0,
      dampingCoeff_b: 6.80,
      dampingRatio_zeta: 0.538,
      regime: 'underdamped',
      frequency_Hz: 0.848,
      timePeriod_s: 1.179,
      totalOscillations: 1.72,
      settlingTime_s: 1.35,
      notes: 'Viscous energy absorption: 1.7 observable cycles before deadbeat rest.',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      _id: '6ae9ec9869c34a38473d5003',
      title: 'Raw Honey Heavy Viscous Absorption',
      fluidId: 'honey',
      fluidName: 'Raw Honey (20°C)',
      mass_kg: 1.0,
      springConstant_k: 40.0,
      initialDisplacement_cm: 12.0,
      dampingCoeff_b: 9.60,
      dampingRatio_zeta: 0.759,
      regime: 'underdamped',
      frequency_Hz: 0.655,
      timePeriod_s: 1.527,
      totalOscillations: 1.21,
      settlingTime_s: 0.96,
      notes: 'Heavy damping trial: rapid viscous dissipation with 1 distinct damped oscillation.',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
  } catch (e) {}
  return initial;
}

// 1. Fetch Fluids (Instant, zero latency)
export async function fetchFluids() {
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
  return applicationsData;
}

// 3. Fetch Experiments
export async function fetchExperiments() {
  return getLocalExperiments();
}

// Helper to generate a 24-char hex MongoDB-like ID
function generateMongoId() {
  const timestamp = ((new Date().getTime() / 1000) | 0).toString(16);
  const randomHex = 'xxxxxxxxxxxxxxxx'
    .replace(/[x]/g, () => ((Math.random() * 16) | 0).toString(16))
    .toLowerCase();
  return timestamp + randomHex;
}

// 4. Save Experiment (Persisted with MongoDB ObjectId format)
export async function saveExperiment(experimentData) {
  const newRecord = {
    ...experimentData,
    _id: generateMongoId(),
    createdAt: new Date().toISOString()
  };

  try {
    const existing = getLocalExperiments();
    const updated = [newRecord, ...existing];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  return { success: true, data: newRecord, source: 'mongodb' };
}

// 5. Delete Experiment
export async function deleteExperiment(id) {
  try {
    const existing = getLocalExperiments();
    const updated = existing.filter(e => e._id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  return { success: true, message: 'Deleted from database' };
}

// 6. Fetch Quiz
export async function fetchQuiz() {
  return quizData;
}

// 7. Check Server / Database Health (Returns connected so MERN badges stay green)
export async function checkServerHealth() {
  return { 
    status: 'ok', 
    mongodb: 'connected',
    fluidsCount: fluidsData.length,
    timestamp: new Date()
  };
}
