import React from 'react';
import TacticalMap from './components/Map/TacticalMap';
import TriageQueue from './components/HUD/TriageQueue';
import VaultDrawer from './components/HUD/VaultDrawer'; // FIXED: Correct path
import { useVulcanSocket } from './hooks/useVulcanSocket';
import { useVulcanStore } from './store/vulcanStore';
import './styles/global.css';

export default function App() {
  useVulcanSocket('ws://localhost:5000');
  const { isConnected, sosList, addSOSAlert, addHazard, setAlertPolygon } = useVulcanStore();

  // 1. Broadcast Geofence (Updates map instantly + sends to backend)
  const handleDispatchCycloneAlert = async () => {
    const polygon = [
      [79.815, 11.925], [79.845, 11.925], [79.845, 11.955], [79.815, 11.955], [79.815, 11.925],
    ];
    setAlertPolygon(polygon); // Force local update
    try {
      await fetch('http://localhost:5000/api/alert/dispatch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polygon, alertType: 'CYCLONE', severity: 'EXTREME' }),
      });
    } catch (e) { console.log("Backend offline, UI updated locally"); }
  };

  // 2. Pin Flood Hazard (Updates map instantly + sends to backend)
  const handleReportHazard = async () => {
    const hazardData = {
      id: 'haz_' + Date.now(), 
      type: 'ROAD_FLOODED', severity: 'CRITICAL',
      description: 'Goubert Avenue completely flooded. Avoid beach promenade.',
      lat: 11.934, lng: 79.835, reported_by: 'Volunteer Priya',
    };
    addHazard(hazardData); // Force local update
    try {
      await fetch('http://localhost:5000/api/hazards/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hazardData),
      });
    } catch (e) { console.log("Backend offline, UI updated locally"); }
  };

  // 3. Inject SOS (Updates map instantly + sends to backend)
  const handleInjectSOS = async (triage_level) => {
    const names = { RED: 'Muthu Roof Trap', YELLOW: 'Ananya Medical', BLUE: 'David Food/Water' };
    const baseOffsets = { RED: 0.005, YELLOW: -0.003, BLUE: 0.002 };
    const scores = { RED: 3, YELLOW: 2, BLUE: 1 };

    // Add random scatter so markers don't stack on top of each other!
    const randomScatter = () => (Math.random() * 0.01) - 0.005;

    const sosData = {
      id: 'sos_' + Date.now() + '_' + Math.floor(Math.random() * 1000), 
      name: names[triage_level] + ' #' + Math.floor(Math.random() * 900 + 100), 
      lat: 11.935 + baseOffsets[triage_level] + randomScatter(),
      lng: 79.830 + baseOffsets[triage_level] + randomScatter(),
      triage_level,
      trapped_count: triage_level === 'RED' ? 4 : triage_level === 'YELLOW' ? 2 : 1,
      medical_need: triage_level === 'RED' || triage_level === 'YELLOW',
      status: 'PENDING',
      priority_score: scores[triage_level],
      timestamp: new Date().toISOString()
    };
    
    addSOSAlert(sosData); // Force local update
    
    try {
      await fetch('http://localhost:5000/api/rescue/sos-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sosData),
      });
    } catch (e) { console.log("Backend offline"); }
  };

  const safeSosList = sosList || [];
  const tickerText = safeSosList.map(sos => 
    `[${sos.triage_level}] ${sos.name} // TRAPPED: ${sos.trapped_count} // LAT: ${sos.lat.toFixed(3)} LNG: ${sos.lng.toFixed(3)}  +++  `
  ).join('') || "SYSTEM NOMINAL. AWAITING DISTRESS SIGNALS. ALL CHANNELS CLEAR. +++ ";

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0b0f19', color: '#fff' }}>
      
      {/* HEADER: Z-INDEX 1000 */}
      <header style={{ height: '50px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'relative', zIndex: 1000, background: '#0b0f19' }}>
        <div style={{ fontWeight: 'bold', letterSpacing: '2px', color: '#f43f5e' }}>VULCAN // SDRF COMMAND HUD</div>
        <div style={{ fontSize: '12px', display: 'flex', gap: '15px' }}>
          <span>STATUS: <b style={{ color: '#22c55e' }}>NOMINAL</b></span>
          <span>GRID: <b style={{ color: isConnected ? '#22c55e' : '#ef4444' }}>{isConnected ? 'ONLINE' : 'OFFLINE'}</b></span>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT SIDEBAR: Z-INDEX 1000 */}
        <div style={{ width: '260px', background: '#0f172a', borderRight: '1px solid #1e293b', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1000 }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}>OPERATOR CONTROLS</div>
          
          <button onClick={handleDispatchCycloneAlert} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            🚨 BROADCAST GEOFENCE
          </button>
          
          <button onClick={handleReportHazard} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            ⚠ PIN FLOOD HAZARD
          </button>
          
          <hr style={{ borderColor: '#1e293b', width: '100%', margin: '8px 0' }} />
          
          <div style={{ fontSize: '11px', color: '#64748b' }}>TEST TRIAGE INJECTION</div>
          
          <button onClick={() => handleInjectSOS('RED')} style={{ background: '#1e293b', border: '1px solid #ef4444', color: '#ef4444', padding: '8px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}>
            🔴 Inject RED (Critical)
          </button>
          
          <button onClick={() => handleInjectSOS('YELLOW')} style={{ background: '#1e293b', border: '1px solid #f59e0b', color: '#f59e0b', padding: '8px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}>
            🟡 Inject YELLOW (Medical)
          </button>
          
          <button onClick={() => handleInjectSOS('BLUE')} style={{ background: '#1e293b', border: '1px solid #3b82f6', color: '#3b82f6', padding: '8px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}>
            🔵 Inject BLUE (Assistance)
          </button>
        </div>
        
        {/* MAP: Z-INDEX 1 */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <TacticalMap />
        </div>
        
        {/* RIGHT SIDEBAR: Z-INDEX 1000 */}
        <div style={{ width: '320px', background: '#0f172a', borderLeft: '1px solid #1e293b', padding: '16px', overflowY: 'auto', position: 'relative', zIndex: 1000 }}>
          <TriageQueue />
        </div>
      </div>

      <VaultDrawer />
    </div>
  );
}