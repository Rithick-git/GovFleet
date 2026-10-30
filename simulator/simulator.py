#!/usr/bin/env python3
"""
GovFleet Real-Time IoT Telemetry Simulator
Simulates 1,000 Government Buses operating concurrently across Tamil Nadu highway corridors.
Publishes telemetry to Eclipse Mosquitto MQTT broker every 2 seconds.
"""

import json
import math
import os
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

# Configuration
MQTT_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
TOTAL_BUSES = int(os.getenv("TOTAL_BUSES", 1000))
PUBLISH_INTERVAL_SEC = float(os.getenv("PUBLISH_INTERVAL_SEC", 2.0))
ROUTES_FILE = Path(__file__).parent / "routes.json"

# Load corridor waypoints
with open(ROUTES_FILE, "r") as f:
    ROUTES_DATA = json.load(f)["corridors"]

def calculate_bearing(coord1, coord2):
    """Calculates forward azimuth bearing in degrees between two GPS coordinates."""
    lon1, lat1 = math.radians(coord1[0]), math.radians(coord1[1])
    lon2, lat2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    initial_bearing = math.atan2(y, x)
    initial_bearing = math.degrees(initial_bearing)
    compass_bearing = (initial_bearing + 360) % 360
    return round(compass_bearing, 2)

def interpolate_segment(coord1, coord2, progress):
    """Linear interpolation between two coordinates [lon, lat]"""
    lon = coord1[0] + (coord2[0] - coord1[0]) * progress
    lat = coord1[1] + (coord2[1] - coord1[1]) * progress
    # Add subtle GPS jitter (realistic IoT GPS variance ~ 1-3 meters)
    jitter = random.uniform(-0.0001, 0.0001)
    return round(lon + jitter, 6), round(lat + jitter, 6)

class BusEntity:
    def __init__(self, bus_id, corridor):
        self.bus_id = bus_id
        self.corridor = corridor
        self.coordinates = corridor["coordinates"]
        self.total_waypoints = len(self.coordinates)
        
        # Stagger initial position along the route
        self.current_segment = random.randint(0, self.total_waypoints - 2)
        self.segment_progress = random.uniform(0.0, 0.95)
        self.direction = random.choice([1, -1]) # 1 = forward, -1 = reverse
        
        # Vehicle characteristics
        self.speed = random.uniform(45.0, 75.0)
        self.fuel_level = random.uniform(35.0, 95.0)
        self.engine_temp = random.uniform(82.0, 91.0)
        self.occupancy = random.randint(20, 95)
        self.driver_id = f"DRV-{random.randint(1000, 9999)}"
        self.route_code = f"TNSTC-{self.corridor['id'][-2:]}"
        
    def step(self, delta_time):
        """Advances vehicle along its route trajectory"""
        # Progress rate depends on speed (approximate degree distance per km/h)
        speed_factor = (self.speed / 70.0) * (delta_time / 40.0)
        self.segment_progress += speed_factor
        
        if self.segment_progress >= 1.0:
            self.segment_progress = 0.0
            if self.direction == 1:
                if self.current_segment < self.total_waypoints - 2:
                    self.current_segment += 1
                else:
                    self.direction = -1
            else:
                if self.current_segment > 0:
                    self.current_segment -= 1
                else:
                    self.direction = 1

        # Current coords
        c1 = self.coordinates[self.current_segment]
        c2 = self.coordinates[self.current_segment + 1]
        
        if self.direction == 1:
            curr_coord = interpolate_segment(c1, c2, self.segment_progress)
            bearing = calculate_bearing(c1, c2)
            next_stop_idx = min(len(self.corridor["stops"]) - 1, self.current_segment + 1)
        else:
            curr_coord = interpolate_segment(c2, c1, self.segment_progress)
            bearing = calculate_bearing(c2, c1)
            next_stop_idx = max(0, self.current_segment)

        # Dynamic telemetry variations
        self.speed = max(15.0, min(82.0, self.speed + random.uniform(-2.5, 2.5)))
        self.engine_temp = max(78.0, min(97.0, self.engine_temp + random.uniform(-0.1, 0.15)))
        self.fuel_level = max(5.0, self.fuel_level - 0.002)
        
        status = "ON_TIME"
        if self.speed < 30.0:
            status = "CONGESTED"
        elif random.random() < 0.04:
            status = "DELAYED"
            
        return {
            "bus_id": self.bus_id,
            "operator": "TNSTC",
            "route_id": self.corridor["id"],
            "route_name": self.corridor["name"],
            "highway": self.corridor["highway"],
            "longitude": curr_coord[0],
            "latitude": curr_coord[1],
            "speed_kmh": round(self.speed, 1),
            "bearing": bearing,
            "occupancy_pct": self.occupancy,
            "fuel_level_pct": round(self.fuel_level, 1),
            "engine_temp_c": round(self.engine_temp, 1),
            "driver_id": self.driver_id,
            "next_stop": self.corridor["stops"][next_stop_idx],
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

def initialize_fleet(total_buses=1000):
    """Spawns 1,000 distinct buses distributed across Tamil Nadu highway corridors."""
    fleet = []
    rto_districts = ["TN-29", "TN-30", "TN-33", "TN-34", "TN-37", "TN-38", "TN-01", "TN-45"]
    
    for i in range(total_buses):
        rto = rto_districts[i % len(rto_districts)]
        bus_number = 1000 + i
        bus_id = f"{rto}-N-{bus_number}"
        corridor = ROUTES_DATA[i % len(ROUTES_DATA)]
        fleet.append(BusEntity(bus_id, corridor))
        
    return fleet

def main():
    print(f"============================================================")
    print(f"🚍 GovFleet Telemetry Simulator Starting...")
    print(f"📊 Total Concurrent Buses : {TOTAL_BUSES}")
    print(f"⏱️ Update Cadence          : {PUBLISH_INTERVAL_SEC} seconds")
    print(f"📡 Target MQTT Broker      : mqtt://{MQTT_HOST}:{MQTT_PORT}")
    print(f"============================================================")
    
    fleet = initialize_fleet(TOTAL_BUSES)
    print(f"✅ Generated {len(fleet)} bus entities along Tamil Nadu highway corridors.")

    client = None
    connected = False
    
    if mqtt:
        try:
            client = mqtt.Client(client_id=f"govfleet-sim-{os.getpid()}")
            client.connect(MQTT_HOST, MQTT_PORT, 60)
            client.loop_start()
            connected = True
            print(f"🟢 Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
        except Exception as e:
            print(f"⚠️ MQTT Broker unreachable ({e}). Running in telemetry dry-run / file emission mode.")
    else:
        print("⚠️ paho-mqtt not installed. Operating in dry-run mode.")

    cycle = 0
    try:
        while True:
            cycle += 1
            start_time = time.time()
            published_count = 0

            for bus in fleet:
                payload = bus.step(PUBLISH_INTERVAL_SEC)
                topic = f"govfleet/vehicles/{payload['bus_id']}/telemetry"
                
                if connected and client:
                    client.publish(topic, json.dumps(payload), qos=1)
                published_count += 1

            elapsed = time.time() - start_time
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Cycle #{cycle:04d}: Broadcasted {published_count} vehicle coordinates in {elapsed:.3f}s")
            
            sleep_time = max(0.1, PUBLISH_INTERVAL_SEC - elapsed)
            time.sleep(sleep_time)

    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped by user.")
        if connected and client:
            client.loop_stop()
            client.disconnect()

if __name__ == "__main__":
    main()
