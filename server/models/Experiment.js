const mongoose = require('mongoose');

const experimentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  fluidId: { type: String, required: true },
  fluidName: { type: String, required: true },
  mass_kg: { type: Number, required: true },
  springConstant_k: { type: Number, required: true },
  initialDisplacement_cm: { type: Number, required: true },
  dampingCoeff_b: { type: Number, required: true },
  dampingRatio_zeta: { type: Number, required: true },
  regime: { type: String, required: true },
  frequency_Hz: { type: Number, required: true },
  timePeriod_s: { type: Number, required: true },
  totalOscillations: { type: Number, required: true },
  settlingTime_s: { type: Number, required: true },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Experiment', experimentSchema);

