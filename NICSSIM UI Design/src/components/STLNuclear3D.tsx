import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

interface STLNuclear3DProps {
  reactorPower?: number; // 0-100
  pumpRpm?: number;
  turbineRpm?: number;
  controlRodWithdrawn?: number; // 0-100
  pumpOn?: boolean;
  turbineOn?: boolean;
}

export function STLNuclear3D({ 
  reactorPower = 60, 
  pumpRpm = 2000, 
  turbineRpm = 2500,
  controlRodWithdrawn = 40,
  pumpOn = true,
  turbineOn = true
}: STLNuclear3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // --- renderer / scene / camera setup ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa8d7ff);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(60, 35, 55);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 8, 0);
    controls.enableDamping = true;

    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(80, 80, 40);
    sun.castShadow = true;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // --- simple island so you see something even before STL loads ---
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(80, 4, 40),
      new THREE.MeshStandardMaterial({ color: 0x4b8b3b, roughness: 0.9 })
    );
    ground.position.set(0, -2, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    // --- references to STL parts we want to animate ---
    const plant = {
      reactorCore: null as THREE.Mesh | null,
      controlRods: null as THREE.Mesh | null,
      pump: null as THREE.Mesh | null,
      turbine: null as THREE.Mesh | null,
      generator: null as THREE.Mesh | null,
      condenser: null as THREE.Mesh | null,
      reactorBuildingParts: [] as THREE.Mesh[],
      turbineHallParts: [] as THREE.Mesh[]
    };

    // --- simulation state ---
    const simState = {
      reactorPower: reactorPower / 100,
      pumpRpm: pumpRpm,
      turbineRpm: turbineRpm,
      rodsWithdrawn: controlRodWithdrawn / 100,
      pumpOn: pumpOn,
      turbineOn: turbineOn
    };

    // --- load STL helper ---
    const stlLoader = new STLLoader();
    const STL_SCALE = 0.01; // adjust to match your model units

    function loadPart(
      path: string, 
      materialOptions: THREE.MeshStandardMaterialParameters, 
      onMeshReady: (mesh: THREE.Mesh) => void
    ) {
      stlLoader.load(
        path,
        geometry => {
          geometry.center();
          const material = new THREE.MeshStandardMaterial(materialOptions);
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.scale.setScalar(STL_SCALE);
          scene.add(mesh);
          onMeshReady(mesh);
        },
        undefined,
        err => {
          console.warn(`Could not load ${path}:`, err);
          // Create placeholder geometry when STL fails to load
          createPlaceholder(path, materialOptions, onMeshReady);
        }
      );
    }

    // Create placeholder geometry when STL file is not available
    function createPlaceholder(
      path: string,
      materialOptions: THREE.MeshStandardMaterialParameters,
      onMeshReady: (mesh: THREE.Mesh) => void
    ) {
      let geometry: THREE.BufferGeometry;
      
      if (path.includes('reactor_core')) {
        geometry = new THREE.CylinderGeometry(2, 2, 5, 32);
      } else if (path.includes('control_rods')) {
        geometry = new THREE.BoxGeometry(0.5, 3, 0.5);
      } else if (path.includes('pump')) {
        geometry = new THREE.TorusGeometry(1.5, 0.6, 16, 32);
      } else if (path.includes('turbine')) {
        geometry = new THREE.CylinderGeometry(2, 2, 4, 32);
      } else if (path.includes('generator')) {
        geometry = new THREE.CylinderGeometry(1.5, 1.5, 3, 32);
      } else if (path.includes('condenser')) {
        geometry = new THREE.BoxGeometry(6, 2, 4);
      } else {
        geometry = new THREE.BoxGeometry(2, 2, 2);
      }

      const material = new THREE.MeshStandardMaterial(materialOptions);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      onMeshReady(mesh);
    }

    // --- load your STL files ---
    // Load all Reactor Building parts (01.STL through 25.STL)
    const reactorBuildingMaterial = { color: 0xe5e7eb, metalness: 0.3, roughness: 0.7 };
    for (let i = 1; i <= 25; i++) {
      const num = String(i).padStart(2, '0');
      loadPart(
        `/stl/Reactor building/${num}.STL`,
        reactorBuildingMaterial,
        mesh => {
          mesh.position.set(-20, 0, 0);
          // Special handling for specific parts
          if (i === 1) {
            // Reactor core - make it glow
            mesh.material = new THREE.MeshStandardMaterial({
              color: 0xffe184,
              emissive: 0xffa500,
              emissiveIntensity: 0.5,
              metalness: 0.2,
              roughness: 0.3
            });
            plant.reactorCore = mesh;
          } else if (i === 2) {
            // Control rods
            mesh.userData.baseY = mesh.position.y;
            plant.controlRods = mesh;
          } else if (i === 3) {
            // Main circulation pump
            plant.pump = mesh;
          }
          plant.reactorBuildingParts.push(mesh);
        }
      );
    }

    // Load all Turbine Hall parts (01.STL through 24.STL)
    const turbineHallMaterial = { color: 0xd1d5db, metalness: 0.4, roughness: 0.6 };
    for (let i = 1; i <= 24; i++) {
      const num = String(i).padStart(2, '0');
      loadPart(
        `/stl/Turbine hall/${num}.STL`,
        turbineHallMaterial,
        mesh => {
          mesh.position.set(5, 0, 0);
          // Special handling for specific parts
          if (i === 1) {
            // Steam turbine
            plant.turbine = mesh;
          } else if (i === 2) {
            // Generator
            mesh.material = new THREE.MeshStandardMaterial({
              color: 0xf97316,
              metalness: 0.8,
              roughness: 0.4
            });
            plant.generator = mesh;
          } else if (i === 3) {
            // Condenser
            mesh.material = new THREE.MeshStandardMaterial({
              color: 0x2563eb,
              metalness: 0.4,
              roughness: 0.5
            });
            plant.condenser = mesh;
          }
          plant.turbineHallParts.push(mesh);
        }
      );
    }

    // --- animation loop ---
    const clock = new THREE.Clock();
    let animationId: number;

    function animate() {
      const dt = clock.getDelta();
      const t = clock.elapsedTime;

      // Update from props
      simState.reactorPower = reactorPower / 100;
      simState.pumpRpm = pumpRpm;
      simState.turbineRpm = turbineRpm;
      simState.rodsWithdrawn = controlRodWithdrawn / 100;
      simState.pumpOn = pumpOn;
      simState.turbineOn = turbineOn;

      const power = simState.reactorPower;

      // core glow vs power
      if (plant.reactorCore && plant.reactorCore.material) {
        const mat = plant.reactorCore.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.3 + 2.0 * power;
      }

      // control rods: 0 = fully in, 1 = fully out
      if (plant.controlRods) {
        const baseY = plant.controlRods.userData.baseY ?? plant.controlRods.position.y;
        plant.controlRods.userData.baseY = baseY;
        const offset = THREE.MathUtils.lerp(-1.0, 1.5, simState.rodsWithdrawn);
        plant.controlRods.position.y = baseY + offset;
      }

      // pump spin
      if (plant.pump && simState.pumpOn) {
        const radPerSec = simState.pumpRpm / 60 * 2 * Math.PI;
        plant.pump.rotation.x += radPerSec * dt;
      }

      // turbine & generator spin
      const turbOn = simState.turbineOn;
      if (plant.turbine && turbOn) {
        const radPerSec = simState.turbineRpm / 60 * 2 * Math.PI;
        plant.turbine.rotation.x += radPerSec * dt;
      }
      if (plant.generator && turbOn) {
        const radPerSec = simState.turbineRpm / 60 * 2 * Math.PI;
        plant.generator.rotation.x += radPerSec * 1.1 * dt;
      }

      // condenser pulsing
      if (plant.condenser && plant.condenser.material) {
        const mat = plant.condenser.material as THREE.MeshStandardMaterial;
        const pulse = 0.2 + 0.5 * power * (0.5 + 0.5 * Math.sin(t * 2.0));
        mat.emissive = new THREE.Color(0x1d4ed8);
        mat.emissiveIntensity = pulse;
      }

      controls.update();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    }
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [reactorPower, pumpRpm, turbineRpm, controlRodWithdrawn, pumpOn, turbineOn]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Status indicator */}
      <div className="absolute top-4 left-4 px-3 py-2 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700 text-xs text-gray-200">
        <div className="font-semibold mb-1">Nuclear ICS Plant - STL Model</div>
        <div className="text-gray-400 space-y-0.5">
          <div>Power: {reactorPower}%</div>
          <div>Pump: {pumpOn ? `${pumpRpm} RPM` : 'OFF'}</div>
          <div>Turbine: {turbineOn ? `${turbineRpm} RPM` : 'OFF'}</div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 px-3 py-2 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700 text-[10px] text-gray-400 max-w-xs">
        <p className="mb-1 text-gray-300 font-semibold">STL Files Loaded:</p>
        <p className="text-orange-400">• Reactor building/ (01.STL - 25.STL)</p>
        <p className="text-orange-400">• Turbine hall/ (01.STL - 24.STL)</p>
        <p className="mt-1 text-gray-500">Total: 49 components loaded from /public/stl/</p>
      </div>
    </div>
  );
}