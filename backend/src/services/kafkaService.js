const { Kafka, logLevel } = require('kafkajs');
const config = require('../config');
const redisService = require('./redisService');
const mongoService = require('./mongoService');

class KafkaService {
  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      logLevel: logLevel.NOTHING,
      retry: {
        initialRetryTime: 300,
        retries: 3
      }
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
    this.isConnected = false;
    this.onMessageCallback = null;
  }

  async connect() {
    try {
      await this.producer.connect();
      console.log(`⚡ [Kafka] Producer connected to brokers: ${config.kafka.brokers.join(', ')}`);

      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: config.kafka.topic,
        fromBeginning: false
      });
      console.log(`⚡ [Kafka] Consumer subscribed to topic: ${config.kafka.topic}`);

      this.isConnected = true;
      this.startConsuming();
    } catch (err) {
      this.isConnected = false;
      console.warn('⚠️ [Kafka] Brokers unavailable. Operating with local direct event pipeline.');
    }
  }

  async sendBusLocation(busData) {
    if (!this.isConnected) {
      // Local event fallback: route directly to Redis & MongoDB & WS
      this.processIncomingBusData(busData);
      return;
    }

    try {
      await this.producer.send({
        topic: config.kafka.topic,
        messages: [
          {
            key: busData.bus_id,
            value: JSON.stringify(busData),
            timestamp: Date.now().toString()
          }
        ]
      });
    } catch (err) {
      console.error('❌ [Kafka Producer Error]:', err.message);
      this.processIncomingBusData(busData);
    }
  }

  async startConsuming() {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const busData = JSON.parse(message.value.toString());
          this.processIncomingBusData(busData);
        } catch (err) {
          console.error('❌ [Kafka Consumer Parse Error]:', err.message);
        }
      }
    });
  }

  processIncomingBusData(busData) {
    // 1. Update In-Memory Redis Cache & Spatial Geohash
    redisService.updateVehicle(busData);

    // 2. Queue for historical batch write in MongoDB
    mongoService.enqueue(busData);

    // 3. Trigger WebSocket broadcast hook if registered
    if (this.onMessageCallback) {
      this.onMessageCallback(busData);
    }
  }

  registerListener(callback) {
    this.onMessageCallback = callback;
  }
}

module.exports = new KafkaService();
