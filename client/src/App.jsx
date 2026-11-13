import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Oscillator3D from './components/Oscillator3D';
import PhysicsControls from './components/PhysicsControls';
import OscillationMetrics from './components/OscillationMetrics';
import LiveCharts from './components/LiveCharts';
import FluidsComparisonTable from './components/FluidsComparisonTable';
import Applications3D from './components/Applications3D';
import TheorySection from './components/TheorySection';
import ExperimentHistory from './components/ExperimentHistory';
import QuizSection from './components/QuizSection';

import { 
  fetchFluids, 
  fetchApplications, 
  fetchExperiments, 
  fetchQuiz, 
  checkServerHealth 
} from './services/api';
import { computeTheoreticalPhysics, calculateEquivalentSpringK } from './utils/physicsEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState('lab');
  const [fluids, setFluids] = useState([]);
  const [selectedFluid, setSelectedFluid] = useState(null);
  const [applications, setApplications] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [serverStatus, setServerStatus] = useState({ mongodb: 'connected', status: 'ok' });

  // Physics simulation parameters
  const [mass, setMass] = useState(1.0);           // kg
  const [initialX, setInitialX] = useState(12.0);   // cm
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simKey, setSimKey] = useState(0);          // Key to trigger fresh re-simulation

  // Spring & string network configuration
  const [springConfig, setSpringConfig] = useState({
    mode: 'single', // 'single', 'series', 'parallel', 'series_parallel'
    k1: 40.0,
    k2: 40.0,
    k3: 40.0
  });

  // Fluid Simulation Mode (Single 14 fluids vs Dual vs Triple Column)
  const [fluidMode, setFluidMode] = useState('single'); // 'single', 'dual', 'triple'
  const [layeredFluids, setLayeredFluids] = useState({
    top: null,
    mid: null,
    bot: null
  });

  // Damping Mode: 'oscillatory' (visible oscillations across ALL 14 fluids) vs 'overdamped' (theoretical non-oscillatory creep)
  const [fluidDampingType, setFluidDampingType] = useState('oscillatory');

  // Equivalent spring constant k_eq
  const springNet = calculateEquivalentSpringK(springConfig);
  const springK = springNet.k_eq;

  // Active damping coefficient
  const activeB = fluidDampingType === 'overdamped'
    ? (selectedFluid?.overdamped_b ?? selectedFluid?.dampingCoeff_b ?? 0.85)
    : (selectedFluid?.dampingCoeff_b ?? 0.70);

  // Live simulation telemetry at 60 FPS
  const [liveMetrics, setLiveMetrics] = useState({
    currentX: 12.0,
    currentV: 0.0,
    currentA: 0.0,
    kineticEnergy: 0.0,
    potentialEnergy: 0.288,
    totalEnergy: 0.288,
    cyclesCompleted: 0,
    elapsedTime: 0.0,
    isSettled: false,
    activeLayer: 'Fluid Medium',
    effectiveB: activeB,
    equivalentK: springK
  });

  // Calculate instant theoretical physics
  const calculatedPhysics = computeTheoreticalPhysics(
    mass,
    springK,
    activeB,
    initialX,
    0.0,
    springConfig
  );

  // Initial load from backend API
  useEffect(() => {
    async function loadData() {
      const health = await checkServerHealth();
      setServerStatus(health);

      const fluidsList = await fetchFluids();
      if (fluidsList && fluidsList.length > 0) {
        setFluids(fluidsList);
        const water = fluidsList.find(f => f.id === 'water') || fluidsList[0];
        const oil = fluidsList.find(f => f.id === 'olive_oil') || fluidsList[5] || fluidsList[0];
        const honey = fluidsList.find(f => f.id === 'honey') || fluidsList[10] || fluidsList[0];
        setSelectedFluid(water);
        setLayeredFluids({ top: oil, mid: water, bot: honey });
      }

      const apps = await fetchApplications();
      setApplications(apps);

      const exps = await fetchExperiments();
      setExperiments(exps);

      const quiz = await fetchQuiz();
      setQuizQuestions(quiz);
    }
    loadData();
  }, []);

  // Handler to force reset and replay from top
  const handleTriggerReplay = () => {
    setIsPlaying(true);
    setSimKey(prev => prev + 1);
  };

  const handleSelectFluid = (fluid) => {
    setSelectedFluid(fluid);
    setFluidMode('single');
    setIsPlaying(true);
    setSimKey(prev => prev + 1);
  };

  // Handle reload experiment trial
  const handleReloadExperiment = (exp) => {
    const matchingFluid = fluids.find(f => f.id === exp.fluidId);
    if (matchingFluid) setSelectedFluid(matchingFluid);
    setMass(exp.mass_kg);
    setSpringConfig({
      mode: 'single',
      k1: exp.springConstant_k,
      k2: exp.springConstant_k,
      k3: exp.springConstant_k
    });
    setInitialX(exp.initialDisplacement_cm);
    setIsPlaying(true);
    setSimKey(prev => prev + 1);
    setActiveTab('lab');
  };

  // Handle experiment deletion
  const handleDeleteExperiment = (id) => {
    setExperiments(prev => prev.filter(e => e._id !== id));
  };

  // Handle experiment save callback
  const handleExperimentSaved = (newRecord) => {
    setExperiments(prev => [newRecord, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Futuristic Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        serverStatus={serverStatus} 
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
        {/* TAB 1: 3D LABORATORY SIMULATOR */}
        {activeTab === 'lab' && (
          <div className="flex flex-col gap-6">
            {/* Top Row: 3D Viewport (Left) + Physics Controls & Metrics (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: 3D Canvas (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <Oscillator3D
                  fluid={selectedFluid}
                  mass={mass}
                  springK={springK}
                  springConfig={springConfig}
                  fluidMode={fluidMode}
                  layeredFluids={layeredFluids}
                  fluidDampingType={fluidDampingType}
                  initialDisplacement={initialX}
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  simSpeed={simSpeed}
                  simKey={simKey}
                  liveMetrics={liveMetrics}
                  setLiveMetrics={setLiveMetrics}
                  onCycleUpdate={(cycle) => {
                    // Update cycle telemetry
                  }}
                />

                {/* Real-time Charts beneath 3D viewport */}
                <LiveCharts 
                  physics={calculatedPhysics} 
                  liveMetrics={liveMetrics} 
                  fluid={selectedFluid}
                />
              </div>

              {/* Right Column: Telemetry Cards & Controls (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                {/* Real-Time Metrics & Regime Banner */}
                <OscillationMetrics
                  fluid={selectedFluid}
                  physics={calculatedPhysics}
                  liveMetrics={liveMetrics}
                  springConfig={springConfig}
                  fluidMode={fluidMode}
                  fluidDampingType={fluidDampingType}
                  onTriggerReplay={handleTriggerReplay}
                />

                {/* Physics Sliders, Spring Network & Multi-Fluid Controls */}
                <PhysicsControls
                  fluids={fluids}
                  selectedFluid={selectedFluid}
                  setSelectedFluid={handleSelectFluid}
                  fluidMode={fluidMode}
                  setFluidMode={setFluidMode}
                  layeredFluids={layeredFluids}
                  setLayeredFluids={setLayeredFluids}
                  fluidDampingType={fluidDampingType}
                  setFluidDampingType={setFluidDampingType}
                  mass={mass}
                  setMass={setMass}
                  springConfig={springConfig}
                  setSpringConfig={setSpringConfig}
                  initialX={initialX}
                  setInitialX={setInitialX}
                  simSpeed={simSpeed}
                  setSimSpeed={setSimSpeed}
                  calculatedPhysics={calculatedPhysics}
                  liveMetrics={liveMetrics}
                  onExperimentSaved={handleExperimentSaved}
                  onTriggerReplay={handleTriggerReplay}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 14+ FLUIDS COMPARATIVE MATRIX */}
        {activeTab === 'fluids' && (
          <FluidsComparisonTable
            fluids={fluids}
            selectedFluid={selectedFluid}
            onSelectFluid={(fluid) => {
              handleSelectFluid(fluid);
              setFluidMode('single');
              setActiveTab('lab');
            }}
          />
        )}

        {/* TAB 3: DAILY LIFE 3D APPLICATIONS */}
        {activeTab === 'applications' && (
          <Applications3D applications={applications} />
        )}

        {/* TAB 4: THEORY & ODE DERIVATION */}
        {activeTab === 'theory' && (
          <TheorySection />
        )}

        {/* TAB 5: MONGODB SAVED EXPERIMENTS */}
        {activeTab === 'history' && (
          <ExperimentHistory
            experiments={experiments}
            onReloadExperiment={handleReloadExperiment}
            onDeleteExperiment={handleDeleteExperiment}
            source={serverStatus.mongodb || 'mongodb'}
          />
        )}

        {/* TAB 6: QUIZ & MASTERY */}
        {activeTab === 'quiz' && (
          <QuizSection quizQuestions={quizQuestions} />
        )}
      </main>

      {/* Futuristic Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/90 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Damped Harmonic Oscillator (DHO) · MERN Stack Simulation Lab</span>
          <div className="flex items-center gap-3">
            <span className="text-cyan-400">Three.js WebGL</span>
            <span>•</span>
            <span className="text-emerald-400">MongoDB / Mongoose</span>
            <span>•</span>
            <span className="text-amber-400">Express / Node.js</span>
            <span>•</span>
            <span className="text-purple-400">React & Vite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
