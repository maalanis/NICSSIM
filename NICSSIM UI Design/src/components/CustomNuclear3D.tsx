import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface CustomNuclear3DProps {
  reactorPower?: number; // 0-100
  pumpRpm?: number;
  turbineRpm?: number;
}

export function CustomNuclear3D({ 
  reactorPower = 60, 
  pumpRpm = 2000, 
  turbineRpm = 2500 
}: CustomNuclear3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<Array<{ text: string; className: string; top: number; left: number }>>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // ----- basic three.js setup -----
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xBEE3FF);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 400);
    camera.position.set(70, 40, 60);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 12, 0);
    controls.enableDamping = true;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x4b5563, 0.8);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(80, 100, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    renderer.shadowMap.enabled = true;

    // ----- plant object references for animation -----
    const plant = {
      pumps: [] as THREE.Mesh[],
      turbineRotors: [] as THREE.Mesh[],
      generatorRotor: null as THREE.Mesh | null,
      condenser: null as THREE.Mesh | null,
      primaryPipes: [] as THREE.Mesh[],
      secondaryPipes: [] as THREE.Mesh[]
    };

    // ----- helpers -----
    function makeMesh(
      geometry: THREE.BufferGeometry,
      materialOptions: THREE.MeshStandardMaterialParameters,
      position?: THREE.Vector3,
      rotation?: THREE.Euler,
      cast = true,
      receive = true
    ) {
      const mat = new THREE.MeshStandardMaterial(materialOptions);
      const mesh = new THREE.Mesh(geometry, mat);
      if (position) mesh.position.copy(position);
      if (rotation) mesh.rotation.copy(rotation);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      scene.add(mesh);
      return mesh;
    }

    function randomRange(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    // ----- create environment (island + sea) -----
    function createIsland() {
      makeMesh(
        new THREE.BoxGeometry(80, 10, 44),
        { color: 0x4b5563, roughness: 0.9, metalness: 0.0 },
        new THREE.Vector3(0, 5, 0)
      );

      const grass = makeMesh(
        new THREE.PlaneGeometry(80, 44),
        { color: 0x65a30d, roughness: 0.85, metalness: 0.0 },
        new THREE.Vector3(0, 10.1, 0)
      );
      grass.rotation.x = -Math.PI / 2;
      grass.receiveShadow = true;

      const sea = makeMesh(
        new THREE.PlaneGeometry(90, 60),
        { color: 0x1d4ed8, roughness: 0.4, metalness: 0.2 },
        new THREE.Vector3(55, 0.1, 0)
      );
      sea.rotation.x = -Math.PI / 2;
      sea.receiveShadow = false;
    }

    // ----- cooling towers -----
    function createCoolingTowers() {
      const towerMaterial = {
        color: 0xe5e7eb,
        roughness: 0.7,
        metalness: 0.1
      };

      function tower(x: number, z: number) {
        makeMesh(
          new THREE.CylinderGeometry(4.8, 6.4, 22, 32),
          towerMaterial,
          new THREE.Vector3(x, 21, z)
        );

        makeMesh(
          new THREE.CylinderGeometry(4.4, 4.4, 0.6, 32),
          { color: 0xf97316, roughness: 0.6, metalness: 0.2 },
          new THREE.Vector3(x, 32.6, z)
        );
      }

      tower(-10, 12);
      tower(2, 12);
    }

    // ----- trees -----
    function createTrees() {
      const trunkMat = { color: 0x78350f, roughness: 0.8, metalness: 0.1 };
      const leafMat = { color: 0x15803d, roughness: 0.7, metalness: 0.0 };

      function tree(x: number, z: number) {
        makeMesh(
          new THREE.CylinderGeometry(0.3, 0.5, 2.2, 8),
          trunkMat,
          new THREE.Vector3(x, 11.1, z)
        );
        makeMesh(
          new THREE.ConeGeometry(1.6, 3.2, 8),
          leafMat,
          new THREE.Vector3(x, 13.6, z)
        );
      }

      for (let i = 0; i < 16; i++) {
        tree(randomRange(-25, 0), randomRange(10, 22));
      }
      for (let i = 0; i < 12; i++) {
        tree(randomRange(10, 30), randomRange(10, 20));
      }
    }

    // ----- reactor building + internals -----
    function createReactorBuilding() {
      makeMesh(
        new THREE.BoxGeometry(20, 7, 18),
        { color: 0xe5e7eb, roughness: 0.85, metalness: 0.05 },
        new THREE.Vector3(-18, 13.5, -1)
      );

      const domeGeom = new THREE.SphereGeometry(
        9, 32, 18,
        Math.PI * 0.15, Math.PI * 1.7,
        0, Math.PI * 0.55
      );
      makeMesh(
        domeGeom,
        { color: 0xe5e7eb, roughness: 0.8, metalness: 0.05 },
        new THREE.Vector3(-18, 19, -1)
      );

      makeMesh(
        new THREE.BoxGeometry(14, 0.4, 12),
        { color: 0xd1d5db, roughness: 0.9, metalness: 0.0 },
        new THREE.Vector3(-18, 11.4, -1)
      );

      makeMesh(
        new THREE.CylinderGeometry(1.7, 1.7, 6.5, 24),
        { color: 0xf97316, roughness: 0.5, metalness: 0.6 },
        new THREE.Vector3(-20.5, 15.2, -1)
      );

      makeMesh(
        new THREE.CylinderGeometry(1.1, 1.1, 4.8, 24),
        { color: 0xfacc15, roughness: 0.5, metalness: 0.6 },
        new THREE.Vector3(-16.5, 17, -5.2)
      );

      makeMesh(
        new THREE.CylinderGeometry(1.4, 1.4, 6.0, 24),
        { color: 0x38bdf8, roughness: 0.5, metalness: 0.6 },
        new THREE.Vector3(-15, 16.3, 3.2)
      );

      const pumpBody = makeMesh(
        new THREE.CylinderGeometry(0.9, 0.9, 2.2, 24),
        { color: 0x22c55e, roughness: 0.4, metalness: 0.7 },
        new THREE.Vector3(-22, 11.5, 4.5),
        new THREE.Euler(Math.PI / 2, 0, 0)
      );
      plant.pumps.push(pumpBody);

      const primMat = { color: 0x22d3ee, roughness: 0.3, metalness: 0.7, emissive: 0x0f172a };
      const p1 = makeMesh(
        new THREE.CylinderGeometry(0.35, 0.35, 5.0, 14),
        primMat,
        new THREE.Vector3(-20.5, 16.8, 1.5),
        new THREE.Euler(Math.PI / 2, 0, 0)
      );
      const p2 = makeMesh(
        new THREE.CylinderGeometry(0.35, 0.35, 7.0, 14),
        primMat,
        new THREE.Vector3(-17.5, 18.3, 1.5),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      plant.primaryPipes.push(p1, p2);
    }

    // ----- turbine hall, turbines, generator, condenser -----
    function createTurbineHall() {
      makeMesh(
        new THREE.BoxGeometry(26, 7, 14),
        { color: 0xe5e7eb, roughness: 0.85, metalness: 0.05 },
        new THREE.Vector3(6, 13.5, -1)
      );

      makeMesh(
        new THREE.BoxGeometry(24, 0.3, 12),
        { color: 0x93c5fd, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.35 },
        new THREE.Vector3(6, 17.5, -1)
      );

      makeMesh(
        new THREE.CylinderGeometry(0.45, 0.45, 16, 24),
        { color: 0x9ca3af, roughness: 0.35, metalness: 0.9 },
        new THREE.Vector3(2, 15.2, -1),
        new THREE.Euler(0, 0, Math.PI / 2)
      );

      function rotor(offsetX: number, radius: number, length: number) {
        const r = makeMesh(
          new THREE.CylinderGeometry(radius, radius, length, 32),
          { color: 0xd4d4d8, roughness: 0.3, metalness: 0.9 },
          new THREE.Vector3(offsetX, 15.2, -1),
          new THREE.Euler(0, 0, Math.PI / 2)
        );
        plant.turbineRotors.push(r);
      }
      rotor(-2, 2.0, 3.2);
      rotor(2.8, 2.4, 3.8);
      rotor(8, 2.6, 4.0);

      const genRotor = makeMesh(
        new THREE.CylinderGeometry(1.7, 1.7, 4, 32),
        { color: 0xf97316, roughness: 0.4, metalness: 0.8 },
        new THREE.Vector3(12.5, 15.2, -1),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      plant.generatorRotor = genRotor;

      const condenser = makeMesh(
        new THREE.BoxGeometry(10, 3, 6),
        { color: 0x1d4ed8, roughness: 0.5, metalness: 0.4, emissive: 0x000000 },
        new THREE.Vector3(2, 10.5, -9)
      );
      plant.condenser = condenser;

      const secMat = { color: 0xf97316, roughness: 0.35, metalness: 0.7, emissive: 0x1f2937 };
      const s1 = makeMesh(
        new THREE.CylinderGeometry(0.35, 0.35, 17, 16),
        secMat,
        new THREE.Vector3(-6, 21, -1),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      const s2 = makeMesh(
        new THREE.CylinderGeometry(0.35, 0.35, 6, 16),
        secMat,
        new THREE.Vector3(0, 16, -6.5),
        new THREE.Euler(Math.PI / 2, 0, 0)
      );
      plant.secondaryPipes.push(s1, s2);
    }

    // ----- aux buildings & tanks -----
    function createAux() {
      makeMesh(
        new THREE.BoxGeometry(8, 3, 5),
        { color: 0xe5e7eb, roughness: 0.85, metalness: 0.05 },
        new THREE.Vector3(-2, 11.5, -13)
      );
      makeMesh(
        new THREE.BoxGeometry(5, 2.6, 4),
        { color: 0xcbd5f5, roughness: 0.85, metalness: 0.05 },
        new THREE.Vector3(6, 11.3, -14)
      );

      makeMesh(
        new THREE.CylinderGeometry(1.6, 1.6, 4.5, 20),
        { color: 0xf97316, roughness: 0.4, metalness: 0.6 },
        new THREE.Vector3(11, 12.5, -12)
      );
      makeMesh(
        new THREE.CylinderGeometry(1.6, 1.6, 4.5, 20),
        { color: 0xf97316, roughness: 0.4, metalness: 0.6 },
        new THREE.Vector3(14, 12.5, -12)
      );
    }

    // ----- build the whole scene -----
    createIsland();
    createCoolingTowers();
    createReactorBuilding();
    createTurbineHall();
    createAux();
    createTrees();

    // ----- simulation state -----
    const simState = {
      reactorPower: reactorPower / 100,
      pumpRpm: pumpRpm,
      turbineRpm: turbineRpm,
      generatorRpm: turbineRpm,
      coolantTemp: 270 + 40 * (reactorPower / 100)
    };

    // ----- animation loop -----
    const clock = new THREE.Clock();
    let animationId: number;

    function animate() {
      const dt = clock.getDelta();

      // Update from props
      simState.reactorPower = reactorPower / 100;
      simState.pumpRpm = pumpRpm;
      simState.turbineRpm = turbineRpm;
      simState.generatorRpm = turbineRpm;
      simState.coolantTemp = 270 + 40 * simState.reactorPower;

      // spin pumps & turbines
      const pumpRps = simState.pumpRpm / 60;
      plant.pumps.forEach((pump) => {
        pump.rotation.y += 2 * Math.PI * pumpRps * dt;
      });

      const turbRps = simState.turbineRpm / 60;
      plant.turbineRotors.forEach((rotor) => {
        rotor.rotation.z += 2 * Math.PI * turbRps * dt;
      });

      if (plant.generatorRotor) {
        const genRps = simState.generatorRpm / 60;
        plant.generatorRotor.rotation.z += 2 * Math.PI * genRps * dt;
      }

      // heat glow: pipes + condenser
      const power = THREE.MathUtils.clamp(simState.reactorPower, 0, 1);
      const primaryGlow = 0.2 + 0.8 * power;
      const secondaryGlow = 0.1 + 0.7 * power;

      plant.primaryPipes.forEach((p) => {
        (p.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x38bdf8);
        (p.material as THREE.MeshStandardMaterial).emissiveIntensity = primaryGlow;
      });
      plant.secondaryPipes.forEach((p) => {
        (p.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xf97316);
        (p.material as THREE.MeshStandardMaterial).emissiveIntensity = secondaryGlow;
      });

      if (plant.condenser) {
        const norm = THREE.MathUtils.clamp((simState.coolantTemp - 270) / 40, 0, 1);
        (plant.condenser.material as THREE.MeshStandardMaterial).emissive = new THREE.Color().setHSL(0.6 - 0.15 * norm, 1, 0.5);
        (plant.condenser.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + 0.6 * norm;
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

    // Set labels after initial render
    setLabels([
      { text: 'COOLING TOWER', className: 'label-orange', top: 12, left: 32 },
      { text: 'REACTOR BUILDING', className: 'label-orange', top: 32, left: 30 },
      { text: 'MAIN CIRCULATION PUMP', className: 'label-green', top: 55, left: 20 },
      { text: 'PRESSURIZER SYSTEM', className: 'label-orange', top: 40, left: 26 },
      { text: 'STEAM GENERATOR', className: 'label-blue', top: 38, left: 37 },
      { text: 'TURBINE HALL', className: 'label-orange', top: 24, left: 63 },
      { text: 'STEAM TURBINE', className: 'label-orange', top: 40, left: 60 },
      { text: 'ELECTRIC GENERATOR', className: 'label-blue', top: 45, left: 73 },
      { text: 'CONDENSER', className: 'label-dark', top: 56, left: 57 },
      { text: 'POWER OUTPUT', className: 'label-dark', top: 34, left: 82 },
    ]);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [reactorPower, pumpRpm, turbineRpm]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* On-screen labels */}
      {labels.map((label, idx) => (
        <div
          key={idx}
          className={`absolute px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap pointer-events-auto cursor-pointer border shadow-lg ${
            label.className === 'label-orange'
              ? 'bg-[#f97316] text-gray-900 border-gray-900/20'
              : label.className === 'label-blue'
              ? 'bg-[#0ea5e9] text-gray-900 border-gray-900/20'
              : label.className === 'label-green'
              ? 'bg-[#22c55e] text-gray-900 border-gray-900/20'
              : 'bg-[#020617] text-gray-200 border-gray-400/50'
          }`}
          style={{ top: `${label.top}%`, left: `${label.left}%` }}
        >
          {label.text}
        </div>
      ))}
    </div>
  );
}
