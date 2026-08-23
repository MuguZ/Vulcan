import { useVulcanStore } from '../../store/vulcanStore';

export default function TriageQueue() {
  const { sosList, updateSOSStatus, clearDispatched } = useVulcanStore();
  const safeSosList = sosList || [];
  const pendingCount = safeSosList.filter(s => s.status !== 'RESCUE_DISPATCHED').length;

  const handleDispatch = (id) => {
    updateSOSStatus(id, 'RESCUE_DISPATCHED');
    fetch(`http://localhost:5000/api/rescue/resolve/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RESCUE_DISPATCHED' })
    }).catch(() => console.log("Backend offline"));
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' 
      }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>Active Dossiers</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>{pendingCount} <span style={{fontSize: '12px', color: '#94a3b8', fontWeight: '400'}}>PENDING</span></div>
        </div>
        <button 
          onClick={clearDispatched}
          style={{ 
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', 
            color: '#ef4444', padding: '6px 12px', borderRadius: '6px', 
            fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' 
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
        >
          ✕ CLEAR
        </button>
      </div>
      
      {/* Scrollable List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
        {safeSosList.length > 0 ? (
          safeSosList.map((sos) => {
            const isDispatched = sos.status === 'RESCUE_DISPATCHED';
            const accentColor = sos.triage_level === 'RED' ? '#ef4444' : sos.triage_level === 'YELLOW' ? '#f59e0b' : '#3b82f6';
            
            return (
              <div 
                key={sos.id} 
                style={{ 
                  background: isDispatched ? 'rgba(16, 185, 129, 0.05)' : 'rgba(30, 41, 59, 0.4)', 
                  border: `1px solid ${isDispatched ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                  borderLeft: `4px solid ${accentColor}`,
                  borderRadius: '8px', 
                  padding: '14px',
                  position: 'relative',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  opacity: isDispatched ? 0.8 : 1
                }}
              >
                {/* Top Row: Badge & Time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ 
                    background: `${accentColor}22`, color: accentColor,
                    padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px'
                  }}>
                    {sos.triage_level} PRIORITY
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                    {new Date(sos.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                
                {/* Name & Data */}
                <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>
                  {sos.name}
                </div>
                
                <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.6', fontFamily: 'JetBrains Mono' }}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span>ID: {sos.id.split('_')[2] || 'UNK'}</span>
                    <span>PAX: {sos.trapped_count || 1}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span>MED: {sos.medical_need ? 'REQ' : 'N/A'}</span>
                    <span style={{ color: isDispatched ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                      {isDispatched ? 'DISPATCHED' : 'PENDING'}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                {!isDispatched && (
                  <button 
                    onClick={() => handleDispatch(sos.id)}
                    style={{
                      width: '100%', marginTop: '12px',
                      background: 'linear-gradient(90deg, #10b981, #059669)',
                      color: '#fff', border: 'none', padding: '8px',
                      borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                      cursor: 'pointer', letterSpacing: '1px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      transition: 'transform 0.1s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    🚁 DISPATCH UNIT
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: '12px', padding: '40px 20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            SYSTEM NOMINAL<br/>Awaiting distress signals...
          </div>
        )}
      </div>
    </div>
  );
}