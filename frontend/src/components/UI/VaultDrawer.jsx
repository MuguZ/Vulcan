// src/components/UI/VaultDrawer.jsx
import { motion } from 'framer-motion';
import { useVulcanStore } from '../../store/vulcanStore';

function VaultDrawer() {
  const selectedSOS = useVulcanStore((state) => state.selectedSOS);
  const setSelectedSOS = useVulcanStore((state) => state.setSelectedSOS);
  const updateSOSStatus = useVulcanStore((state) => state.updateSOSStatus);

  const handleDispatch = () => {
    if (!selectedSOS) return;
    updateSOSStatus(selectedSOS.id, 'RESCUE_DISPATCHED');
    setSelectedSOS(null);
  };

  if (!selectedSOS) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed', top: 0, right: 0,
        width: '420px', height: '100vh',
        background: 'var(--bg-panel)',
        borderLeft: '4px solid var(--accent-hazard)',
        zIndex: 1000, padding: '30px',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column'
      }}
    >
      <button 
        onClick={() => setSelectedSOS(null)}
        className="font-stencil"
        style={{
          position: 'absolute', top: '20px', right: '20px',
          background: 'transparent', border: '1px solid #555', color: '#888',
          width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.2rem'
        }}
      >
        ✕
      </button>

      <div className="panel-title" style={{marginBottom: '10px'}}>Dispatch File</div>
      <div className="font-mono" style={{fontSize: '0.75rem', color: '#888', marginBottom: '30px'}}>
        INTERCEPTED SIGNAL // CONFIDENTIAL
      </div>

      {/* Paper File Inside Drawer */}
      <div className="paper-card" style={{flex: 1, transform: 'rotate(-0.3deg)', overflowY: 'auto'}}>
        <div className="card-header">
          <span className={`triage-badge triage-${selectedSOS.triage_level}`}>
            {selectedSOS.triage_level} PRIORITY
          </span>
        </div>

        <div className="card-data" style={{fontSize: '0.85rem'}}>
          <div style={{marginBottom: '16px'}}>
            <div style={{color: '#666', fontSize: '0.7rem'}}>SUBJECT NAME</div>
            <div style={{fontWeight: '600', fontSize: '1.1rem'}}>{selectedSOS.name}</div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px'}}>
            <div>
              <div style={{color: '#666', fontSize: '0.7rem'}}>TRAPPED</div>
              <div style={{fontWeight: '600'}}>{selectedSOS.trapped_count} PAX</div>
            </div>
            <div>
              <div style={{color: '#666', fontSize: '0.7rem'}}>MEDICAL</div>
              <div style={{fontWeight: '600', color: selectedSOS.medical_need ? 'var(--triage-red)' : 'var(--ink-dark)'}}>
                {selectedSOS.medical_need ? 'REQUIRED' : 'NONE'}
              </div>
            </div>
          </div>

          <div style={{borderTop: '1px dashed #999', paddingTop: '12px'}}>
            <div style={{color: '#666', fontSize: '0.7rem'}}>COORDINATES</div>
            <div>LAT: {selectedSOS.lat.toFixed(4)}° N</div>
            <div>LNG: {selectedSOS.lng.toFixed(4)}° E</div>
          </div>
        </div>

        {/* Dispatch Button */}
        <button
          onClick={handleDispatch}
          className="font-stencil"
          style={{
            width: '100%', marginTop: '24px', padding: '16px',
            background: 'var(--ink-dark)', color: 'var(--bg-paper)',
            border: 'none', fontSize: '1.4rem', letterSpacing: '2px',
            cursor: 'pointer', boxShadow: '4px 4px 0px rgba(0,0,0,0.5)',
            transition: 'all 0.1s'
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '2px 2px 0px rgba(0,0,0,0.5)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '4px 4px 0px rgba(0,0,0,0.5)'; }}
        >
          DISPATCH UNIT
        </button>
      </div>
    </motion.div>
  );
}

export default VaultDrawer;