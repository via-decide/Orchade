Repair mode for repository via-decide/orchade.

TARGET
Validate and repair only the files touched by the previous implementation.

TASK
Enhance 'Orchade' by implementing 'DaxiniAtmosphere'-a real-time dynamic weather and environmental physics engine. CORE ARCHITECTURE (The Atmosphere Layer): 1. The Global Weather State: - Update 'src/types.ts' to include an 'Environment' interface: { weather: 'sunny' | 'rainy' | 'stormy' | 'foggy', intensity: number, windSpeed: number }. 2. The Weather Controller Component: - Create 'src/components/WeatherOverlay.tsx' that renders particle systems for rain, snow, or dust based on the current state. 3. Physical Impact Logic: - Modify the growth logic in 'src/App.tsx'.

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