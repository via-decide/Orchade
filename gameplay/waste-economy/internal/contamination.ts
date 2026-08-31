/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContaminationRecord } from '../public';

const RAW_MANURE_SAFETY_DAYS = 120;
const CONTAMINATED_QUALITY_MULTIPLIER = 0.6;
const CONTAMINATED_PRICE_MULTIPLIER = 0.5;

export function applyRawManure(
  zoneId: number,
  massLbs: number,
  currentDay: number,
): ContaminationRecord {
  return {
    zoneId,
    appliedOnDay: currentDay,
    safeHarvestDay: currentDay + RAW_MANURE_SAFETY_DAYS,
    massAppliedLbs: massLbs,
  };
}

export function isHarvestContaminated(
  zoneId: number,
  currentDay: number,
  contaminations: ContaminationRecord[],
): boolean {
  return contaminations.some(
    c => c.zoneId === zoneId && currentDay < c.safeHarvestDay,
  );
}

export function getContaminationPenalty(
  zoneId: number,
  currentDay: number,
  contaminations: ContaminationRecord[],
): { qualityMultiplier: number; priceMultiplier: number; daysUntilSafe: number } | null {
  const active = contaminations.filter(
    c => c.zoneId === zoneId && currentDay < c.safeHarvestDay,
  );

  if (active.length === 0) return null;

  const latestSafe = Math.max(...active.map(c => c.safeHarvestDay));
  return {
    qualityMultiplier: CONTAMINATED_QUALITY_MULTIPLIER,
    priceMultiplier: CONTAMINATED_PRICE_MULTIPLIER,
    daysUntilSafe: latestSafe - currentDay,
  };
}

export function cleanExpiredContaminations(
  contaminations: ContaminationRecord[],
  currentDay: number,
): ContaminationRecord[] {
  return contaminations.filter(c => currentDay < c.safeHarvestDay);
}
