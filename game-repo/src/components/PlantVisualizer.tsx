import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { WeatherType } from '../types';

interface PlantVisualizerProps {
  stageIndex: number;
  progress: number; // 0 to 1
  type?: string;
  color?: string;
  isBurning?: boolean;
  hasPests?: boolean;
  stress?: number;
  weather?: WeatherType;
  toolEffect?: string | null;
}

const createPlantModel = (index: number, progress: number, type: string = 'Basic', plantColor: string = '#4CAF50') => {
  const group = new THREE.Group();
  const leafColor = new THREE.Color(plantColor);
  
  // Adjust color based on progress (maturing)
  const hsl = { h: 0, s: 0, l: 0 };
  leafColor.getHSL(hsl);
  leafColor.setHSL(hsl.h, hsl.s, hsl.l + (progress * 0.1));

  const stemThickness = (0.05 + (index * 0.03)) * (1 + progress * 0.5);
  const stemHeight = (0.6 + (index * 0.4)) * (1 + progress * 0.2);

  // Type-specific adjustments
  let trunkColor = 0x795548; // Default brown
  if (type === 'Neon-Vine') trunkColor = 0x1B5E20;
  if (type === 'Quartz-Fern') trunkColor = 0x90A4AE;
  if (type === 'Shadow-Fungi') trunkColor = 0x311B92;
  if (type === 'Cryo-Lily') trunkColor = 0x81D4FA;
  if (type === 'Plasma-Orchid') trunkColor = 0xAD1457;
  if (type === 'Void-Willow') trunkColor = 0x212121;
  if (type === 'Xero-Cactus') trunkColor = 0x33691E;

  // Stage 0: Seed
  if (index === 0) {
    const geometry = type === 'Quartz-Fern' ? new THREE.IcosahedronGeometry(0.3, 0) : new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: trunkColor });
    const seed = new THREE.Mesh(geometry, material);
    seed.name = 'stem';
    seed.scale.y = 0.8;
    seed.position.y = 0.2 + (progress * 0.1);
    group.add(seed);
  }
  // Stage 1-4: Growth
  else {
    // Trunk/Stem
    const trunkRadiusTop = stemThickness * (type === 'Xero-Cactus' ? 2 : type === 'Aether-Grass' ? 0.5 : 1);
    const trunkRadiusBottom = trunkRadiusTop * 1.5;
    const trunkGeom = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, stemHeight, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ 
      color: trunkColor,
      emissive: (type === 'Neon-Vine' || type === 'Plasma-Orchid') ? trunkColor : 0x000000,
      emissiveIntensity: 0.5
    });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.name = 'stem';
    trunk.position.y = stemHeight / 2;
    group.add(trunk);

    // Leaves/Canopy
    const leafMat = new THREE.MeshStandardMaterial({ 
      color: leafColor,
      transparent: type === 'Aether-Grass' || type === 'Cryo-Lily',
      opacity: type === 'Aether-Grass' ? 0.6 : 0.9,
      emissive: (type === 'Neon-Vine' || type === 'Solar-Bloom') ? leafColor : 0x000000,
      emissiveIntensity: 0.3
    });

    const leafCount = (index * 2) + (type === 'Aether-Grass' ? 6 : type === 'Xero-Cactus' ? 0 : 2);
    
    if (type === 'Shadow-Fungi') {
      // Mushroom cap
      const capGeom = new THREE.ConeGeometry(0.5 * index, 0.3 * index, 16);
      const cap = new THREE.Mesh(capGeom, leafMat);
      cap.name = 'leaf';
      cap.position.y = stemHeight;
      group.add(cap);
    } else if (type === 'Xero-Cactus') {
      // Spines instead of leaves
      for (let i = 0; i < 12; i++) {
        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
        const angle = (i / 12) * Math.PI * 2;
        spine.position.set(Math.cos(angle) * trunkRadiusTop, (Math.random() * stemHeight), Math.sin(angle) * trunkRadiusTop);
        spine.rotation.z = Math.random() * Math.PI;
        spine.name = 'leaf';
        group.add(spine);
      }
    } else {
      for (let i = 0; i < leafCount; i++) {
        let leafGeom;
        if (type === 'Quartz-Fern' || type === 'Cryo-Lily') {
          leafGeom = new THREE.IcosahedronGeometry(0.2 * (1 + progress * 0.5), 0);
        } else if (type === 'Aether-Grass') {
          leafGeom = new THREE.BoxGeometry(0.05, 0.8 * (1 + progress), 0.01);
        } else {
          leafGeom = new THREE.SphereGeometry(0.2 * (1 + progress * 0.5), 8, 8);
        }

        const leaf = new THREE.Mesh(leafGeom, leafMat);
        leaf.name = 'leaf';
        const angle = (i / leafCount) * Math.PI * 2;
        const dist = trunkRadiusTop + (0.1 * index);
        
        if (type === 'Aether-Grass') {
          leaf.position.set(Math.cos(angle) * 0.1, stemHeight, Math.sin(angle) * 0.1);
          leaf.rotation.x = 0.2;
          leaf.rotation.y = angle;
        } else if (type === 'Void-Willow') {
          leaf.position.set(Math.cos(angle) * dist * 2, stemHeight - (Math.random() * 0.5), Math.sin(angle) * dist * 2);
          leaf.scale.set(1, 2, 0.5);
        } else {
          leaf.position.set(Math.cos(angle) * dist, (stemHeight * 0.6) + (Math.random() * stemHeight * 0.4), Math.sin(angle) * dist);
          leaf.scale.set(1, 0.3, 1);
          leaf.rotation.z = angle;
        }
        // Store original position and rotation for animation
        leaf.userData.originalRotation = leaf.rotation.clone();
        leaf.userData.originalPosition = leaf.position.clone();
        group.add(leaf);
      }
    }
  }

  return group;
};

const PlantVisualizer: React.FC<PlantVisualizerProps> = ({ 
  stageIndex, 
  progress,
  type = 'Basic',
  color,
  isBurning = false, 
  hasPests = false,
  stress = 0,
  weather = 'clear',
  toolEffect = null
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const plantGroupRef = useRef<THREE.Group | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const weatherParticlesRef = useRef<THREE.Points | null>(null);
  const pestParticlesRef = useRef<THREE.Points | null>(null);
  const pestMeshesRef = useRef<THREE.Group | null>(null);
  const burningParticlesRef = useRef<THREE.Points | null>(null);
  const toolParticlesRef = useRef<THREE.Points | null>(null);
  const lastLightningTime = useRef(0);
  const lightningIntensity = useRef(0);

  // Use refs for props to avoid stale closures in the animation loop
  const isBurningRef = useRef(isBurning);
  const hasPestsRef = useRef(hasPests);
  const stressRef = useRef(stress);
  const weatherRef = useRef(weather);
  const progressRef = useRef(progress);
  const toolEffectRef = useRef(toolEffect);

  useEffect(() => {
    isBurningRef.current = isBurning;
    hasPestsRef.current = hasPests;
    stressRef.current = stress;
    weatherRef.current = weather;
    progressRef.current = progress;
    toolEffectRef.current = toolEffect;
  }, [isBurning, hasPests, stress, weather, progress, toolEffect]);

  // Particle System for Weather
  const createWeatherParticles = (type: WeatherType) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (weatherParticlesRef.current) {
      scene.remove(weatherParticlesRef.current);
      weatherParticlesRef.current.geometry.dispose();
      (weatherParticlesRef.current.material as THREE.Material).dispose();
      weatherParticlesRef.current = null;
    }

    // Reset scene fog and background
    scene.fog = null;
    scene.background = null;

    if (type === 'rain' || type === 'storm') {
      const count = type === 'storm' ? 3000 : 1000;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);

      for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 10;
        positions[i + 1] = Math.random() * 10;
        positions[i + 2] = (Math.random() - 0.5) * 10;
        velocities[i + 1] = type === 'storm' ? -0.2 - Math.random() * 0.2 : -0.1 - Math.random() * 0.1;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

      const material = new THREE.PointsMaterial({
        color: 0x81D4FA,
        size: 0.05,
        transparent: true,
        opacity: 0.6,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      weatherParticlesRef.current = points;

      // Set dark background for rain/storm
      scene.background = new THREE.Color(type === 'storm' ? 0x1A1A1A : 0x2A2A2A);
    } else if (type === 'heatwave') {
      const count = 300;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 4;
        positions[i + 1] = Math.random() * 4;
        positions[i + 2] = (Math.random() - 0.5) * 4;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: 0xFFCC80,
        size: 0.15,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      weatherParticlesRef.current = points;

      // Set warm background for heatwave
      scene.background = new THREE.Color(0x3E2723);
    } else if (type === 'fog') {
      const count = 800;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 15;
        positions[i + 1] = Math.random() * 3;
        positions[i + 2] = (Math.random() - 0.5) * 15;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.5,
        transparent: true,
        opacity: 0.15,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      weatherParticlesRef.current = points;

      // Add scene fog and matching background
      const fogColor = new THREE.Color(0x454545);
      scene.fog = new THREE.Fog(fogColor, 2, 10);
      scene.background = fogColor;
    }
  };

  const createStatusParticles = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Pests
    if (pestParticlesRef.current) {
      scene.remove(pestParticlesRef.current);
      pestParticlesRef.current.geometry.dispose();
      (pestParticlesRef.current.material as THREE.Material).dispose();
      pestParticlesRef.current = null;
    }
    if (pestMeshesRef.current) {
      scene.remove(pestMeshesRef.current);
      pestMeshesRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      pestMeshesRef.current = null;
    }

    if (hasPests) {
      // Swarm particles
      const count = 40;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 1.5;
        positions[i + 1] = Math.random() * 2;
        positions[i + 2] = (Math.random() - 0.5) * 1.5;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: 0x1B5E20,
        size: 0.05,
        transparent: true,
        opacity: 0.6,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      pestParticlesRef.current = points;

      // "Hero" insect meshes
      const insectGroup = new THREE.Group();
      const bodyGeom = new THREE.SphereGeometry(0.03, 4, 4);
      const wingGeom = new THREE.PlaneGeometry(0.06, 0.03);
      const insectMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x1B5E20 });
      const wingMat = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF, 
        transparent: true, 
        opacity: 0.4, 
        side: THREE.DoubleSide 
      });
      
      for (let i = 0; i < 6; i++) {
        const insect = new THREE.Group();
        
        const body = new THREE.Mesh(bodyGeom, insectMat);
        insect.add(body);

        const leftWing = new THREE.Mesh(wingGeom, wingMat);
        leftWing.position.set(-0.03, 0.02, 0);
        leftWing.name = 'leftWing';
        insect.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeom, wingMat);
        rightWing.position.set(0.03, 0.02, 0);
        rightWing.name = 'rightWing';
        insect.add(rightWing);

        // Random starting positions
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.5 + Math.random() * 0.7;
        insect.position.set(Math.cos(angle) * radius, 0.5 + Math.random() * 1.5, Math.sin(angle) * radius);
        insectGroup.add(insect);
      }
      scene.add(insectGroup);
      pestMeshesRef.current = insectGroup;
    }

    // Burning
    if (burningParticlesRef.current) {
      scene.remove(burningParticlesRef.current);
      burningParticlesRef.current.geometry.dispose();
      (burningParticlesRef.current.material as THREE.Material).dispose();
      burningParticlesRef.current = null;
    }

    if (isBurning) {
      const count = 150;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 1.2;
        positions[i3 + 1] = Math.random() * 2.5;
        positions[i3 + 2] = (Math.random() - 0.5) * 1.2;
        sizes[i] = Math.random();
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      const material = new THREE.PointsMaterial({
        color: 0xFF4500, // Orange Red
        size: 0.08,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      burningParticlesRef.current = points;
    }
  };

  const createToolParticles = (effect: string) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (toolParticlesRef.current) {
      scene.remove(toolParticlesRef.current);
      toolParticlesRef.current.geometry.dispose();
      (toolParticlesRef.current.material as THREE.Material).dispose();
      toolParticlesRef.current = null;
    }

    let count = 0;
    let color = 0xffffff;
    let size = 0.1;
    let opacity = 0.8;

    if (effect === 'water') {
      count = 500;
      color = 0x00B0FF;
      size = 0.08;
    } else if (effect === 'fertilize') {
      count = 300;
      color = 0xFFD700;
      size = 0.12;
    } else if (effect === 'pesticide' || effect === 'pest-repellent-pulse') {
      count = 1000;
      color = 0x00E676;
      size = 0.15;
      opacity = 0.4;
    } else if (effect === 'genetic-scanner') {
      count = 800;
      color = 0x2196F3;
      size = 0.05;
    } else if (effect === 'pruning-shears') {
      count = 600;
      color = 0xFFFFFF; // White/Silver for shears
      size = 0.06;
      opacity = 0.9;
    }

    if (count > 0) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);

      for (let i = 0; i < count * 3; i += 3) {
        if (effect === 'water') {
          positions[i] = (Math.random() - 0.5) * 2;
          positions[i + 1] = 4 + Math.random() * 2;
          positions[i + 2] = (Math.random() - 0.5) * 2;
          velocities[i + 1] = -0.1 - Math.random() * 0.1;
        } else if (effect === 'pruning-shears') {
          // Sparkles falling around the plant
          positions[i] = (Math.random() - 0.5) * 1.5;
          positions[i + 1] = 1 + Math.random() * 2;
          positions[i + 2] = (Math.random() - 0.5) * 1.5;
          velocities[i + 1] = -0.02 - Math.random() * 0.03;
          velocities[i] = (Math.random() - 0.5) * 0.01;
          velocities[i + 2] = (Math.random() - 0.5) * 0.01;
        } else if (effect === 'fertilize') {
          positions[i] = (Math.random() - 0.5) * 1.5;
          positions[i + 1] = Math.random() * 0.5;
          positions[i + 2] = (Math.random() - 0.5) * 1.5;
          velocities[i + 1] = 0.05 + Math.random() * 0.05;
        } else {
          positions[i] = (Math.random() - 0.5) * 0.1;
          positions[i + 1] = 1 + (Math.random() - 0.5) * 0.1;
          positions[i + 2] = (Math.random() - 0.5) * 0.1;
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.1 + Math.random() * 0.1;
          velocities[i] = Math.cos(angle) * speed;
          velocities[i + 1] = (Math.random() - 0.5) * 0.1;
          velocities[i + 2] = Math.sin(angle) * speed;
        }
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

      const material = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);
      toolParticlesRef.current = points;
    }
  };

  useEffect(() => {
    progressRef.current = progress;
    if (plantGroupRef.current) {
      const scale = 1 + progress * 0.3;
      plantGroupRef.current.scale.set(scale, scale, scale);
    }
  }, [progress]);

  useEffect(() => {
    isBurningRef.current = isBurning;
    hasPestsRef.current = hasPests;
    createStatusParticles();
  }, [isBurning, hasPests]); // Consolidate status updates

  useEffect(() => {
    toolEffectRef.current = toolEffect;
    if (toolEffect) {
      createToolParticles(toolEffect);
    }
  }, [toolEffect]);

  useEffect(() => {
    weatherRef.current = weather;
    createWeatherParticles(weather);
  }, [weather]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Handle resize with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !rendererRef.current || !cameraRef.current) return;
      
      // Use clientWidth/Height for the most accurate "available space" measurement
      const width = containerRef.current?.clientWidth || 0;
      const height = containerRef.current?.clientHeight || 0;
      
      if (width === 0 || height === 0) return;

      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    });
    resizeObserver.observe(containerRef.current);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Ground
    const soilMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.5, 0.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.8 })
    );
    soilMesh.position.y = -0.1;
    scene.add(soilMesh);

    // Initial Plant
    const plantGroup = createPlantModel(stageIndex, progress, type, color);
    scene.add(plantGroup);
    plantGroupRef.current = plantGroup;

    // Initial particles
    createWeatherParticles(weather);
    createStatusParticles();

    // Animation loop
    let frameId: number;
    let time = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      time += 0.01;

      if (plantGroupRef.current) {
        // Dynamic rotation speed based on type
        const rotSpeed = type === 'Plasma-Orchid' ? 0.03 : type === 'Gravity-Root' ? 0.005 : 0.015;
        plantGroupRef.current.rotation.y += rotSpeed;
        
        // Subtle swaying based on weather
        const windStrength = weatherRef.current === 'storm' ? 0.15 : weatherRef.current === 'rain' ? 0.05 : 0.02;
        const swayAmount = Math.sin(time * 1.5) * windStrength;
        plantGroupRef.current.rotation.z = swayAmount;
        plantGroupRef.current.rotation.x = Math.cos(time * 1.2) * (windStrength * 0.5);

        // Animate leaves and stems
        plantGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.name === 'leaf') {
              // Fluttering animation
              const flutterSpeed = 2 + (child.id % 5) * 0.2;
              const flutterAmount = 0.05 + (windStrength * 0.5);
              child.rotation.x = (child.userData.originalRotation?.x || 0) + Math.sin(time * flutterSpeed) * flutterAmount;
              
              // Wilting effect based on stress
              const wiltAngle = (stressRef.current / 100) * (Math.PI / 4);
              child.rotation.x += wiltAngle;

              // Color shift based on stress (yellowing/browning)
              if (child.material instanceof THREE.MeshStandardMaterial) {
                const baseColor = new THREE.Color(color || '#4CAF50');
                const stressColor = new THREE.Color(0x8B4513); // Brown
                const yellowColor = new THREE.Color(0xFFFF00); // Yellow
                
                let targetColor = baseColor.clone();
                if (stressRef.current > 40) {
                  const mixFactor = (stressRef.current - 40) / 60;
                  targetColor.lerp(stressRef.current > 70 ? stressColor : yellowColor, mixFactor);
                }
                child.material.color.lerp(targetColor, 0.05);
              }
            }
          }
        });

        // Visual effects based on state
        if (isBurningRef.current) {
          // Heat shimmer / jitter
          plantGroupRef.current.position.x = Math.sin(time * 50) * 0.02;
          plantGroupRef.current.position.z = Math.cos(time * 40) * 0.02;
          plantGroupRef.current.scale.setScalar((1 + progress * 0.3) * (1 + Math.sin(time * 20) * 0.01));
          
          dirLightRef.current?.color.setHex(0xFF5252);
          
          // Pulse emissive for burning effect
          plantGroupRef.current.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
              if (obj.name === 'stem') {
                obj.material.emissive.setHex(0xFF4500);
                obj.material.emissiveIntensity = 0.4 + Math.sin(time * 25 + obj.id) * 0.3;
                // Darken the base color to look charred
                if (!obj.userData.originalColor) obj.userData.originalColor = obj.material.color.clone();
                obj.material.color.lerp(new THREE.Color(0x111111), 0.02);
              }
            }
          });
        } else if (hasPestsRef.current) {
          plantGroupRef.current.position.x = 0;
          plantGroupRef.current.position.z = 0;
          dirLightRef.current?.color.setHex(0xB2FF59);
          
          // Subtle green pulse for pests
          plantGroupRef.current.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
              obj.material.emissive.setHex(0x2E7D32);
              obj.material.emissiveIntensity = 0.2 + Math.sin(time * 5) * 0.1;
              // Restore color if it was charred
              if (obj.userData.originalColor) obj.material.color.lerp(obj.userData.originalColor, 0.1);
            }
          });
        } else {
          plantGroupRef.current.position.x = 0;
          plantGroupRef.current.position.z = 0;
          // Weather Lighting
          if (weatherRef.current === 'clear') dirLightRef.current?.color.setHex(0xFFFDE7);
          else if (weatherRef.current === 'rain' || weatherRef.current === 'storm') dirLightRef.current?.color.setHex(0x90CAF9);
          else if (weatherRef.current === 'heatwave') {
            dirLightRef.current?.color.setHex(0xFFCC80);
            // Heat shimmer even if not burning
            plantGroupRef.current.position.x = Math.sin(time * 10) * 0.01;
          }
          else if (weatherRef.current === 'fog') dirLightRef.current?.color.setHex(0xE0E0E0);
          else dirLightRef.current?.color.setHex(0xffffff);

          // Reset emissive if not burning/pests
          plantGroupRef.current.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
              // Restore color if it was charred
              if (obj.userData.originalColor) obj.material.color.lerp(obj.userData.originalColor, 0.1);

              // Only reset if it wasn't already emissive by default (like Neon-Vine)
              if (type !== 'Neon-Vine' && type !== 'Plasma-Orchid' && type !== 'Solar-Bloom') {
                obj.material.emissive.setHex(0x000000);
                obj.material.emissiveIntensity = 0;
              }
            }
          });
        }
      }

      // Animate Weather Particles
      if (weatherParticlesRef.current) {
        const positions = weatherParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const velocities = weatherParticlesRef.current.geometry.attributes.velocity?.array as Float32Array;
        
        if (weatherRef.current === 'rain' || weatherRef.current === 'storm') {
          for (let i = 0; i < positions.length; i += 3) {
            if (velocities) {
              positions[i + 1] += velocities[i + 1];
            } else {
              positions[i + 1] -= 0.15;
            }
            // Add some horizontal drift
            positions[i] += Math.sin(time + i) * 0.01;
            
            if (positions[i + 1] < 0) {
              positions[i + 1] = 10;
              positions[i] = (Math.random() - 0.5) * 10;
              positions[i + 2] = (Math.random() - 0.5) * 10;
            }
          }
        } else if (weatherRef.current === 'heatwave') {
          for (let i = 1; i < positions.length; i += 3) {
            positions[i] += 0.02;
            positions[i - 1] += Math.sin(time * 2 + i) * 0.02;
            if (positions[i] > 4) positions[i] = 0;
          }
        } else if (weatherRef.current === 'fog') {
          for (let i = 0; i < positions.length; i += 3) {
            positions[i] += Math.sin(time * 0.3 + i) * 0.008;
            positions[i + 2] += Math.cos(time * 0.3 + i) * 0.008;
          }
        }
        weatherParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Lightning effect for storm
      if (weatherRef.current === 'storm' && !isBurningRef.current && !hasPestsRef.current) {
        const now = Date.now();
        if (now - lastLightningTime.current > 3000 + Math.random() * 5000) {
          // Flash!
          lightningIntensity.current = 2.0;
          lastLightningTime.current = now;
        }
      }

      // Apply lightning decay
      if (lightningIntensity.current > 0) {
        lightningIntensity.current *= 0.9;
        if (lightningIntensity.current < 0.01) lightningIntensity.current = 0;
        
        if (dirLightRef.current) dirLightRef.current.intensity = 0.8 + lightningIntensity.current;
        if (ambientLightRef.current) ambientLightRef.current.intensity = 0.6 + lightningIntensity.current * 0.5;
      } else {
        if (dirLightRef.current) dirLightRef.current.intensity = 0.8;
        if (ambientLightRef.current) ambientLightRef.current.intensity = 0.6;
      }

      // Animate Pest Particles
      if (pestParticlesRef.current) {
        const positions = pestParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += (Math.random() - 0.5) * 0.08;
          positions[i+1] += (Math.random() - 0.5) * 0.08;
          positions[i+2] += (Math.random() - 0.5) * 0.08;
          
          // Keep them near the plant
          if (Math.abs(positions[i]) > 1.2) positions[i] *= 0.8;
          if (positions[i+1] < 0.2 || positions[i+1] > 2.2) positions[i+1] = 1;
          if (Math.abs(positions[i+2]) > 1.2) positions[i+2] *= 0.8;
        }
        pestParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Animate Pest Meshes
      if (pestMeshesRef.current) {
        pestMeshesRef.current.children.forEach((insect, idx) => {
          const speed = 1 + idx * 0.2;
          const radius = 0.6 + Math.sin(time * speed + idx) * 0.2;
          insect.position.x = Math.cos(time * speed + idx) * radius;
          insect.position.z = Math.sin(time * speed + idx) * radius;
          insect.position.y += Math.sin(time * 3 + idx) * 0.01;
          
          // Flap wings
          const leftWing = insect.getObjectByName('leftWing');
          const rightWing = insect.getObjectByName('rightWing');
          if (leftWing && rightWing) {
            const flap = Math.sin(time * 40 + idx) * 0.8;
            leftWing.rotation.z = flap;
            rightWing.rotation.z = -flap;
          }

          // Orient insect to movement
          insect.rotation.y = -(time * speed + idx) + Math.PI / 2;
        });
      }

      // Animate Burning Particles
      if (burningParticlesRef.current) {
        const positions = burningParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += 0.03;
          positions[i-1] += (Math.random() - 0.5) * 0.02;
          positions[i+1] += (Math.random() - 0.5) * 0.02;
          if (positions[i] > 3) {
            positions[i] = 0;
            positions[i-1] = (Math.random() - 0.5) * 0.5;
            positions[i+1] = (Math.random() - 0.5) * 0.5;
          }
        }
        burningParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }
      
      if (toolParticlesRef.current) {
        const positions = toolParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const velocities = toolParticlesRef.current.geometry.attributes.velocity.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += velocities[i];
          positions[i + 1] += velocities[i + 1];
          positions[i + 2] += velocities[i + 2];

          if (toolEffectRef.current === 'water') {
            if (positions[i + 1] < 0) {
              positions[i + 1] = 4 + Math.random() * 2;
              positions[i] = (Math.random() - 0.5) * 2;
              positions[i + 2] = (Math.random() - 0.5) * 2;
            }
          } else if (toolEffectRef.current === 'pruning-shears') {
            if (positions[i + 1] < 0) {
              positions[i + 1] = 1 + Math.random() * 2;
              positions[i] = (Math.random() - 0.5) * 1.5;
              positions[i + 2] = (Math.random() - 0.5) * 1.5;
            }
          } else if (toolEffectRef.current === 'fertilize') {
            if (positions[i + 1] > 3) {
              positions[i + 1] = 0;
              positions[i] = (Math.random() - 0.5) * 1.5;
              positions[i + 2] = (Math.random() - 0.5) * 1.5;
            }
          } else {
            // Pulse effect - particles travel outwards
            const dist = Math.sqrt(positions[i]**2 + positions[i+2]**2);
            if (dist > 5) {
              positions[i] = (Math.random() - 0.5) * 0.1;
              positions[i + 1] = 1 + (Math.random() - 0.5) * 0.1;
              positions[i + 2] = (Math.random() - 0.5) * 0.1;
            }
          }
        }
        toolParticlesRef.current.geometry.attributes.position.needsUpdate = true;
        
        // Fade out tool particles over time
        const mat = toolParticlesRef.current.material as THREE.PointsMaterial;
        if (mat.opacity > 0) {
          mat.opacity -= 0.005;
        } else {
          sceneRef.current?.remove(toolParticlesRef.current);
          toolParticlesRef.current = null;
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update model when stage, progress, type or color changes
  useEffect(() => {
    if (sceneRef.current && plantGroupRef.current) {
      sceneRef.current.remove(plantGroupRef.current);
      const newPlant = createPlantModel(stageIndex, progress, type, color);
      sceneRef.current.add(newPlant);
      plantGroupRef.current = newPlant;
    }
  }, [stageIndex, progress, type, color]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative z-10"
    />
  );
};

export default PlantVisualizer;
