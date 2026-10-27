import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import * as turf from '@turf/turf';
import { MapPin, Trash2 } from 'lucide-react';
import type { SupportedLanguage } from '../services/i18n';
import { TRANSLATIONS } from '../services/i18n';

// Fix Leaflet marker icons in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RoofMapProps {
  lat: number;
  lon: number;
  zoom?: number;
  onRoofAreaChange: (areaSqMeters: number, geoJsonPolygon: any | null) => void;
  lang: SupportedLanguage;
  locationName?: string;
}

export const RoofMap: React.FC<RoofMapProps> = ({
  lat,
  lon,
  zoom = 18,
  onRoofAreaChange,
  lang,
  locationName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  const [measuredArea, setMeasuredArea] = useState<number>(0);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    let isCancelled = false;

    async function setupMap() {
      // Ensure L is attached globally before loading leaflet-draw plugin
      (window as any).L = L;
      await import('leaflet-draw');

      if (isCancelled || !mapContainerRef.current) return;

      // Initialize Leaflet map
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom,
        maxZoom: 20,
        zoomControl: false,
      });
      mapInstanceRef.current = map;

      // Add zoom control on bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // High resolution Esri World Imagery Satellite Tiles
      const esriSatellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics',
          maxNativeZoom: 19,
          maxZoom: 20,
        }
      );

      // Reference labels overlay for street/city names over satellite
      const cartoLabels = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; CartoDB',
          maxZoom: 20,
          subdomains: 'abcd',
          opacity: 0.85,
        }
      );

      esriSatellite.addTo(map);
      cartoLabels.addTo(map);

      // Feature group for user's drawn roof polygon
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      // Configure Leaflet.Draw controls safely
      const DrawControl = (L.Control as any).Draw;
      if (DrawControl) {
        const drawControl = new DrawControl({
          position: 'topleft',
          draw: {
            polygon: {
              allowIntersection: false,
              showArea: true,
              drawError: {
                color: '#ef4444',
                message: '<strong>Error:</strong> Roof polygon edges cannot overlap!',
              },
              shapeOptions: {
                color: '#f59e0b', // Solar Amber
                fillColor: '#fbbf24',
                fillOpacity: 0.45,
                weight: 3,
              },
            },
            rectangle: {
              shapeOptions: {
                color: '#f59e0b',
                fillColor: '#fbbf24',
                fillOpacity: 0.45,
                weight: 3,
              },
            },
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
          },
          edit: {
            featureGroup: drawnItems,
            remove: true,
          },
        });

        map.addControl(drawControl);
      }

      const drawEvents = (L as any).Draw?.Event || {
        CREATED: 'draw:created',
        EDITED: 'draw:edited',
        DELETED: 'draw:deleted',
      };

      // Handle polygon creation
      map.on(drawEvents.CREATED, (e: any) => {
        const layer = e.layer;
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);

        const geoJson = layer.toGeoJSON();
        const areaM2 = turf.area(geoJson);
        const roundedArea = Math.round(areaM2 * 10) / 10;
        setMeasuredArea(roundedArea);
        onRoofAreaChange(roundedArea, geoJson);
      });

      // Handle polygon edit
      map.on(drawEvents.EDITED, () => {
        let totalArea = 0;
        let lastGeoJson = null;
        drawnItems.eachLayer((layer: any) => {
          const geoJson = layer.toGeoJSON();
          lastGeoJson = geoJson;
          totalArea += turf.area(geoJson);
        });
        const rounded = Math.round(totalArea * 10) / 10;
        setMeasuredArea(rounded);
        onRoofAreaChange(rounded, lastGeoJson);
      });

      // Handle polygon deletion
      map.on(drawEvents.DELETED, () => {
        setMeasuredArea(0);
        onRoofAreaChange(0, null);
      });
    }

    setupMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Pan to new coordinates when address changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 18, { duration: 1.5 });
    }
  }, [lat, lon]);

  const handleClearDrawing = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }
    setMeasuredArea(0);
    onRoofAreaChange(0, null);
  };

  const handlePresetRoof = (presetM2: number) => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    const sideMeters = Math.sqrt(presetM2);
    const deltaLat = (sideMeters / 111320) / 2;
    const deltaLon = (sideMeters / (111320 * Math.cos(center.lat * (Math.PI / 180)))) / 2;

    const bounds = L.latLngBounds(
      [center.lat - deltaLat, center.lng - deltaLon],
      [center.lat + deltaLat, center.lng + deltaLon]
    );

    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
      const rect = L.rectangle(bounds, {
        color: '#f59e0b',
        fillColor: '#fbbf24',
        fillOpacity: 0.45,
        weight: 3,
      });
      drawnItemsRef.current.addLayer(rect);
      const geoJson = rect.toGeoJSON();
      const area = Math.round(turf.area(geoJson) * 10) / 10;
      setMeasuredArea(area);
      onRoofAreaChange(area, geoJson);
    }
  };

  const sqFt = Math.round(measuredArea * 10.7639);
  const maxKw = Math.max(0, Math.floor(((measuredArea * 0.85) / 10.0) * 10) / 10);

  return (
    <div className="roof-map-wrapper">
      {/* Map Header / Location Tag */}
      <div className="map-toolbar-banner">
        <div className="location-pill">
          <MapPin size={16} className="text-amber" />
          <span className="location-text">
            {locationName || `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`}
          </span>
        </div>

        <div className="map-actions">
          {measuredArea > 0 && (
            <button
              onClick={handleClearDrawing}
              className="btn-danger-soft"
              title="Clear drawn roof polygon"
            >
              <Trash2 size={14} />
              <span>{t.clearRoof}</span>
            </button>
          )}

          <div className="quick-presets">
            <span className="preset-label">Quick sizes:</span>
            <button onClick={() => handlePresetRoof(35)} className="btn-chip">
              35 m² (~3 kW)
            </button>
            <button onClick={() => handlePresetRoof(60)} className="btn-chip">
              60 m² (~5 kW)
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="leaflet-map-canvas" id="solar-roof-map" />

      {/* Floating Measurement Overlay HUD */}
      {measuredArea > 0 ? (
        <div className="map-hud-badge">
          <div className="hud-metric">
            <span className="hud-label">Roof Traced</span>
            <span className="hud-val">{measuredArea} m²</span>
            <span className="hud-sub">({sqFt.toLocaleString('en-IN')} sq.ft)</span>
          </div>
          <div className="hud-divider" />
          <div className="hud-metric">
            <span className="hud-label">Shadow-Free Usable</span>
            <span className="hud-val">{(measuredArea * 0.85).toFixed(1)} m²</span>
            <span className="hud-sub">(85% effective)</span>
          </div>
          <div className="hud-divider" />
          <div className="hud-metric highlight">
            <span className="hud-label">Max Solar Fit</span>
            <span className="hud-val text-amber">{maxKw} kWp</span>
            <span className="hud-sub">{(maxKw * 10).toFixed(0)} m² needed</span>
          </div>
        </div>
      ) : (
        <div className="map-draw-instruction">
          <span className="pulse-dot" />
          <span>{t.drawRoofTip}</span>
        </div>
      )}
    </div>
  );
};
