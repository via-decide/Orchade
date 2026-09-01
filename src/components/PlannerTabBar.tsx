import React from 'react';

export type PlannerPrimaryTab = 'plan' | 'operate' | 'system' | 'evidence';

interface PlannerTabBarProps {
  active: PlannerPrimaryTab;
  onChange: (tab: PlannerPrimaryTab) => void;
}

const TABS: Array<{ id: PlannerPrimaryTab; icon: string; label: string }> = [
  { id: 'plan', icon: '🗺', label: 'Plan' },
  { id: 'operate', icon: '🌱', label: 'Operate' },
  { id: 'system', icon: '📊', label: 'System' },
  { id: 'evidence', icon: '📜', label: 'Evidence' },
];

export function PlannerTabBar({ active, onChange }: PlannerTabBarProps) {
  return (
    <div className="orchade-tabs bg-[#171410] border border-[#332c22] rounded-xl p-1 flex gap-1 font-mono">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
          className={`flex-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            active === tab.id
              ? 'bg-[#c9a227] text-[#171410] shadow'
              : 'text-[#b8ab8e] hover:text-white hover:bg-[#262016]'
          }`}
          style={{ minHeight: '44px' }}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
