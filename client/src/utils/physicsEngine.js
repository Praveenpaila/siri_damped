// Physics Analytical Engine for Damped Harmonic Oscillator with Spring Networks & Multi-Fluid Dynamics

/**
 * Calculates the equivalent spring constant (k_eq) for different combinations of springs/strings.
 * Configurations supported:
 * 1. Single: k_eq = k1
 * 2. Series: 1/k_eq = 1/k1 + 1/k2 => k_eq = (k1 * k2) / (k1 + k2)
 * 3. Parallel: k_eq = k1 + k2
 * 4. Series-Parallel: (k1 || k2) in series with k3 => k_eq = ((k1 + k2) * k3) / ((k1 + k2) + k3)
 */
export function calculateEquivalentSpringK(springConfig) {
  const mode = springConfig?.mode || 'single';
  const k1 = Math.max(1.0, Number(springConfig?.k1 ?? 40.0));
  const k2 = Math.max(1.0, Number(springConfig?.k2 ?? 40.0));
  const k3 = Math.max(1.0, Number(springConfig?.k3 ?? 40.0));

  let k_eq = k1;
  let formula = 'k_{eq} = k_1';
  let description = 'Single spring attached to bob';

  if (mode === 'series') {
    k_eq = (k1 * k2) / (k1 + k2);
    formula = '\\frac{1}{k_{eq}} = \\frac{1}{k_1} + \\frac{1}{k_2} \\implies k_{eq} = \\frac{k_1 k_2}{k_1 + k_2}';
    description = `Two springs in series: ${(k1).toFixed(1)} N/m & ${(k2).toFixed(1)} N/m`;
  } else if (mode === 'parallel') {
    k_eq = k1 + k2;
    formula = 'k_{eq} = k_1 + k_2';
    description = `Two springs in parallel: ${(k1).toFixed(1)} N/m + ${(k2).toFixed(1)} N/m`;
  } else if (mode === 'series_parallel') {
    const k_parallel = k1 + k2;
    k_eq = (k_parallel * k3) / (k_parallel + k3);
    formula = 'k_{eq} = \\frac{(k_1 + k_2) \\cdot k_3}{(k_1 + k_2) + k_3}';
    description = `Parallel pair (${(k1).toFixed(1)} + ${(k2).toFixed(1)} N/m) in series with ${(k3).toFixed(1)} N/m`;
  }

  return {
    mode,
    k1,
    k2,
    k3,
    k_eq: Number(k_eq.toFixed(2)),
    formula,
    description
  };
}

/**
 * Calculates analytical and numerical physics properties for DHO
 */
export function computeTheoreticalPhysics(
  mass = 1.0, 
  kInput = 40.0, 
  bInput = 0.85, 
  x0 = 12.0, 
  v0 = 0.0,
  springConfig = null
) {
  const m = Math.max(0.1, Number(mass));

  // Determine effective spring stiffness
  let spring_k = 40.0;
  let springNetInfo = null;
  if (springConfig && typeof springConfig === 'object') {
    springNetInfo = calculateEquivalentSpringK(springConfig);
    spring_k = springNetInfo.k_eq;
  } else {
    spring_k = Math.max(0.1, Number(kInput));
    springNetInfo = {
      mode: 'single',
      k1: spring_k,
      k2: spring_k,
      k3: spring_k,
      k_eq: spring_k,
      formula: 'k_{eq} = k',
      description: 'Single spring'
    };
  }

  const damp_b = Math.max(0.0, Number(bInput));
  const init_x = Number(x0);
  const init_v = Number(v0);

  const omega0 = Math.sqrt(spring_k / m);
  const gamma = damp_b / (2 * m);
  const b_crit = 2 * Math.sqrt(spring_k * m);
  const zeta = damp_b / b_crit;

  let regime = 'underdamped';
  let omega_d = 0;
  let frequency_Hz = 0;
  let timePeriod_s = Infinity;
  let totalOscillations = 0;
  let settlingTime_s = 0;
  let qualityFactor = Infinity;
  let logDecrement = 0;

  if (damp_b === 0) {
    regime = 'undamped';
    omega_d = omega0;
    frequency_Hz = omega0 / (2 * Math.PI);
    timePeriod_s = 1 / frequency_Hz;
    totalOscillations = 'Infinite';
    settlingTime_s = 'Infinite';
    qualityFactor = 'Infinite';
    logDecrement = 0;
  } else if (zeta < 0.999) {
    regime = 'underdamped';
    omega_d = Math.sqrt(Math.max(0, omega0 * omega0 - gamma * gamma));
    frequency_Hz = omega_d / (2 * Math.PI);
    timePeriod_s = (2 * Math.PI) / Math.max(0.0001, omega_d);
    settlingTime_s = Number((4.60517 / Math.max(0.0001, gamma)).toFixed(2)); // decay to 1%
    totalOscillations = Number((settlingTime_s / timePeriod_s).toFixed(2));
    qualityFactor = Number((omega0 / (2 * gamma)).toFixed(2));
    logDecrement = Number((gamma * timePeriod_s).toFixed(3));
  } else if (Math.abs(zeta - 1.0) <= 0.005) {
    regime = 'critically_damped';
    omega_d = 0;
    frequency_Hz = 0;
    timePeriod_s = null;
    settlingTime_s = Number((6.638 / Math.max(0.001, gamma)).toFixed(2));
    totalOscillations = 0;
    qualityFactor = 0.5;
    logDecrement = 'N/A (No cycle)';
  } else {
    regime = 'overdamped';
    omega_d = 0;
    frequency_Hz = 0;
    timePeriod_s = null;
    const alpha = Math.sqrt(Math.max(0.0001, gamma * gamma - omega0 * omega0));
    const slowRate = Math.max(0.001, gamma - alpha);
    settlingTime_s = Number((4.60517 / slowRate).toFixed(2));
    totalOscillations = 0;
    qualityFactor = Number((1 / (2 * Math.max(0.001, zeta))).toFixed(2));
    logDecrement = 'N/A (No cycle)';
  }

  // Generate 200 analytical curve sample points
  const duration = Math.min(25, Math.max(5, isFinite(settlingTime_s) ? settlingTime_s * 1.25 : 12));
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
      const B = (init_v + gamma * init_x) / Math.max(0.0001, omega_d);
      x = expTerm * (A * cosTerm + B * sinTerm);
      v = -gamma * x + expTerm * (-A * omega_d * sinTerm + B * omega_d * cosTerm);
    } else if (regime === 'critically_damped') {
      const expTerm = Math.exp(-gamma * t);
      const c1 = init_x;
      const c2 = init_v + gamma * init_x;
      x = (c1 + c2 * t) * expTerm;
      v = (c2 - gamma * (c1 + c2 * t)) * expTerm;
    } else {
      // Overdamped exact formulation
      const alpha = Math.sqrt(Math.max(0.0001, gamma * gamma - omega0 * omega0));
      const expTerm = Math.exp(-gamma * t);
      const coshT = Math.cosh(alpha * t);
      const sinhT = Math.sinh(alpha * t);
      x = expTerm * (init_x * coshT + ((init_v + gamma * init_x) / alpha) * sinhT);
      v = expTerm * (init_v * coshT - ((omega0 * omega0 * init_x + gamma * init_v) / alpha) * sinhT);
    }

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
    springNetInfo,
    dampingCoeff: damp_b,
    criticalDampingCoeff: Number(b_crit.toFixed(3)),
    dampingRatio: Number(zeta.toFixed(4)),
    regime,
    naturalFrequency_rad_s: Number(omega0.toFixed(3)),
    naturalFrequency_Hz: Number((omega0 / (2 * Math.PI)).toFixed(3)),
    dampedAngularFreq_rad_s: Number(omega_d.toFixed(3)),
    frequency_Hz: Number(frequency_Hz.toFixed(3)),
    timePeriod_s: isFinite(timePeriod_s) ? Number(timePeriod_s.toFixed(3)) : null,
    totalOscillations,
    settlingTime_s,
    qualityFactor,
    logDecrement,
    points
  };
}
