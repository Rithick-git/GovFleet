require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mqtt: {
    url: process.env.MQTT_URL || `mqtt://${process.env.MQTT_BROKER_HOST || 'localhost'}:${process.env.MQTT_BROKER_PORT || 1883}`,
    topic: process.env.MQTT_TOPIC_TELEMETRY || 'govfleet/vehicles/+/telemetry'
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKER || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'govfleet-ingestion-service',
    groupId: process.env.KAFKA_GROUP_ID || 'govfleet-telemetry-consumer-group',
    topic: process.env.KAFKA_TOPIC_LOCATIONS || 'bus-locations'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    geoKey: process.env.REDIS_GEO_KEY || 'govfleet:active_buses:geo',
    hashPrefix: process.env.REDIS_HASH_PREFIX || 'govfleet:bus:'
  },
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/govfleet',
    dbName: process.env.MONGO_DB_NAME || 'govfleet'
  }
};
