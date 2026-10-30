const { MongoClient } = require('mongodb');
const config = require('../config');

class MongoService {
  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
    this.isConnected = false;
    this.batchQueue = [];
    this.batchInterval = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(config.mongo.uri, {
        serverSelectionTimeoutMS: 2000
      });
      await this.client.connect();
      this.db = this.client.db(config.mongo.dbName);
      this.collection = this.db.collection('vehicle_telemetry_history');
      
      // Create 2dsphere and time index for geospatial historical queries
      await this.collection.createIndex({ location: '2dsphere' });
      await this.collection.createIndex({ bus_id: 1, timestamp: -1 });

      this.isConnected = true;
      console.log(`🍃 [MongoDB] Connected to database: ${config.mongo.dbName}`);

      // Start periodic bulk flush every 5 seconds
      this.batchInterval = setInterval(() => this.flushBatch(), 5000);
    } catch (err) {
      this.isConnected = false;
      console.warn('⚠️ [MongoDB] Running without active MongoDB connection (persisting to in-memory ring buffer).');
    }
  }

  enqueue(telemetry) {
    if (!this.isConnected) return;
    this.batchQueue.push({
      bus_id: telemetry.bus_id,
      route_id: telemetry.route_id,
      speed_kmh: telemetry.speed_kmh,
      bearing: telemetry.bearing,
      location: {
        type: 'Point',
        coordinates: [telemetry.longitude, telemetry.latitude]
      },
      occupancy_pct: telemetry.occupancy_pct,
      fuel_level_pct: telemetry.fuel_level_pct,
      engine_temp_c: telemetry.engine_temp_c,
      status: telemetry.status,
      timestamp: new Date(telemetry.timestamp)
    });

    if (this.batchQueue.length >= 500) {
      this.flushBatch();
    }
  }

  async flushBatch() {
    if (!this.isConnected || this.batchQueue.length === 0) return;
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    try {
      await this.collection.insertMany(batch, { ordered: false });
    } catch (err) {
      console.error('❌ [MongoDB] Bulk insert error:', err.message);
    }
  }
}

module.exports = new MongoService();
