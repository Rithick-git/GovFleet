// Embedded Tamil Nadu Highway Corridors for Instant High-Speed Client Rendering
export const TAMIL_NADU_CORRIDORS = [
  {
    id: "TN-CORR-01",
    name: "Hosur - Krishnagiri - Dharmapuri - Salem",
    highway: "NH 44",
    color: "#06b6d4",
    stops: ["Hosur Bus Stand", "Krishnagiri Toll", "Dharmapuri Central", "Salem Junction"],
    coordinates: [
      [77.8253, 12.7409], [77.9201, 12.6841], [78.0412, 12.5930], [78.2144, 12.5186],
      [78.1950, 12.3820], [78.1812, 12.2530], [78.1593, 12.1211], [78.1620, 11.9540],
      [78.1510, 11.8100], [78.1460, 11.6643]
    ]
  },
  {
    id: "TN-CORR-02",
    name: "Salem - Sankagiri - Erode - Perundurai",
    highway: "NH 544",
    color: "#10b981",
    stops: ["Salem New Bus Stand", "Magudanchavadi", "Sankagiri Bypass", "Bhavani Cut", "Erode Central", "Perundurai SIPCOT"],
    coordinates: [
      [78.1460, 11.6643], [78.0120, 11.5830], [77.8711, 11.4878], [77.7850, 11.4230],
      [77.7172, 11.3410], [77.6520, 11.3090], [77.5831, 11.2758]
    ]
  },
  {
    id: "TN-CORR-03",
    name: "Erode - Pallipalayam - Tiruchengode - Namakkal",
    highway: "SH 86 / SH 79",
    color: "#f59e0b",
    stops: ["Erode Bus Stand", "Pallipalayam Bridge", "Tiruchengode Arthanareeswarar Cut", "Velur Gate", "Namakkal Bus Terminal"],
    coordinates: [
      [77.7172, 11.3410], [77.7420, 11.3550], [77.8100, 11.3680], [77.8967, 11.3797],
      [77.9800, 11.3200], [78.0700, 11.2650], [78.1670, 11.2189]
    ]
  },
  {
    id: "TN-CORR-04",
    name: "Hosur - Tiruchengode Express Link",
    highway: "NH 44 -> SH 86",
    color: "#ec4899",
    stops: ["Hosur Central", "Krishnagiri Bypass", "Dharmapuri", "Thoppur Ghats", "Omalur", "Sankagiri", "Tiruchengode"],
    coordinates: [
      [77.8253, 12.7409], [78.0412, 12.5930], [78.2144, 12.5186], [78.1593, 12.1211],
      [78.1150, 11.9200], [78.0400, 11.7500], [77.8711, 11.4878], [77.8967, 11.3797]
    ]
  },
  {
    id: "TN-CORR-05",
    name: "Perundurai - Coimbatore Transit Highway",
    highway: "NH 544",
    color: "#8b5cf6",
    stops: ["Perundurai", "Vijayamangalam", "Avinashi", "Karumathampatti", "Hope College", "Gandhipuram Central"],
    coordinates: [
      [77.5831, 11.2758], [77.4600, 11.2300], [77.2680, 11.1920], [77.1700, 11.1080],
      [77.0500, 11.0420], [76.9558, 11.0168]
    ]
  },
  {
    id: "TN-CORR-06",
    name: "Chennai - Villupuram - Trichy Superfast Corridors",
    highway: "NH 38 / NH 45",
    color: "#3b82f6",
    stops: ["Chennai CMBT", "Tambaram", "Chengalpattu", "Tindivanam", "Villupuram", "Perambalur", "Trichy Central"],
    coordinates: [
      [80.2090, 13.0674], [80.1170, 12.9249], [79.9820, 12.6910], [79.6514, 12.2312],
      [79.4862, 11.9401], [78.8800, 11.2330], [78.7047, 10.7905]
    ]
  }
];

function calculateBearing(c1, c2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const toDeg = rad => (rad * 180) / Math.PI;
  const lon1 = toRad(c1[0]);
  const lat1 = toRad(c1[1]);
  const lon2 = toRad(c2[0]);
  const lat2 = toRad(c2[1]);
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let brng = toDeg(Math.atan2(y, x));
  return Math.round(((brng + 360) % 360) * 10) / 10;
}

export function createInitialFleet(total = 1000) {
  const rtoDistricts = ["TN-29", "TN-30", "TN-33", "TN-34", "TN-37", "TN-38", "TN-01", "TN-45"];
  const fleet = [];

  for (let i = 0; i < total; i++) {
    const corridor = TAMIL_NADU_CORRIDORS[i % TAMIL_NADU_CORRIDORS.length];
    const rto = rtoDistricts[i % rtoDistricts.length];
    const busId = `${rto}-N-${1000 + i}`;
    const totalPts = corridor.coordinates.length;
    const currentSegment = Math.floor(Math.random() * (totalPts - 1));
    const segmentProgress = Math.random();
    const c1 = corridor.coordinates[currentSegment];
    const c2 = corridor.coordinates[currentSegment + 1];

    const lon = c1[0] + (c2[0] - c1[0]) * segmentProgress;
    const lat = c1[1] + (c2[1] - c1[1]) * segmentProgress;
    const speed = Math.round((45 + Math.random() * 32) * 10) / 10;

    fleet.push({
      bus_id: busId,
      operator: "TNSTC",
      route_id: corridor.id,
      route_name: corridor.name,
      highway: corridor.highway,
      corridorIndex: i % TAMIL_NADU_CORRIDORS.length,
      currentSegment,
      segmentProgress,
      direction: Math.random() > 0.5 ? 1 : -1,
      speed_kmh: speed,
      bearing: calculateBearing(c1, c2),
      occupancy_pct: Math.floor(30 + Math.random() * 65),
      fuel_level_pct: Math.round((45 + Math.random() * 50) * 10) / 10,
      engine_temp_c: Math.round((82 + Math.random() * 9) * 10) / 10,
      driver_id: `DRV-${1000 + (i % 250)}`,
      next_stop: corridor.stops[Math.min(corridor.stops.length - 1, currentSegment + 1)],
      status: speed < 28 ? "CONGESTED" : Math.random() < 0.03 ? "DELAYED" : "ON_TIME",
      longitude: Math.round(lon * 1000000) / 1000000,
      latitude: Math.round(lat * 1000000) / 1000000,
      timestamp: new Date().toISOString()
    });
  }

  return fleet;
}

export function toGeoJSON(fleet) {
  return {
    type: "FeatureCollection",
    features: fleet.map(bus => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [bus.longitude, bus.latitude]
      },
      properties: { ...bus }
    }))
  };
}
