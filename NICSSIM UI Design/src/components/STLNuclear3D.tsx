"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type PartGroup = "reactor" | "turbine";

interface STLNuclear3DProps {
  reactorPower?: number;
  pumpRpm?: number;
  turbineRpm?: number;
  controlRodWithdrawn?: number;
  pumpOn?: boolean;
  turbineOn?: boolean;
  theme?: "light" | "dark";
}

export function STLNuclear3D({ 
  reactorPower = 60, 
  pumpRpm = 2000, 
  turbineRpm = 2500,
  controlRodWithdrawn = 40,
  pumpOn = true,
  turbineOn = true,
  theme = "dark"
}: STLNuclear3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Island sizes (ground plane)
    const ISLAND_LENGTH = 800;
    const ISLAND_DEPTH = 400;
    const ISLAND_TARGET_RATIO = 0.75; // plant occupies ~75% of island length

    // -----------------------------------
    // SCENE
    // -----------------------------------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === "dark" ? 0x1e293b : 0xa8d7ff);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 20000);
    camera.position.set(0, 300, 600);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 80, 0);

    // LIGHTING
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(600, 800, 600);
    sun.castShadow = true;
    scene.add(sun);

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.3);
    scene.add(hemi);

    // GROUND
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(ISLAND_LENGTH, 10, ISLAND_DEPTH),
      new THREE.MeshStandardMaterial({ color: 0x3b6e2b, roughness: 0.9 })
    );
    ground.position.set(0, -5, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    // AXES
    scene.add(new THREE.AxesHelper(100));

    // -----------------------------------
    // PLANT GROUP (reactor + turbine)
    // -----------------------------------
    const plant = new THREE.Group();
    scene.add(plant);

    const loader = new STLLoader();
    let loadedCount = 0;

    // Your data currently has 48 usable STLs (22 was bad),
    // so we mirror that here to avoid 404s.
    const reactorFiles = Array.from({ length: 25 }, (_, i) => i + 1).filter(
      (i) => i !== 22
    );
    const turbineFiles = Array.from({ length: 24 }, (_, i) => i + 1);
    const TOTAL = reactorFiles.length + turbineFiles.length; // 48

    // -----------------------------------
    // Animation buckets
    // -----------------------------------
    const animParts = {
      reactorCore: [] as THREE.Mesh[],
      reactorPipes: [] as THREE.Mesh[],
      turbineRotors: [] as THREE.Mesh[],
    };

    // -------------------------------------------------------
    // Color helper: pick colors by group + size + index
    // -------------------------------------------------------
    function pickColor(
      group: PartGroup,
      index: number,
      size: THREE.Vector3
    ): number {
      const maxDim = Math.max(size.x, size.y, size.z);
      const minDim = Math.min(size.x, size.y, size.z);
      const uniformish = maxDim / (minDim || 1) < 1.3; // mostly same in all axes

      const BIG = maxDim > 400;
      const MID = maxDim > 200 && maxDim <= 400;
      const SMALL = maxDim <= 200;

      if (group === "reactor") {
        if (BIG) return 0xc7774a; // brick-ish outer walls/floor

        // big-ish cube / tank near left
        if (uniformish && maxDim > 150 && maxDim < 350) return 0x7dd3fc;

        if (MID) {
          if (index <= 3) return 0x4b5563; // inner vessel darker
          return 0x9ca3af; // big internal structure
        }

        if (SMALL) {
          // pipes, valves
          return index % 2 === 0 ? 0xf97316 : 0x22c7f6; // orange / teal
        }
      } else {
        // Turbine hall
        if (BIG) return 0xc7774a; // walls/floor

        if (MID) {
          return index % 2 === 0 ? 0x6b7280 : 0x9ca3af; // beams / casings
        }

        if (SMALL) {
          return index % 2 === 0 ? 0x22c55e : 0x3b82f6; // green / blue machinery
        }
      }

      return group === "reactor" ? 0x9ca3af : 0xb0b4ba;
    }

    // Heuristic classification for animation buckets
    function classifyForAnimation(
      group: PartGroup,
      size: THREE.Vector3,
      center: THREE.Vector3,
      mesh: THREE.Mesh
    ) {
      const maxDim = Math.max(size.x, size.y, size.z);

      if (group === "reactor") {
        const height = size.y;
        const radial = (size.x + size.z) / 2;
        const xzDiff = Math.abs(size.x - size.z);

        // Tall cylinder near center => reactor core/vessel
        const tallCylinder =
          height > radial * 1.1 && xzDiff < radial * 0.35 && height > 200;
        const nearCenter = Math.abs(center.x) < 200 && Math.abs(center.z) < 200;

        if (tallCylinder && nearCenter) {
          animParts.reactorCore.push(mesh);
          return;
        }

        // Smaller stuff = pipes / internals
        if (maxDim < 300) {
          animParts.reactorPipes.push(mesh);
        }
      } else {
        // For turbine: long skinny parts along X => rotor-ish things
        const length = size.x;
        const skinnyX = length > size.y * 2 && length > size.z * 2;

        if (skinnyX && maxDim > 200) {
          animParts.turbineRotors.push(mesh);
        }
      }
    }

    function loadSTL(
      url: string,
      group: PartGroup,
      index: number
    ): Promise<void> {
      return new Promise((resolve) => {
        loader.load(
          url,
          (geometry) => {
            geometry.computeVertexNormals();
            geometry.computeBoundingBox();
            const bbox = geometry.boundingBox!;
            const size = new THREE.Vector3(
              bbox.max.x - bbox.min.x,
              bbox.max.y - bbox.min.y,
              bbox.max.z - bbox.min.z
            );
            const center = new THREE.Vector3();
            bbox.getCenter(center);

            const color = pickColor(group, index, size);
            const material = new THREE.MeshStandardMaterial({
              color,
              roughness: 0.6,
              metalness: 0.2,
              side: THREE.DoubleSide,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            (mesh.userData as any).baseColor = material.color.clone();

            plant.add(mesh);

            classifyForAnimation(group, size, center, mesh);

            loadedCount++;
            console.log("Loaded STL:", url, `${loadedCount}/${TOTAL}`);
            resolve();
          },
          undefined,
          (err) => {
            console.error("Failed to load STL:", url, err);
            loadedCount++;
            resolve();
          }
        );
      });
    }

    async function loadAll() {
      // REACTOR BUILDING
      for (const i of reactorFiles) {
        const url = `/stl/Reactor_building/${String(i).padStart(2, "0")}.stl`;
        await loadSTL(url, "reactor", i);
      }

      // TURBINE HALL
      for (const i of turbineFiles) {
        const url = `/stl/Turbine_hall/${String(i).padStart(2, "0")}.stl`;
        await loadSTL(url, "turbine", i);
      }

      console.log("All STL files loaded:", loadedCount);

      // -----------------------------------
      // GLOBAL BBOX (before transforms)
      // -----------------------------------
      const bbox = new THREE.Box3().setFromObject(plant);
      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());

      console.log("Plant bbox size:", size, "center:", center);

      const maxDim = Math.max(size.x, size.y, size.z);

      // Make plant roughly 75% of island length
      const targetSize = ISLAND_LENGTH * ISLAND_TARGET_RATIO;
      const scale = targetSize / maxDim;

      plant.scale.setScalar(scale);
      plant.position.set(
        -center.x * scale,
        -center.y * scale + 40, // lift above ground
        -center.z * scale
      );

      console.log("Global scale:", scale, "plant.position:", plant.position);

      // CAMERA based on target size (closer than before)
      const camDist = targetSize * 0.9;
      camera.position.set(camDist, camDist * 0.7, camDist * 0.4);
      controls.target.set(0, 60, 0);
      controls.update();

      // Bounding box helper
      const helper = new THREE.BoxHelper(plant, 0xff0000);
      scene.add(helper);
    }

    loadAll();

    // -----------------------------------
    // ANIMATION LOOP
    // -----------------------------------
    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();

      // Reactor core glow
      animParts.reactorCore.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.set(0xffd34a);
        mat.emissiveIntensity = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.0));
      });

      // Reactor pipes / internals pulse
      animParts.reactorPipes.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const base = (mesh.userData as any).baseColor as THREE.Color;
        const pulse = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * 3.0));
        mat.emissive.copy(base).multiplyScalar(0.25);
        mat.emissiveIntensity = pulse;
      });

      // Turbine rotors spin
      const radPerSec = (turbineRpm / 60) * 2 * Math.PI;
      animParts.turbineRotors.forEach((mesh) => {
        mesh.rotation.x += radPerSec * dt;
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // CLEANUP
    return () => {
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [theme, reactorPower, pumpRpm, turbineRpm, controlRodWithdrawn, pumpOn, turbineOn]);

  return <div ref={containerRef} className="w-full h-full" />;
}