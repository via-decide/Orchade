import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface PlantVisualizerProps {
  stageIndex: number;
  progress: number; // 0 to 1
  isBurning?: boolean;
  hasPests?: boolean;
  weather?: 'sun' | 'rain';
  showSoil?: boolean;
  isSmall?: boolean;
}

const PlantVisualizer: React.FC<PlantVisualizerProps> = ({ 
  stageIndex, 
  progress,
  isBurning = false, 
  hasPests = false,
  weather = 'sun',
  showSoil = true,
  isSmall = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const plantGroupRef = useRef<THREE.Group | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Use refs for props to avoid stale closures in the animation loop
  const isBurningRef = useRef(isBurning);
  const hasPestsRef = useRef(hasPests);
  const weatherRef = useRef(weather);
  const progressRef = useRef(progress);

  useEffect(() => {
    isBurningRef.current = isBurning;
  }, [isBurning]);

  useEffect(() => {
    hasPestsRef.current = hasPests;
  }, [hasPests]);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    progressRef.current = progress;
    if (plantGroupRef.current) {
      const scale = 1 + progress * 0.3; // Scale up to 30% within a stage
      plantGroupRef.current.scale.set(scale, scale, scale);
    }
  }, [progress]);

  // Helper to apply current scale to a plant group
  const applyCurrentScale = (group: THREE.Group) => {
    const scale = 1 + progressRef.current * 0.3;
    group.scale.set(scale, scale, scale);
  };

  const createPlantModel = (index: number) => {
    const group = new THREE.Group();
    
    // Stage 0: Seed
    if (index === 0) {
      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.8 });
      const seed = new THREE.Mesh(geometry, material);
      seed.scale.y = 0.8;
      seed.position.y = 0.2;
      group.add(seed);
    }
    // Stage 1: Sprout
    else if (index === 1) {
      const stemGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x689F38 });
      const stem = new THREE.Mesh(stemGeom, stemMat);
      stem.position.y = 0.3;
      group.add(stem);

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
      const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), leafMat);
      leaf1.scale.set(1, 0.2, 1);
      leaf1.position.set(0.15, 0.5, 0);
      leaf1.rotation.z = -0.4;
      
      const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), leafMat);
      leaf2.scale.set(1, 0.2, 1);
      leaf2.position.set(-0.15, 0.4, 0);
      leaf2.rotation.z = 0.4;
      
      group.add(leaf1, leaf2);
    }
    // Stage 2: Sapling
    else if (index === 2) {
      const trunkGeom = new THREE.CylinderGeometry(0.08, 0.12, 1.2, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x795548 });
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 0.6;
      group.add(trunk);

      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x43A047, roughness: 0.8 })
      );
      canopy.position.y = 1.3;
      group.add(canopy);
    }
    // Stage 3: Young Tree
    else if (index === 3) {
      const trunkGeom = new THREE.CylinderGeometry(0.15, 0.25, 1.8, 12);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 0.9;
      group.add(trunk);

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.8 });
      const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), leafMat);
      c1.position.set(0, 1.8, 0);
      const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), leafMat);
      c2.position.set(0.4, 1.5, 0.3);
      const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), leafMat);
      c3.position.set(-0.4, 1.5, -0.3);
      group.add(c1, c2, c3);
    }
    // Stage 4: Mature Tree
    else {
      const trunkGeom = new THREE.CylinderGeometry(0.2, 0.4, 2.5, 16);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3E2723 });
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 1.25;
      group.add(trunk);

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x1B5E20, roughness: 0.8 });
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), leafMat);
      canopy.position.y = 2.8;
      group.add(canopy);
    }

    applyCurrentScale(group);
    return group;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Check for WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglError('WebGL not supported on this device');
        return;
      }
    } catch (e) {
      setWebglError('Error checking WebGL support');
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a); // Solid background for visibility
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    if (isSmall) {
      camera.position.set(0, 1.5, 5); 
      camera.lookAt(0, 0.8, 0); 
    } else {
      camera.position.set(0, 2.5, 8); 
      camera.lookAt(0, 1.2, 0); 
    }
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: false, // Disable alpha for more robust rendering
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Handle resize
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current || !containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      if (width === 0 || height === 0) return;
      rendererRef.current.setSize(width, height, false);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    handleResize();

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    // Ground
    let soilMesh: THREE.Mesh | null = null;
    if (showSoil) {
      soilMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.5, 0.2, 24),
        new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.8 })
      );
      soilMesh.position.y = -0.1;
      scene.add(soilMesh);
    }

    // Initial Plant
    const plantGroup = createPlantModel(stageIndex);
    scene.add(plantGroup);
    plantGroupRef.current = plantGroup;

    // Animation loop
    let time = 0;
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      
      time += 0.016;
      
      if (plantGroupRef.current) {
        plantGroupRef.current.rotation.y += 0.015;
        const breath = Math.sin(time * 1.5) * 0.015;
        const baseScale = 1 + progressRef.current * 0.3;
        const currentScale = baseScale + breath;
        plantGroupRef.current.scale.set(currentScale, currentScale, currentScale);

        if (soilMesh) {
          soilMesh.scale.set(1 + breath * 0.2, 1, 1 + breath * 0.2);
        }

        if (isBurningRef.current) {
          plantGroupRef.current.position.x = (Math.random() - 0.5) * 0.03;
          dirLightRef.current?.color.setHex(0xFF5252);
        } else if (hasPestsRef.current) {
          plantGroupRef.current.position.x = 0;
          dirLightRef.current?.color.setHex(0xB2FF59);
        } else {
          plantGroupRef.current.position.x = 0;
          dirLightRef.current?.color.setHex(weatherRef.current === 'sun' ? 0xFFFDE7 : 0xffffff);
        }
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current && plantGroupRef.current) {
      sceneRef.current.remove(plantGroupRef.current);
      const newPlant = createPlantModel(stageIndex);
      sceneRef.current.add(newPlant);
      plantGroupRef.current = newPlant;
    }
  }, [stageIndex]);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a] text-text-secondary text-xs p-4 text-center">
        <div className="space-y-2">
          <p>{webglError}</p>
          <p className="text-[10px]">Try enabling hardware acceleration in your browser settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative z-10 bg-[#0a0a0a]"
    />
  );
};

export default PlantVisualizer;
