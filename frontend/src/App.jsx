import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './components/Header';
import FleetStats from './components/FleetStats';
import MapView from './components/MapView';
import BusDrawer from './components/BusDrawer';
import LiveStreamLog from './components/LiveStreamLog';
import { wsClient } from './services/wsClient';
import { createInitialFleet, toGeoJSON } from './services/localSimulator';

export default function App() {
  const [fleetList, setFleetList] = useState(() => createInitialFleet(1000));
  const [wsStatus, setWsStatus] = useState('CONNECTING');
  const [selectedBus, setSelectedBus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [streamLogs, setStreamLogs] = useState([]);
  const mapRef = useRef(null);

  // Initialize WebSocket connection and fallback simulator
  useEffect(() => {
    // 1. Connect to backend WebSocket
    wsClient.connect();

    const unsubStatus = wsClient.subscribeStatus((status) => {
      setWsStatus(status);
    });

    const unsubData = wsClient.subscribe((payload) => {
      if (payload && payload.geojson && payload.geojson.features) {
        const buses = payload.geojson.features.map(f => f.properties);
        setFleetList(buses);

        // Add to stream log
        if (buses.length > 0) {
          const sample = buses[Math.floor(Math.random() * buses.length)];
          const nowStr = new Date().toTimeString().split(' ')[0];
          setStreamLogs(prev => [
            {
              time: nowStr,
              bus_id: sample.bus_id,
              route_name: sample.route_name,
              speed_kmh: sample.speed_kmh,
              status: sample.status
            },
            ...prev.slice(0, 15)
          ]);
        }
      }
    });

    // 2. Smooth local movement loop in case backend WebSocket is disconnected or buffering
    let localInterval = null;
    localInterval = setInterval(() => {
      setFleetList((prevFleet) => {
        const updated = prevFleet.map(bus => {
          // Progress simulation
          const speedFactor = (bus.speed_kmh / 70) * 0.0003;
          let progress = (bus.segmentProgress || 0) + speedFactor;
          let dir = bus.direction || 1;

          if (progress >= 1.0) {
            progress = 0.0;
            dir = dir === 1 ? -1 : 1;
          }

          // Small jitter
          const jitter = (Math.random() - 0.5) * 0.00012;
          const newLon = bus.longitude + (dir * speedFactor * 0.4) + jitter;
          const newLat = bus.latitude + (dir * speedFactor * 0.4) + jitter;

          return {
            ...bus,
            segmentProgress: progress,
            direction: dir,
            longitude: Math.round(newLon * 1000000) / 1000000,
            latitude: Math.round(newLat * 1000000) / 1000000,
            speed_kmh: Math.round(Math.max(18, Math.min(78, bus.speed_kmh + (Math.random() - 0.5) * 2)) * 10) / 10
          };
        });

        // Add telemetry packet to ticker
        const randIdx = Math.floor(Math.random() * updated.length);
        const randBus = updated[randIdx];
        const now = new Date().toTimeString().split(' ')[0];
        setStreamLogs(prev => [
          {
            time: now,
            bus_id: randBus.bus_id,
            route_name: randBus.route_name,
            speed_kmh: randBus.speed_kmh,
            status: randBus.status
          },
          ...prev.slice(0, 15)
        ]);

        return updated;
      });
    }, 1500);

    return () => {
      unsubStatus();
      unsubData();
      if (localInterval) clearInterval(localInterval);
    };
  }, []);

  // Filter fleet based on user search query or corridor filter
  const filteredFleet = useMemo(() => {
    let result = fleetList;

    if (selectedRoute) {
      result = result.filter(b => b.route_id === selectedRoute);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => 
        b.bus_id?.toLowerCase().includes(q) ||
        b.route_name?.toLowerCase().includes(q) ||
        b.highway?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [fleetList, selectedRoute, searchQuery]);

  // Convert to GeoJSON FeatureCollection
  const geojsonData = useMemo(() => {
    return toGeoJSON(filteredFleet);
  }, [filteredFleet]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = filteredFleet.length;
    if (total === 0) return { total: 0, avgSpeed: 0, onTimeRate: 100, congested: 0 };

    let totalSpeed = 0;
    let onTime = 0;
    let congested = 0;

    for (const b of filteredFleet) {
      totalSpeed += b.speed_kmh || 55;
      if (b.status === 'ON_TIME') onTime++;
      else if (b.status === 'CONGESTED') congested++;
    }

    return {
      total,
      avgSpeed: Math.round((totalSpeed / total) * 10) / 10,
      onTimeRate: Math.round((onTime / total) * 1000) / 10,
      congested
    };
  }, [filteredFleet]);

  // Fly to selected bus on map
  const handleFocusBus = (bus) => {
    if (mapRef.current && bus.longitude && bus.latitude) {
      mapRef.current.flyTo({
        center: [bus.longitude, bus.latitude],
        zoom: 12.5,
        speed: 1.2,
        curve: 1.4,
        pitch: 45
      });
    }
  };

  // Recenter map on Tamil Nadu
  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [78.6569, 11.1271],
        zoom: 7.3,
        speed: 1.2,
        pitch: 25
      });
      setSelectedBus(null);
      setSearchQuery('');
      setSelectedRoute('');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080d1a]">
      {/* 1. Header Bar */}
      <Header
        wsStatus={wsStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedRoute={selectedRoute}
        setSelectedRoute={setSelectedRoute}
        totalVehicles={filteredFleet.length}
        onResetView={handleResetView}
      />

      {/* 2. Real-Time Stats HUD */}
      <FleetStats stats={stats} />

      {/* 3. Fullscreen Map Canvas */}
      <MapView
        geojsonData={geojsonData}
        selectedBus={selectedBus}
        onSelectBus={(bus) => {
          setSelectedBus(bus);
          handleFocusBus(bus);
        }}
        mapRefOut={mapRef}
      />

      {/* 4. Selected Vehicle Telemetry Drawer */}
      <BusDrawer
        bus={selectedBus}
        onClose={() => setSelectedBus(null)}
        onFocus={handleFocusBus}
      />

      {/* 5. Live Ingestion Stream Log */}
      <LiveStreamLog logs={streamLogs} />
    </div>
  );
}
