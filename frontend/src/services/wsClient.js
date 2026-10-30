/**
 * GovFleet WebSocket & Ingestion Client
 * Streams 1,000 concurrent vehicle coordinates at sub-second intervals.
 */

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.url = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:5000/ws';
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.isConnected = false;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyStatus('CONNECTED');
        console.log('⚡ [GovFleet WS] Connected to live vehicle telemetry stream');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'FLEET_GEOJSON_UPDATE') {
            this.notifyData(data);
          } else if (data.type === 'SYSTEM_STATUS') {
            this.notifyStatus(data.payload.status);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyStatus('DISCONNECTED');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this.isConnected = false;
        this.notifyStatus('ERROR');
        this.ws?.close();
      };
    } catch (err) {
      this.isConnected = false;
      this.notifyStatus('ERROR');
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribeStatus(callback) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  notifyData(data) {
    for (const listener of this.listeners) {
      listener(data);
    }
  }

  notifyStatus(status) {
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}

export const wsClient = new WebSocketClient();
