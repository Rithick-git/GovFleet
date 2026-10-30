import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { TAMIL_NADU_CORRIDORS } from '../services/localSimulator';

// High-contrast, dark-mode vector tile map style (Carto Dark Matter)
const DARK_MATTER_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Tamil Nadu Center
const TN_CENTER = [78.6569, 11.1271];
const TN_ZOOM = 7.3;

export default function MapView({
  geojsonData,
  selectedBus,
  onSelectBus,
  mapRefOut
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DARK_MATTER_STYLE,
      center: TN_CENTER,
      zoom: TN_ZOOM,
      minZoom: 5.5,
      maxZoom: 16,
      pitch: 25, // Subtle 3D perspective
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-left');

    map.on('load', () => {
      // -----------------------------------------------------------------------
      // 1. Add Tamil Nadu Highway Corridors Lines
      // -----------------------------------------------------------------------
      const corridorsGeoJSON = {
        type: 'FeatureCollection',
        features: TAMIL_NADU_CORRIDORS.map(c => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: c.coordinates
          },
          properties: {
            id: c.id,
            name: c.name,
            highway: c.highway,
            color: c.color
          }
        }))
      };

      map.addSource('corridors-source', {
        type: 'geojson',
        data: corridorsGeoJSON
      });

      // Corridor Route Glow Layer
      map.addLayer({
        id: 'corridor-glow',
        type: 'line',
        source: 'corridors-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 6,
          'line-opacity': 0.25,
          'line-blur': 4
        }
      });

      // Corridor Route Core Line
      map.addLayer({
        id: 'corridor-core',
        type: 'line',
        source: 'corridors-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.5,
          'line-opacity': 0.85
        }
      });

      // -----------------------------------------------------------------------
      // 2. High-Performance GeoJSON Bus Layer (WebGL Canvas - Zero DOM Lag)
      // -----------------------------------------------------------------------
      map.addSource('buses-source', {
        type: 'geojson',
        data: geojsonData || { type: 'FeatureCollection', features: [] }
      });

      // Bus Outer Glow Halo
      map.addLayer({
        id: 'buses-halo',
        type: 'circle',
        source: 'buses-source',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            6, 5,
            8, 8,
            12, 14
          ],
          'circle-color': [
            'match',
            ['get', 'status'],
            'ON_TIME', '#10b981',
            'CONGESTED', '#f59e0b',
            'DELAYED', '#ef4444',
            '#06b6d4'
          ],
          'circle-opacity': 0.35,
          'circle-blur': 0.5
        }
      });

      // Bus Core Dot
      map.addLayer({
        id: 'buses-core',
        type: 'circle',
        source: 'buses-source',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            6, 2.8,
            8, 4.5,
            12, 7.5
          ],
          'circle-color': [
            'match',
            ['get', 'status'],
            'ON_TIME', '#34d399',
            'CONGESTED', '#fbbf24',
            'DELAYED', '#f87171',
            '#22d3ee'
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#0f172a'
        }
      });

      // Interactive Click on Bus
      map.on('click', 'buses-core', (e) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          onSelectBus(props);
        }
      });

      // Hover Pointer Cursor
      map.on('mouseenter', 'buses-core', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'buses-core', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapInstanceRef.current = map;
    if (mapRefOut) {
      mapRefOut.current = map;
    }

    return () => {
      map.remove();
    };
  }, []);

  // Update GeoJSON Source on Real-Time Streaming Updates
  useEffect(() => {
    if (!mapInstanceRef.current || !geojsonData) return;
    const map = mapInstanceRef.current;
    const source = map.getSource('buses-source');
    if (source) {
      source.setData(geojsonData);
    }
  }, [geojsonData]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
