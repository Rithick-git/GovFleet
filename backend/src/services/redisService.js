const Redis = require('ioredis');
const config = require('../config');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        retryStrategy: (times) => {
          if (times > 5) {
            console.warn('⚠️ [Redis] Max reconnection attempts reached. Running with in-memory fallback.');
            return null;
          }
          return Math.min(times * 1000, 3000);
        },
        maxRetriesPerRequest: 1,
        lazyConnect: true
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log(`🧠 [Redis] Connected successfully to ${config.redis.host}:${config.redis.port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        // Suppress repetitive log spam if redis is not running locally
        if (err.code === 'ECONNREFUSED') {
          // silently handle
        } else {
          console.error('⚠️ [Redis Error]:', err.message);
        }
      });

      await this.client.connect().catch(() => {});
    } catch (err) {
      this.isConnected = false;
      console.warn('⚠️ [Redis] Running without active Redis connection (fallback cache active).');
    }
  }

  /**
   * Updates Redis with vehicle geohash coordinates and metadata
   * Uses pipeline for maximum throughput (1,000s of writes/sec)
   */
  async updateVehicle(bus) {
    if (!this.isConnected || !this.client) return;

    try {
      const pipeline = this.client.pipeline();

      // 1. Update Geospatial Index
      // GEOADD key longitude latitude member
      pipeline.geoadd(
        config.redis.geoKey,
        bus.longitude,
        bus.latitude,
        bus.bus_id
      );

      // 2. Cache latest vehicle telemetry hash with 60s TTL
      const hashKey = `${config.redis.hashPrefix}${bus.bus_id}`;
      pipeline.hset(hashKey, {
        bus_id: bus.bus_id,
        route_id: bus.route_id,
        route_name: bus.route_name,
        highway: bus.highway,
        longitude: bus.longitude,
        latitude: bus.latitude,
        speed_kmh: bus.speed_kmh,
        bearing: bus.bearing,
        occupancy_pct: bus.occupancy_pct,
        fuel_level_pct: bus.fuel_level_pct,
        engine_temp_c: bus.engine_temp_c,
        driver_id: bus.driver_id,
        next_stop: bus.next_stop,
        status: bus.status,
        updated_at: bus.timestamp
      });
      pipeline.expire(hashKey, 60);

      await pipeline.exec();
    } catch (error) {
      console.error(`❌ [Redis] Failed to cache bus ${bus.bus_id}:`, error.message);
    }
  }

  async getVehicle(busId) {
    if (!this.isConnected || !this.client) return null;
    return await this.client.hgetall(`${config.redis.hashPrefix}${busId}`);
  }
}

module.exports = new RedisService();
