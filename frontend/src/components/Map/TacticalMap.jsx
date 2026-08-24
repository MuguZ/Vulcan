import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useVulcanStore } from '../../store/vulcanStore';

export default function TacticalMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const hazardMarkersRef = useRef({});
  const polygonLayerRef = useRef(null);
  
  const { sosList, hazards, activeAlertPolygon } = useVulcanStore();

  // Initialize Map Centered on Puducherry
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    
       const map = L.map(mapContainerRef.current, {
      center: [11.935, 79.830], // Starts at Puducherry
      zoom: 6, // Zoomed out just enough to see all of India
      minZoom: 4, // PREVENTS zooming out to the whole world
      maxZoom: 19,
      
      // Lock the map strictly to India's borders
      maxBounds: L.latLngBounds(
        L.latLng(6.7471, 68.1624),  // South-West corner of India
        L.latLng(35.6745, 97.3953)  // North-East corner of India
      ),
      maxBoundsViscosity: 1.0, // Makes the borders feel "solid"
      
      zoomControl: false,
    });
    
    L.control.zoom({ position: 'topright' }).addTo(map);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO',
      maxZoom: 19,
    }).addTo(map);
    
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 1. Render Active G2C Hazard Polygon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    if (activeAlertPolygon && activeAlertPolygon.length > 0) {
      const latLngs = activeAlertPolygon.map(([lng, lat]) => [lat, lng]);
      
      const polygon = L.polygon(latLngs, {
        color: '#f43f5e',
        fillColor: '#ef4444',
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '5, 10',
      }).addTo(map);
      
      polygon.bindPopup('<b>⚠ EMERGENCY CELL BROADCAST ZONE</b><br>Multi-lingual alerts dispatched via Radio TAC.');
      polygonLayerRef.current = polygon;
      map.fitBounds(polygon.getBounds(), { padding: [40, 40] });
    }
  }, [activeAlertPolygon]);

  // 2. Render Crowdsourced Hazard Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    hazards.forEach((h) => {
      if (!hazardMarkersRef.current[h.id]) {
        const hazardIcon = L.divIcon({
          className: 'hazard-icon',
          html: `<div style="background:#f59e0b; color:#000; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid #fff; box-shadow:0 0 10px rgba(245,158,11,0.8);">⚠</div>`,
          iconSize: [24, 24],
        });
        
        const marker = L.marker([h.lat, h.lng], { icon: hazardIcon })
          .bindPopup(`<b>🚨 CROWDSOURCED OBSTACLE</b><br>Type: <b>${h.type}</b><br>Note: ${h.description}<br>By: <i>${h.reported_by || 'Volunteer'}</i>`)
          .addTo(map);
        
        hazardMarkersRef.current[h.id] = marker;
      }
    });
  }, [hazards]);

  // 3. Render 3-Tier SOS Distress Beacons (FIXED: Now turns GREEN when dispatched)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    sosList.forEach((sos) => {
      // If marker already exists, REMOVE IT so we can redraw it with the new color
      if (markersRef.current[sos.id]) {
        map.removeLayer(markersRef.current[sos.id]);
        delete markersRef.current[sos.id];
      }

      // Determine color based on status
      const isDispatched = sos.status === 'RESCUE_DISPATCHED';
      const color = isDispatched ? '#22c55e' : (sos.triage_level === 'RED' ? '#ef4444' : sos.triage_level === 'YELLOW' ? '#f59e0b' : '#3b82f6');
      const borderColor = isDispatched ? '#000' : '#fff';
      const animClass = isDispatched ? 'beacon-dispatched' : `beacon-${sos.triage_level}`;

      const customIcon = L.divIcon({
        className: 'custom-beacon',
        // Use inline styles to guarantee the color changes immediately
        html: `<div class="${animClass}" style="background-color: ${color}; border: 2px solid ${borderColor}; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 0 10px ${color};"></div>`,
        iconSize: [20, 20],
      });
      
      const marker = L.marker([sos.lat, sos.lng], { icon: customIcon })
        .bindPopup(`
          <div style="color:#0f172a; font-family: sans-serif;">
            <h4 style="margin: 0 0 4px 0;">${sos.name || 'Emergency Victim'}</h4>
            <p style="margin: 0 0 4px 0; font-size: 12px;"><b>Triage:</b> <span style="color:${color}; font-weight:bold;">${sos.triage_level}</span></p>
            <p style="margin: 0 0 4px 0; font-size: 12px;"><b>Trapped:</b> ${sos.trapped_count || 1} people</p>
            <p style="margin: 0; font-size: 12px;"><b>Status:</b> ${sos.status || 'PENDING'}</p>
          </div>
        `)
        .addTo(map);
      
      markersRef.current[sos.id] = marker;
    });
  }, [sosList]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />;
}