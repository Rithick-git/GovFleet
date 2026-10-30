const WebSocket = require('ws');
const redisService = require('./redisService');

class WebSocketServerManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.clients.add(ws);
      console.log(`🔌 [WebSocket] Client connected. Total active clients: ${this.clients.size}`);

      // Send greeting & protocol metadata
      ws.send(JSON.stringify({
        type: 'SYSTEM_STATUS',
        payload: {
          status: 'CONNECTED',
          message: 'Connected to GovFleet Real-Time Telemetry Stream',
          serverTime: new Date().toISOString()
        }
      }));

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          }
        } catch (e) {}
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`🔌 [WebSocket] Client disconnected. Total active clients: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.error('⚠️ [WebSocket Client Error]:', err.message);
        this.clients.delete(ws);
      });
    });

    // Keep-alive heartbeat interval every 30s
    setInterval(() => {
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.ping();
        }
      }
    }, 30000);
  }

  /**
   * Broadcasts batch updates or full GeoJSON FeatureCollection to connected frontends
   */
  broadcastFleetUpdates(fleetList) {
    if (this.clients.size === 0) return;

    // Convert into optimized GeoJSON format to prevent front-end parse thrashing
    const geoJsonPayload = {
      type: 'FLEET_GEOJSON_UPDATE',
      count: fleetList.length,
      timestamp: new Date().toISOString(),
      geojson: {
        type: 'FeatureCollection',
        features: fleetList.map((bus) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [bus.longitude, bus.latitude]
          },
          properties: {
            bus_id: bus.bus_id,
            operator: bus.operator,
            route_id: bus.route_id,
            route_name: bus.route_name,
            highway: bus.highway,
            speed_kmh: bus.speed_kmh,
            bearing: bus.bearing,
            occupancy_pct: bus.occupancy_pct,
            fuel_level_pct: bus.fuel_level_pct,
            engine_temp_c: bus.engine_temp_c,
            driver_id: bus.driver_id,
            next_stop: bus.next_stop,
            status: bus.status,
            timestamp: bus.timestamp
          }
        }))
      }
    };

    const messageString = JSON.stringify(geoJsonPayload);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    }
  }
}

module.exports = new WebSocketServerManager();
