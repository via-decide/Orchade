/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ByproductStack,
  CompostBin,
  ContaminationRecord,
  GreywaterFlow,
  ByproductLedger,
} from './public';

export interface WasteEconomyState {
  byproducts: ByproductStack[];
  compostBins: CompostBin[];
  contaminations: ContaminationRecord[];
  greywaterFlows: GreywaterFlow[];
  ledger: ByproductLedger;
}

export const initialWasteEconomyState: WasteEconomyState = {
  byproducts: [],
  compostBins: [],
  contaminations: [],
  greywaterFlows: [],
  ledger: {
    totalProducedLbs: 0,
    totalGreywaterGallons: 0,
    totalReusedLbs: 0,
    totalGreywaterReusedGallons: 0,
    totalWastedLbs: 0,
    closedLoopPercent: 0,
  },
};
