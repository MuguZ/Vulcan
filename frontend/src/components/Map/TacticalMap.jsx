import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useVulcanStore } from '../../store/vulcanStore';

const SEVERITY_COLORS = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };

export default function TacticalMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const hazardMarkersRef = useRef({});
  const polygonLayerRef = useRef(null);
  const { sosList, hazards, activeAlertPolygon, setSelectedLocation } = useVulcanStore();

  // 1. Initialize Map & Click Handler
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    
    const map = L.map(mapContainerRef.current, { 
      center: [11.935, 79.830], 
      zoom: 13, 
      minZoom: 4, 
      maxZoom: 19, 
      maxBounds: L.latLngBounds(L.latLng(6.7471, 68.1624), L.latLng(35.6745, 97.3953)), 
      maxBoundsViscosity: 1.0, 
      zoomControl: false 
    });
    
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© CARTO', maxZoom: 19 }).addTo(map);
    mapInstanceRef.current = map;

    // Map click handler for pinpointing
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });
      
      if (window.tempPinpointMarker) {
        map.removeLayer(window.tempPinpointMarker);
      }
      
      const icon = L.divIcon({
        className: 'pinpoint-marker',
        html: `<div style="background:#ef4444; border:3px solid white; border-radius:50%; width:20px; height:20px; box-shadow:0 0 10px rgba(239,68,68,0.8);"></div>`,
        iconSize: [20, 20]
      });
      
      window.tempPinpointMarker = L.marker([lat, lng], { icon }).addTo(map);
    });

    return () => { 
      map.remove(); 
      mapInstanceRef.current = null; 
    };
  }, [setSelectedLocation]);

  // 2. Render Hazard Polygon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (polygonLayerRef.current) { map.removeLayer(polygonLayerRef.current); polygonLayerRef.current = null; }
    if (activeAlertPolygon && activeAlertPolygon.length > 0) {
      const latLngs = activeAlertPolygon.map(([lng, lat]) => [lat, lng]);
      const polygon = L.polygon(latLngs, { color: '#f43f5e', fillColor: '#ef4444', fillOpacity: 0.25, weight: 2, dashArray: '5, 10' }).addTo(map);
      polygon.bindPopup('<b>⚠ EMERGENCY CELL BROADCAST ZONE</b><br>Multi-lingual alerts dispatched via Radio TAC.');
      polygonLayerRef.current = polygon;
      map.fitBounds(polygon.getBounds(), { padding: [40, 40] });
    }
  }, [activeAlertPolygon]);

  // 3. Render Hazards
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    hazards.forEach((h) => {
      const hazardId = h.id || h._id;
      if (!hazardMarkersRef.current[hazardId]) {
        const color = SEVERITY_COLORS[h.severity] || SEVERITY_COLORS.MEDIUM;
        const hazardIcon = L.divIcon({
          className: 'hazard-icon',
          html: `<div style="background:${color}; color:#fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; border:2px solid #fff; box-shadow:0 0 10px ${color};">⚠</div>`,
          iconSize: [28, 28],
        });
        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin.replace(/:\d+/, ':5000');
        const imgUrl = h.imageUrl ? `<img src="${h.imageUrl.startsWith('http') ? h.imageUrl : apiUrl + h.imageUrl}" style="width:100%; max-height:150px; object-fit:cover; border-radius:4px; margin-bottom:8px;" />` : '';
        const aiInfo = h.aiAnalysis ? `<br><b>AI Detected:</b> ${h.aiAnalysis.detectedType}<br><b>Confidence:</b> ${(h.aiAnalysis.confidence * 100).toFixed(0)}%<br><i style="font-size:11px;">${h.aiAnalysis.explanation}</i>` : '';

        const marker = L.marker([h.lat, h.lng], { icon: hazardIcon })
          .bindPopup(`<div style="color:#0f172a; font-family: sans-serif; min-width: 200px;">${imgUrl}<h4 style="margin: 0 0 4px 0;">🚨 ${h.type.replace('_', ' ')}</h4><p style="margin: 0 0 4px 0; font-size: 12px;"><b>Severity:</b> <span style="color:${color}; font-weight:bold;">${h.severity}</span></p><p style="margin: 0 0 4px 0; font-size: 12px;"><b>Note:</b> ${h.description}</p><p style="margin: 0 0 4px 0; font-size: 12px;"><b>By:</b> ${h.reportedBy || 'Volunteer'}</p><p style="margin: 0; font-size: 11px; color: #64748b;">${new Date(h.reportedAt || h.timestamp).toLocaleString()}</p>${aiInfo}</div>`)
          .addTo(map);
        hazardMarkersRef.current[hazardId] = marker;
      }
    });
  }, [hazards]);

  // 4. Render SOS
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    sosList.forEach((sos) => {
      if (markersRef.current[sos.id]) { map.removeLayer(markersRef.current[sos.id]); delete markersRef.current[sos.id]; }
      const isDispatched = sos.status === 'RESCUE_DISPATCHED';
      const color = isDispatched ? '#22c55e' : (sos.triage_level === 'RED' ? '#ef4444' : sos.triage_level === 'YELLOW' ? '#f59e0b' : '#3b82f6');
      const customIcon = L.divIcon({
        className: 'custom-beacon',
        html: `<div class="${isDispatched ? 'beacon-dispatched' : `beacon-${sos.triage_level}`}" style="background-color: ${color}; border: 2px solid ${isDispatched ? '#000' : '#fff'}; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 0 10px ${color};"></div>`,
        iconSize: [20, 20],
      });
      const marker = L.marker([sos.lat, sos.lng], { icon: customIcon })
        .bindPopup(`<div style="color:#0f172a; font-family: sans-serif;"><h4 style="margin: 0 0 4px 0;">${sos.name || 'Emergency Victim'}</h4><p style="margin: 0 0 4px 0; font-size: 12px;"><b>Triage:</b> <span style="color:${color}; font-weight:bold;">${sos.triage_level}</span></p><p style="margin: 0 0 4px 0; font-size: 12px;"><b>Trapped:</b> ${sos.trapped_count || 1} people</p><p style="margin: 0; font-size: 12px;"><b>Status:</b> ${sos.status || 'PENDING'}</p></div>`)
        .addTo(map);
      markersRef.current[sos.id] = marker;
    });
  }, [sosList]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />;
}