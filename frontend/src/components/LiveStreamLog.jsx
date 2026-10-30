import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Radio } from 'lucide-react';

export default function LiveStreamLog({ logs }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute bottom-4 right-4 z-10 w-96 max-w-[calc(100vw-32px)] glass-panel rounded-2xl overflow-hidden pointer-events-auto border border-slate-700/60 shadow-2xl transition-all">
      {/* Header bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 cursor-pointer border-b border-slate-800 hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Telemetry Stream Inspector</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono text-[11px] text-cyan-300">500 msgs/s</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {/* Log Body */}
      {isOpen && (
        <div className="p-2.5 max-h-36 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-slate-950/80">
          {logs && logs.length > 0 ? (
            logs.slice(0, 6).map((log, index) => (
              <div key={index} className="flex items-center justify-between text-slate-300 gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-500">{log.time}</span>
                  <span className="text-cyan-400 font-bold">{log.bus_id}</span>
                  <span className="text-slate-400 truncate">{log.route_name?.split('-')[0]}</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className={log.speed_kmh < 30 ? 'text-amber-400' : 'text-emerald-400'}>
                    {log.speed_kmh} km/h
                  </span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                    QoS 1
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-slate-500 text-center py-2 italic text-xs">
              Subscribing to MQTT topic: govfleet/vehicles/+/telemetry...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
