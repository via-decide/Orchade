import React from 'react';

interface ActivityLogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'bonus' | 'alert';
}

interface PlannerEvidencePanelProps {
  activityLogs: ActivityLogEntry[];
  onOpenReportModal: () => void;
}

export function PlannerEvidencePanel({ activityLogs, onOpenReportModal }: PlannerEvidencePanelProps) {
  return (
    <div className="space-y-3 font-sans text-[#f4ecd8]">
      <div className="bg-[#171410] border border-[#332c22] p-3 rounded-xl flex items-center justify-between">
        <div>
          {/* Not "Evidence" -- this panel only shows the session's own
              activity log (operator/UI events), not accepted observations,
              provenance, or validated evidence records. Renamed per closeout
              review until real evidence integration (ObservationRecord,
              DeviceSource, provenance) is wired into this UI. */}
          <h3 className="text-sm font-bold font-mono text-[#f4ecd8]">Homestead Activity Log</h3>
          <span className="text-[11px] text-[#8a7f68]">Export or print this session's activity log</span>
        </div>
        <button
          onClick={onOpenReportModal}
          className="px-3 py-2 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#b8ab8e] border border-[#332c22] flex items-center gap-1.5 transition-all cursor-pointer"
          style={{ minHeight: '44px' }}
        >
          <span>📋 Open Activity Log</span>
        </button>
      </div>

      <div className="bg-[#171410] border border-[#332c22] p-4 rounded-xl space-y-2">
        <div className="text-xs font-mono font-bold text-[#e9c46a] mb-2 uppercase">Recent Homestead Activity:</div>
        {activityLogs.map(log => (
          <div key={log.id} className="text-xs font-mono flex items-start gap-2 p-1.5 rounded bg-[#1e1913] border border-[#2a241b]">
            <span className="text-[#8a7f68] shrink-0">[{log.time}]</span>
            <span className={log.type === 'bonus' ? 'text-[#81c784]' : log.type === 'alert' ? 'text-[#e57373]' : 'text-[#f4ecd8]'}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
