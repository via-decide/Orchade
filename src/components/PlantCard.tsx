import React from 'react';
import { Plant } from '../types';
import { PLANT_STAGES } from '../constants';
import { Bug, Droplets, Flame, Sprout, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import PlantVisualizer from './PlantVisualizer';

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
  const isBurning = plant.stress > 90;
  const hasPests = plant.pests > 0;

  // Calculate progress within current stage
  const currentThreshold = stage.threshold;
  const nextStage = PLANT_STAGES[plant.stageIndex + 1];
  const nextThreshold = nextStage ? nextStage.threshold : currentThreshold * 2;
  const progress = Math.min(1, Math.max(0, (plant.rootStrength - currentThreshold) / (nextThreshold - currentThreshold)));

  return (
    <button
      onClick={onClick}
      className={`h-48 rounded-xl border-2 p-3 flex flex-col gap-2 transition-all relative overflow-hidden
        ${isSelected ? 'border-leaf-green bg-leaf-green/10' : 'border-bark-brown bg-soil-light hover:border-leaf-green/50'}`}
    >
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Stage {plant.stageIndex}
          </span>
          <span className="text-xs font-bold text-text-primary truncate max-w-[80px]">{stage.name}</span>
        </div>
        <div className="flex gap-1">
          {hasPests && <Bug size={12} className="text-toxic-green animate-pulse" />}
          {isBurning && <Flame size={12} className="text-burn-red animate-bounce" />}
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Soil/Base */}
          <div className="absolute bottom-2 w-16 h-4 bg-soil-dark/40 rounded-[100%] blur-[2px]" />
          
          {/* Plant Icon based on stage */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10"
            style={{ color: stage.color }}
          >
            {plant.stageIndex === 0 && (
              <div className="w-6 h-6 bg-soil-dark rounded-full border-2 border-bark-brown animate-bounce" />
            )}
            {plant.stageIndex === 1 && (
              <Sprout size={40} className="animate-pulse" />
            )}
            {plant.stageIndex >= 2 && (
              <div className="relative">
                <div 
                  className="w-1 h-12 bg-bark-brown rounded-full mx-auto"
                  style={{ height: `${20 + plant.stageIndex * 10}px` }}
                />
                <div 
                  className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full blur-[4px]"
                  style={{ backgroundColor: `${stage.color}40` }}
                />
                <div 
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
              </div>
            )}
          </motion.div>

          {/* Status Effects */}
          {hasPests && (
            <motion.div 
              animate={{ x: [0, 5, -5, 0], y: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute top-0 right-0 text-toxic-green"
            >
              <Bug size={16} />
            </motion.div>
          )}
          {isBurning && (
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute inset-0 bg-burn-red/20 rounded-full blur-xl"
            />
          )}
        </div>
      </div>

      <div className="space-y-1.5 z-10">
        <div className="flex gap-1">
          <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-water-blue transition-all duration-500" 
              style={{ width: `${waterPct}%` }}
            />
          </div>
          <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-mineral-gold transition-all duration-500" 
              style={{ width: `${nutrientPct}%` }}
            />
          </div>
        </div>
        <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden">
          <div 
            className="h-full bg-leaf-green transition-all duration-500" 
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-0 right-0 w-6 h-6 bg-leaf-green flex items-center justify-center rounded-bl-lg">
          <div className="w-1.5 h-1.5 bg-soil-dark rounded-full" />
        </div>
      )}
    </button>
  );
};

export default PlantCard;
