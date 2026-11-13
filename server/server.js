const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const fluidsData = require('./data/fluidsData');
const applicationsData = require('./data/applicationsData');
const Fluid = require('./models/Fluid');
const Experiment = require('./models/Experiment');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/damped_oscillator_db';

app.use(cors());
app.use(express.json());

// In-memory fallback cache in case MongoDB is temporarily disconnected
let memoryExperiments = [];

// Connect to MongoDB
let isMongoConnected = false;
mongoose.connect(MONGODB_URI)
  .then(async () => {
    isMongoConnected = true;
    console.log('✓ Successfully connected to MongoDB at', MONGODB_URI);
    // Seed or synchronize fluids collection
    try {
      for (const fluid of fluidsData) {
        await Fluid.findOneAndUpdate(
          { id: fluid.id },
          fluid,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
      console.log(`✓ Synchronized all ${fluidsData.length} fluids with MongoDB.`);
    } catch (seedErr) {
      console.warn('Note on fluid seeding:', seedErr.message);
    }
  })
  .catch((err) => {
    console.warn('MongoDB connection warning:', err.message);
    console.log('Using in-memory data store as fallback.');
  });

// Physics Calculation Helper
function calculateOscillatorPhysics(mass = 1.0, k = 40.0, b = 0.85, x0 = 10.0, v0 = 0.0) {
  const m = Math.max(0.1, Number(mass));
  const spring_k = Math.max(0.1, Number(k));
  const damp_b = Math.max(0.0, Number(b));
  const init_x = Number(x0);
  const init_v = Number(v0);

  const omega0 = Math.sqrt(spring_k / m); // natural frequency in rad/s
  const gamma = damp_b / (2 * m);         // damping coefficient per mass
  const b_crit = 2 * Math.sqrt(spring_k * m); // critical damping coeff
  const zeta = damp_b / b_crit;           // damping ratio

  let regime = 'underdamped';
  let omega_d = 0;
  let frequency_Hz = 0;
  let timePeriod_s = Infinity;
  let totalOscillations = 0; // to 1% amplitude threshold
  let settlingTime_s = 0;
  let qualityFactor = Infinity;
  let logDecrement = 0;

  if (damp_b === 0) {
    regime = 'undamped';
    omega_d = omega0;
    frequency_Hz = omega0 / (2 * Math.PI);
    timePeriod_s = 1 / frequency_Hz;
    totalOscillations = Infinity;
    settlingTime_s = Infinity;
    qualityFactor = Infinity;
    logDecrement = 0;
  } else if (zeta < 0.999) {
    regime = 'underdamped';
    omega_d = Math.sqrt(omega0 * omega0 - gamma * gamma);
    frequency_Hz = omega_d / (2 * Math.PI);
    timePeriod_s = (2 * Math.PI) / omega_d;
    settlingTime_s = 4.60517 / gamma; // ln(100)/gamma -> decay to 1% of initial x0
    totalOscillations = Number((settlingTime_s / timePeriod_s).toFixed(2));
    qualityFactor = Number((omega0 / (2 * gamma)).toFixed(2));
    logDecrement = Number((gamma * timePeriod_s).toFixed(3));
  } else if (Math.abs(zeta - 1.0) <= 0.001) {
    regime = 'critically_damped';
    omega_d = 0;
    frequency_Hz = 0;
    timePeriod_s = Infinity;
    settlingTime_s = 6.638 / gamma; // (1+gamma*t)*exp(-gamma*t)=0.01
    totalOscillations = 0;
    qualityFactor = 0.5;
    logDecrement = Infinity;
  } else {
    regime = 'overdamped';
    omega_d = 0;
    frequency_Hz = 0;
    timePeriod_s = Infinity;
    const alpha = Math.sqrt(gamma * gamma - omega0 * omega0);
    const slowRate = gamma - alpha; // dominant pole decay rate
    settlingTime_s = 4.60517 / Math.max(0.001, slowRate);
    totalOscillations = 0;
    qualityFactor = Number((1 / (2 * zeta)).toFixed(2));
    logDecrement = Infinity;
  }

  // Generate 200 analytical curve sample points for plotting
  const duration = Math.min(25, Math.max(4, isFinite(settlingTime_s) ? settlingTime_s * 1.25 : 12));
  const numPoints = 200;
  const timeStep = duration / numPoints;
  const points = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i * timeStep;
    let x = 0;
    let v = 0;

    if (regime === 'undamped') {
      x = init_x * Math.cos(omega0 * t) + (init_v / omega0) * Math.sin(omega0 * t);
      v = -init_x * omega0 * Math.sin(omega0 * t) + init_v * Math.cos(omega0 * t);
    } else if (regime === 'underdamped') {
      const expTerm = Math.exp(-gamma * t);
      const cosTerm = Math.cos(omega_d * t);
      const sinTerm = Math.sin(omega_d * t);
      const A = init_x;
      const B = (init_v + gamma * init_x) / omega_d;
      x = expTerm * (A * cosTerm + B * sinTerm);
      v = -gamma * x + expTerm * (-A * omega_d * sinTerm + B * omega_d * cosTerm);
    } else if (regime === 'critically_damped') {
      const expTerm = Math.exp(-gamma * t);
      const c1 = init_x;
      const c2 = init_v + gamma * init_x;
      x = (c1 + c2 * t) * expTerm;
      v = (c2 - gamma * (c1 + c2 * t)) * expTerm;
    } else {
      // Overdamped
      const alpha = Math.sqrt(gamma * gamma - omega0 * omega0);
      const r1 = -gamma + alpha;
      const r2 = -gamma - alpha;
      const c1 = (init_v - r2 * init_x) / (r1 - r2);
      const c2 = (r1 * init_x - init_v) / (r1 - r2);
      x = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
      v = c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
    }

    // Energy calculation in SI (convert x from cm to m)
    const x_m = x / 100;
    const v_ms = v / 100;
    const ke = 0.5 * m * (v_ms * v_ms);
    const pe = 0.5 * spring_k * (x_m * x_m);
    const initialEnergy = 0.5 * spring_k * ((init_x / 100) ** 2) + 0.5 * m * ((init_v / 100) ** 2);
    const totalE = ke + pe;
    const dissipatedE = Math.max(0, initialEnergy - totalE);

    points.push({
      t: Number(t.toFixed(3)),
      x: Number(x.toFixed(3)),
      v: Number(v.toFixed(3)),
      upperEnvelope: regime === 'underdamped' ? Number((Math.abs(init_x) * Math.exp(-gamma * t)).toFixed(3)) : null,
      lowerEnvelope: regime === 'underdamped' ? Number((-Math.abs(init_x) * Math.exp(-gamma * t)).toFixed(3)) : null,
      kineticEnergy: Number(ke.toFixed(4)),
      potentialEnergy: Number(pe.toFixed(4)),
      dissipatedEnergy: Number(dissipatedE.toFixed(4))
    });
  }

  return {
    mass: m,
    springConstant: spring_k,
    dampingCoeff: damp_b,
    criticalDampingCoeff: Number(b_crit.toFixed(3)),
    dampingRatio: Number(zeta.toFixed(4)),
    regime,
    naturalFrequency_rad_s: Number(omega0.toFixed(3)),
    naturalFrequency_Hz: Number((omega0 / (2 * Math.PI)).toFixed(3)),
    dampedAngularFreq_rad_s: Number(omega_d.toFixed(3)),
    frequency_Hz: Number(frequency_Hz.toFixed(3)),
    timePeriod_s: isFinite(timePeriod_s) ? Number(timePeriod_s.toFixed(3)) : null,
    totalOscillations: isFinite(totalOscillations) ? totalOscillations : 'Infinite',
    settlingTime_s: isFinite(settlingTime_s) ? Number(settlingTime_s.toFixed(2)) : 'Infinite',
    qualityFactor: isFinite(qualityFactor) ? qualityFactor : 'Infinite',
    logDecrement: isFinite(logDecrement) ? logDecrement : 'N/A',
    points
  };
}

// ---------------- ROUTES ----------------

// GET /api/fluids - list all fluids with their calculated oscillator metrics
app.get('/api/fluids', async (req, res) => {
  try {
    let fluids = fluidsData;
    if (isMongoConnected) {
      const dbFluids = await Fluid.find().lean();
      if (dbFluids && dbFluids.length > 0) {
        fluids = dbFluids;
      }
    }

    // Attach calculated physics defaults (mass=1.0kg, k=40N/m, x0=10cm) for instant comparison
    const enriched = fluids.map(fluid => {
      const calc = calculateOscillatorPhysics(1.0, 40.0, fluid.dampingCoeff_b, 10.0, 0.0);
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

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/fluids/:id
app.get('/api/fluids/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let fluid = fluidsData.find(f => f.id === id);
    if (isMongoConnected) {
      const dbFluid = await Fluid.findOne({ id }).lean();
      if (dbFluid) fluid = dbFluid;
    }
    if (!fluid) {
      return res.status(404).json({ success: false, error: 'Fluid not found' });
    }
    const calc = calculateOscillatorPhysics(1.0, 40.0, fluid.dampingCoeff_b, 10.0, 0.0);
    res.json({ success: true, data: { ...fluid, calculated: calc } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/simulate - custom simulation ODE solution
app.post('/api/simulate', (req, res) => {
  try {
    const { mass = 1.0, springConstant = 40.0, dampingCoeff = 0.85, initialDisplacement = 10.0, initialVelocity = 0.0 } = req.body;
    const result = calculateOscillatorPhysics(mass, springConstant, dampingCoeff, initialDisplacement, initialVelocity);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/applications - real-world applications & 3D models data
app.get('/api/applications', (req, res) => {
  res.json({ success: true, count: applicationsData.length, data: applicationsData });
});

// GET /api/experiments - list saved user experiments
app.get('/api/experiments', async (req, res) => {
  try {
    if (isMongoConnected) {
      const experiments = await Experiment.find().sort({ createdAt: -1 });
      return res.json({ success: true, data: experiments, source: 'mongodb' });
    }
    res.json({ success: true, data: memoryExperiments, source: 'in-memory' });
  } catch (err) {
    res.json({ success: true, data: memoryExperiments, source: 'in-memory', warning: err.message });
  }
});

// POST /api/experiments - save a user experiment trial
app.post('/api/experiments', async (req, res) => {
  try {
    const expData = req.body;
    if (isMongoConnected) {
      const newExp = new Experiment(expData);
      const saved = await newExp.save();
      return res.status(201).json({ success: true, data: saved });
    }
    // Fallback to memory
    const memoryRecord = {
      ...expData,
      _id: 'mem_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    memoryExperiments.unshift(memoryRecord);
    res.status(201).json({ success: true, data: memoryRecord, source: 'in-memory' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/experiments/:id
app.delete('/api/experiments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected && !id.startsWith('mem_')) {
      await Experiment.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Experiment deleted from MongoDB' });
    }
    memoryExperiments = memoryExperiments.filter(e => e._id !== id);
    res.json({ success: true, message: 'Experiment deleted from memory' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/quiz - interactive quiz questions
app.get('/api/quiz', (req, res) => {
  const quiz = [
    {
      id: 1,
      question: "What defines the critical damping condition (ζ = 1) in a harmonic oscillator?",
      options: [
        "The system oscillates with maximum resonant amplitude.",
        "The oscillator returns to its equilibrium position in the fastest possible time without oscillating.",
        "The damping force is equal to the gravitational acceleration.",
        "The system oscillates with the same frequency as an undamped oscillator."
      ],
      correctIndex: 1,
      explanation: "Critical damping (ζ = 1 or b = 2√(km)) provides the fastest return to rest with zero overshoot or oscillations, making it ideal for car suspension and analog meters."
    },
    {
      id: 2,
      question: "If you replace water with honey in the oscillator beaker, what happens to the motion?",
      options: [
        "The frequency increases because honey is denser.",
        "The number of oscillations increases tenfold.",
        "The system transitions into the heavily overdamped regime, slowly creeping to equilibrium without oscillating.",
        "The spring breaks due to hydrodynamic cavitation."
      ],
      correctIndex: 2,
      explanation: "Honey has an extremely high dynamic viscosity (~10,000 cP), causing the damping ratio ζ to surge well above 1.0 (overdamped). The restoring spring force cannot overcome the viscous drag quickly enough to produce oscillations."
    },
    {
      id: 3,
      question: "According to Stokes' Law, how is viscous drag force related to fluid viscosity η and sphere velocity v?",
      options: [
        "F_drag is proportional to η² and v².",
        "F_drag is linearly proportional to viscosity (F_drag = 6πηrv).",
        "F_drag is inversely proportional to velocity.",
        "F_drag depends only on fluid density, independent of viscosity."
      ],
      correctIndex: 1,
      explanation: "Stokes' Law states F_drag = 6πηrv for low Reynolds number laminar flow, proving why fluid viscosity directly scales the damping coefficient b."
    },
    {
      id: 4,
      question: "Why does Taipei 101 use a massive 660-tonne Tuned Mass Damper on its upper floors?",
      options: [
        "To generate hydroelectric power from floor vibrations.",
        "To oscillate out of phase with wind and earthquakes, transferring building kinetic energy to hydraulic shock dissipators.",
        "To tilt the building permanently away from the typhoon wind direction.",
        "To act as a counterweight for the high-speed elevators."
      ],
      correctIndex: 1,
      explanation: "The tuned mass damper is tuned to the building's fundamental sway frequency. When wind shakes the building, the pendulum swings with phase delay, transferring kinetic energy to viscous hydraulic pistons that dissipate energy as heat."
    },
    {
      id: 5,
      question: "What happens to the damped angular frequency ω_d as fluid damping coefficient b increases in the underdamped regime?",
      options: [
        "ω_d decreases according to ω_d = √(ω₀² - γ²).",
        "ω_d increases infinitely.",
        "ω_d stays completely constant regardless of fluid.",
        "ω_d becomes negative."
      ],
      correctIndex: 0,
      explanation: "As damping increases, γ = b/(2m) grows, which pulls ω_d = √(ω₀² - γ²) downward. Consequently, the oscillation period T_d = 2π/ω_d expands (oscillations get slower) until critical damping is reached."
    },
    {
      id: 6,
      question: "Why are automobile shock absorbers designed to be nearly critically damped (ζ ≈ 0.7 - 0.8) rather than underdamped?",
      options: [
        "An underdamped suspension would bounce repeatedly after a pothole, reducing tire contact and steering control.",
        "An underdamped suspension would cause the engine to stall.",
        "Underdamped shock absorbers freeze in winter.",
        "Critical damping makes the car go faster on straight roads."
      ],
      correctIndex: 0,
      explanation: "If underdamped (ζ << 1), a single bump would cause the vehicle to bounce up and down for multiple cycles, resulting in loss of tire traction, steering instability, and passenger discomfort."
    }
  ];
  res.json({ success: true, data: quiz });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: isMongoConnected ? 'connected' : 'in-memory-fallback',
    fluidsCount: fluidsData.length,
    timestamp: new Date()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Damped Harmonic Oscillator Backend Server running on http://localhost:${PORT}`);
});

