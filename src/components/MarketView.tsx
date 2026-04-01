import { useEffect, useState } from 'react';
import { subscribeSeedPrices } from '../services/gameService';

type SeedPrices = {
  fern_seed: number;
  citrus_seed: number;
  moonleaf_seed: number;
};

const DEFAULT_PRICES: SeedPrices = {
  fern_seed: 22,
  citrus_seed: 48,
  moonleaf_seed: 95,
};

export default function MarketView() {
  const [prices, setPrices] = useState<SeedPrices>(DEFAULT_PRICES);

  useEffect(() => {
    const unsubscribe = subscribeSeedPrices(setPrices);
    return () => unsubscribe();
  }, []);

  return (
    <section className="space-y-3">
      <h2 className="font-bold text-sm px-1">Seed Market</h2>
      {Object.entries(prices).map(([seedId, price]) => (
        <article
          key={seedId}
          className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] p-4 flex items-center justify-between"
        >
          <div>
            <p className="font-bold text-sm">{seedId.replace('_', ' ')}</p>
            <p className="text-[10px] text-text-secondary">Global harvest indexed</p>
          </div>
          <p className="text-sm font-bold text-leaf-green">{price}⬡</p>
        </article>
      ))}
    </section>
  );
}
