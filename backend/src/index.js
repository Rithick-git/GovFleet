const http = require('http');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const redisService = require('./services/redisService');
const mongoService = require('./services/mongoService');
const kafkaService = require('./services/kafkaService');
const mqttBridge = require('./services/mqttBridge');
const websocketServer = require('./services/websocketServer');
const liveFleetStream = require('./services/liveFleetStream');

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------------------
// REST API Endpoints
// -----------------------------------------------------------------------------

// System Health & Pipeline Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {
      mqtt: mqttBridge.isConnected ? 'CONNECTED' : 'DISCONNECTED',
      kafka: kafkaService.isConnected ? 'CONNECTED' : 'STANDALONE_FALLBACK',
      redis: redisService.isConnected ? 'CONNECTED' : 'STANDALONE_CACHE',
      mongodb: mongoService.isConnected ? 'CONNECTED' : 'STANDALONE_BUFFER'
    },
    fleet: {
      activeBuses: liveFleetStream.totalBuses,
      connectedWebSockets: websocketServer.clients.size
    }
  });
});

// Corridors & Road Network
app.get('/api/routes', (req, res) => {
  res.json({
    corridors: liveFleetStream.getCorridors()
  });
});

// All Active Vehicles
app.get('/api/buses', (req, res) => {
  const { route_id, status } = req.query;
  let buses = liveFleetStream.getAllBuses();

  if (route_id) {
    buses = buses.filter(b => b.route_id === route_id);
  }
  if (status) {
    buses = buses.filter(b => b.status === status);
  }

  res.json({
    count: buses.length,
    buses
  });
});

// Single Bus Inspector
app.get('/api/buses/:id', async (req, res) => {
  const { id } = req.params;
  
  // Try Redis first
  let bus = await redisService.getVehicle(id);
  if (!bus || Object.keys(bus).length === 0) {
    bus = liveFleetStream.getBusById(id);
  }

  if (!bus) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  res.json({ bus });
});

// Fleet Telemetry Aggregates & KPIs
app.get('/api/stats', (req, res) => {
  const buses = liveFleetStream.getAllBuses();
  const total = buses.length;
  if (total === 0) {
    return res.json({ total: 0 });
  }

  let totalSpeed = 0;
  let onTimeCount = 0;
  let congestedCount = 0;
  let delayedCount = 0;
  let totalOccupancy = 0;

  for (const b of buses) {
    totalSpeed += b.speed_kmh;
    totalOccupancy += b.occupancy_pct;
    if (b.status === 'ON_TIME') onTimeCount++;
    else if (b.status === 'CONGESTED') congestedCount++;
    else if (b.status === 'DELAYED') delayedCount++;
  }

  res.json({
    totalBuses: total,
    avgSpeedKmh: Math.round((totalSpeed / total) * 10) / 10,
    avgOccupancyPct: Math.round(totalOccupancy / total),
    onTimeRatePct: Math.round((onTimeCount / total) * 1000) / 10,
    congestedCount,
    delayedCount,
    activeRoutesCount: liveFleetStream.getCorridors().length,
    timestamp: new Date().toISOString()
  });
});

// -----------------------------------------------------------------------------
// Server Bootstrap & Orchestration
// -----------------------------------------------------------------------------
const server = http.createServer(app);

// Mount WebSockets
websocketServer.initialize(server);

// Start Pipeline Services
async function bootstrap() {
  console.log('🚀 [GovFleet Ingestion Engine] Initializing distributed services...');
  
  // 1. Connect Redis
  await redisService.connect();

  // 2. Connect MongoDB
  await mongoService.connect();

  // 3. Connect Kafka
  await kafkaService.connect();

  // 4. Connect MQTT Broker
  mqttBridge.connect();

  // 5. Connect Kafka consumer to WebSocket broadcaster
  kafkaService.registerListener((busData) => {
    // When individual messages arrive from Kafka, they can be streamed
  });

  // 6. Start Live Fleet Telemetry Stream
  liveFleetStream.start((batch) => {
    // Broadcast GeoJSON update to all connected frontend clients
    websocketServer.broadcastFleetUpdates(batch);

    // Cache to Redis
    for (let i = 0; i < Math.min(batch.length, 50); i++) {
      redisService.updateVehicle(batch[i]);
    }
  });

  // Listen
  server.listen(config.port, () => {
    console.log(`=============================================================`);
    console.log(`🚍 GovFleet Backend API & WebSocket Server`);
    console.log(`🌐 HTTP API      : http://localhost:${config.port}`);
    console.log(`🔌 WebSocket Stream: ws://localhost:${config.port}/ws`);
    console.log(`=============================================================`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
});
