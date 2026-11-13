export const quizData = [
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

