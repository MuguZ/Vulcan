// src/components/HUD/TriageQueue.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { useVulcanStore } from '../../store/vulcanStore';

function TriageQueue() {
  const activeSOSQueue = useVulcanStore((state) => state.activeSOSQueue);

  return (
    <div>
      <AnimatePresence>
        {activeSOSQueue.map((sos, index) => {
          const rotation = index % 2 === 0 ? -0.6 : 0.6; 
          const isDispatched = sos.status === 'RESCUE_DISPATCHED';

          return (
            <motion.div
              key={sos.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="paper-card"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <div className="card-header">
                <span className={`triage-badge triage-${sos.triage_level}`}>
                  {sos.triage_level}
                </span>
                <span style={{fontFamily: 'IBM Plex Mono', fontSize: '0.7rem', color: '#666'}}>
                  {new Date(sos.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              
              <div className="card-data">
                <div style={{fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px'}}>{sos.name}</div>
                <div>ID: {sos.id.toUpperCase()}</div>
                <div>TRAPPED: {sos.trapped_count} PAX</div>
                <div>MED: {sos.medical_need ? 'REQUIRED' : 'NONE'}</div>
              </div>

              {isDispatched && <div className="rubber-stamp">DISPATCHED</div>}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default TriageQueue;