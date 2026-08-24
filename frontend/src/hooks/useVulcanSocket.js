import { useEffect, useRef } from 'react';
import { useVulcanStore } from '../store/vulcanStore';

export function useVulcanSocket(url = 'ws://localhost:5000') {
  const socketRef = useRef(null);
  const { setConnected, addSOSAlert, addHazard, setAlertPolygon, updateSOSStatus } = useVulcanStore();

  useEffect(() => {
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('[VULCAN WS] Connected to backend');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[VULCAN WS] Message received:', payload);
        
        switch (payload.event) {
          case 'EMERGENCY_BROADCAST':
            if (payload.hazardPolygon) {
              setAlertPolygon(payload.hazardPolygon);
            }
            break;
          case 'NEW_SOS_ALERT':
            addSOSAlert(payload.sos);
            break;
          case 'NEW_HAZARD_REPORTED':
            addHazard(payload.hazard);
            break;
          case 'SOS_STATUS_UPDATED':
            updateSOSStatus(payload.sos_id, payload.status);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('[VULCAN WS] Parse error:', err);
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => ws.close();
  }, [url]);

  return socketRef;
}