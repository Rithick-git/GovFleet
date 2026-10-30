import React from 'react';
import { Bus, Radio, Search, Filter, ShieldCheck, Activity } from 'lucide-react';
import { TAMIL_NADU_CORRIDORS } from '../services/localSimulator';

export default function Header({
  wsStatus,
  searchQuery,
  setSearchQuery,
  selectedRoute,
  setSelectedRoute,
  totalVehicles,
  onResetView
}) {
  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex flex-col md:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl glass-panel">
      {/* Brand & State Transit Label */}
      <div className="flex items-center gap-3.5">
        <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
          <Bus className="w-6 h-6 text-white" />
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              GovFleet <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono font-medium">TN-TRANSIT</span>
            </h1>
            <span className="text-xs text-slate-400 hidden sm:inline">| Tamil Nadu State Transport</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-medium">Live Telemetry</span>
            <span>•</span>
            <span className="font-mono">{totalVehicles.toLocaleString()} Concurrent Buses</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex items-center gap-2.5 w-full md:w-auto">
        {/* Search Input */}
        <div className="relative flex-1 md:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Plate (e.g. TN-29)"
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Route Filter Dropdown */}
        <div className="relative flex-1 md:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="w-full pl-9 pr-7 py-1.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors appearance-none cursor-pointer truncate"
          >
            <option value="">All Tamil Nadu Corridors</option>
            {TAMIL_NADU_CORRIDORS.map(c => (
              <option key={c.id} value={c.id}>
                {c.highway} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Recenter Map Button */}
        <button
          onClick={onResetView}
          className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Center Map</span>
        </button>
      </div>
    </header>
  );
}
