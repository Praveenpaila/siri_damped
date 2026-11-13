const mongoose = require('mongoose');

const fluidSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  emoji: { type: String, default: '💧' },
  category: { type: String, required: true },
  viscosity_Pa_s: { type: Number, required: true },
  viscosity_cP: { type: Number, required: true },
  density_kg_m3: { type: Number, required: true },
  dampingCoeff_b: { type: Number, required: true },
  overdamped_b: { type: Number },
  color: { type: String, default: '#06b6d4' },
  liquidHex: { type: String, default: '#06b6d4' },
  opacity: { type: Number, default: 0.5 },
  description: { type: String, required: true },
  molecularOrigin: { type: String },
  realWorldExample: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Fluid', fluidSchema);

