const path = require('path');
const fs = require('fs');
const kafkaService = require('./kafkaService');

// Load corridor geometries
let corridors = [];
try {
  const routesPath = path.resolve(__dirname, '../../../simulator/routes.json');
  if (fs.existsSync(routesPath)) {
    const raw = fs.readFileSync(routesPath, 'utf8');
    corridors = JSON.parse(raw).corridors;
  }
} catch (e) {
  // Fallback default corridor if path fails
  corridors = [
    {
      id: "TN-CORR-01",
      name: "Hosur - Krishnagiri - Salem",
      highway: "NH 44",
      stops: ["Hosur", "Krishnagiri", "Dharmapuri", "Salem"],
      coordinates: [[77.8253, 12.7409], [78.2144, 12.5186], [78.1593, 12.1211], [78.1460, 11.6643]]
    }
  ];
}

function calculateBearing(coord1, coord2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const lon1 = toRad(coord1[0]);
  const lat1 = toRad(coord1[1]);
  const lon2 = toRad(coord2[0]);
  const lat2 = toRad(coord2[1]);

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let brng = toDeg(Math.atan2(y, x));
  return Math.round(((brng + 360) % 360) * 10) / 10;
}

class LiveFleetStream {
  constructor() {
    this.fleetMap = new Map();
    this.totalBuses = 1000;
    this.isRunning = false;
    this.intervalId = null;
    this.initFleet();
  }

  initFleet() {
    const rtoCodes = ['TN-29', 'TN-30', 'TN-33', 'TN-34', 'TN-37', 'TN-38', 'TN-01', 'TN-45'];
    for (let i = 0; i < this.totalBuses; i++) {
      const corridor = corridors[i % corridors.length];
      const rto = rtoCodes[i % rtoCodes.length];
      const busId = `${rto}-N-${1000 + i}`;
      const totalPts = corridor.coordinates.length;

      this.fleetMap.set(busId, {
        bus_id: busId,
        operator: 'TNSTC',
        route_id: corridor.id,
        route_name: corridor.name,
        highway: corridor.highway,
        corridorIndex: i % corridors.length,
        currentSegment: Math.floor(Math.random() * (totalPts - 1)),
        segmentProgress: Math.random(),
        direction: Math.random() > 0.5 ? 1 : -1,
        speed_kmh: 45 + Math.random() * 30,
        bearing: 0,
        occupancy_pct: Math.floor(25 + Math.random() * 70),
        fuel_level_pct: Math.round((40 + Math.random() * 55) * 10) / 10,
        engine_temp_c: Math.round((82 + Math.random() * 9) * 10) / 10,
        driver_id: `DRV-${1000 + (i % 250)}`,
        status: 'ON_TIME',
        next_stop: corridor.stops[0],
        longitude: corridor.coordinates[0][0],
        latitude: corridor.coordinates[0][1],
        timestamp: new Date().toISOString()
      });
    }
  }

  start(broadcastCallback) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`🚀 [LiveFleetStream] Active real-time engine running for ${this.totalBuses} vehicles.`);

    // Tick every 1 second (sub-second feel with 2s vehicle refresh rate)
    this.intervalId = setInterval(() => {
      const now = new Date().toISOString();
      const updates = [];

      for (const [busId, bus] of this.fleetMap.entries()) {
        const corridor = corridors[bus.corridorIndex];
        const coords = corridor.coordinates;
        const totalPts = coords.length;

        // Advance along segment
        const speedFactor = (bus.speed_kmh / 65) * 0.035;
        bus.segmentProgress += speedFactor;

        if (bus.segmentProgress >= 1.0) {
          bus.segmentProgress = 0.0;
          if (bus.direction === 1) {
            if (bus.currentSegment < totalPts - 2) {
              bus.currentSegment++;
            } else {
              bus.direction = -1;
            }
          } else {
            if (bus.currentSegment > 0) {
              bus.currentSegment--;
            } else {
              bus.direction = 1;
            }
          }
        }

        const c1 = coords[bus.currentSegment];
        const c2 = coords[bus.currentSegment + 1];

        let lon, lat, bearing;
        if (bus.direction === 1) {
          lon = c1[0] + (c2[0] - c1[0]) * bus.segmentProgress;
          lat = c1[1] + (c2[1] - c1[1]) * bus.segmentProgress;
          bearing = calculateBearing(c1, c2);
          const stopIdx = Math.min(corridor.stops.length - 1, bus.currentSegment + 1);
          bus.next_stop = corridor.stops[stopIdx];
        } else {
          lon = c2[0] + (c1[0] - c2[0]) * bus.segmentProgress;
          lat = c2[1] + (c1[1] - c2[1]) * bus.segmentProgress;
          bearing = calculateBearing(c2, c1);
          const stopIdx = Math.max(0, bus.currentSegment);
          bus.next_stop = corridor.stops[stopIdx];
        }

        // Add subtle GPS jitter
        const jitter = (Math.random() - 0.5) * 0.00015;
        bus.longitude = Math.round((lon + jitter) * 1000000) / 1000000;
        bus.latitude = Math.round((lat + jitter) * 1000000) / 1000000;
        bus.bearing = bearing;
        bus.speed_kmh = Math.round(Math.max(20, Math.min(78, bus.speed_kmh + (Math.random() - 0.5) * 4)) * 10) / 10;
        bus.engine_temp_c = Math.round(Math.max(80, Math.min(96, bus.engine_temp_c + (Math.random() - 0.5) * 0.2)) * 10) / 10;
        bus.timestamp = now;

        if (bus.speed_kmh < 28) {
          bus.status = 'CONGESTED';
        } else if (Math.random() < 0.02) {
          bus.status = 'DELAYED';
        } else {
          bus.status = 'ON_TIME';
        }

        updates.push(bus);
      }

      // Also trigger Kafka pipeline event handler for caching
      if (broadcastCallback) {
        broadcastCallback(updates);
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  getAllBuses() {
    return Array.from(this.fleetMap.values());
  }

  getBusById(id) {
    return this.fleetMap.get(id) || null;
  }

  getCorridors() {
    return corridors;
  }
}

module.exports = new LiveFleetStream();
