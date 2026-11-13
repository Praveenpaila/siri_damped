// Real-World Daily Life Applications of Damped Harmonic Oscillators
const applicationsData = [
  {
    id: "vehicle_suspension",
    title: "Automotive Shock Absorbers & Suspension",
    category: "Automotive & Transportation",
    tagline: "Preventing dangerous car bounce through critical hydraulic damping",
    dampingRegime: "Critically Damped (ζ ≈ 0.7 - 1.0)",
    icon: "Car",
    dailyLifeUse: "Every time your car, bus, or bicycle rides over a pothole, speed bump, or rough road.",
    howItWorks: `Without damping, the car's steel coil springs would act as simple harmonic oscillators, causing the chassis to bounce uncontrollably up and down for minutes after hitting a single bump. This causes loss of tire traction, steering failure, and severe motion sickness.
    
    A hydraulic shock absorber (telescopic damper) contains a piston forced through viscous hydraulic oil. Tiny orifices in the piston restrict oil flow, creating viscous drag that converts kinetic bouncing energy into dissipated thermal energy (heat). Tuned close to critical damping (ζ ≈ 0.7 to 0.9), it allows the tire to absorb the shock in a single compression cycle and return smoothly to equilibrium with minimal body bounce.`,
    physicsFormula: "F_{damping} = -c \\cdot v = -c \\frac{dx}{dt}",
    keyParameters: [
      { label: "Damper Type", value: "Twin-tube or Monotube Hydraulic" },
      { label: "Optimal Damping Ratio (ζ)", value: "0.65 – 0.85" },
      { label: "Target Recovery Time", value: "< 0.4 seconds" },
      { label: "Failure Symptom if Undamped", value: "Violent resonance & loss of road grip" }
    ],
    interactive3dScene: "car_suspension"
  },
  {
    id: "tuned_mass_damper",
    title: "Tuned Mass Dampers in Skyscrapers (Taipei 101)",
    category: "Civil & Structural Engineering",
    tagline: "Massive suspended pendulums counteracting typhoon winds and earthquakes",
    dampingRegime: "Tuned Underdamped with Hydraulic Dissipators (ζ ≈ 0.1 - 0.2)",
    icon: "Building2",
    dailyLifeUse: "Keeping supertall skyscrapers, airport control towers, and suspension bridges stable during high winds and seismic tremors.",
    howItWorks: `Tall towers like Taipei 101 act as giant vertical cantilever oscillators with natural flexural frequencies (e.g. ~0.15 Hz). Strong typhoon winds or tectonic earthquakes induce severe resonance. 
    
    Suspended between the 87th and 92nd floors is a 660-tonne spherical steel pendulum connected to eight hydraulic viscous dampers anchored to the building core. When the building sways to the left, the heavy pendulum lags behind and pulls to the right, transferring kinetic energy to the hydraulic dampers where viscous fluid shear dissipates the energy as heat, reducing building sway by up to 45%.`,
    physicsFormula: "m_d \\ddot{x}_d + c_d(\\dot{x}_d - \\dot{x}_b) + k_d(x_d - x_b) = 0",
    keyParameters: [
      { label: "Pendulum Mass (Taipei 101)", value: "660 metric tonnes" },
      { label: "Damper Units", value: "8 primary hydraulic shock struts" },
      { label: "Building Sway Reduction", value: "35% – 45%" },
      { label: "Tuned Frequency Ratio", value: "ω_damper ≈ ω_building" }
    ],
    interactive3dScene: "skyscraper"
  },
  {
    id: "door_closer",
    title: "Commercial Hydraulic Door Closers",
    category: "Everyday Architecture",
    tagline: "Smooth, silent closing without finger-crushing slams or sluggish drafts",
    dampingRegime: "Critically Damped to Overdamped (ζ ≥ 1.0)",
    icon: "DoorClosed",
    dailyLifeUse: "Office doors, school entrances, emergency fire exits, and refrigerator doors.",
    howItWorks: `When you push open an office door, you compress a heavy internal coiled steel spring, storing potential energy. When released, the spring wants to snap the door shut instantly.
    
    A rack-and-pinion gear converts the door's rotational swing into linear piston motion inside a cylinder filled with silicone or petroleum hydraulic oil. The fluid must squeeze through an adjustable needle bypass valve. Damping is engineered so that:
    1. Fast swing phase is controlled (prevents wind catching the door).
    2. Latch check phase slows down to prevent finger pinching and loud slamming.
    3. Final closing latch provides enough force to overcome the latch bolt.`,
    physicsFormula: "\\tau_{viscous} = -b_\\theta \\cdot \\omega = -b_\\theta \\frac{d\\theta}{dt}",
    keyParameters: [
      { label: "Fluid Medium", value: "High-grade hydraulic silicone oil" },
      { label: "Regulation", value: "Adjustable needle screw orifice" },
      { label: "Critical Damping Purpose", value: "Zero bounce against door frame" },
      { label: "Safety Advantage", value: "Prevents door slams and drafts" }
    ],
    interactive3dScene: "door_closer"
  },
  {
    id: "galvanometer",
    title: "Analog Galvanometers & Moving-Coil Meters",
    category: "Electrical Instrumentation",
    tagline: "Needles that point to current measurements in a fraction of a second without oscillating",
    dampingRegime: "Critically Damped (ζ = 1.0)",
    icon: "Gauge",
    dailyLifeUse: "Analog multimeters, voltmeters, ammeters, seismograph recorders, and audio VU meters.",
    howItWorks: `In a d'Arsonval galvanometer, current passes through a coil placed in a magnetic field, producing a torque τ = B·I·A·N against a hairspring. If undamped, the needle would vibrate back and forth across the dial for several seconds before resting, making fast measurement impossible.
    
    Critical damping is achieved either by winding the coil onto a light aluminum former (which generates Lenz's law eddy currents that oppose motion) or using an air dashpot. The needle sweeps swiftly and settles dead on the precise mark without overshoot or ringing.`,
    physicsFormula: "I \\frac{d^2\\theta}{dt^2} + (b_{air} + \\frac{B^2 L^2}{R}) \\frac{d\\theta}{dt} + k \\theta = \\tau_{ext}",
    keyParameters: [
      { label: "Damping Mechanism", value: "Eddy-current electromagnetic damping" },
      { label: "Damping Factor (ζ)", value: "Exactly 1.0 (Deadbeat operation)" },
      { label: "Settling Time", value: "< 0.2 seconds" },
      { label: "Result", value: "Zero indicator bounce / rapid readability" }
    ],
    interactive3dScene: "galvanometer"
  },
  {
    id: "acoustic_damping",
    title: "Musical Instrument Dampers & Soundproofing",
    category: "Acoustics & Music",
    tagline: "Controlling acoustic sustain, tone clarity, and resonance decay",
    dampingRegime: "Controlled Underdamped to Heavy Overdamped",
    icon: "Music",
    dailyLifeUse: "Pianos (felt mute pedal), drum set gel pads (Moongel), guitar fret wraps, and studio acoustic wall foam.",
    howItWorks: `When a piano key is struck, a hammer strikes the steel wire. As long as you hold the key, the string oscillates under low air damping, sustaining the rich harmonic note.
    
    The moment you release the key, a spring-loaded felt damper drops onto the string. The dense viscoelastic felt fibers exert intense friction and shear damping against the string vibrations, dissipating acoustic waves in less than 50 milliseconds into minute amounts of heat. Drum mutes (viscous silicone gel) work similarly to kill high-frequency ringing overtone modes.`,
    physicsFormula: "y(x,t) = \\sum A_n e^{-\\gamma_n t} \\sin(k_n x) \\cos(\\omega_n t)",
    keyParameters: [
      { label: "Damper Medium", value: "Pressed wool felt / viscoelastic polymer" },
      { label: "Decay Speedup", value: "> 98% reduction in ring time" },
      { label: "Target Harmonics", value: "Selectable or broad-spectrum damping" },
      { label: "Mechanical Actuation", value: "Keyboard escapement / sustain pedal" }
    ],
    interactive3dScene: "acoustic_damping"
  }
];

module.exports = applicationsData;

