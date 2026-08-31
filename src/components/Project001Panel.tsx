import React, { useEffect, useMemo, useState } from 'react';
import { ProgressionPanel } from './ProgressionPanel';
import {
  PROJECT_001_BASELINE_SCENARIO,
  advanceProject001RunSession,
  compareProject001Scenarios,
  createProject001InitialState,
  createProject001RunSession,
  createScenarioRevision,
  finalizeProject001Run,
  type FailureRecord,
  type Project001Comparison,
  type Project001RunSession,
  type Project001SimulationRun,
  type SelfSufficiencyMetrics,
} from '../simulation/homestead';

interface Project001PanelProps { totalAcreage: number }

const ACRES_TO_M2 = 4046.8564224;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const metricRows: Array<{ key: keyof SelfSufficiencyMetrics; label: string; inverse?: boolean }> = [
  { key: 'foodSelfSufficiency', label: 'Food' },
  { key: 'waterIndependence', label: 'Water' },
  { key: 'energyIndependence', label: 'Energy' },
  { key: 'nutrientCircularity', label: 'Nutrients' },
  { key: 'propertyCostCoverage', label: 'Property cost' },
  { key: 'householdEconomicCoverage', label: 'Household economy' },
  { key: 'labourFeasibility', label: 'Labour load', inverse: true },
];

export function Project001Panel({ totalAcreage }: Project001PanelProps) {
  const [seed, setSeed] = useState(PROJECT_001_BASELINE_SCENARIO.seed);
  const [durationDays, setDurationDays] = useState(365);
  const [members, setMembers] = useState(4);
  const [tankCapacityL, setTankCapacityL] = useState(5000);
  const [session, setSession] = useState<Project001RunSession | null>(null);
  const [run, setRun] = useState<Project001SimulationRun | null>(null);
  const [comparison, setComparison] = useState<Project001Comparison | null>(null);
  const [running, setRunning] = useState(false);
  const [replayStatus, setReplayStatus] = useState<'idle' | 'verified' | 'mismatch'>('idle');
  const [selectedFailureId, setSelectedFailureId] = useState<string | null>(null);

  const scenario = useMemo(() => {
    const totalAreaM2 = totalAcreage * ACRES_TO_M2;
    const usableAreaM2 = totalAreaM2 * 0.824;
    return {
      ...PROJECT_001_BASELINE_SCENARIO,
      seed,
      durationDays,
      revision: {
        ...PROJECT_001_BASELINE_SCENARIO.revision,
        id: 'project-001-ui-rev-001',
        changeSet: [
          { path: 'land.totalAreaM2', previousValue: PROJECT_001_BASELINE_SCENARIO.land.totalAreaM2, nextValue: totalAreaM2, operation: 'replace' as const },
          { path: 'household.members', previousValue: 4, nextValue: members, operation: 'replace' as const },
          { path: 'water.tankCapacityL', previousValue: 5000, nextValue: tankCapacityL, operation: 'replace' as const },
        ],
        reason: 'Plot Planner Project 001 configuration.',
      },
      land: { ...PROJECT_001_BASELINE_SCENARIO.land, totalAreaM2, usableAreaM2, reservedAreaM2: totalAreaM2 - usableAreaM2 },
      household: { ...PROJECT_001_BASELINE_SCENARIO.household, members },
      water: { ...PROJECT_001_BASELINE_SCENARIO.water, tankCapacityL, initialTankLevelL: Math.min(tankCapacityL, PROJECT_001_BASELINE_SCENARIO.water.initialTankLevelL) },
      metadata: { ...PROJECT_001_BASELINE_SCENARIO.metadata, name: 'PROJECT 001 — Plot Planner scenario' },
    };
  }, [durationDays, members, seed, tankCapacityL, totalAcreage]);
  const initialState = useMemo(() => createProject001InitialState(scenario).state, [scenario]);
  const displayState = session?.state ?? initialState;
  const metrics = run?.finalMetrics ?? displayState.lastMetrics;
  const elapsedDays = session ? Math.max(0, session.state.day - scenario.startDay + 1) : 0;
  const progress = Math.min(1, elapsedDays / durationDays);
  const failures = displayState.knowledge.failures;
  const selectedFailure: FailureRecord | undefined = failures.find(item => item.id === selectedFailureId) ?? failures[0];
  const recentEvents = (session?.events ?? initialState.lastEvents).slice(-8).reverse();
  const progressionInputs = {
    pantryItemCount: displayState.household.foodInventoryCalories > 0 ? 1 : 0,
    totalReusedLbs: displayState.nutrients.cumulativeInternalSupplyUnits,
    waterStoredGallons: displayState.water.tankLevelL * 0.264172,
    paidUnlockCount: 0,
    activePaddockCount: displayState.livestock.length,
    closedLoopPercent: metrics.nutrientCircularity * 100,
    solarWatts: scenario.energy.solarCapacityKw * 1000,
  };

  useEffect(() => {
    setSession(null); setRun(null); setComparison(null); setRunning(false); setReplayStatus('idle'); setSelectedFailureId(null);
  }, [scenario]);

  useEffect(() => {
    if (!running || !session) return;
    if (elapsedDays >= durationDays) {
      setRun(finalizeProject001Run(session));
      setRunning(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setSession(current => current ? advanceProject001RunSession(current, Math.min(7, durationDays - elapsedDays)) : current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [durationDays, elapsedDays, running, session]);

  const startRun = () => {
    setSession(createProject001RunSession(scenario)); setRun(null); setComparison(null); setReplayStatus('idle'); setRunning(true);
  };
  const resumeRun = () => { if (session && elapsedDays < durationDays) setRunning(true); };
  const verifyReplay = () => {
    if (!run) return;
    const replayed = finalizeProject001Run(advanceProject001RunSession(createProject001RunSession(scenario), durationDays));
    setReplayStatus(replayed.finalStateHash === run.finalStateHash && JSON.stringify(replayed.dailyChecksums) === JSON.stringify(run.dailyChecksums) ? 'verified' : 'mismatch');
  };
  const compareStorageRevision = () => {
    const baselineRun = run ?? finalizeProject001Run(advanceProject001RunSession(createProject001RunSession(scenario), durationDays));
    const evidenceRefs = baselineRun.finalState.knowledge.failures.find(item => item.type === 'WATER_SHORTAGE')?.evidenceRefs ?? [];
    const nextCapacity = Math.max(tankCapacityL + 5000, tankCapacityL * 2);
    const revision = createScenarioRevision(scenario, {
      id: 'project-001-ui-rev-002', createdAt: '2026-08-31T00:00:03.000Z', reason: 'Test increased storage against water-shortage evidence.', evidenceRefs,
      changes: [
        { path: 'water.tankCapacityL', operation: 'replace', previousValue: tankCapacityL, nextValue: nextCapacity },
        { path: 'water.initialTankLevelL', operation: 'replace', previousValue: scenario.water.initialTankLevelL, nextValue: Math.min(nextCapacity, scenario.water.initialTankLevelL + 3500) },
      ],
    });
    setRun(baselineRun);
    setComparison(compareProject001Scenarios(scenario, revision));
  };

  return (
    <section className="bg-[#171410] border border-[#3d3323] rounded-xl p-3 space-y-3" aria-label="Project 001 simulation">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="text-[10px] uppercase tracking-[0.18em] text-[#c9a227] font-mono">Project 001 · deterministic property simulator</div><div className="text-xs text-[#b8ab8e] mt-1">BUILD → MEASURE → FAIL → LEARN → IMPROVE → RERUN</div></div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={startRun} className="px-3 py-1.5 rounded bg-[#c9a227] text-[#171410] text-xs font-mono font-bold cursor-pointer">Run scenario</button>
          <button onClick={() => setRunning(false)} disabled={!running} className="px-3 py-1.5 rounded bg-[#332c22] disabled:opacity-40 text-xs font-mono cursor-pointer">Pause</button>
          <button onClick={resumeRun} disabled={running || !session || elapsedDays >= durationDays} className="px-3 py-1.5 rounded bg-[#332c22] disabled:opacity-40 text-xs font-mono cursor-pointer">Resume</button>
          <button onClick={verifyReplay} disabled={!run} className="px-3 py-1.5 rounded bg-[#24352a] text-[#81c784] disabled:opacity-40 text-xs font-mono cursor-pointer">Replay verify</button>
          <button onClick={compareStorageRevision} className="px-3 py-1.5 rounded bg-[#1d3140] text-[#64b5f6] text-xs font-mono cursor-pointer">Create revision + compare</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] font-mono">
        <label className="space-y-1"><span className="text-[#8a7f68]">Seed</span><input value={seed} onChange={event => setSeed(event.target.value)} className="w-full bg-[#211c16] border border-[#3d3323] rounded px-2 py-1 text-[#f4ecd8]" /></label>
        <label className="space-y-1"><span className="text-[#8a7f68]">Duration</span><select value={durationDays} onChange={event => setDurationDays(Number(event.target.value))} className="w-full bg-[#211c16] border border-[#3d3323] rounded px-2 py-1"><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>365 days</option></select></label>
        <label className="space-y-1"><span className="text-[#8a7f68]">Household</span><input type="number" min={1} max={12} value={members} onChange={event => setMembers(Number(event.target.value))} className="w-full bg-[#211c16] border border-[#3d3323] rounded px-2 py-1" /></label>
        <label className="space-y-1"><span className="text-[#8a7f68]">Tank capacity L</span><input type="number" min={0} step={1000} value={tankCapacityL} onChange={event => setTankCapacityL(Number(event.target.value))} className="w-full bg-[#211c16] border border-[#3d3323] rounded px-2 py-1" /></label>
        <div className="space-y-1"><span className="text-[#8a7f68]">Land constraint</span><div className="bg-[#211c16] border border-[#3d3323] rounded px-2 py-1">{displayState.land.occupiedAreaM2.toFixed(0)} / {displayState.land.usableAreaM2.toFixed(0)} m²</div></div>
      </div>

      <div className="h-1.5 rounded-full bg-[#2a241b] overflow-hidden"><div className="h-full bg-[#c9a227] transition-all" style={{ width: `${progress * 100}%` }} /></div>
      <div className="text-[10px] font-mono text-[#8a7f68] flex justify-between"><span>{running ? 'RUNNING' : run ? 'COMPLETE' : session ? 'PAUSED' : 'READY'} · Day {elapsedDays}/{durationDays}</span><span>{replayStatus === 'verified' ? '✓ Replay checksum verified' : replayStatus === 'mismatch' ? '⚠ Replay mismatch' : scenario.simulationVersion}</span></div>

      <ProgressionPanel
        scenarioId={scenario.id}
        currentDay={session?.state.day ?? scenario.startDay}
        season={displayState.climate.season}
        availableAreaM2={displayState.land.remainingUsableAreaM2}
        levelInputs={progressionInputs}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-[#1f1b15] border border-[#332c22] rounded-lg p-2.5 space-y-2">
          <div className="text-[10px] uppercase text-[#8a7f68] font-mono">System status</div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <span>Food inventory</span><b className="text-right">{Math.round(displayState.household.foodInventoryCalories).toLocaleString()} kcal</b>
            <span>Tank / pond</span><b className="text-right text-[#64b5f6]">{Math.round(displayState.water.tankLevelL)} / {Math.round(displayState.water.pondLevelL)} L</b>
            <span>Battery / grid</span><b className="text-right text-[#e9c46a]">{displayState.energy.batteryKwh.toFixed(1)} / {displayState.energy.gridImportedTodayKwh.toFixed(1)} kWh</b>
            <span>Mature compost</span><b className="text-right text-[#81c784]">{displayState.nutrients.matureCompostUnits.toFixed(1)} units</b>
            <span>Labour</span><b className="text-right">{displayState.household.labourRequiredTodayMinutes}/{displayState.household.labourAvailableTodayMinutes} min</b>
            <span>Cash</span><b className="text-right text-[#c9a227]">₹{Math.round(displayState.economy.cashBalance).toLocaleString()}</b>
          </div>
        </div>

        <div className="bg-[#1f1b15] border border-[#332c22] rounded-lg p-2.5 space-y-1.5">
          <div className="text-[10px] uppercase text-[#8a7f68] font-mono">Self-sufficiency · separate denominators</div>
          {metricRows.map(row => { const value = metrics[row.key]; const visual = row.inverse ? Math.min(1, value) : Math.min(1, Math.max(0, value)); return <div key={row.key} className="grid grid-cols-[100px_1fr_52px] items-center gap-2 text-[10px] font-mono"><span>{row.label}</span><div className="h-1.5 bg-[#2a241b] rounded overflow-hidden"><div className={`h-full ${row.inverse && value > 1 ? 'bg-[#e57373]' : 'bg-[#81c784]'}`} style={{ width: `${visual * 100}%` }} /></div><b className="text-right">{percent(value)}</b></div>; })}
        </div>

        <div className="bg-[#1f1b15] border border-[#332c22] rounded-lg p-2.5 space-y-2">
          <div className="text-[10px] uppercase text-[#8a7f68] font-mono">Evidence</div>
          <div className="text-[10px] font-mono space-y-1 break-all">
            <div><span className="text-[#8a7f68]">Scenario:</span> {session?.scenarioHash ?? 'not run'}</div><div><span className="text-[#8a7f68]">Seed:</span> {seed}</div><div><span className="text-[#8a7f68]">Revision:</span> {scenario.revision.id}</div><div><span className="text-[#8a7f68]">Final checksum:</span> <b className="text-[#81c784]">{run?.finalStateHash ?? 'pending'}</b></div><div><span className="text-[#8a7f68]">Daily checksums:</span> {run?.dailyChecksums.length ?? session?.dailyChecksums.length ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-[#1f1b15] border border-[#332c22] rounded-lg p-2.5 max-h-48 overflow-y-auto"><div className="text-[10px] uppercase text-[#8a7f68] font-mono mb-2">Events / failures</div>{recentEvents.map(event => <button key={event.id} onClick={() => { const failure = failures.find(item => item.evidenceRefs.includes(event.id)); if (failure) setSelectedFailureId(failure.id); }} className="w-full text-left text-[10px] font-mono px-2 py-1 border-b border-[#2a241b] hover:bg-[#2a241b] cursor-pointer"><span className="text-[#8a7f68]">D{event.day}</span> {event.type}</button>)}</div>
        <div className="bg-[#1f1b15] border border-[#332c22] rounded-lg p-2.5 text-[10px] font-mono space-y-1.5"><div className="uppercase text-[#8a7f68]">Why?</div>{selectedFailure ? <><select value={selectedFailure.id} onChange={event => setSelectedFailureId(event.target.value)} className="w-full bg-[#211c16] border border-[#3d3323] rounded p-1"><option value={selectedFailure.id}>{selectedFailure.type} · Day {selectedFailure.tick}</option>{failures.slice(-30).filter(item => item.id !== selectedFailure.id).map(item => <option key={item.id} value={item.id}>{item.type} · Day {item.tick}</option>)}</select><div className="text-[#e57373]">{selectedFailure.immediateCause}</div>{selectedFailure.upstreamCauses.map(cause => <div key={cause}>← {cause}</div>)}<div className="text-[#81c784]">Change: {selectedFailure.recovery}</div></> : <div className="text-[#8a7f68]">Run the scenario to expose causal failures.</div>}</div>
        <div className="bg-[#1f1b15] border border-[#332c22] rounded-lg p-2.5 text-[10px] font-mono space-y-1.5"><div className="uppercase text-[#8a7f68]">Experiment · baseline vs revision</div>{comparison ? <><div>Shared seed: <b>{comparison.sharedSeed}</b></div><div>Tank: {comparison.baseline.scenario.water.tankCapacityL.toLocaleString()} → {comparison.intervention.scenario.water.tankCapacityL.toLocaleString()} L</div><div>Water failures: {comparison.baseline.failureSummary.WATER_SHORTAGE ?? 0} → <b className="text-[#81c784]">{comparison.intervention.failureSummary.WATER_SHORTAGE ?? 0}</b></div><div>Food coverage Δ: <b>{percent(comparison.metricDelta.foodSelfSufficiency)}</b></div><div>Evidence: {comparison.intervention.scenario.revision.evidenceRefs.length} baseline refs</div></> : <div className="text-[#8a7f68]">Create a storage revision to rerun the same weather sequence and measure the difference.</div>}</div>
      </div>
    </section>
  );
}
