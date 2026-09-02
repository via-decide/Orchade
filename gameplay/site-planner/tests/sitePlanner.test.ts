import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { checksum } from '../../../src/engine/replay/checksum';
import { runProject001Scenario } from '../../../src/simulation/homestead/projectRun';
import { validateHomesteadScenario } from '../../../src/simulation/homestead/scenario';
import { applySitePlacementIntent } from '../internal/placement';
import { validateSiteProject } from '../internal/validation';
import { compileSiteProjectToHomesteadScenario } from '../internal/compiler';
import {
  computePolygonAreaM2,
  describeSiteArea,
  estimateUnionFootprintAreaM2,
  isPolygonSelfIntersecting,
  moduleFootprintPolygon,
  polygonFullyInside,
  siteAreaM2,
  validateSiteGeometry,
} from '../internal/geometry';
import { createSiteModule } from '../internal/factory';
import { siteHash } from '../internal/hash';
import { createBlankSiteProject, createRectangularSiteGeometry } from '../state';
import { createReference10GunthaSiteProject, REFERENCE_10_GUNTHA_AREA_M2 } from '../fixtures/reference10Guntha';
import type { SitePlacementIntent, SiteProject } from '../public';

function freshReferenceProject(): SiteProject {
  return createReference10GunthaSiteProject();
}

function smallBlankProject(widthM = 10, depthM = 10): SiteProject {
  return createBlankSiteProject({ geometry: createRectangularSiteGeometry({ siteGeometryId: 'test-geometry', widthM, depthM }) });
}

export function runSitePlannerTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error('  ❌ ' + message); }
  };

  // 1. 10-guntha conversion fixture resolves to expected canonical area.
  {
    assert(Math.abs(REFERENCE_10_GUNTHA_AREA_M2 - 1011.714) < 0.01, '1. 10 guntha resolves to ~1011.714 m²');
    const display = describeSiteArea(REFERENCE_10_GUNTHA_AREA_M2);
    assert(Math.abs(display.guntha - 10) < 1e-6, '1. Canonical area round-trips to 10 guntha');
    assert(Math.abs(display.acre - 0.25) < 1e-6, '1. Canonical area round-trips to 0.25 acre');
  }

  // 2. Polygon area calculation is deterministic.
  {
    const polygon = [{ xM: 0, yM: 0 }, { xM: 20, yM: 0 }, { xM: 20, yM: 10 }, { xM: 0, yM: 10 }];
    const areaA = computePolygonAreaM2(polygon);
    const areaB = computePolygonAreaM2(polygon);
    assert(areaA === areaB && areaA === 200, '2. Rectangle polygon area is deterministic and correct');
    const irregular = [{ xM: 0, yM: 0 }, { xM: 20, yM: 0 }, { xM: 21, yM: 49 }, { xM: 0, yM: 51 }];
    assert(computePolygonAreaM2(irregular) === computePolygonAreaM2(irregular), '2. Irregular polygon area is deterministic');
  }

  // 3. Self-intersecting parcel is rejected.
  {
    const bowtie = [{ xM: 0, yM: 0 }, { xM: 10, yM: 10 }, { xM: 10, yM: 0 }, { xM: 0, yM: 10 }];
    assert(isPolygonSelfIntersecting(bowtie), '3. Bowtie polygon is detected as self-intersecting');
    let threw = false;
    try {
      validateSiteGeometry({
        siteGeometryId: 'bowtie', schemaVersion: 1, revision: 'r1', measurementSystem: 'metric',
        boundaryPolygon: bowtie, northBearingDegrees: 0, accessPoints: [], excludedZones: [], existingStructures: [],
      });
    } catch { threw = true; }
    assert(threw, '3. Self-intersecting geometry is rejected');
  }

  // 4. Module outside parcel is rejected.
  {
    const project = smallBlankProject(10, 10);
    const intent: SitePlacementIntent = { type: 'PLACE_MODULE', moduleId: 'far-shed', moduleType: 'SHED', anchor: { xM: 8, yM: 8 }, widthM: 4, depthM: 4 };
    const result = applySitePlacementIntent(project, intent);
    assert(!result.accepted, '4. Module extending past the boundary is rejected');
    assert(result.failures.some(f => f.type === 'OUTSIDE_BOUNDARY'), '4. Rejection reports OUTSIDE_BOUNDARY');
    assert(result.project.modules.length === 0, '4. Rejected placement leaves project unchanged');
  }

  // 5. Incompatible module overlap is rejected.
  {
    let project = smallBlankProject(10, 10);
    project = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'shed-a', moduleType: 'SHED', anchor: { xM: 1, yM: 1 }, widthM: 3, depthM: 3 }).project;
    const result = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'shed-b', moduleType: 'SHED', anchor: { xM: 2, yM: 2 }, widthM: 3, depthM: 3 });
    assert(!result.accepted, '5. Overlapping incompatible modules are rejected');
    assert(result.failures.some(f => f.type === 'MODULE_OVERLAP'), '5. Rejection reports MODULE_OVERLAP');
  }

  // 6. Valid roof-mounted solar overlap is accepted when explicitly supported.
  {
    let project = smallBlankProject(10, 10);
    project = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'house', moduleType: 'RESIDENCE', anchor: { xM: 1, yM: 1 }, widthM: 6, depthM: 5 }).project;
    const result = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'roof-solar', moduleType: 'SOLAR_ARRAY', anchor: { xM: 2, yM: 2 }, widthM: 2, depthM: 2 });
    assert(result.accepted, '6. Solar mounted on a residence roof is accepted');
    assert(!result.failures.some(f => f.type === 'MODULE_OVERLAP'), '6. No MODULE_OVERLAP for an explicitly compatible pair');
  }

  // 7. Moving a module creates deterministic site state.
  {
    const base = (() => {
      let project = smallBlankProject(10, 10);
      project = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'shed', moduleType: 'SHED', anchor: { xM: 1, yM: 1 }, widthM: 2, depthM: 2 }).project;
      return project;
    })();
    const moveIntent: SitePlacementIntent = { type: 'MOVE_MODULE', moduleId: 'shed', anchor: { xM: 4, yM: 4 } };
    const resultA = applySitePlacementIntent(base, moveIntent);
    const resultB = applySitePlacementIntent(base, moveIntent);
    assert(resultA.accepted && resultB.accepted, '7. Move intent is accepted deterministically');
    assert(siteHash(resultA.project) === siteHash(resultB.project), '7. Identical move produces identical site hash');
  }

  // 8. Same placement sequence produces same site hash.
  {
    const sequence: SitePlacementIntent[] = [
      { type: 'PLACE_MODULE', moduleId: 'house', moduleType: 'RESIDENCE', anchor: { xM: 1, yM: 1 }, widthM: 5, depthM: 4 },
      { type: 'PLACE_MODULE', moduleId: 'beds', moduleType: 'VEGETABLE_BED', anchor: { xM: 7, yM: 1 }, widthM: 2, depthM: 2 },
      { type: 'ROTATE_MODULE', moduleId: 'beds', rotationDegrees: 90 },
    ];
    const run = () => sequence.reduce((project, intent) => applySitePlacementIntent(project, intent).project, smallBlankProject(10, 10));
    assert(siteHash(run()) === siteHash(run()), '8. Same placement sequence yields the same site hash');
  }

  // 9. Same site revision compiles to same homestead scenario hash.
  {
    const compileOnce = () => compileSiteProjectToHomesteadScenario(freshReferenceProject()).scenario;
    assert(checksum(compileOnce()) === checksum(compileOnce()), '9. Same site revision compiles to the same scenario hash');
  }

  // 10. Same compiled scenario + seed produces same replay/final checksum.
  {
    const scenario = compileSiteProjectToHomesteadScenario(freshReferenceProject()).scenario;
    const runA = runProject001Scenario(scenario);
    const runB = runProject001Scenario(scenario);
    assert(runA.finalStateHash === runB.finalStateHash, '10. Same compiled scenario + seed produces the same final checksum');
  }

  // 11. Missing water connection produces RESOURCE_CONNECTION_MISSING.
  {
    let project = smallBlankProject(20, 20);
    project = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'unwatered-bed', moduleType: 'VEGETABLE_BED', anchor: { xM: 1, yM: 1 }, widthM: 3, depthM: 3 }).project;
    const failures = validateSiteProject(project);
    assert(failures.some(f => f.type === 'RESOURCE_CONNECTION_MISSING' && f.moduleId === 'unwatered-bed'), '11. Unconnected vegetable bed reports RESOURCE_CONNECTION_MISSING');
  }

  // 12. Module with no compatible access point produces ACCESS_BLOCKED.
  {
    const geometry = createRectangularSiteGeometry({
      siteGeometryId: 'pedestrian-only-gate', widthM: 15, depthM: 15,
      accessPoints: [{ id: 'foot-gate', type: 'pedestrian', position: { xM: 7.5, yM: 0 } }],
    });
    let project = createBlankSiteProject({ geometry });
    project = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'workshop', moduleType: 'WORKSHOP', anchor: { xM: 5, yM: 5 }, widthM: 4, depthM: 3 }).project;
    const failures = validateSiteProject(project);
    assert(failures.some(f => f.type === 'ACCESS_BLOCKED' && f.moduleId === 'workshop'), '12. Workshop with no compatible access point reports ACCESS_BLOCKED');
  }

  // 13. Total placed footprint cannot exceed parcel.
  {
    const project = smallBlankProject(10, 10);
    const oversized = createSiteModule({ moduleId: 'giant-field', moduleType: 'STAPLE_FIELD', anchor: { xM: 0, yM: 0 }, widthM: 15, depthM: 15 });
    const failures = validateSiteProject({ ...project, modules: [oversized] });
    assert(failures.some(f => f.type === 'INSUFFICIENT_AREA'), '13. Footprint larger than the parcel reports INSUFFICIENT_AREA');
  }

  // 14. Removing livestock changes feed/manure/labour flows.
  {
    const withChickens = compileSiteProjectToHomesteadScenario(freshReferenceProject()).scenario;
    assert(withChickens.livestock.length === 1, '14. Reference fixture compiles with one livestock entry');
    const withoutChickensProject = applySitePlacementIntent(freshReferenceProject(), { type: 'REMOVE_MODULE', moduleId: 'chicken-coop' }).project;
    const withoutChickens = compileSiteProjectToHomesteadScenario(withoutChickensProject).scenario;
    assert(withoutChickens.livestock.length === 0, '14. Removing the chicken coop removes livestock from the compiled scenario');
    assert(withoutChickens.economy.dailyPropertyOperatingCost < withChickens.economy.dailyPropertyOperatingCost, '14. Removing livestock reduces daily operating cost');
  }

  // 15. Increasing tank capacity changes only intended scenario fields.
  {
    const scenarioA = compileSiteProjectToHomesteadScenario(freshReferenceProject()).scenario;
    const resizedProject = applySitePlacementIntent(freshReferenceProject(), { type: 'RESIZE_MODULE', moduleId: 'water-tank', capacity: 15000 }).project;
    const scenarioB = compileSiteProjectToHomesteadScenario(resizedProject).scenario;
    assert(scenarioB.water.tankCapacityL === 15000, '15. Resizing the tank updates tankCapacityL');
    assert(checksum(scenarioA.foodProducers) === checksum(scenarioB.foodProducers), '15. Tank resize leaves foodProducers unchanged');
    assert(checksum(scenarioA.livestock) === checksum(scenarioB.livestock), '15. Tank resize leaves livestock unchanged');
    assert(checksum(scenarioA.energy) === checksum(scenarioB.energy), '15. Tank resize leaves energy unchanged');
    assert(checksum(scenarioA.land) === checksum(scenarioB.land), '15. Tank resize leaves land placements unchanged');
  }

  // 16. Applying an intent never mutates the original project.
  {
    const project = smallBlankProject(10, 10);
    const before = checksum(project);
    applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'shed', moduleType: 'SHED', anchor: { xM: 1, yM: 1 }, widthM: 2, depthM: 2 });
    assert(checksum(project) === before, '16. Applying a placement intent never mutates the input project');
  }

  // 17. Structurally malformed intents fail closed.
  {
    const project = smallBlankProject(10, 10);
    const result = applySitePlacementIntent(project, { type: 'MOVE_MODULE', moduleId: 'does-not-exist', anchor: { xM: 1, yM: 1 } });
    assert(!result.accepted, '17. Moving a nonexistent module fails closed');
    assert(result.failures.some(f => f.type === 'INVALID_INTENT'), '17. Failure is reported as INVALID_INTENT');
  }

  // 18. Empty-site constructor works.
  {
    const project = smallBlankProject(31.8, 31.8);
    const compiled = compileSiteProjectToHomesteadScenario(project);
    assert(compiled.scenario.foodProducers.length === 0 && compiled.scenario.livestock.length === 0, '18. Blank site compiles with no producers or livestock');
    let threw = false;
    try { validateHomesteadScenario(compiled.scenario); } catch { threw = true; }
    assert(!threw, '18. Blank site compiled scenario passes canonical validation');
  }

  // 19. 365-day 10-guntha reference run completes.
  {
    const scenario = compileSiteProjectToHomesteadScenario(freshReferenceProject()).scenario;
    let threw = false;
    let run: ReturnType<typeof runProject001Scenario> | undefined;
    try { run = runProject001Scenario(scenario); } catch { threw = true; }
    assert(!threw && !!run, '19. 365-day reference run completes without throwing');
    assert(!!run && run.dailyChecksums.length === 365, '19. Reference run advances exactly 365 days');
  }

  // 20. Failures contain causal evidence.
  {
    let project = smallBlankProject(20, 20);
    project = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'unwatered-bed', moduleType: 'VEGETABLE_BED', anchor: { xM: 1, yM: 1 }, widthM: 3, depthM: 3 }).project;
    const failure = validateSiteProject(project).find(f => f.type === 'RESOURCE_CONNECTION_MISSING');
    assert(!!failure && !!failure.reason && failure.reason.length > 0, '20. Failure carries a human-readable reason');
    assert(!!failure && !!failure.moduleId, '20. Failure identifies the affected module');
    assert(!!failure && typeof failure.evidence === 'object', '20. Failure carries structured evidence');
  }

  // 21. No Math.random exists anywhere in the Site Planner runtime path.
  {
    const moduleDir = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
    const runtimeDirs = ['internal', 'fixtures'].map(name => path.join(moduleDir, name));
    const runtimeFiles = [path.join(moduleDir, 'public.ts'), path.join(moduleDir, 'state.ts'), path.join(moduleDir, 'api.ts')];
    const offenders: string[] = [];
    const scanFile = (fullPath: string) => {
      if (fs.readFileSync(fullPath, 'utf8').includes('Math' + '.random')) offenders.push(fullPath);
    };
    const scanDir = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) { scanDir(fullPath); continue; }
        if (entry.name.endsWith('.ts')) scanFile(fullPath);
      }
    };
    runtimeDirs.forEach(scanDir);
    runtimeFiles.filter(fs.existsSync).forEach(scanFile);
    assert(offenders.length === 0, `21. No Math.random in the site-planner runtime path (found in: ${offenders.join(', ')})`);
  }

  // 23. Same physical site with different revisions keeps distinct hashes and receipts.
  {
    const projectA = freshReferenceProject();
    const projectB: SiteProject = { ...projectA, revision: { ...projectA.revision, revisionId: 'orchade-site-001-rev-b' } };
    assert(siteHash(projectA) !== siteHash(projectB), '23. Different revision ids produce different site hashes');
    const scenarioA = compileSiteProjectToHomesteadScenario(projectA).scenario;
    const scenarioB = compileSiteProjectToHomesteadScenario(projectB).scenario;
    assert(scenarioA.id !== scenarioB.id, '23. Different revisions compile to different scenario ids');
  }

  // 24. Land-use totals reconcile against canonical parcel area.
  {
    const project = freshReferenceProject();
    const scenario = compileSiteProjectToHomesteadScenario(project).scenario;
    const totalAreaM2 = siteAreaM2(project.geometry);
    assert(Math.abs(scenario.land.totalAreaM2 - totalAreaM2) < 1e-6, '24. Compiled total area matches canonical polygon area');
    assert(Math.abs(scenario.land.usableAreaM2 + scenario.land.reservedAreaM2 - scenario.land.totalAreaM2) < 1e-6, '24. Usable + reserved area reconciles exactly against total area');
  }

  // 25. Disabled modules consume and produce nothing.
  {
    const project = freshReferenceProject();
    const disabledProject = applySitePlacementIntent(project, { type: 'DISABLE_MODULE', moduleId: 'chicken-coop' }).project;
    const scenario = compileSiteProjectToHomesteadScenario(disabledProject).scenario;
    assert(scenario.livestock.length === 0, '25. Disabled chicken coop contributes no livestock');
    assert(scenario.land.placements.some(p => p.id === 'chicken-coop'), '25. Disabled module still occupies its land placement');
  }

  // 26. Placement colliding with an existing structure is rejected.
  {
    const geometry = createRectangularSiteGeometry({
      siteGeometryId: 'with-existing-structure',
      widthM: 10,
      depthM: 10,
      existingStructures: [{ id: 'old-well', label: 'Existing well', polygon: [
        { xM: 4, yM: 4 }, { xM: 6, yM: 4 }, { xM: 6, yM: 6 }, { xM: 4, yM: 6 },
      ] }],
    });
    const project = createBlankSiteProject({ geometry });
    const result = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'shed', moduleType: 'SHED', anchor: { xM: 3, yM: 3 }, widthM: 3, depthM: 3 });
    assert(!result.accepted, '26. Module colliding with an existing structure is rejected');
    assert(result.failures.some(f => f.type === 'EXISTING_STRUCTURE_COLLISION'), '26. Rejection reports EXISTING_STRUCTURE_COLLISION');

    const clearResult = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'shed-clear', moduleType: 'SHED', anchor: { xM: 0, yM: 0 }, widthM: 2, depthM: 2 });
    assert(clearResult.accepted, '26. Module clear of the existing structure is accepted');
  }

  // 27. polygonFullyInside rejects a footprint edge crossing a concave boundary indentation, but accepts one flush against a straight boundary edge.
  {
    // A "C"-shaped (concave) 10x10 boundary with a notch cut out of its right side.
    const concaveBoundary = [
      { xM: 0, yM: 0 }, { xM: 10, yM: 0 }, { xM: 10, yM: 4 },
      { xM: 5, yM: 4 }, { xM: 5, yM: 6 }, { xM: 10, yM: 6 },
      { xM: 10, yM: 10 }, { xM: 0, yM: 10 },
    ];
    // All four corners lie inside the boundary, but the footprint spans the
    // notch: its right edge (running through the notch's open air at x=8)
    // crosses two boundary edges of the indentation.
    const spanningNotch = [{ xM: 2, yM: 3 }, { xM: 8, yM: 3 }, { xM: 8, yM: 7 }, { xM: 2, yM: 7 }];
    assert(!polygonFullyInside(spanningNotch, concaveBoundary), '27. Footprint spanning a concave boundary notch is rejected even though all corners are inside');

    // A footprint built flush against the boundary's outer edge (collinear
    // overlap, not a crossing) must still be accepted.
    const flushAgainstEdge = [{ xM: 0, yM: 0 }, { xM: 2, yM: 0 }, { xM: 2, yM: 2 }, { xM: 0, yM: 2 }];
    assert(polygonFullyInside(flushAgainstEdge, concaveBoundary), '27. Footprint edge running flush along a straight boundary edge is accepted, not treated as a crossing');
  }

  // 28. A module placed flush against the parcel boundary is accepted (regression for the concave-boundary fix above).
  {
    const project = smallBlankProject(10, 10);
    const result = applySitePlacementIntent(project, { type: 'PLACE_MODULE', moduleId: 'edge-shed', moduleType: 'SHED', anchor: { xM: 0, yM: 0 }, widthM: 2, depthM: 2 });
    assert(result.accepted, '28. A module flush against the parcel boundary is accepted');
  }

  // Geometry helper sanity: union-area estimate does not double-count legal overlaps.
  {
    const residence = createSiteModule({ moduleId: 'house', moduleType: 'RESIDENCE', anchor: { xM: 0, yM: 0 }, widthM: 10, depthM: 8 });
    const solar = createSiteModule({ moduleId: 'roof-solar', moduleType: 'SOLAR_ARRAY', anchor: { xM: 1, yM: 1 }, widthM: 2, depthM: 2 });
    const footprints = [moduleFootprintPolygon(residence.geometry, 0), moduleFootprintPolygon(solar.geometry, 0)];
    const union = estimateUnionFootprintAreaM2(footprints);
    assert(Math.abs(union - 80) < 2, 'Union footprint area does not double-count a fully-contained overlap');
  }

  return { passed, failed, errors };
}
