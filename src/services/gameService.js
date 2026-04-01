import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const BASE_PRICES = {
  fern_seed: 22,
  citrus_seed: 48,
  moonleaf_seed: 95,
};

export function subscribeSeedPrices(onUpdate) {
  const ref = doc(db, 'system', 'global_stats');
  return onSnapshot(ref, (snapshot) => {
    const data = snapshot.data() || {};
    const harvestVolume = Number(data.globalHarvestVolume || 0);
    const pressure = Math.min(0.8, harvestVolume / 100000);

    onUpdate({
      fern_seed: Math.round(BASE_PRICES.fern_seed * (1 + pressure * 0.35)),
      citrus_seed: Math.round(BASE_PRICES.citrus_seed * (1 + pressure * 0.45)),
      moonleaf_seed: Math.round(BASE_PRICES.moonleaf_seed * (1 + pressure * 0.6)),
    });
  });
}
