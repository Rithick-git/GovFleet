import React from 'react';
import { Gauge, Clock, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';

export default function FleetStats({ stats }) {
  const {
    total = 1000,
    avgSpeed = 58.4,
    onTimeRate = 94.2,
    congested = 38,
    delayed = 20
  } = stats || {};

  return (
    <div className="absolute top-24 left-4 z-10 flex flex-col gap-2.5 w-64 pointer-events-auto">
      {/* KPI 1: Active Vehicles */}
      <div className="glass-panel p-3 rounded-2xl flex items-center justify-between border-l-4 border-l-cyan-400">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Fleet</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold text-white font-mono">{total.toLocaleString()}</span>
            <span className="text-[11px] text-cyan-400 font-medium">Buses Live</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Zap className="w-5 h-5" />
        </div>
      </div>

      {/* KPI 2: On-Time Rate */}
      <div className="glass-panel p-3 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-400">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">On-Time Reliability</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold text-emerald-400 font-mono">{onTimeRate}%</span>
            <span className="text-[11px] text-slate-400">SLA Met</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* KPI 3: Fleet Average Speed */}
      <div className="glass-panel p-3 rounded-2xl flex items-center justify-between border-l-4 border-l-blue-400">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Corridor Velocity</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold text-white font-mono">{avgSpeed}</span>
            <span className="text-[11px] text-slate-400">km/h avg</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Gauge className="w-5 h-5" />
        </div>
      </div>

      {/* KPI 4: Congestion Alerts */}
      <div className="glass-panel p-3 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-400">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Congestion Alerts</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold text-amber-400 font-mono">{congested}</span>
            <span className="text-[11px] text-slate-400">vehicles slow</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
