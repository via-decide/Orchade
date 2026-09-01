import type { SiteModuleDefinition, SiteModuleType, SitePoint2D } from '../public';
import { moduleTemplate } from './moduleCatalog';

export interface CreateSiteModuleOptions {
  moduleId: string;
  moduleType: SiteModuleType;
  anchor: SitePoint2D;
  widthM?: number;
  depthM?: number;
  rotationDegrees?: number;
  capacity?: number;
}

/** Builds a SiteModuleDefinition from catalog defaults. Pure -- no randomness, no clock. */
export function createSiteModule(options: CreateSiteModuleOptions): SiteModuleDefinition {
  const template = moduleTemplate(options.moduleType);
  const widthM = options.widthM ?? template.defaultWidthM;
  const depthM = options.depthM ?? template.defaultDepthM;
  const capacity = options.capacity ?? template.defaultCapacity;
  return {
    moduleId: options.moduleId,
    moduleType: options.moduleType,
    geometry: { anchor: options.anchor, widthM, depthM },
    rotationDegrees: options.rotationDegrees ?? 0,
    footprintM2: widthM * depthM,
    capacity,
    dependencies: [],
    resourceInputs: template.requiredResourceInputs.map(resourceClass => ({ resourceClass, ratePerDay: 0 })),
    resourceOutputs: template.producesResourceOutputs.map(resourceClass => ({ resourceClass, ratePerDay: 0 })),
    labourProfile: { minutesPerDay: template.labourMinutesPerDay },
    energyProfile: { consumptionKwhPerDay: template.energyConsumptionKwhPerDay, productionKwhPerDay: template.energyProductionKwhPerDay },
    waterProfile: { consumptionLitresPerDay: template.waterConsumptionLitresPerDay, productionLitresPerDay: template.waterProductionLitresPerDay },
    economicProfile: { capitalCost: template.capitalCost, operatingCostPerDay: template.operatingCostPerDay },
    evidenceLevel: template.evidenceLevel,
    enabled: true,
  };
}
