You are working in repository via-decide/orchade on branch main.

MISSION
Enhance 'Orchade' by implementing 'DaxiniAtmosphere'-a real-time dynamic weather and environmental physics engine. CORE ARCHITECTURE (The Atmosphere Layer): 1. The Global Weather State: - Update 'src/types.ts' to include an 'Environment' interface: { weather: 'sunny' | 'rainy' | 'stormy' | 'foggy', intensity: number, windSpeed: number }. 2. The Weather Controller Component: - Create 'src/components/WeatherOverlay.tsx' that renders particle systems for rain, snow, or dust based on the current state. 3. Physical Impact Logic: - Modify the growth logic in 'src/App.tsx'.

CONSTRAINTS
Ensure the particle systems are optimized to maintain 60FPS. The weather transitions must be smooth (interpolated) to prevent sudden visual jumps in the 'PlantVisualizer'.

PROCESS (MANDATORY)
1. Read README.md and AGENTS.md before editing.
2. Audit architecture before coding. Summarize current behavior.
3. Preserve unrelated working code. Prefer additive modular changes.
4. Implement the smallest safe change set for the stated goal.
5. Run validation commands and fix discovered issues.
6. Self-review for regressions, missing env wiring, and docs drift.
7. Return complete final file contents for every modified or created file.

REPO AUDIT CONTEXT
- Description: Growth game
- Primary language: TypeScript
- README snippet:
<div align="center"> <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" /> </div> # Run and deploy your AI Studio app This contains everything you need to run your app locally. View your app in AI Studio: https://ai.

- AGENTS snippet:
not found


SOP: PRE-MODIFICATION PROTOCOL (MANDATORY)
1. Adherence to Instructions: No deviations without explicit user approval.
2. Mandatory Clarification: Immediately ask if instructions are ambiguous or incomplete.
3. Proposal First: Always propose optimizations or fixes before implementing them.
4. Scope Discipline: Do not add unrequested features or modify unrelated code.
5. Vulnerability Check: Immediately flag and explain security risks.

OUTPUT REQUIREMENTS
- Include: implementation summary, checks run, risks, rollback notes.
- Generate branch + PR package.
- Keep prompts deterministic and preservation-first.