const mqtt = require('mqtt');
const config = require('../config');
const kafkaService = require('./kafkaService');

class MqttBridge {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    try {
      this.client = mqtt.connect(config.mqtt.url, {
        reconnectPeriod: 5000,
        connectTimeout: 4000
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log(`📡 [MQTT] Connected to broker: ${config.mqtt.url}`);
        
        // Subscribe to all vehicle telemetry topics
        this.client.subscribe(config.mqtt.topic, { qos: 1 }, (err) => {
          if (!err) {
            console.log(`📡 [MQTT] Subscribed to topic pattern: ${config.mqtt.topic}`);
          } else {
            console.error('❌ [MQTT] Subscription error:', err.message);
          }
        });
      });

      this.client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          // Push into Kafka event pipeline
          kafkaService.sendBusLocation(payload);
        } catch (err) {
          console.error('❌ [MQTT] JSON parse error on topic', topic, err.message);
        }
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        // Suppress repeated logs if broker is not running locally
      });
    } catch (err) {
      console.warn('⚠️ [MQTT] Ingestion bridge started without active broker.');
    }
  }
}

module.exports = new MqttBridge();
