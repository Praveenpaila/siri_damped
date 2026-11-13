import React from 'react';
import { BookOpen, CheckSquare, Layers, Cpu, Flame, Target, ChevronRight } from 'lucide-react';

export default function TheorySection() {
  const requirements = [
    {
      title: "1. Inertial Mass (m)",
      icon: "⚖️",
      role: "Kinetic Energy Storage",
      desc: "An oscillating body with mass m. When moving at velocity v, it stores kinetic energy E_k = 1/2 · m · v². Inertia causes it to overshoot the center equilibrium point."
    },
    {
      title: "2. Restoring Spring Force (k)",
      icon: "🌀",
      role: "Elastic Potential Energy Storage",
      desc: "A linear elastic element obeying Hooke's Law: F_s = -k · x. When displaced by distance x from equilibrium, it stores potential energy E_p = 1/2 · k · x² and pulls the mass back toward center."
    },
    {
      title: "3. Viscous Dissipative Medium (b, η)",
      icon: "💧",
      role: "Irreversible Thermal Energy Dissipation",
      desc: "A surrounding fluid medium (water, shampoo, honey, oil) that creates viscous shear drag F_d = -b · v. By Stokes' Law (F_d = 6πηrv), molecular friction converts mechanical work directly into thermal energy (heat)."
    },
    {
      title: "4. Equilibrium Reference Frame",
      icon: "📏",
      role: "Geometric Coordinate Boundary",
      desc: "A rigid mounting rig and calibrated position coordinate where net static spring force balances gravity (x = 0), defining amplitude displacements."
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-slate-100">Physics & Mathematical Foundations</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Complete rigorous derivation of the 2nd-order differential equation, Stokes' viscous law, and regime classifications.
        </p>
      </div>

      {/* SECTION 1: What All Are Required Here */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-slate-100">What All Are Required for a Damped Harmonic Oscillator?</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {requirements.map((req, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col shadow-lg"
            >
              <div className="text-2xl mb-2">{req.icon}</div>
              <h4 className="font-bold text-sm text-slate-100">{req.title}</h4>
              <span className="text-[11px] font-mono text-cyan-400 font-semibold my-1">{req.role}</span>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">{req.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Mathematical ODE Derivation */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-slate-100">Step-by-Step Differential Equation Derivation</h3>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 font-mono">
            <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Step 1: Newton's Second Law of Motion</span>
            <div className="text-cyan-300 font-bold text-sm sm:text-base my-1">
              ∑ F = m · a = m · (d²x / dt²)
            </div>
            <p className="text-slate-400 text-xs mt-1 font-sans">
              Two primary forces act on the oscillating mass: the Hookean restoring spring force F_s = -k·x and the fluid viscous drag force F_d = -b·v = -b·(dx/dt).
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 font-mono">
            <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Step 2: Second-Order Homogeneous ODE</span>
            <div className="text-emerald-300 font-bold text-sm sm:text-base my-1">
              m · (d²x / dt²) + b · (dx / dt) + k · x = 0
            </div>
            <p className="text-slate-400 text-xs mt-1 font-sans">
              Dividing the entire equation by the mass m gives standard canonical form:
            </p>
            <div className="text-cyan-300 font-bold my-2 text-sm">
              d²x/dt² + 2γ · (dx/dt) + ω₀² · x = 0
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 pt-1">
              <div>• Natural frequency: <strong className="text-emerald-400">ω₀ = √(k/m)</strong></div>
              <div>• Damping factor: <strong className="text-amber-400">γ = b / (2m)</strong></div>
              <div>• Damping ratio: <strong className="text-purple-400">ζ = b / (2√(km))</strong></div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 font-mono">
            <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Step 3: Stokes' Viscous Drag Law (Replacing the Medium)</span>
            <div className="text-amber-300 font-bold text-sm sm:text-base my-1">
              F_drag = 6π · η · r · v  ⟹  b_stokes = 6π · η · r
            </div>
            <p className="text-slate-400 text-xs mt-1 font-sans">
              This explains why switching from <strong>water (η = 1 cP)</strong> to <strong>shampoo (η = 3,200 cP)</strong> or <strong>honey (η = 10,000 cP)</strong> radically alters the oscillator behavior! The damping coefficient b scales linearly with dynamic viscosity η, transforming the system from underdamped ringing into sluggish overdamped ooze.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: The Three Damping Regimes Explained */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Regime 1: Underdamped */}
        <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 text-sm">1. Underdamped (ζ &lt; 1)</span>
            <span className="text-xs font-mono text-cyan-400">γ &lt; ω₀</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Fluid drag is small. The mass oscillates back and forth with a reduced damped frequency:
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950/80 text-cyan-300 font-mono text-xs text-center my-1">
            ωd = √(ω₀² - γ²)
          </div>
          <p className="text-xs text-slate-400">
            Oscillations decay inside an exponential boundary: <code className="text-cyan-300">x(t) = x₀·e⁻ᵞᵗ·cos(ωdt)</code>. Examples: Air, Water, Milk, Kerosene.
          </p>
        </div>

        {/* Regime 2: Critically Damped */}
        <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 text-sm">2. Critically Damped (ζ = 1)</span>
            <span className="text-xs font-mono text-emerald-400">γ = ω₀</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The exact balance where energy is extinguished in the shortest possible time without a single overshoot:
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950/80 text-emerald-300 font-mono text-xs text-center my-1">
            x(t) = x₀ · (1 + γt) · e⁻ᵞᵗ
          </div>
          <p className="text-xs text-slate-400">
            Crucial for engineering: Car shock absorbers, galvanometer needle dials, and automatic door closers use this exact tuning!
          </p>
        </div>

        {/* Regime 3: Overdamped */}
        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-800/40 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300 text-sm">3. Overdamped (ζ &gt; 1)</span>
            <span className="text-xs font-mono text-amber-400">γ &gt; ω₀</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Fluid viscosity is overwhelmingly large. The mass creeps back to center extremely sluggishly without ever crossing zero:
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950/80 text-amber-300 font-mono text-xs text-center my-1">
            x(t) = C₁·e⁻ʳ¹ᵗ + C₂·e⁻ʳ²ᵗ
          </div>
          <p className="text-xs text-slate-400">
            Examples: Shampoo, Honey, Heavy Molasses, High-Viscosity Gel.
          </p>
        </div>
      </div>
    </div>
  );
}

