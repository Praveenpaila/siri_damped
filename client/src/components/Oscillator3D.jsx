import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Sparkles, 
  Activity, 
  Layers, 
  GitCommit, 
  Eye, 
  Maximize2,
  Zap
} from 'lucide-react';
import { calculateEquivalentSpringK } from '../utils/physicsEngine';

export default function Oscillator3D({
  fluid,
  mass = 1.0,
  springK = 40.0,
  springConfig = { mode: 'single', k1: 40.0, k2: 40.0, k3: 40.0 },
  fluidMode = 'single', // 'single', 'dual', 'triple'
  layeredFluids = { top: null, mid: null, bot: null },
  fluidDampingType = 'oscillatory', // 'oscillatory' (visible cycles in all 14 fluids) vs 'overdamped' (theoretical creep)
  initialDisplacement = 12.0, // cm
  isPlaying = true,
  setIsPlaying,
  simSpeed = 1.0,
  onCycleUpdate,
  liveMetrics,
  setLiveMetrics,
  simKey = 0
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);

  // Mesh refs for dynamic updates
  const springGroupRef = useRef(null);
  const bobGroupRef = useRef(null);
  const suspensionStringRef = useRef(null);
  const liquidMeshesRef = useRef([]);
  const bubbleParticlesRef = useRef(null);
  const wakeParticlesRef = useRef(null);
  const causticMeshRef = useRef(null);
  const surfaceCapRef = useRef(null);
  const rippleMeshRef = useRef(null);
  const springForceArrowRef = useRef(null);
  const dampingForceArrowRef = useRef(null);
  const velocityArrowRef = useRef(null);

  // Simulation state refs for animation loop
  const simState = useRef({
    x: initialDisplacement, // in cm (0 is equilibrium)
    v: 0.0,                 // in cm/s
    t: 0.0,
    cycleCount: 0,
    lastDirection: 0,
    halfCycles: 0,
    isSettled: false,
    activeLayer: fluid?.name || 'Fluid Medium',
    effectiveB: fluidDampingType === 'overdamped' ? (fluid?.overdamped_b ?? 0.85) : (fluid?.dampingCoeff_b ?? 0.70)
  });

  const [cameraView, setCameraView] = useState('front');
  const [showVectors, setShowVectors] = useState(true);
  const [fluidSwitchToast, setFluidSwitchToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (!fluid) return;
    const calcB = fluidDampingType === 'overdamped' 
      ? (fluid.overdamped_b ?? fluid.dampingCoeff_b ?? 0.85) 
      : (fluid.dampingCoeff_b ?? 0.70);

    setFluidSwitchToast({
      id: fluid.id,
      name: fluid.name,
      emoji: fluid.emoji || '💧',
      color: fluid.color,
      category: fluid.category,
      viscosity_cP: fluid.viscosity_cP,
      dampingCoeff_b: calcB,
      description: fluid.description
    });

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setFluidSwitchToast(null);
    }, 4500);

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [fluid?.id, fluidDampingType, simKey]);

  // Helper to generate helical coiled spring geometry
  const createSpringGeometry = (startHeight, endHeight, coils = 12, radius = 0.42, tubeRadius = 0.052) => {
    const points = [];
    const totalPoints = coils * 28;
    const height = Math.max(0.2, endHeight - startHeight);
    for (let i = 0; i <= totalPoints; i++) {
      const u = i / totalPoints;
      const angle = u * coils * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = startHeight + u * height;
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, coils * 20, tubeRadius, 8, false);
  };

  // Reset simulation to start
  const resetSimulation = (targetX = initialDisplacement, targetV = 0.0) => {
    const defaultB = fluidDampingType === 'overdamped' 
      ? (fluid?.overdamped_b ?? fluid?.dampingCoeff_b ?? 0.85) 
      : (fluid?.dampingCoeff_b ?? 0.70);

    simState.current = {
      x: targetX,
      v: targetV,
      t: 0.0,
      cycleCount: 0,
      lastDirection: 0,
      halfCycles: 0,
      isSettled: false,
      activeLayer: fluid?.name || 'Fluid Medium',
      effectiveB: defaultB
    };
    if (setIsPlaying) setIsPlaying(true);
    if (onCycleUpdate) onCycleUpdate(0);
  };

  // Re-trigger simulation whenever parameters change
  useEffect(() => {
    resetSimulation(initialDisplacement, 0.0);
  }, [
    fluid?.id, 
    initialDisplacement, 
    mass, 
    springK, 
    springConfig?.mode, 
    springConfig?.k1, 
    springConfig?.k2, 
    springConfig?.k3, 
    fluidMode, 
    fluidDampingType,
    layeredFluids?.top?.id, 
    layeredFluids?.mid?.id, 
    layeredFluids?.bot?.id, 
    simKey
  ]);

  const handlePullAndRelease = (cm = 12.0) => {
    resetSimulation(cm, 0.0);
  };

  const handlePlungeImpulse = () => {
    resetSimulation(0.0, -45.0);
  };

  // Main Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 560;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.032);

    // 2. Camera: Framed directly onto the glass beaker and immersed bob
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, -0.6, 12.0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.replaceChildren(renderer.domElement);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.05);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(7, 14, 8);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const cyanPointLight = new THREE.PointLight(0x06b6d4, 3.2, 20);
    cyanPointLight.position.set(-5, -1, 5);
    scene.add(cyanPointLight);

    const amberBackLight = new THREE.PointLight(0xf59e0b, 2.0, 20);
    amberBackLight.position.set(5, -3, -4);
    scene.add(amberBackLight);

    // Realistic Internal Fluid Core Point Light (illuminates fluid from inside beaker)
    const fluidPointLight = new THREE.PointLight(new THREE.Color(fluid?.color || '#06b6d4'), 2.2, 7.5);
    fluidPointLight.name = 'fluidPointLight';
    fluidPointLight.position.set(0, -3.0, 0);
    scene.add(fluidPointLight);

    // 5. Rig Vertical Mounting Plates & Rods
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.95, roughness: 0.12 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25 });

    // Top ceiling plate
    const topPlateGeo = new THREE.BoxGeometry(5.4, 0.35, 3.8);
    const topPlate = new THREE.Mesh(topPlateGeo, metalMat);
    topPlate.position.set(0, 4.85, 0);
    topPlate.castShadow = true;
    scene.add(topPlate);

    // Support Rods
    const supportRodGeo = new THREE.CylinderGeometry(0.09, 0.09, 11.2, 16);
    const leftRod = new THREE.Mesh(supportRodGeo, chromeMat);
    leftRod.position.set(-2.3, -0.6, 0);
    scene.add(leftRod);

    const rightRod = new THREE.Mesh(supportRodGeo, chromeMat);
    rightRod.position.set(2.3, -0.6, 0);
    scene.add(rightRod);

    // Base Plate (Lab Bench)
    const basePlateGeo = new THREE.BoxGeometry(6.4, 0.45, 5.2);
    const darkPlateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 });
    const basePlate = new THREE.Mesh(basePlateGeo, darkPlateMat);
    basePlate.position.set(0, -6.1, 0);
    basePlate.receiveShadow = true;
    scene.add(basePlate);

    // Realistic Fluid Caustic Light Projection onto Bench
    const causticGeo = new THREE.CircleGeometry(2.35, 36);
    const causticMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(fluid?.color || '#06b6d4'),
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide
    });
    const causticMesh = new THREE.Mesh(causticGeo, causticMat);
    causticMesh.rotation.x = -Math.PI / 2;
    causticMesh.position.set(0, -5.86, 0);
    scene.add(causticMesh);
    causticMeshRef.current = causticMesh;

    const grid = new THREE.GridHelper(26, 26, 0x1e293b, 0x0f172a);
    grid.position.y = -6.3;
    scene.add(grid);

    // 6. Transparent Glass Beaker
    const beakerRadius = 1.75;
    const beakerHeight = 6.0;
    const beakerGeo = new THREE.CylinderGeometry(beakerRadius, beakerRadius, beakerHeight, 36, 1, true);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      opacity: 1,
      transparent: true,
      roughness: 0.03,
      ior: 1.52,
      thickness: 0.35,
      side: THREE.DoubleSide
    });
    const beaker = new THREE.Mesh(beakerGeo, glassMat);
    beaker.position.set(0, -2.8, 0);
    scene.add(beaker);

    const beakerBottomGeo = new THREE.CylinderGeometry(beakerRadius, beakerRadius, 0.14, 36);
    const beakerBottom = new THREE.Mesh(beakerBottomGeo, glassMat);
    beakerBottom.position.set(0, -5.75, 0);
    scene.add(beakerBottom);

    // Beaker Measurement Graduation Rings
    const gradMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
    for (let g = 0; g <= 4; g++) {
      const gradGeo = new THREE.TorusGeometry(beakerRadius + 0.005, 0.012, 8, 36);
      const gradMesh = new THREE.Mesh(gradGeo, gradMat);
      gradMesh.rotation.x = Math.PI / 2;
      gradMesh.position.set(0, -5.0 + g * 1.05, 0);
      scene.add(gradMesh);
    }

    // 7. Multi-Fluid Layering Meshes Group
    const fluidsContainerGroup = new THREE.Group();
    fluidsContainerGroup.name = 'fluidsContainerGroup';
    scene.add(fluidsContainerGroup);

    // 8. Surface Ripple Mesh (at liquid surface y = -0.4)
    const rippleGeo = new THREE.RingGeometry(0.1, beakerRadius - 0.08, 32);
    const rippleMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      side: THREE.DoubleSide
    });
    const ripple = new THREE.Mesh(rippleGeo, rippleMat);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(0, -0.38, 0);
    scene.add(ripple);
    rippleMeshRef.current = ripple;

    // 9. Calibrated Physics Ruler & Equilibrium Line
    const rulerGeo = new THREE.BoxGeometry(0.42, 6.2, 0.06);
    const rulerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const ruler = new THREE.Mesh(rulerGeo, rulerMat);
    ruler.position.set(-2.25, -2.8, 0);
    scene.add(ruler);

    // Equilibrium 0 Position Indicator Line (Located at y = -3.0 INSIDE the fluid)
    const eqLineGeo = new THREE.BoxGeometry(1.4, 0.05, 0.05);
    const eqLineMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const eqLine = new THREE.Mesh(eqLineGeo, eqLineMat);
    eqLine.position.set(-1.6, -3.0, 0);
    scene.add(eqLine);

    // 10. Oscillating Bob Group (Immersed inside fluid volume at y = -3.0)
    const bobGroup = new THREE.Group();
    bobGroup.name = 'bobGroup';

    // Bob Top Attachment Eyelet Ring
    const eyeletGeo = new THREE.TorusGeometry(0.14, 0.035, 16, 24);
    const eyeletMesh = new THREE.Mesh(eyeletGeo, chromeMat);
    eyeletMesh.position.set(0, 0.85, 0);
    eyeletMesh.castShadow = true;
    bobGroup.add(eyeletMesh);

    // Bob Attachment Stem
    const stemGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.35, 16);
    const stem = new THREE.Mesh(stemGeo, chromeMat);
    stem.position.set(0, 0.65, 0);
    stem.castShadow = true;
    bobGroup.add(stem);

    // Main Bob Body: High-gloss polished spherical metallic mass with bright emissive edge
    const bobSphereGeo = new THREE.SphereGeometry(0.68, 32, 32);
    const bobMat = new THREE.MeshStandardMaterial({ 
      color: 0x0284c7, 
      metalness: 0.90, 
      roughness: 0.12,
      emissive: 0x0369a1,
      emissiveIntensity: 0.25
    });
    const bobSphere = new THREE.Mesh(bobSphereGeo, bobMat);
    bobSphere.position.set(0, 0.1, 0);
    bobSphere.castShadow = true;
    bobGroup.add(bobSphere);

    // Brass accent ring around bob
    const accentRingGeo = new THREE.TorusGeometry(0.70, 0.035, 16, 32);
    const accentRing = new THREE.Mesh(accentRingGeo, brassMat);
    accentRing.rotation.x = Math.PI / 2;
    accentRing.position.set(0, 0.1, 0);
    bobGroup.add(accentRing);

    // Lower Viscous Drag Flange/Paddle
    const flangeGeo = new THREE.CylinderGeometry(0.98, 0.98, 0.08, 32);
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.85, roughness: 0.25 });
    const flange = new THREE.Mesh(flangeGeo, flangeMat);
    flange.position.set(0, -0.42, 0);
    flange.castShadow = true;
    bobGroup.add(flange);

    // Hydrodynamic Viscous Shear Wake Particles (Attached around the bob)
    const wakeGroup = new THREE.Group();
    wakeGroup.name = 'wakeGroup';
    const wakeParticleCount = 20;
    const wakeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const wakeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0
    });
    for (let i = 0; i < wakeParticleCount; i++) {
      const p = new THREE.Mesh(wakeGeo, wakeMat.clone());
      const angle = (i / wakeParticleCount) * Math.PI * 2;
      const r = 0.76 + (i % 3) * 0.12;
      p.position.set(Math.cos(angle) * r, -0.42, Math.sin(angle) * r);
      p.userData = { angle, radius: r, baseY: -0.42, phase: i * 0.35 };
      wakeGroup.add(p);
    }
    bobGroup.add(wakeGroup);
    wakeParticlesRef.current = wakeGroup;

    bobGroup.position.set(0, -3.0, 0);
    scene.add(bobGroup);
    bobGroupRef.current = bobGroup;

    // 11. Suspension String (Braided cable connecting spring bottom to bob eyelet)
    const stringGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 12);
    const stringMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const suspensionString = new THREE.Mesh(stringGeo, stringMat);
    suspensionString.castShadow = true;
    scene.add(suspensionString);
    suspensionStringRef.current = suspensionString;

    // 12. Dynamic Spring System Group
    const springGroup = new THREE.Group();
    springGroup.name = 'springGroup';
    scene.add(springGroup);
    springGroupRef.current = springGroup;

    // 13. Dynamic 3D Force Vector Arrows
    const springArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1.4, -3.0, 0), 1.0, 0x10b981, 0.25, 0.15);
    scene.add(springArrow);
    springForceArrowRef.current = springArrow;

    const dampingArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(2.0, -3.0, 0), 1.0, 0xf97316, 0.25, 0.15);
    scene.add(dampingArrow);
    dampingForceArrowRef.current = dampingArrow;

    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1.4, -3.0, 0), 1.0, 0x38bdf8, 0.25, 0.15);
    scene.add(velArrow);
    velocityArrowRef.current = velArrow;

    // 14. Camera Orbit Controls
    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e) => {
      isMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isMouseDown) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      if (e.buttons === 1) {
        const radius = camera.position.distanceTo(new THREE.Vector3(0, -1.5, 0));
        let theta = Math.atan2(camera.position.x, camera.position.z);
        let phi = Math.acos(Math.max(-0.99, Math.min(0.99, (camera.position.y - (-1.5)) / radius)));
        theta -= deltaX * 0.008;
        phi = Math.max(0.15, Math.min(Math.PI - 0.2, phi + deltaY * 0.008));
        camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = -1.5 + radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
        camera.lookAt(0, -1.8, 0);
      }
    };

    const onMouseUp = () => { isMouseDown = false; };
    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.004;
      const dir = camera.position.clone().sub(new THREE.Vector3(0, -1.5, 0)).normalize();
      const currentDist = camera.position.distanceTo(new THREE.Vector3(0, -1.5, 0));
      const newDist = Math.max(4.5, Math.min(22, currentDist + zoomFactor * 2));
      camera.position.copy(new THREE.Vector3(0, -1.5, 0).add(dir.multiplyScalar(newDist)));
      camera.lookAt(0, -1.8, 0);
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 560;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Liquid Layers Meshes in Three.js (Single, Dual, or Triple)
  useEffect(() => {
    if (!sceneRef.current) return;
    const containerGroup = sceneRef.current.getObjectByName('fluidsContainerGroup');
    if (!containerGroup) return;

    while (containerGroup.children.length > 0) {
      const child = containerGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      containerGroup.remove(child);
    }
    liquidMeshesRef.current = [];

    const beakerRadius = 1.72;
    const liquidBottomY = -5.7;
    const liquidTopY = -0.4;
    const totalLiquidHeight = liquidTopY - liquidBottomY; // 5.3 units

    let layersToRender = [];
    if (fluidMode === 'single') {
      layersToRender = [
        {
          name: fluid?.name || 'Water',
          color: fluid?.color || '#06b6d4',
          opacity: fluid?.opacity || 0.40,
          metalness: fluid?.id === 'mercury' ? 0.95 : 0.08,
          height: totalLiquidHeight,
          startY: liquidBottomY,
          endY: liquidTopY,
          fluidObj: fluid
        }
      ];
    } else if (fluidMode === 'dual') {
      const topF = layeredFluids?.top || fluid || { name: 'Olive Oil', color: '#84cc16', opacity: 0.45, dampingCoeff_b: 2.40 };
      const botF = layeredFluids?.bot || { name: 'Pure Water', color: '#06b6d4', opacity: 0.38, dampingCoeff_b: 0.70 };
      const halfH = totalLiquidHeight / 2;

      layersToRender = [
        {
          name: botF.name,
          color: botF.color || '#06b6d4',
          opacity: botF.opacity || 0.40,
          metalness: botF.id === 'mercury' ? 0.95 : 0.08,
          height: halfH,
          startY: liquidBottomY,
          endY: liquidBottomY + halfH,
          fluidObj: botF
        },
        {
          name: topF.name,
          color: topF.color || '#84cc16',
          opacity: topF.opacity || 0.45,
          metalness: topF.id === 'mercury' ? 0.95 : 0.08,
          height: halfH,
          startY: liquidBottomY + halfH,
          endY: liquidTopY,
          fluidObj: topF
        }
      ];
    } else if (fluidMode === 'triple') {
      const topF = layeredFluids?.top || { name: 'Extra Virgin Olive Oil', color: '#84cc16', opacity: 0.45, dampingCoeff_b: 2.40 };
      const midF = layeredFluids?.mid || fluid || { name: 'Pure Water', color: '#06b6d4', opacity: 0.38, dampingCoeff_b: 0.70 };
      const botF = layeredFluids?.bot || { name: 'Raw Honey', color: '#f59e0b', opacity: 0.50, dampingCoeff_b: 9.60 };
      const thirdH = totalLiquidHeight / 3;

      layersToRender = [
        {
          name: botF.name,
          color: botF.color || '#f59e0b',
          opacity: botF.opacity || 0.48,
          metalness: botF.id === 'mercury' ? 0.95 : 0.08,
          height: thirdH,
          startY: liquidBottomY,
          endY: liquidBottomY + thirdH,
          fluidObj: botF
        },
        {
          name: midF.name,
          color: midF.color || '#06b6d4',
          opacity: midF.opacity || 0.40,
          metalness: midF.id === 'mercury' ? 0.95 : 0.08,
          height: thirdH,
          startY: liquidBottomY + thirdH,
          endY: liquidBottomY + thirdH * 2,
          fluidObj: midF
        },
        {
          name: topF.name,
          color: topF.color || '#84cc16',
          opacity: topF.opacity || 0.45,
          metalness: topF.id === 'mercury' ? 0.95 : 0.08,
          height: thirdH,
          startY: liquidBottomY + thirdH * 2,
          endY: liquidTopY,
          fluidObj: topF
        }
      ];
    }

    layersToRender.forEach((layer, idx) => {
      const isTopLayer = idx === layersToRender.length - 1;
      const fObj = layer.fluidObj || {};
      const isMercury = fObj.id === 'mercury';
      const isVacuum = fObj.id === 'vacuum';
      const isAir = fObj.id === 'air';
      const isMilk = fObj.id === 'milk';

      // 1. Realistic Volumetric Physical Fluid Cylinder
      const cylGeo = new THREE.CylinderGeometry(beakerRadius - 0.04, beakerRadius - 0.04, layer.height, 48);
      let cylMat;

      if (isMercury) {
        // Photorealistic Liquid Metal Mirror
        cylMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xdce2e6),
          metalness: 0.98,
          roughness: 0.03
        });
      } else if (isVacuum) {
        // High-tech Vacuum Chamber (transparent with ethereal laser indicator grid)
        cylMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(0x38bdf8),
          transparent: true,
          opacity: 0.03,
          wireframe: true
        });
      } else if (isAir) {
        // Atmospheric Gaseous Volume
        cylMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0x94a3b8),
          transmission: 0.98,
          opacity: 0.08,
          transparent: true,
          roughness: 0.01,
          ior: 1.0003
        });
      } else if (isMilk) {
        // Creamy Colloidal Whole Milk with Subsurface Scattering Sheen
        cylMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0xf8fafc),
          transmission: 0.12,
          roughness: 0.28,
          metalness: 0.02,
          clearcoat: 0.7,
          clearcoatRoughness: 0.1,
          opacity: 0.92,
          transparent: true,
          side: THREE.DoubleSide
        });
      } else {
        // Photorealistic Dielectric Physical Fluid (Beer-Lambert Absorption & Refraction)
        cylMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(layer.color),
          transmission: fObj.transmission ?? 0.88,
          transparent: true,
          opacity: 1.0,
          roughness: fObj.roughness ?? 0.03,
          ior: fObj.ior ?? 1.45,
          thickness: fObj.thickness ?? 2.2,
          attenuationColor: new THREE.Color(fObj.attenuationColor || layer.color),
          attenuationDistance: fObj.attenuationDistance ?? 2.5,
          clearcoat: 0.92,
          clearcoatRoughness: 0.03,
          specularIntensity: 1.0,
          side: THREE.DoubleSide
        });
      }

      const mesh = new THREE.Mesh(cylGeo, cylMat);
      mesh.position.set(0, layer.startY + layer.height / 2, 0);
      containerGroup.add(mesh);

      // 2. Realistic Liquid Surface Cap or Interfacial Stratum Disc
      if (isTopLayer) {
        // Realistic Top Fluid Surface Cap (Disc with Wet Gloss)
        const capGeo = new THREE.CircleGeometry(beakerRadius - 0.045, 48);
        let capMat;
        if (isMercury) {
          capMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xdce2e6),
            metalness: 0.98,
            roughness: 0.03,
            side: THREE.DoubleSide
          });
        } else if (isMilk) {
          capMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xf8fafc),
            roughness: 0.25,
            side: THREE.DoubleSide
          });
        } else if (isVacuum) {
          capMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        } else {
          capMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(layer.color),
            transmission: 0.84,
            transparent: true,
            roughness: 0.02,
            ior: fObj.ior ?? 1.4,
            clearcoat: 1.0,
            clearcoatRoughness: 0.02,
            side: THREE.DoubleSide
          });
        }
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.rotation.x = -Math.PI / 2;
        capMesh.position.set(0, layer.endY, 0);
        capMesh.name = 'surfaceCapMesh';
        containerGroup.add(capMesh);
        surfaceCapRef.current = capMesh;

        // Realistic Capillary Meniscus Curved Edge against Beaker Glass Wall
        if (!isVacuum) {
          const meniscusGeo = new THREE.TorusGeometry(beakerRadius - 0.045, 0.032, 12, 48);
          const meniscusMat = isMercury
            ? new THREE.MeshStandardMaterial({ color: 0xdce2e6, metalness: 0.98, roughness: 0.03 })
            : new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(layer.color),
                transmission: 0.75,
                transparent: true,
                roughness: 0.03,
                clearcoat: 1.0
              });
          const meniscusMesh = new THREE.Mesh(meniscusGeo, meniscusMat);
          meniscusMesh.rotation.x = Math.PI / 2;
          // Water/oils curve concave upward (+0.014); Mercury curves convex downward (-0.018)
          meniscusMesh.position.set(0, layer.endY + (isMercury ? -0.018 : 0.014), 0);
          meniscusMesh.name = 'meniscusMesh';
          containerGroup.add(meniscusMesh);
        }
      } else {
        // Multi-Fluid Stratified Interfacial Disc (Liquid-Liquid Boundary)
        const interfaceGeo = new THREE.CircleGeometry(beakerRadius - 0.045, 36);
        const interfaceMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(layer.color),
          transmission: 0.70,
          transparent: true,
          opacity: 0.55,
          roughness: 0.05,
          clearcoat: 0.85,
          side: THREE.DoubleSide
        });
        const interfaceMesh = new THREE.Mesh(interfaceGeo, interfaceMat);
        interfaceMesh.rotation.x = -Math.PI / 2;
        interfaceMesh.position.set(0, layer.endY, 0);
        containerGroup.add(interfaceMesh);

        // Interfacial Meniscus Ring
        const ifRingGeo = new THREE.TorusGeometry(beakerRadius - 0.045, 0.024, 10, 36);
        const ifRingMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(layer.color),
          transparent: true,
          opacity: 0.65,
          roughness: 0.1
        });
        const ifRingMesh = new THREE.Mesh(ifRingGeo, ifRingMat);
        ifRingMesh.rotation.x = Math.PI / 2;
        ifRingMesh.position.set(0, layer.endY, 0);
        containerGroup.add(ifRingMesh);
      }

      liquidMeshesRef.current.push({ ...layer, mesh });
    });

    // Populate Micro-bubbles inside liquid volume
    if (bubbleParticlesRef.current) {
      containerGroup.remove(bubbleParticlesRef.current);
    }
    const currentFluidId = fluid?.id || 'water';
    const isVac = currentFluidId === 'vacuum';
    const isHeavy = ['honey', 'corn_syrup', 'polymer_gel', 'glycerin', 'shampoo'].includes(currentFluidId);
    const bubbleCount = isVac ? 0 : isHeavy ? 18 : 42;
    const bubbleGeo = new THREE.SphereGeometry(isHeavy ? 0.065 : 0.038, 8, 8);
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: isHeavy ? 0.6 : 0.45,
      roughness: 0.1
    });
    const bubbleGroup = new THREE.Group();
    for (let i = 0; i < bubbleCount; i++) {
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
      bubble.position.set(
        (Math.random() - 0.5) * (beakerRadius * 1.45),
        liquidBottomY + 0.2 + Math.random() * (totalLiquidHeight - 0.3),
        (Math.random() - 0.5) * (beakerRadius * 1.45)
      );
      bubble.userData = {
        baseSpeedY: (isHeavy ? 0.003 : 0.008) + Math.random() * (isHeavy ? 0.005 : 0.016),
        baseX: bubble.position.x,
        phase: Math.random() * Math.PI * 2
      };
      bubbleGroup.add(bubble);
    }
    containerGroup.add(bubbleGroup);
    bubbleParticlesRef.current = bubbleGroup;

    if (rippleMeshRef.current && layersToRender.length > 0) {
      const topLayer = layersToRender[layersToRender.length - 1];
      rippleMeshRef.current.material.color = new THREE.Color(topLayer.color);
      // Surface ripple expansion when fluid is loaded
      rippleMeshRef.current.scale.set(1.4, 1.4, 1);
      rippleMeshRef.current.material.opacity = 0.8;
    }

    if (causticMeshRef.current && layersToRender.length > 0) {
      const topLayer = layersToRender[layersToRender.length - 1];
      causticMeshRef.current.material.color = new THREE.Color(topLayer.color);
      causticMeshRef.current.material.opacity = isVac ? 0.04 : 0.28;
    }

    if (sceneRef.current && layersToRender.length > 0) {
      const pl = sceneRef.current.getObjectByName('fluidPointLight');
      if (pl) {
        const topLayer = layersToRender[layersToRender.length - 1];
        pl.color = new THREE.Color(topLayer.color);
        pl.intensity = isVac ? 0.4 : 2.2;
      }
    }
  }, [fluid, fluidMode, layeredFluids]);

  // Camera presets
  const setPresetView = (view) => {
    setCameraView(view);
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    if (view === 'front') cam.position.set(0, -1.0, 12.0);
    else if (view === 'iso') cam.position.set(8.5, 4.0, 9.5);
    else if (view === 'side') cam.position.set(12.5, -1.0, 0);
    else if (view === 'closeup') cam.position.set(0, -2.8, 5.8);
    else if (view === 'top') cam.position.set(0, 12.0, 0.1);
    cam.lookAt(0, -1.8, 0);
  };

  // Helper to determine active immersion fluid layer and instantaneous damping b(y)
  const getImmersionPhysicsAt = (bobWorldY) => {
    const liquidBottomY = -5.7;
    const liquidTopY = -0.4;

    const resolveB = (f) => {
      if (!f) return 0.70;
      return fluidDampingType === 'overdamped' 
        ? (f.overdamped_b ?? f.dampingCoeff_b ?? 0.85) 
        : (f.dampingCoeff_b ?? 0.70);
    };

    if (bobWorldY > liquidTopY) {
      return {
        name: 'Air (Surface)',
        dampingCoeff_b: 0.08,
        density_kg_m3: 1.204,
        color: '#94a3b8'
      };
    }

    if (fluidMode === 'single') {
      return {
        name: fluid?.name || 'Water',
        dampingCoeff_b: resolveB(fluid),
        density_kg_m3: fluid?.density_kg_m3 ?? 998.2,
        color: fluid?.color || '#06b6d4'
      };
    }

    const totalHeight = liquidTopY - liquidBottomY;

    if (fluidMode === 'dual') {
      const midY = liquidBottomY + totalHeight / 2;
      const topF = layeredFluids?.top || fluid || { name: 'Olive Oil', dampingCoeff_b: 2.40, density_kg_m3: 918, color: '#84cc16' };
      const botF = layeredFluids?.bot || { name: 'Pure Water', dampingCoeff_b: 0.70, density_kg_m3: 998, color: '#06b6d4' };

      if (bobWorldY >= midY) {
        return {
          name: `Layer 1: ${topF.name}`,
          dampingCoeff_b: resolveB(topF),
          density_kg_m3: topF.density_kg_m3 ?? 918,
          color: topF.color || '#84cc16'
        };
      } else {
        return {
          name: `Layer 2: ${botF.name}`,
          dampingCoeff_b: resolveB(botF),
          density_kg_m3: botF.density_kg_m3 ?? 998,
          color: botF.color || '#06b6d4'
        };
      }
    }

    if (fluidMode === 'triple') {
      const third = totalHeight / 3;
      const y1 = liquidBottomY + third;
      const y2 = liquidBottomY + third * 2;

      const topF = layeredFluids?.top || { name: 'Olive Oil', dampingCoeff_b: 2.40, density_kg_m3: 918, color: '#84cc16' };
      const midF = layeredFluids?.mid || fluid || { name: 'Pure Water', dampingCoeff_b: 0.70, density_kg_m3: 998, color: '#06b6d4' };
      const botF = layeredFluids?.bot || { name: 'Raw Honey', dampingCoeff_b: 9.60, density_kg_m3: 1420, color: '#f59e0b' };

      if (bobWorldY >= y2) {
        return {
          name: `Top: ${topF.name}`,
          dampingCoeff_b: resolveB(topF),
          density_kg_m3: topF.density_kg_m3 ?? 918,
          color: topF.color || '#84cc16'
        };
      } else if (bobWorldY >= y1) {
        return {
          name: `Middle: ${midF.name}`,
          dampingCoeff_b: resolveB(midF),
          density_kg_m3: midF.density_kg_m3 ?? 998,
          color: midF.color || '#06b6d4'
        };
      } else {
        return {
          name: `Bottom: ${botF.name}`,
          dampingCoeff_b: resolveB(botF),
          density_kg_m3: botF.density_kg_m3 ?? 1420,
          color: botF.color || '#f59e0b'
        };
      }
    }

    return {
      name: fluid?.name || 'Water',
      dampingCoeff_b: resolveB(fluid),
      density_kg_m3: 1000,
      color: '#06b6d4'
    };
  };

  // Re-build 3D Springs (Single, Series, Parallel, Series-Parallel) in Three.js
  useEffect(() => {
    if (!sceneRef.current) return;
    const group = springGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      group.remove(child);
    }

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.2 });
    const springWireMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.92, roughness: 0.18 });
    const springWireMat2 = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.92, roughness: 0.18 });
    const springWireMat3 = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.92, roughness: 0.18 });
    const spreaderMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.3 });

    const mode = springConfig?.mode || 'single';

    const createHookMesh = (mat = chromeMat) => {
      const hookGeo = new THREE.TorusGeometry(0.12, 0.03, 12, 24, Math.PI * 1.4);
      return new THREE.Mesh(hookGeo, mat);
    };

    if (mode === 'single') {
      const topHook = createHookMesh();
      topHook.position.set(0, 4.88, 0);
      topHook.rotation.z = Math.PI / 2;
      group.add(topHook);

      const sGeo = createSpringGeometry(1.2, 4.75, 14, 0.44);
      const sMesh = new THREE.Mesh(sGeo, springWireMat);
      sMesh.name = 'spring_single';
      sMesh.castShadow = true;
      group.add(sMesh);

      const botHook = createHookMesh();
      botHook.name = 'spring_bottom_hook';
      botHook.position.set(0, 1.2, 0);
      group.add(botHook);
    } 
    else if (mode === 'series') {
      const topHook = createHookMesh();
      topHook.position.set(0, 4.88, 0);
      group.add(topHook);

      const s1Geo = createSpringGeometry(2.8, 4.75, 9, 0.40);
      const s1Mesh = new THREE.Mesh(s1Geo, springWireMat);
      s1Mesh.name = 'spring_series_1';
      s1Mesh.castShadow = true;
      group.add(s1Mesh);

      const couplerGroup = new THREE.Group();
      couplerGroup.name = 'series_coupler';
      const ringGeo = new THREE.TorusGeometry(0.16, 0.035, 12, 24);
      const couplerRing = new THREE.Mesh(ringGeo, spreaderMat);
      couplerGroup.add(couplerRing);
      couplerGroup.position.set(0, 2.8, 0);
      group.add(couplerGroup);

      const s2Geo = createSpringGeometry(1.2, 2.7, 9, 0.40);
      const s2Mesh = new THREE.Mesh(s2Geo, springWireMat2);
      s2Mesh.name = 'spring_series_2';
      s2Mesh.castShadow = true;
      group.add(s2Mesh);

      const botHook = createHookMesh();
      botHook.name = 'spring_bottom_hook';
      botHook.position.set(0, 1.2, 0);
      group.add(botHook);
    } 
    else if (mode === 'parallel') {
      const topBarGeo = new THREE.BoxGeometry(1.5, 0.08, 0.08);
      const topBar = new THREE.Mesh(topBarGeo, spreaderMat);
      topBar.position.set(0, 4.85, 0);
      group.add(topBar);

      const s1Geo = createSpringGeometry(1.2, 4.8, 13, 0.35);
      const s1Mesh = new THREE.Mesh(s1Geo, springWireMat);
      s1Mesh.name = 'spring_parallel_1';
      s1Mesh.position.x = -0.55;
      s1Mesh.castShadow = true;
      group.add(s1Mesh);

      const s2Geo = createSpringGeometry(1.2, 4.8, 13, 0.35);
      const s2Mesh = new THREE.Mesh(s2Geo, springWireMat2);
      s2Mesh.name = 'spring_parallel_2';
      s2Mesh.position.x = 0.55;
      s2Mesh.castShadow = true;
      group.add(s2Mesh);

      const botBarGeo = new THREE.BoxGeometry(1.5, 0.08, 0.08);
      const botBar = new THREE.Mesh(botBarGeo, spreaderMat);
      botBar.name = 'parallel_bot_bar';
      botBar.position.set(0, 1.2, 0);
      group.add(botBar);

      const botHook = createHookMesh();
      botHook.name = 'spring_bottom_hook';
      botHook.position.set(0, 1.12, 0);
      group.add(botHook);
    } 
    else if (mode === 'series_parallel') {
      const topBarGeo = new THREE.BoxGeometry(1.4, 0.08, 0.08);
      const topBar = new THREE.Mesh(topBarGeo, spreaderMat);
      topBar.position.set(0, 4.85, 0);
      group.add(topBar);

      const s1Geo = createSpringGeometry(2.8, 4.8, 8, 0.32);
      const s1Mesh = new THREE.Mesh(s1Geo, springWireMat);
      s1Mesh.name = 'spring_sp_1';
      s1Mesh.position.x = -0.48;
      s1Mesh.castShadow = true;
      group.add(s1Mesh);

      const s2Geo = createSpringGeometry(2.8, 4.8, 8, 0.32);
      const s2Mesh = new THREE.Mesh(s2Geo, springWireMat2);
      s2Mesh.name = 'spring_sp_2';
      s2Mesh.position.x = 0.48;
      s2Mesh.castShadow = true;
      group.add(s2Mesh);

      const midBarGeo = new THREE.BoxGeometry(1.4, 0.08, 0.08);
      const midBar = new THREE.Mesh(midBarGeo, spreaderMat);
      midBar.name = 'sp_mid_bar';
      midBar.position.set(0, 2.8, 0);
      group.add(midBar);

      const s3Geo = createSpringGeometry(1.2, 2.75, 9, 0.40);
      const s3Mesh = new THREE.Mesh(s3Geo, springWireMat3);
      s3Mesh.name = 'spring_sp_3';
      s3Mesh.castShadow = true;
      group.add(s3Mesh);

      const botHook = createHookMesh();
      botHook.name = 'spring_bottom_hook';
      botHook.position.set(0, 1.2, 0);
      group.add(botHook);
    }
  }, [springConfig?.mode]);

  // 60 FPS EXACT ANALYTICAL & SUB-STEP STATE PROPAGATOR LOOP
  useEffect(() => {
    let animationFrameId;
    let lastTimestamp = performance.now();

    const animate = (timestamp) => {
      const dtReal = Math.min(0.04, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;

      const springNet = calculateEquivalentSpringK(springConfig);
      const k_eff = springNet.k_eq || 40.0;
      const m = mass || 1.0;

      // EQUILIBRIUM COORDINATES: Center of bob sits inside fluid at y = -3.0
      const eqWorldY = -3.0;
      const worldScale = 0.12;

      if (isPlaying) {
        const dt = dtReal * simSpeed;
        let curX = simState.current.x; // in cm
        let curV = simState.current.v; // in cm/s

        const currentWorldY = eqWorldY + curX * worldScale;
        const currentFluidInfo = getImmersionPhysicsAt(currentWorldY);

        simState.current.activeLayer = currentFluidInfo.name;
        simState.current.effectiveB = currentFluidInfo.dampingCoeff_b;

        const b = currentFluidInfo.dampingCoeff_b;

        // Exact Analytical State Propagator for damped harmonic oscillator
        const omega0 = Math.sqrt(k_eff / m);
        const gamma = b / (2 * m);
        const disc = gamma * gamma - omega0 * omega0;
        const expTerm = Math.exp(-gamma * dt);

        let newX = curX;
        let newV = curV;

        if (b === 0) {
          // Undamped
          newX = curX * Math.cos(omega0 * dt) + (curV / omega0) * Math.sin(omega0 * dt);
          newV = -curX * omega0 * Math.sin(omega0 * dt) + curV * Math.cos(omega0 * dt);
        } else if (Math.abs(disc) < 1e-5) {
          // Critically Damped (zeta == 1)
          newX = expTerm * (curX + (curV + gamma * curX) * dt);
          newV = expTerm * (curV - gamma * (curV + gamma * curX) * dt);
        } else if (disc < 0) {
          // Underdamped (zeta < 1) - Visible harmonic oscillations!
          const omegad = Math.sqrt(-disc);
          const cosT = Math.cos(omegad * dt);
          const sinT = Math.sin(omegad * dt);
          newX = expTerm * (curX * cosT + ((curV + gamma * curX) / omegad) * sinT);
          newV = expTerm * (curV * cosT - ((omega0 * omega0 * curX + gamma * curV) / omegad) * sinT);
        } else {
          // Overdamped (zeta > 1) - Monotonic creep
          const alpha = Math.sqrt(disc);
          const coshT = Math.cosh(alpha * dt);
          const sinhT = Math.sinh(alpha * dt);
          newX = expTerm * (curX * coshT + ((curV + gamma * curX) / alpha) * sinhT);
          newV = expTerm * (curV * coshT - ((omega0 * omega0 * curX + gamma * curV) / alpha) * sinhT);
        }

        // Cycle counting via peak & zero detection
        const dir = Math.sign(newV);
        if (simState.current.lastDirection !== 0 && dir !== simState.current.lastDirection && dir < 0) {
          simState.current.halfCycles += 1;
          const fullCycles = Math.floor(simState.current.halfCycles / 2);
          if (fullCycles > simState.current.cycleCount) {
            simState.current.cycleCount = fullCycles;
            if (onCycleUpdate) onCycleUpdate(fullCycles);
          }
        }
        simState.current.lastDirection = dir;

        // Settling threshold detection (< 1% of initial displacement)
        if (Math.abs(newX) < Math.abs(initialDisplacement) * 0.01 && Math.abs(newV) < 0.2) {
          simState.current.isSettled = true;
        }

        simState.current.x = newX;
        simState.current.v = newV;
        simState.current.t += dt;

        // Live Telemetry updates
        if (setLiveMetrics) {
          const x_m = newX / 100;
          const v_ms = newV / 100;
          const b_now = simState.current.effectiveB;
          const ke = 0.5 * m * (v_ms ** 2);
          const pe = 0.5 * k_eff * (x_m ** 2);

          setLiveMetrics({
            currentX: Number(newX.toFixed(2)),
            currentV: Number(newV.toFixed(2)),
            currentA: Number(((-k_eff * x_m - b_now * v_ms) / m).toFixed(2)),
            kineticEnergy: Number(ke.toFixed(4)),
            potentialEnergy: Number(pe.toFixed(4)),
            totalEnergy: Number((ke + pe).toFixed(4)),
            cyclesCompleted: simState.current.cycleCount,
            elapsedTime: Number(simState.current.t.toFixed(2)),
            isSettled: simState.current.isSettled,
            activeLayer: simState.current.activeLayer,
            effectiveB: simState.current.effectiveB,
            equivalentK: k_eff
          });
        }
      }

      // 3D Scene Mesh Updates
      const curX = simState.current.x;
      const curV = simState.current.v;
      const bobWorldY = eqWorldY + curX * worldScale; // Center of immersed bob

      if (bobGroupRef.current) {
        bobGroupRef.current.position.y = bobWorldY;
      }

      // Spring & String Kinematics
      const topAttachY = 4.85;
      const bobEyeletY = bobWorldY + 0.85;
      const deltaSpring = curX * worldScale * 0.45;
      const springBottomY = Math.max(0.6, 1.2 + deltaSpring);

      if (suspensionStringRef.current) {
        const stringHeight = Math.max(0.1, springBottomY - bobEyeletY);
        const midY = (springBottomY + bobEyeletY) / 2;
        suspensionStringRef.current.position.set(0, midY, 0);
        suspensionStringRef.current.scale.set(1, stringHeight, 1);
      }

      // Update 3D Spring Meshes according to Spring Mode
      const springGroup = springGroupRef.current;
      if (springGroup) {
        const mode = springConfig?.mode || 'single';

        if (mode === 'single') {
          const sMesh = springGroup.getObjectByName('spring_single');
          const botHook = springGroup.getObjectByName('spring_bottom_hook');
          if (sMesh) {
            sMesh.geometry.dispose();
            sMesh.geometry = createSpringGeometry(springBottomY, topAttachY, 14, 0.44);
          }
          if (botHook) {
            botHook.position.set(0, springBottomY, 0);
          }
        } 
        else if (mode === 'series') {
          const s1Mesh = springGroup.getObjectByName('spring_series_1');
          const s2Mesh = springGroup.getObjectByName('spring_series_2');
          const coupler = springGroup.getObjectByName('series_coupler');
          const botHook = springGroup.getObjectByName('spring_bottom_hook');

          const k1 = springConfig.k1 || 40;
          const k2 = springConfig.k2 || 40;
          const totalSpringHeight = Math.max(0.6, topAttachY - springBottomY);
          const splitRatio = k2 / (k1 + k2);
          const couplerY = springBottomY + totalSpringHeight * (1 - splitRatio);

          if (s1Mesh) {
            s1Mesh.geometry.dispose();
            s1Mesh.geometry = createSpringGeometry(couplerY, topAttachY, 8, 0.40);
          }
          if (coupler) {
            coupler.position.set(0, couplerY, 0);
          }
          if (s2Mesh) {
            s2Mesh.geometry.dispose();
            s2Mesh.geometry = createSpringGeometry(springBottomY, couplerY, 8, 0.40);
          }
          if (botHook) {
            botHook.position.set(0, springBottomY, 0);
          }
        } 
        else if (mode === 'parallel') {
          const s1Mesh = springGroup.getObjectByName('spring_parallel_1');
          const s2Mesh = springGroup.getObjectByName('spring_parallel_2');
          const botBar = springGroup.getObjectByName('parallel_bot_bar');
          const botHook = springGroup.getObjectByName('spring_bottom_hook');

          if (s1Mesh && s2Mesh) {
            s1Mesh.geometry.dispose();
            s1Mesh.geometry = createSpringGeometry(springBottomY, topAttachY, 13, 0.35);
            s2Mesh.geometry.dispose();
            s2Mesh.geometry = createSpringGeometry(springBottomY, topAttachY, 13, 0.35);
          }
          if (botBar) {
            botBar.position.set(0, springBottomY, 0);
          }
          if (botHook) {
            botHook.position.set(0, springBottomY - 0.08, 0);
          }
        } 
        else if (mode === 'series_parallel') {
          const s1Mesh = springGroup.getObjectByName('spring_sp_1');
          const s2Mesh = springGroup.getObjectByName('spring_sp_2');
          const midBar = springGroup.getObjectByName('sp_mid_bar');
          const s3Mesh = springGroup.getObjectByName('spring_sp_3');
          const botHook = springGroup.getObjectByName('spring_bottom_hook');

          const kp = (springConfig.k1 || 40) + (springConfig.k2 || 40);
          const k3 = springConfig.k3 || 40;
          const totalSpringHeight = Math.max(0.8, topAttachY - springBottomY);
          const splitRatio = k3 / (kp + k3);
          const midBarY = springBottomY + totalSpringHeight * (1 - splitRatio);

          if (s1Mesh && s2Mesh) {
            s1Mesh.geometry.dispose();
            s1Mesh.geometry = createSpringGeometry(midBarY, topAttachY, 7, 0.32);
            s2Mesh.geometry.dispose();
            s2Mesh.geometry = createSpringGeometry(midBarY, topAttachY, 7, 0.32);
          }
          if (midBar) {
            midBar.position.set(0, midBarY, 0);
          }
          if (s3Mesh) {
            s3Mesh.geometry.dispose();
            s3Mesh.geometry = createSpringGeometry(springBottomY, midBarY, 8, 0.38);
          }
          if (botHook) {
            botHook.position.set(0, springBottomY, 0);
          }
        }
      }

      // Dynamic 3D Force Vectors
      const b_now = simState.current.effectiveB;
      const F_spring = -k_eff * (curX / 100);
      const F_damping = -b_now * (curV / 100);

      if (showVectors) {
        if (springForceArrowRef.current) {
          springForceArrowRef.current.visible = true;
          springForceArrowRef.current.position.set(1.4, bobWorldY, 0);
          const dirS = F_spring >= 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0);
          springForceArrowRef.current.setDirection(dirS);
          springForceArrowRef.current.setLength(Math.min(3.5, Math.max(0.2, Math.abs(F_spring) * 0.45)), 0.25, 0.15);
        }

        if (dampingForceArrowRef.current) {
          dampingForceArrowRef.current.visible = true;
          dampingForceArrowRef.current.position.set(2.0, bobWorldY, 0);
          const dirD = F_damping >= 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0);
          dampingForceArrowRef.current.setDirection(dirD);
          dampingForceArrowRef.current.setLength(Math.min(3.5, Math.max(0.15, Math.abs(F_damping) * 0.6)), 0.25, 0.15);
        }

        if (velocityArrowRef.current) {
          velocityArrowRef.current.visible = true;
          velocityArrowRef.current.position.set(-1.4, bobWorldY, 0);
          const dirV = curV >= 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0);
          velocityArrowRef.current.setDirection(dirV);
          velocityArrowRef.current.setLength(Math.min(3.0, Math.max(0.2, Math.abs(curV) * 0.04)), 0.25, 0.15);
        }
      } else {
        if (springForceArrowRef.current) springForceArrowRef.current.visible = false;
        if (dampingForceArrowRef.current) dampingForceArrowRef.current.visible = false;
        if (velocityArrowRef.current) velocityArrowRef.current.visible = false;
      }

      // Animate fluid micro-bubbles
      if (bubbleParticlesRef.current && isPlaying) {
        bubbleParticlesRef.current.children.forEach(bubble => {
          const bubblePhysics = getImmersionPhysicsAt(bubble.position.y);
          const viscositySpeedFactor = 1.0 / Math.max(0.2, Math.sqrt(bubblePhysics.dampingCoeff_b || 1.0));
          bubble.position.y += bubble.userData.baseSpeedY * viscositySpeedFactor * (1 + Math.abs(curV) * 0.04);
          bubble.position.x = bubble.userData.baseX + Math.sin(timestamp * 0.002 + bubble.userData.phase) * (0.06 * viscositySpeedFactor);
          if (bubble.position.y > -0.5) bubble.position.y = -5.6;
        });
      }

      // Animate Hydrodynamic Viscous Shear Wake Particles
      if (wakeParticlesRef.current && isPlaying) {
        const isVac = simState.current.activeLayer.toLowerCase().includes('vacuum');
        const speed = Math.abs(curV); // in cm/s
        const bEff = simState.current.effectiveB || 0.7;
        const wakeOpacity = isVac ? 0.0 : Math.min(0.70, (speed * 0.03) * Math.min(2.0, Math.sqrt(bEff)));

        wakeParticlesRef.current.children.forEach((p, idx) => {
          p.material.opacity = wakeOpacity;
          p.material.color = new THREE.Color(fluid?.color || '#06b6d4');
          const trailSign = curV > 0 ? -1 : 1; // if bob moves up, wake trails below; if down, wake streams upward
          const streamY = p.userData.baseY + trailSign * (0.12 + (speed * 0.012) * ((idx % 4) + 1) * 0.22);
          const wobble = Math.sin(timestamp * 0.008 + p.userData.phase) * (0.03 + speed * 0.002);
          p.position.y = streamY;
          p.position.x = Math.cos(p.userData.angle) * (p.userData.radius + wobble);
          p.position.z = Math.sin(p.userData.angle) * (p.userData.radius + wobble);
        });
      }

      // Archimedes Liquid Surface Displacement
      if (surfaceCapRef.current) {
        const displacementY = -0.4 - (curX * worldScale * 0.035);
        surfaceCapRef.current.position.y = displacementY;
      }

      // Realistic Dynamic Traveling Wave Ripples on Liquid Surface
      if (rippleMeshRef.current) {
        const distFromSurface = Math.abs(bobWorldY - (-0.4));
        const waveAmp = Math.max(0, 1.0 - distFromSurface * 0.55) * Math.min(1.2, Math.abs(curV) * 0.045);
        const waveFreq = timestamp * 0.006;
        const rippleScale = 1.0 + (waveAmp * 0.3) + Math.sin(waveFreq) * 0.05 * waveAmp;
        rippleMeshRef.current.scale.set(rippleScale, rippleScale, 1);
        rippleMeshRef.current.material.opacity = 0.25 + waveAmp * 0.55;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    isPlaying, 
    simSpeed, 
    fluid, 
    mass, 
    springK, 
    springConfig, 
    fluidMode, 
    layeredFluids, 
    fluidDampingType,
    showVectors, 
    initialDisplacement
  ]);

  const activeSpringDetails = calculateEquivalentSpringK(springConfig);
  const currentB = simState.current.effectiveB || 0.70;
  const isOverdamped = currentB > 2 * Math.sqrt((activeSpringDetails.k_eq || 40) * (mass || 1));
  const isCritical = Math.abs(currentB - 2 * Math.sqrt((activeSpringDetails.k_eq || 40) * (mass || 1))) < 0.25;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/80 shadow-2xl flex flex-col">
      {/* 3D Canvas Mount */}
      <div 
        ref={mountRef} 
        className="relative w-full h-[540px] sm:h-[600px] cursor-grab active:cursor-grabbing"
      />

      {/* Dynamic Fluid Switch Toast Notification */}
      {fluidSwitchToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-400/80 backdrop-blur-xl shadow-2xl shadow-cyan-500/20 animate-fadeIn transition-all max-w-[90%] sm:max-w-md">
          <span className="text-2xl flex-shrink-0 p-1.5 rounded-xl bg-slate-800 border border-slate-700 shadow">
            {fluidSwitchToast.emoji}
          </span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 font-sans truncate">
                {fluidSwitchToast.name}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex-shrink-0">
                {fluidSwitchToast.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-300 mt-0.5">
              <span>η = {fluidSwitchToast.viscosity_cP < 10 ? fluidSwitchToast.viscosity_cP : Math.round(fluidSwitchToast.viscosity_cP)} cP</span>
              <span>·</span>
              <span className="text-amber-400 font-bold">b = {fluidSwitchToast.dampingCoeff_b} N·s/m</span>
              <span>·</span>
              <span className="text-emerald-400">
                {fluidDampingType === 'oscillatory' ? 'Oscillating' : 'Overdamped'}
              </span>
            </div>
          </div>
          <button
            onClick={() => resetSimulation(initialDisplacement, 0.0)}
            className="ml-auto flex-shrink-0 px-2.5 py-1 text-[11px] rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors shadow"
          >
            Replay
          </button>
        </div>
      )}

      {/* Top Overlay HUD Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Active Fluid / Immersion Badge */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg">
          <span 
            className="w-3.5 h-3.5 rounded-full shadow-md animate-pulse"
            style={{ backgroundColor: fluid?.color || '#06b6d4' }}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-100 leading-tight">
                {fluidMode === 'single' ? (fluid?.name || 'Water') : `${fluidMode.toUpperCase()}-LAYER COLUMN`}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 font-mono border border-cyan-800/60 uppercase">
                {springConfig?.mode?.replace('_', '-')}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              k_eq = {activeSpringDetails.k_eq} N/m · b_eff = {currentB} N·s/m
            </span>
          </div>
        </div>

        {/* Live Vector Legend & Camera View Switcher */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
              showVectors
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            Vectors: {showVectors ? 'ON' : 'OFF'}
          </button>
          
          <div className="hidden sm:flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1">
            {['front', 'iso', 'side', 'closeup'].map(v => (
              <button
                key={v}
                onClick={() => setPresetView(v)}
                className={`px-2 py-0.5 text-[11px] rounded uppercase font-mono font-medium transition-colors ${
                  cameraView === v 
                    ? 'bg-cyan-500 text-slate-950 font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Immersion Status Badge */}
      <div className="absolute top-16 left-3 pointer-events-auto p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 backdrop-blur-md shadow-xl flex items-center gap-2 text-xs font-mono animate-fadeIn">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase">Submerged in Liquid:</span>
          <span className="font-semibold text-cyan-200 text-xs">
            {simState.current.activeLayer} (b = {currentB} N·s/m)
          </span>
        </div>
      </div>

      {/* Overdamped Notice (When user activates Theoretical Overdamping) */}
      {(isOverdamped || isCritical) && fluidDampingType === 'overdamped' && (
        <div className="absolute top-28 left-3 right-3 sm:right-auto sm:max-w-md pointer-events-auto p-3 rounded-xl bg-slate-900/95 border border-amber-500/50 backdrop-blur-md shadow-2xl flex flex-col gap-1.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">
                {isCritical ? 'Critically Damped (ζ ≈ 1.0)' : 'Theoretical Overdamped (ζ > 1.0)'}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
              0 Oscillations (Creep)
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            In Theoretical Overdamping mode, viscous resistance prevents harmonic oscillation. To see visible oscillations, switch to <strong>"Observable Oscillations"</strong> in the controls.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handlePullAndRelease(12.0)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Pull & Release (+12cm)</span>
            </button>
          </div>
        </div>
      )}

      {/* Vector Legend Badge */}
      {showVectors && (!isOverdamped || fluidDampingType === 'oscillatory') && (
        <div className="absolute top-28 left-3 pointer-events-none hidden md:flex flex-col gap-1 p-2.5 rounded-xl bg-slate-900/85 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-emerald-300">Fs = -k_eq·x (Spring Network)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
            <span className="text-amber-300">Fd = -b·v (Fluid Drag)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm" />
            <span className="text-sky-300">v (Instant Velocity)</span>
          </div>
        </div>
      )}

      {/* Live Telemetry HUD (Right Overlay) */}
      <div className="absolute top-16 right-3 pointer-events-none flex flex-col gap-2 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-xl min-w-[180px]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">
            {isOverdamped && fluidDampingType === 'overdamped' ? 'Creep Status' : 'Cycles Detected'}
          </span>
          <span className="animate-ping w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </div>
        
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold text-cyan-300 font-mono-num">
            {liveMetrics?.cyclesCompleted ?? 0}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {isOverdamped && fluidDampingType === 'overdamped' ? 'cycles (None)' : `cycles`}
          </span>
        </div>

        <div className="h-px bg-slate-800 my-0.5" />

        <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
          <div className="text-slate-400">Position:</div>
          <div className="text-right text-slate-100 font-mono-num">{liveMetrics?.currentX ?? initialDisplacement} cm</div>
          <div className="text-slate-400">Velocity:</div>
          <div className="text-right text-slate-100 font-mono-num">{liveMetrics?.currentV ?? 0} cm/s</div>
          <div className="text-slate-400">k_eq:</div>
          <div className="text-right text-emerald-400 font-mono-num">{activeSpringDetails.k_eq} N/m</div>
          <div className="text-slate-400">Time:</div>
          <div className="text-right text-cyan-400 font-mono-num">{liveMetrics?.elapsedTime ?? 0} s</div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold shadow-cyan-500/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Simulate</span>
              </>
            )}
          </button>

          <button
            onClick={() => handlePullAndRelease(initialDisplacement)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition-colors"
            title="Reset to Initial Displacement"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay</span>
          </button>

          <button
            onClick={() => handlePullAndRelease(12.0)}
            className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 text-xs font-medium border border-cyan-800/60 transition-colors"
          >
            <ArrowUpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pull Bob (+12cm)</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Bob Immersed · Oscillations Active in All Fluids · {activeSpringDetails.description}</span>
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
          Drag to rotate · Scroll to zoom
        </div>
      </div>
    </div>
  );
}
