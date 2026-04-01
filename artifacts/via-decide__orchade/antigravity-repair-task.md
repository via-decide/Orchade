Repair mode for repository via-decide/orchade.

TARGET
Validate and repair only the files touched by the previous implementation.

TASK
Enhance 'Orchade' into a AAA-grade simulation game by upgrading the core engine and visual stack. CORE ARCHITECTURE (The Ecosystem Engine): 1. The 3D Visual Overhaul: - Transition 'src/components/PlantVisualizer.tsx' from 2D Canvas to 'React Three Fiber' (Three.js). - Implement 'Procedural Growth'-plants should grow in 3D space with unique branch structures based on 'Genetic Seeds'. 2. The Biological Simulation: - Update 'src/types.ts' to include complex environmental variables: [Soil_pH], [Humidity], [Mineral_Composition], and [Cross-Breeding_Logic].

RULES
1. Audit touched files first and identify regressions.
2. Preserve architecture and naming conventions.
3. Make minimal repairs only; do not expand scope.
4. Re-run checks and provide concise root-cause notes.
5. Return complete contents for changed files only.

SOP: REPAIR PROTOCOL (MANDATORY)
1. Strict Fix Only: Do not use repair mode to expand scope or add features.
2. Regression Check: Audit why previous attempt failed before proposing a fix.
3. Minimal Footprint: Only return contents for the actual repaired files.

REPO CONTEXT
- README snippet:
<div align="center"> <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" /> </div> # Run and deploy your AI Studio app This contains everything you need to run your app locally. View your app in AI Studio: https://ai.
- AGENTS snippet:
not found
- package.json snippet:
{ "name": "react-example", "private": true, "version": "0.0.0", "type": "module", "scripts": { "dev": "vite --port=3000 --host=0.0.0.0", "build": "vite build", "preview": "vite preview", "clean": "rm -rf dist", "lint": "tsc --noEmit" }, "dependencies": { "@googl