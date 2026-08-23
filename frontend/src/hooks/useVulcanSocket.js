// src/hooks/useVulcanSocket.js
import { useEffect, useRef } from 'react';
import { useVulcanStore } from '../store/vulcanStore';

// Synthesized Sonar Ping (Web Audio API)
const playSonarPing = () => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.5);
  
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.5);
};

export const useVulcanSocket = () => {
  const { addNewSOS, updateSOSStatus, setConnectionStatus } = useVulcanStore();
  const ws = useRef(null);

  useEffect(() => {
    // Connect to Mugu's Backend
    ws.current = new WebSocket('ws://localhost:5000');

    ws.current.onopen = () => {
      setConnectionStatus('ONLINE');
      console.log('VULCAN ENGINE CONNECTED');
    };

    ws.current.onclose = () => {
      setConnectionStatus('OFFLINE');
      console.log('VULCAN ENGINE DISCONNECTED');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.event === 'NEW_SOS_ALERT') {
        addNewSOS(data.sos);
        playSonarPing();
        triggerScreenShake();
      } 
      
      if (data.event === 'SOS_STATUS_UPDATED') {
        updateSOSStatus(data.sos_id, data.status);
      }
    };

    return () => ws.current.close();
  }, []);
};

// Screen Shake Trigger
const triggerScreenShake = () => {
  const app = document.querySelector('.vulcan-console');
  if (app) {
    app.classList.add('shake-active');
    setTimeout(() => app.classList.remove('shake-active'), 400);
  }
};