import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import TacticalMap from './components/Map/TacticalMap';
import ReportHazardModal from './components/HUD/ReportHazardModal';
import { useVulcanStore } from './store/vulcanStore';

// Dynamically get the backend URL from .env, fallback to localhost
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');const WS_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export default function App() {
  const { setConnected, addHazard, setHazards } = useVulcanStore();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: null, lng: null });

  useEffect(() => {
    console.log('Connecting to WebSocket at:', WS_URL);
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => { 
      console.log('[WS] Connected to Vulcan Engine'); 
      setConnected(true); 
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'NEW_HAZARD_REPORTED') {
          addHazard(data.hazard);
        }
      } catch (e) {
        console.error('WS Parse Error', e);
      }
    };
    
    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setConnected(false);
    };

    // Fetch initial hazards
    fetch(`${API_URL}/api/hazards/active`)
      .then(res => res.json())
      .then(data => { 
        if (data.hazards) setHazards(data.hazards);
      })
      .catch(err => console.error('Failed to fetch hazards:', err));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Location access denied', err)
      );
    }
    
    return () => ws.close();
  }, [setConnected, addHazard, setHazards]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#020617', overflow: 'hidden' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />
      <TacticalMap />
      
      <button
  onClick={() => setIsReportModalOpen(true)}
  style={{
    position: 'absolute', 
    bottom: '2rem', 
    right: '2rem',
    backgroundColor: '#d97706', 
    color: 'white', 
    padding: '1.25rem 2rem',  // Larger padding
    borderRadius: '12px',
    boxShadow: '0 10px 25px -3px rgba(217, 119, 6, 0.5)',
    border: 'none', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center',
    gap: '0.75rem', 
    fontWeight: '700', 
    fontSize: '1.1rem',  // Larger text
    zIndex: 1000,
    transition: 'all 0.2s',
    transform: 'scale(1.1)'  // 10% bigger
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'scale(1.15)';
    e.currentTarget.style.backgroundColor = '#b45309';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'scale(1.1)';
    e.currentTarget.style.backgroundColor = '#d97706';
  }}
>
  🚨 Report Damage
</button>

      <ReportHazardModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        userLat={userLocation.lat}
        userLng={userLocation.lng}
        onSuccess={(newHazard) => addHazard(newHazard)}
      />
    </div>
  );
}