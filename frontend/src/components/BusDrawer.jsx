import React from 'react';
import { 
  X, 
  Navigation, 
  Users, 
  Fuel, 
  Thermometer, 
  Compass, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Crosshair
} from 'lucide-react';

export default function BusDrawer({ bus, onClose, onFocus }) {
  if (!bus) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'ON_TIME':
        return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      case 'CONGESTED':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'DELAYED':
        return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
      default:
        return 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';
    }
  };

  return (
    <div className="absolute top-24 right-4 z-20 w-80 max-h-[calc(100vh-120px)] overflow-y-auto glass-panel p-5 rounded-3xl border border-cyan-500/30 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start justify-between pb-3.5 border-b border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {bus.operator || 'TNSTC'}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(bus.status)}`}>
              {bus.status?.replace('_', ' ')}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white font-mono mt-1 tracking-tight">
            {bus.bus_id}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 font-medium">{bus.route_name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Speed & Corridor Card */}
      <div className="my-4 p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/60 border border-slate-700/60">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Velocity</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-black text-cyan-400 font-mono tracking-tight">{bus.speed_kmh}</span>
              <span className="text-xs text-slate-400 font-medium">km/h</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Heading</span>
            <div className="flex items-center justify-end gap-1 mt-1 text-slate-200 font-mono text-sm">
              <Compass 
                className="w-4 h-4 text-cyan-400 transition-transform duration-500" 
                style={{ transform: `rotate(${bus.bearing || 0}deg)` }}
              />
              <span>{Math.round(bus.bearing || 0)}°</span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <span className="text-slate-400">Corridor:</span>
          <span className="font-semibold text-white">{bus.highway}</span>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* Passenger Occupancy */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Occupancy</span>
          </div>
          <p className="text-lg font-bold text-white font-mono mt-1">{bus.occupancy_pct}%</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full ${bus.occupancy_pct > 85 ? 'bg-amber-400' : 'bg-blue-400'}`}
              style={{ width: `${bus.occupancy_pct}%` }}
            />
          </div>
        </div>

        {/* Fuel / Battery */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Fuel className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fuel / Range</span>
          </div>
          <p className="text-lg font-bold text-white font-mono mt-1">{bus.fuel_level_pct}%</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div 
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${bus.fuel_level_pct}%` }}
            />
          </div>
        </div>

        {/* Engine Temperature */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
            <span>Engine Temp</span>
          </div>
          <p className="text-lg font-bold text-white font-mono mt-1">{bus.engine_temp_c} °C</p>
          <span className="text-[10px] text-emerald-400 font-medium">Optimal Band</span>
        </div>

        {/* Driver ID */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Navigation className="w-3.5 h-3.5 text-purple-400" />
            <span>Driver Unit</span>
          </div>
          <p className="text-sm font-bold text-white font-mono mt-1.5 truncate">{bus.driver_id || 'DRV-1044'}</p>
          <span className="text-[10px] text-slate-400">Duty Verified</span>
        </div>
      </div>

      {/* Next Stop Waypoint */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>Approaching Stop</span>
        </div>
        <p className="text-sm font-bold text-white mt-1">{bus.next_stop || 'Bypass Junction'}</p>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
          <span>GPS Fix:</span>
          <span>{bus.latitude?.toFixed(4)}° N, {bus.longitude?.toFixed(4)}° E</span>
        </div>
      </div>

      {/* Action Button: Recenter on Bus */}
      <button
        onClick={() => onFocus(bus)}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
      >
        <Crosshair className="w-4 h-4" />
        <span>Track & Center Vehicle</span>
      </button>
    </div>
  );
}
