import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Car, 
  Building2, 
  DoorClosed, 
  Play, 
  RotateCcw, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Activity, 
  Eye, 
  Sliders, 
  RefreshCw,
  Zap
} from 'lucide-react';

export default function Applications3D({ applications = [] }) {
  const [selectedApp, setSelectedApp] = useState('vehicle_suspension'); // 'vehicle_suspension', 'tuned_mass_damper', 'door_closer'
  const [damperMode, setDamperMode] = useState('critical'); // 'critical', 'underdamped', 'overdamped'
  const [isDamperActive, setIsDamperActive] = useState(true); // for skyscraper TMD
  const [continuousRoad, setContinuousRoad] = useState(false); // for vehicle continuous washboard road
  const [cameraView, setCameraView] = useState('front');

  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const coiloverSpringRef = useRef(null);
  const doorScissorArmRef = useRef(null);

  // Live telemetry states for UI display
  const [telemetry, setTelemetry] = useState({
    suspensionDisp: 0,
    buildingSway: 0,
    doorAngleDeg: 0,
    isSlammed: false,
    chassisPhase: 'Stable'
  });

  // Animation state refs
  const appAnimState = useRef({
    time: 0,
    carBodyY: 0,
    carBodyVy: 0,
    wheelY: 0,
    wheelVy: 0,
    isImpacting: false,
    buildingSway: 0,
    tmdSway: 0,
    doorAngle: 0, // radians
    doorOmega: 0,
    slamTimer: 0
  });

  const triggerBump = (intensity = 15.0) => {
    appAnimState.current.isImpacting = true;
    appAnimState.current.carBodyVy = intensity;
    appAnimState.current.wheelY = 0.9;
  };

  const triggerDoorOpen = (angleRad = 1.48) => { // ~85 degrees
    appAnimState.current.doorAngle = angleRad;
    appAnimState.current.doorOmega = 0;
  };

  // Helper to generate helical coiled spring geometry
  const createCoilGeometry = (startHeight, endHeight, coils = 7, radius = 0.32, tubeRadius = 0.04) => {
    const points = [];
    const totalPoints = coils * 24;
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
    return new THREE.TubeGeometry(curve, coils * 18, tubeRadius, 8, false);
  };

  // Camera presets
  const setPresetView = (view) => {
    setCameraView(view);
    if (!cameraRef.current) return;
    const cam = cameraRef.current;

    if (selectedApp === 'vehicle_suspension') {
      if (view === 'front') cam.position.set(0, 1.2, 8.5);
      else if (view === 'iso') cam.position.set(6.5, 4.0, 7.5);
      else if (view === 'side') cam.position.set(9.0, 0.8, 0);
      else if (view === 'closeup') cam.position.set(0, 0.4, 4.5);
      cam.lookAt(0, 0.3, 0);
    } else if (selectedApp === 'tuned_mass_damper') {
      if (view === 'front') cam.position.set(0, 1.2, 11.5);
      else if (view === 'iso') cam.position.set(8.5, 5.0, 9.5);
      else if (view === 'side') cam.position.set(11.5, 1.2, 0);
      else if (view === 'closeup') cam.position.set(0, 2.0, 5.2);
      cam.lookAt(0, 0.5, 0);
    } else if (selectedApp === 'door_closer') {
      if (view === 'front') cam.position.set(0, 0.5, 7.8);
      else if (view === 'iso') cam.position.set(5.5, 4.0, 6.5);
      else if (view === 'side') cam.position.set(8.0, 1.2, 1.0);
      else if (view === 'closeup') cam.position.set(-0.8, 2.3, 3.8);
      cam.lookAt(0, 0.4, 0);
    }
  };

  // Setup Three.js scene for selected application
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x070b16);
    scene.fog = new THREE.FogExp2(0x070b16, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.replaceChildren(renderer.domElement);

    // Common Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(7, 14, 8);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 2.8, 22);
    cyanLight.position.set(-6, 3, 6);
    scene.add(cyanLight);

    const amberLight = new THREE.PointLight(0xf59e0b, 1.8, 22);
    amberLight.position.set(6, -2, 5);
    scene.add(amberLight);

    // ==========================================
    // 1. VEHICLE SUSPENSION SCENE
    // ==========================================
    if (selectedApp === 'vehicle_suspension') {
      camera.position.set(0, 1.2, 8.5);
      camera.lookAt(0, 0.3, 0);

      // Road Surface
      const roadGeo = new THREE.BoxGeometry(18, 0.35, 5);
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(0, -2.4, 0);
      road.receiveShadow = true;
      scene.add(road);

      // Moving Yellow Lane Markings Group
      const roadMarksGroup = new THREE.Group();
      roadMarksGroup.name = 'roadMarksGroup';
      for (let i = -8; i <= 8; i += 2.8) {
        const markGeo = new THREE.BoxGeometry(1.4, 0.03, 0.22);
        const markMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const mark = new THREE.Mesh(markGeo, markMat);
        mark.position.set(i, -2.21, 0);
        roadMarksGroup.add(mark);
      }
      scene.add(roadMarksGroup);

      // Wheel assembly
      const wheelGroup = new THREE.Group();
      wheelGroup.name = 'wheelGroup';

      // Rubber Tire with rim and brake rotor
      const tireGeo = new THREE.TorusGeometry(1.15, 0.38, 16, 36);
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
      const tire = new THREE.Mesh(tireGeo, tireMat);
      wheelGroup.add(tire);

      // Alloy Rim Hub
      const rimGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.42, 28);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.92, roughness: 0.18 });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      wheelGroup.add(rim);

      // Brake rotor disc & red caliper
      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.06, 24),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.95 })
      );
      rotor.rotation.x = Math.PI / 2;
      wheelGroup.add(rotor);

      const caliper = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.35, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 })
      );
      caliper.position.set(0.48, 0.35, 0.05);
      wheelGroup.add(caliper);

      wheelGroup.position.set(0, -1.05, 0);
      scene.add(wheelGroup);

      // Suspension Wishbone (Lower Control Arm)
      const aArmMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85 });
      const aArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 12), aArmMat);
      aArm.name = 'suspensionArm';
      aArm.rotation.z = Math.PI / 2;
      aArm.position.set(-0.9, -1.05, 0);
      scene.add(aArm);

      // Vehicle Chassis Quarter-Body
      const chassis = new THREE.Group();
      chassis.name = 'chassis';

      const chassisMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.85,
        roughness: 0.2
      });
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 2.8), chassisMat);
      chassis.add(bodyMesh);

      // Roof cabin & tinted windows
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.92, roughness: 0.1 });
      const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 2.5), cabinMat);
      cabinMesh.position.set(-0.2, 1.0, 0);
      chassis.add(cabinMesh);

      // Headlights
      const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.4), lightMat);
      hlLeft.position.set(2.6, 0, 0.9);
      chassis.add(hlLeft);

      const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.4), lightMat);
      hlRight.position.set(2.6, 0, -0.9);
      chassis.add(hlRight);

      chassis.position.set(0, 1.8, 0);
      scene.add(chassis);

      // MacPherson Strut (Shock Absorber Cylinder + Coaxial Spring)
      const strutGroup = new THREE.Group();
      strutGroup.name = 'strutGroup';

      // Red Damper Barrel (Hydraulic Cylinder)
      const cylGeo = new THREE.CylinderGeometry(0.20, 0.20, 1.3, 20);
      const cylMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.85, roughness: 0.25 });
      const cyl = new THREE.Mesh(cylGeo, cylMat);
      cyl.name = 'damperCylinder';
      cyl.position.y = -0.35;
      strutGroup.add(cyl);

      // Chrome Piston Rod
      const rodGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.5, 16);
      const rodMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
      const innerRod = new THREE.Mesh(rodGeo, rodMat);
      innerRod.name = 'damperRod';
      innerRod.position.y = 0.55;
      strutGroup.add(innerRod);

      // Co-axial Helical Suspension Spring
      const springMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 });
      const sGeo = createCoilGeometry(-0.55, 0.95, 7, 0.32, 0.04);
      const sMesh = new THREE.Mesh(sGeo, springMat);
      sMesh.name = 'strutSpring';
      strutGroup.add(sMesh);
      coiloverSpringRef.current = sMesh;

      strutGroup.position.set(0, 0.4, 0);
      scene.add(strutGroup);
    } 
    // ==========================================
    // 2. SKYSCRAPER TUNED MASS DAMPER (TAIPEI 101)
    // ==========================================
    else if (selectedApp === 'tuned_mass_damper') {
      camera.position.set(0, 1.2, 11.5);
      camera.lookAt(0, 0.5, 0);

      // Ground Foundation (Fixed anchor at base)
      const groundGeo = new THREE.BoxGeometry(22, 0.7, 16);
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.position.y = -4.9;
      scene.add(ground);

      // Skyscraper Cantilever Tower Structure
      // Anchored at y = -4.5 (Pivots at the base, sways at the top!)
      const towerBaseGroup = new THREE.Group();
      towerBaseGroup.name = 'towerBaseGroup';
      towerBaseGroup.position.set(0, -4.5, 0); // PIVOT AT GROUND FOUNDATION

      const towerColumnMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.2 });
      const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transmission: 0.8, opacity: 0.7, transparent: true });

      // 8-Tiered Tapered Skyscraper Tower Sections (Taipei 101 Architecture)
      const towerHeight = 9.0;
      for (let t = 0; t < 7; t++) {
        const floorY = 0.6 + t * 1.2;
        const widthT = 3.8 - t * 0.25;

        // Steel floor deck plate
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(widthT, 0.12, widthT),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
        );
        deck.position.set(0, floorY, 0);
        towerBaseGroup.add(deck);

        // Glass curtain wall enclosure
        const glassBox = new THREE.Mesh(
          new THREE.BoxGeometry(widthT - 0.2, 1.05, widthT - 0.2),
          glassMat
        );
        glassBox.position.set(0, floorY + 0.6, 0);
        towerBaseGroup.add(glassBox);
      }

      // 4 Main Structural Steel Perimeter Columns
      for (let c = 0; c < 4; c++) {
        const angle = (c / 4) * Math.PI * 2 + Math.PI / 4;
        const col = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, towerHeight, 0.25),
          towerColumnMat
        );
        col.position.set(Math.cos(angle) * 2.2, towerHeight / 2, Math.sin(angle) * 2.2);
        towerBaseGroup.add(col);
      }

      // Spire at top of tower
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.25, 2.2, 16),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.95 })
      );
      spire.position.set(0, towerHeight + 1.1, 0);
      towerBaseGroup.add(spire);

      // TMD Observatory Chamber (Floors 87-92)
      // TMD Pendulum suspended from top ceiling of tower
      const tmdGroup = new THREE.Group();
      tmdGroup.name = 'tmdGroup';
      tmdGroup.position.set(0, towerHeight - 1.2, 0);

      // 8 Braided Steel Suspension Cables
      const cableMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 });
      for (let c = 0; c < 8; c++) {
        const angle = (c / 8) * Math.PI * 2;
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 8), cableMat);
        cable.position.set(Math.cos(angle) * 0.45, 1.2, Math.sin(angle) * 0.45);
        tmdGroup.add(cable);
      }

      // 660-Tonne Golden Spherical TMD Damper Ball
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.92,
        roughness: 0.15
      });
      const goldenSphere = new THREE.Mesh(new THREE.SphereGeometry(0.95, 36, 36), sphereMat);
      goldenSphere.name = 'goldenSphere';
      goldenSphere.position.set(0, 0, 0);
      goldenSphere.castShadow = true;
      tmdGroup.add(goldenSphere);

      // 4 Telescopic Hydraulic Dampers connecting sphere to building columns
      const pMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.85 });
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 12), pMat);
      p1.rotation.z = Math.PI / 2;
      p1.position.set(1.2, 0, 0);
      tmdGroup.add(p1);

      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 12), pMat);
      p2.rotation.z = Math.PI / 2;
      p2.position.set(-1.2, 0, 0);
      tmdGroup.add(p2);

      towerBaseGroup.add(tmdGroup);
      scene.add(towerBaseGroup);

      // Wind gust streamline particles
      const windGroup = new THREE.Group();
      windGroup.name = 'windGroup';
      for (let w = 0; w < 30; w++) {
        const stream = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 1.5 + Math.random() * 2, 8),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 })
        );
        stream.rotation.z = Math.PI / 2;
        stream.position.set(
          -8 + Math.random() * 16,
          -3 + Math.random() * 8,
          (Math.random() - 0.5) * 6
        );
        stream.userData = { speed: 8 + Math.random() * 12 };
        windGroup.add(stream);
      }
      scene.add(windGroup);
    } 
    // ==========================================
    // 3. HYDRAULIC DOOR CLOSER SCENE
    // ==========================================
    else if (selectedApp === 'door_closer') {
      camera.position.set(0, 0.5, 7.8);
      camera.lookAt(0, 0.4, 0);

      // Door Frame & Jamb
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const topFrame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, 0.45), frameMat);
      topFrame.position.set(0, 2.7, 0);
      scene.add(topFrame);

      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.4, 0.45), frameMat);
      leftPost.position.set(-1.95, 0, 0);
      scene.add(leftPost);

      const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.4, 0.45), frameMat);
      rightPost.position.set(1.95, 0, 0);
      scene.add(rightPost);

      // Swinging Door Panel (Hinged at left edge x = -1.8)
      const doorPivotGroup = new THREE.Group();
      doorPivotGroup.name = 'doorPivotGroup';
      doorPivotGroup.position.set(-1.8, 0, 0);

      // Wooden Door Leaf
      const doorMat = new THREE.MeshStandardMaterial({
        color: 0x0f766e,
        roughness: 0.35,
        metalness: 0.35
      });
      const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 5.0, 0.12), doorMat);
      doorPanel.position.set(1.8, 0, 0);
      doorPanel.castShadow = true;
      doorPivotGroup.add(doorPanel);

      // Brass Handle
      const brassHandleMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.95, roughness: 0.15 });
      const handlePlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.04), brassHandleMat);
      handlePlate.position.set(3.3, 0, 0.08);
      doorPivotGroup.add(handlePlate);

      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 12), brassHandleMat);
      lever.rotation.z = Math.PI / 2;
      lever.position.set(3.4, 0, 0.15);
      doorPivotGroup.add(lever);

      // Closer Housing Box mounted on top of door
      const closerHousingMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
      const closerBox = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.36, 0.36), closerHousingMat);
      closerBox.position.set(1.0, 2.35, 0.18);
      doorPivotGroup.add(closerBox);

      scene.add(doorPivotGroup);

      // Articulated Folding Scissor Arm Assembly
      const armGroup = new THREE.Group();
      armGroup.name = 'scissorArmGroup';

      const armMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.92, roughness: 0.2 });

      // Primary Arm (attached to closer spindle)
      const primaryArm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.1, 12), armMat);
      primaryArm.name = 'primaryArm';
      primaryArm.rotation.z = Math.PI / 2;
      primaryArm.position.set(-0.8, 2.6, 0.25);
      armGroup.add(primaryArm);

      // Secondary Forearm (attached to frame jamb)
      const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.1, 12), armMat);
      foreArm.name = 'foreArm';
      foreArm.rotation.z = Math.PI / 2;
      foreArm.position.set(-0.8, 2.65, 0.25);
      armGroup.add(foreArm);

      scene.add(armGroup);
      doorScissorArmRef.current = armGroup;
    }

    // ==========================================
    // MOUSE ORBIT CONTROLS
    // ==========================================
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
        const radius = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
        let theta = Math.atan2(camera.position.x, camera.position.z);
        let phi = Math.acos(Math.max(-0.99, Math.min(0.99, camera.position.y / radius)));
        theta -= deltaX * 0.008;
        phi = Math.max(0.15, Math.min(Math.PI - 0.2, phi + deltaY * 0.008));
        camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
        camera.lookAt(0, 0.3, 0);
      }
    };

    const onMouseUp = () => { isMouseDown = false; };
    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.004;
      const dir = camera.position.clone().normalize();
      const currentDist = camera.position.length();
      const newDist = Math.max(4.0, Math.min(22, currentDist + zoomFactor * 2));
      camera.position.copy(dir.multiplyScalar(newDist));
      camera.lookAt(0, 0.3, 0);
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // ==========================================
    // 60 FPS REAL-TIME ANIMATION LOOP
    // ==========================================
    let animId;
    let lastTime = performance.now();

    const renderLoop = (timeNow) => {
      const dt = Math.min(0.04, (timeNow - lastTime) / 1000);
      lastTime = timeNow;

      appAnimState.current.time += dt;

      // ANIMATE APPLICATION 1: VEHICLE SUSPENSION
      if (selectedApp === 'vehicle_suspension') {
        const chassis = scene.getObjectByName('chassis');
        const wheelGroup = scene.getObjectByName('wheelGroup');
        const strutGroup = scene.getObjectByName('strutGroup');
        const roadMarks = scene.getObjectByName('roadMarksGroup');

        // Continuous road ripples if enabled
        if (continuousRoad) {
          const roadWave = Math.sin(appAnimState.current.time * 8.0) * 0.6;
          appAnimState.current.wheelY = roadWave;
        }

        if (chassis && wheelGroup) {
          let b_veh = 18.0; // Critically Damped
          if (damperMode === 'underdamped') b_veh = 2.8; // Bouncy
          if (damperMode === 'overdamped') b_veh = 52.0; // Stiff

          const k_veh = 65.0;
          const m_veh = 4.0;

          // Relative motion between chassis and wheel
          const yRel = appAnimState.current.carBodyY - appAnimState.current.wheelY;
          const vyRel = appAnimState.current.carBodyVy - appAnimState.current.wheelVy;

          const F_net = -k_veh * yRel - b_veh * vyRel;
          const ay = F_net / m_veh;

          appAnimState.current.carBodyVy += ay * dt;
          appAnimState.current.carBodyY += appAnimState.current.carBodyVy * dt;

          if (!continuousRoad) {
            appAnimState.current.wheelY += (-appAnimState.current.wheelY) * 9.0 * dt;
          }

          chassis.position.y = 1.8 + appAnimState.current.carBodyY * 0.14;
          wheelGroup.position.y = -1.05 + appAnimState.current.wheelY * 0.14;

          // Move road yellow dashes forward
          if (roadMarks) {
            roadMarks.children.forEach(mark => {
              mark.position.x -= dt * 6.0;
              if (mark.position.x < -8.5) mark.position.x = 8.5;
            });
          }

          wheelGroup.rotation.z -= dt * 7.0;

          // Update telescopic MacPherson strut
          if (strutGroup) {
            const distance = chassis.position.y - wheelGroup.position.y;
            strutGroup.scale.y = Math.max(0.4, distance / 2.85);

            const springMesh = strutGroup.getObjectByName('strutSpring');
            if (springMesh) {
              const springTop = 0.95;
              const springBot = -0.55 * strutGroup.scale.y;
              springMesh.geometry.dispose();
              springMesh.geometry = createCoilGeometry(springBot, springTop, 7, 0.32, 0.04);
            }
          }

          setTelemetry(prev => ({
            ...prev,
            suspensionDisp: Number((appAnimState.current.carBodyY * 1.5).toFixed(1)),
            chassisPhase: Math.abs(appAnimState.current.carBodyVy) > 1.0 
              ? (damperMode === 'underdamped' ? 'Oscillating (Bouncy)' : 'Absorbing Shock') 
              : 'Level & Stable'
          }));
        }
      }

      // ANIMATE APPLICATION 2: SKYSCRAPER TUNED MASS DAMPER
      else if (selectedApp === 'tuned_mass_damper') {
        const towerBase = scene.getObjectByName('towerBaseGroup');
        const tmdGroup = scene.getObjectByName('tmdGroup');
        const windGroup = scene.getObjectByName('windGroup');

        // External typhoon wind forcing frequency (~0.35 Hz)
        const windCycle = Math.sin(appAnimState.current.time * 2.2);
        
        // Sway amplitude: TMD Damper suppresses building sway by up to 55%!
        const swayAmp = isDamperActive ? 0.024 : 0.068;
        const towerRotationZ = -windCycle * swayAmp;
        
        // TMD Pendulum swings out-of-phase (~90 deg lead) relative to tower
        const tmdRelX = Math.sin(appAnimState.current.time * 2.2 - 1.3) * (isDamperActive ? 0.75 : 0.08);

        if (towerBase) {
          // Foundation stays fixed at y = -4.5; tower flexes about Z-axis!
          towerBase.rotation.z = towerRotationZ;
        }

        if (tmdGroup) {
          tmdGroup.position.x = tmdRelX;
          tmdGroup.rotation.z = -tmdRelX * 0.22;
        }

        // Animate wind stream streaks across the sky
        if (windGroup) {
          windGroup.children.forEach(stream => {
            stream.position.x += stream.userData.speed * dt;
            if (stream.position.x > 9.0) stream.position.x = -9.0;
          });
        }

        const swayCm = Math.abs(Math.sin(appAnimState.current.time * 2.2)) * (isDamperActive ? 32 : 98);
        setTelemetry(prev => ({
          ...prev,
          buildingSway: Number(swayCm.toFixed(1))
        }));
      }

      // ANIMATE APPLICATION 3: HYDRAULIC DOOR CLOSER
      else if (selectedApp === 'door_closer') {
        const doorPivot = scene.getObjectByName('doorPivotGroup');
        const scissorArm = scene.getObjectByName('scissorArmGroup');

        if (doorPivot) {
          let b_door = 9.8; // Critically Damped
          if (damperMode === 'underdamped') b_door = 1.2; // Violent slam
          if (damperMode === 'overdamped') b_door = 28.0; // Slow crawl

          const k_door = 16.5; // Internal wound coil spring torque
          const I_door = 2.0;

          const theta = appAnimState.current.doorAngle;
          const omega = appAnimState.current.doorOmega;

          // Two-zone damping: Latching zone (last 12°) has valve throttling
          let b_effective = b_door;
          if (theta < 0.20 && damperMode === 'critical') {
            b_effective = b_door * 1.6; // Cushioning right before frame
          }

          const tau = -k_door * theta - b_effective * omega;
          const alpha = tau / I_door;

          appAnimState.current.doorOmega += alpha * dt;
          appAnimState.current.doorAngle += appAnimState.current.doorOmega * dt;

          if (appAnimState.current.doorAngle <= 0) {
            if (damperMode === 'underdamped' && Math.abs(appAnimState.current.doorOmega) > 2.0) {
              appAnimState.current.slamTimer = 0.7;
              appAnimState.current.doorAngle = 0;
              appAnimState.current.doorOmega = -appAnimState.current.doorOmega * 0.42; // Rebound bounce
            } else {
              appAnimState.current.doorAngle = 0;
              appAnimState.current.doorOmega = 0;
            }
          }

          if (appAnimState.current.slamTimer > 0) {
            appAnimState.current.slamTimer -= dt;
          }

          doorPivot.rotation.y = appAnimState.current.doorAngle;

          // Articulate folding scissor arm linkage
          if (scissorArm) {
            const primary = scissorArm.getObjectByName('primaryArm');
            const fore = scissorArm.getObjectByName('foreArm');
            if (primary && fore) {
              primary.rotation.y = appAnimState.current.doorAngle * 0.6;
              fore.rotation.y = -appAnimState.current.doorAngle * 0.4;
            }
          }

          setTelemetry(prev => ({
            ...prev,
            doorAngleDeg: Math.round((appAnimState.current.doorAngle * 180) / Math.PI),
            isSlammed: appAnimState.current.slamTimer > 0
          }));
        }
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [selectedApp, damperMode, isDamperActive, continuousRoad]);

  const activeAppObj = applications.find(a => a.id === selectedApp) || applications[0] || {};

  return (
    <div className="flex flex-col gap-6">
      {/* Top Application Selector Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-100">Daily Life & Engineering 3D Applications</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            See how viscous damping engineering prevents violent vibrations in vehicles, skyscrapers, and doors.
          </p>
        </div>

        {/* Application Mode Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setSelectedApp('vehicle_suspension'); setPresetView('front'); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              selectedApp === 'vehicle_suspension'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>1. Car Suspension</span>
          </button>

          <button
            onClick={() => { setSelectedApp('tuned_mass_damper'); setPresetView('front'); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              selectedApp === 'tuned_mass_damper'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>2. Skyscraper (Taipei 101)</span>
          </button>

          <button
            onClick={() => { setSelectedApp('door_closer'); setPresetView('front'); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              selectedApp === 'door_closer'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <DoorClosed className="w-4 h-4" />
            <span>3. Hydraulic Door Closer</span>
          </button>
        </div>
      </div>

      {/* Main 3D Viewport + Interactive Controller Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D Canvas Viewport (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden shadow-2xl relative">
          <div ref={canvasRef} className="w-full h-[490px] cursor-grab active:cursor-grabbing" />

          {/* Floating HUD Overlays */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="pointer-events-auto px-3.5 py-1.5 rounded-full text-xs font-mono font-medium bg-slate-900/90 border border-slate-700 text-slate-200 shadow-lg">
              {activeAppObj.title}
            </span>

            {/* Quick Interactive Triggers */}
            {selectedApp === 'vehicle_suspension' && (
              <div className="pointer-events-auto flex items-center gap-2">
                <button
                  onClick={() => triggerBump(16.0)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/30"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Hit Pothole!</span>
                </button>
                <button
                  onClick={() => setContinuousRoad(!continuousRoad)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                    continuousRoad 
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' 
                      : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${continuousRoad ? 'animate-spin' : ''}`} />
                  <span>{continuousRoad ? 'Rough Road: ON' : 'Washboard Road'}</span>
                </button>
              </div>
            )}

            {selectedApp === 'door_closer' && (
              <div className="pointer-events-auto flex items-center gap-2">
                <button
                  onClick={() => triggerDoorOpen(1.48)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-md"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Open Door (85°)</span>
                </button>
                <button
                  onClick={() => triggerDoorOpen(0.65)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                >
                  Nudge (35°)
                </button>
              </div>
            )}

            {selectedApp === 'tuned_mass_damper' && (
              <button
                onClick={() => setIsDamperActive(!isDamperActive)}
                className={`pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-lg ${
                  isDamperActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
                    : 'bg-red-600 text-white border-red-500 animate-pulse'
                }`}
              >
                {isDamperActive ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{isDamperActive ? 'TMD Damper: ACTIVE (Safe)' : 'TMD Damper: DISABLED (Danger!)'}</span>
              </button>
            )}
          </div>

          {/* Camera View Switcher */}
          <div className="absolute top-14 right-3 pointer-events-auto flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 text-[11px] font-mono">
            {['front', 'iso', 'side', 'closeup'].map(v => (
              <button
                key={v}
                onClick={() => setPresetView(v)}
                className={`px-2 py-0.5 rounded uppercase transition-colors ${
                  cameraView === v 
                    ? 'bg-cyan-500 text-slate-950 font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Real-Time Live Telemetry HUD Bar */}
          <div className="absolute bottom-16 left-3 pointer-events-none p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono shadow-xl backdrop-blur-md">
            {selectedApp === 'vehicle_suspension' && (
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Chassis Travel:</span>
                  <span className="font-bold text-cyan-300">{telemetry.suspensionDisp} cm</span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Chassis State:</span>
                  <span className="font-semibold text-emerald-400">{telemetry.chassisPhase}</span>
                </div>
              </div>
            )}
            {selectedApp === 'tuned_mass_damper' && (
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Top Roof Sway:</span>
                  <span className={`font-bold ${isDamperActive ? 'text-amber-400' : 'text-red-400'}`}>
                    {telemetry.buildingSway} cm {isDamperActive ? '(Protected)' : '(Severe Drift!)'}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Sway Reduction:</span>
                  <span className="font-bold text-cyan-300">{isDamperActive ? '55% Suppressed' : '0% (Raw Resonance)'}</span>
                </div>
              </div>
            )}
            {selectedApp === 'door_closer' && (
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Door Angle:</span>
                  <span className="font-bold text-emerald-300">{telemetry.doorAngleDeg}°</span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Phase:</span>
                  <span className="text-slate-200">
                    {telemetry.doorAngleDeg > 15 ? 'Closing Sweep Zone' : telemetry.doorAngleDeg > 0 ? 'Latch Cushioning' : 'Latched Shut'}
                  </span>
                </div>
                {telemetry.isSlammed && (
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold animate-ping text-[11px]">
                    💥 SLAM!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Damping Regime Switcher for Suspension / Door */}
          {(selectedApp === 'vehicle_suspension' || selectedApp === 'door_closer') && (
            <div className="flex items-center justify-center gap-2 p-3 bg-slate-900/95 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-mono">Damping Mode:</span>
              <button
                onClick={() => setDamperMode('underdamped')}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  damperMode === 'underdamped'
                    ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Underdamped (Bouncy / Slam)
              </button>
              <button
                onClick={() => setDamperMode('critical')}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  damperMode === 'critical'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Critically Damped (Ideal Smooth)
              </button>
              <button
                onClick={() => setDamperMode('overdamped')}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  damperMode === 'overdamped'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Overdamped (Stiff / Crawling)
              </button>
            </div>
          )}
        </div>

        {/* Detailed Explanation Panel (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          {/* Title & Tagline */}
          <div>
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider block">
              {activeAppObj.category}
            </span>
            <h3 className="text-xl font-bold text-slate-100 mt-1">
              {activeAppObj.title}
            </h3>
            <p className="text-xs text-slate-400 italic mt-0.5">
              "{activeAppObj.tagline}"
            </p>
          </div>

          {/* Daily Life Use Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
            <span className="text-cyan-400 font-semibold block mb-1">
              📍 Where You Experience This in Daily Life:
            </span>
            <p className="text-slate-300 leading-relaxed">
              {activeAppObj.dailyLifeUse}
            </p>
          </div>

          {/* How It Works Text */}
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <span className="font-semibold text-slate-100 block">🔬 Physics & Mechanical Function:</span>
            <p className="whitespace-pre-line text-slate-400">
              {activeAppObj.howItWorks}
            </p>
          </div>

          {/* Key Parameters Matrix */}
          <div className="mt-auto pt-3 border-t border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-2">Engineering Parameters:</span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {activeAppObj.keyParameters?.map((param, i) => (
                <div key={i} className="p-2 rounded-lg bg-slate-950/50 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">{param.label}</span>
                  <span className="text-cyan-300 font-medium">{param.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
