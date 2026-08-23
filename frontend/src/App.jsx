import './styles/global.css';
import TacticalMap from './components/Map/TacticalMap';
import TriageQueue from './components/HUD/TriageQueue';
import VaultDrawer from './components/UI/VaultDrawer';
import { useVulcanSocket } from './hooks/useVulcanSocket';
import { useVulcanStore } from './store/vulcanStore';
import { useState } from 'react';

function App() {
  useVulcanSocket();
  const connectionStatus = useVulcanStore((state) => state.connectionStatus);
  const addNewSOS = useVulcanStore((state) => state.addNewSOS);
  const activeSOSQueue = useVulcanStore((state) => state.activeSOSQueue);
  
  const [showRedVignette, setShowRedVignette] = useState(false);

  const simulateAlert = (triageLevel) => {
    const mockSOS = {
      id: `sos_${Date.now().toString().slice(-4)}`,
      name: `CITIZEN_${Math.floor(Math.random() * 900) + 100}`,
      lat: 20.5937 + (Math.random() * 10 - 5),
      lng: 78.9629 + (Math.random() * 10 - 5),
      trapped_count: Math.floor(Math.random() * 5) + 1,
      medical_need: triageLevel === 'RED' || triageLevel === 'YELLOW',
      triage_level: triageLevel,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };
    addNewSOS(mockSOS);

    if (triageLevel === 'RED') {
      setShowRedVignette(true);
      setTimeout(() => setShowRedVignette(false), 2000);
    }
  };

  const tickerText = activeSOSQueue.map(sos => 
    `[${sos.triage_level}] ${sos.name} // TRAPPED: ${sos.trapped_count} // LAT: ${sos.lat.toFixed(3)} LNG: ${sos.lng.toFixed(3)}  +++  `
  ).join('') || "SYSTEM NOMINAL. AWAITING DISTRESS SIGNALS. ALL CHANNELS CLEAR. +++ ";

  return (
    <>
      <div className={`red-vignette ${showRedVignette ? 'active' : ''}`}></div>

      <div className="app-root">
        <header className="top-bar">
          <div className="wordmark">Vulcan // SDRF Command</div>
          <div style={{fontFamily: 'IBM Plex Mono', fontSize: '0.8rem', color: 'var(--text-muted)'}}>
            <span className="status-dot"></span>
            SYS NOMINAL // CONN: {connectionStatus}
          </div>
        </header>
        
        <div className="hazard-tape"></div>

        <div className="teleprinter-ticker">
          <div className="ticker-content">{tickerText}</div>
        </div>

        <div className="main-content">
          <aside className="side-panel left">
            <div className="panel-title">Dispatch Simulation</div>
            <p style={{fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px'}}>
              Inject mock distress signals for operator training.
            </p>
            
            <button className="physical-btn btn-red" onClick={() => simulateAlert('RED')}>
              <span style={{color: 'var(--triage-red)', fontSize: '1.2rem'}}>●</span> INJECT RED (CRITICAL)
            </button>
            <button className="physical-btn btn-yellow" onClick={() => simulateAlert('YELLOW')}>
              <span style={{color: 'var(--triage-yellow)', fontSize: '1.2rem'}}>●</span> INJECT YELLOW (INJURED)
            </button>
            <button className="physical-btn btn-blue" onClick={() => simulateAlert('BLUE')}>
              <span style={{color: 'var(--triage-blue)', fontSize: '1.2rem'}}>●</span> INJECT BLUE (STRANDED)
            </button>
          </aside>
          
          <main className="map-wrapper">
            <TacticalMap />
          </main>
          
          <aside className="side-panel right">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="panel-title" style={{ marginBottom: 0 }}>Active Case Files ({activeSOSQueue.length})</div>
              
              <button 
                onClick={() => useVulcanStore.getState().clearDispatched()}
                style={{
                  background: 'transparent',
                  border: '1px solid #444',
                  color: '#888',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontFamily: 'Montserrat',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--triage-red)'; e.currentTarget.style.color = 'var(--triage-red)'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#888'; }}
              >
                ✕ CLEAR
              </button>
            </div>
            <TriageQueue />
          </aside>
        </div>
      </div>

      <VaultDrawer />
    </>
  );
}

export default App;