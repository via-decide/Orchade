import React from 'react';
import { Plant } from '../types';
import { PLANT_STAGES } from '../constants';
import { Bug, Droplets, Flame, Sprout } from 'lucide-react';

interface PlantCardProps {
  plant: Plant | null;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, index, isSelected, onClick }) => {
  if (!plant) {
    return (
      <button
        onClick={onClick}
        className={`h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all
          ${isSelected ? 'border-leaf-green bg-leaf-green/5' : 'border-bark-brown hover:border-leaf-green/50 hover:bg-white/5'}`}
      >
        <div className="w-10 h-10 rounded-full bg-bark-brown/20 flex items-center justify-center text-text-secondary">
          <Sprout size={20} />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Empty Plot</span>
      </button>
    );
  }

  const stage = PLANT_STAGES[plant.stageIndex];
  const waterPct = (plant.water / stage.maxWater) * 100;
  const nutrientPct = (plant.nutrients / stage.maxNutrients) * 100;

  return (
    <button
      onClick={onClick}
      className={`h-48 rounded-xl border-2 p-4 flex flex-col gap-3 transition-all relative overflow-hidden
        ${isSelected ? 'border-leaf-green bg-leaf-green/10' : 'border-bark-brown bg-soil-light hover:border-leaf-green/50'}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Stage {plant.stageIndex}
          </span>
          <span className="text-sm font-bold text-text-primary">{stage.name}</span>
        </div>
        <div className="flex gap-1">
          {plant.pests > 0 && <Bug size={14} className="text-toxic-green animate-pulse" />}
          {plant.stress > 50 && <Flame size={14} className="text-burn-red animate-bounce" />}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${stage.color}20` }}
        >
          <div 
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
          <div 
            className="h-full bg-water-blue transition-all duration-500" 
            style={{ width: `${waterPct}%` }}
          />
        </div>
        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
          <div 
            className="h-full bg-mineral-gold transition-all duration-500" 
            style={{ width: `${nutrientPct}%` }}
          />
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-0 right-0 w-8 h-8 bg-leaf-green flex items-center justify-center rounded-bl-xl">
          <div className="w-2 h-2 bg-soil-dark rounded-full" />
        </div>
      )}
    </button>
  );
};

export default PlantCard;
