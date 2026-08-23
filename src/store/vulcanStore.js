import { create } from 'zustand';

const getTriageWeight = (level) => {
  if (level === 'RED') return 0;
  if (level === 'YELLOW') return 1;
  return 2;
};

export const useVulcanStore = create((set) => ({
  activeSOSQueue: [],
  connectionStatus: 'OFFLINE',
  selectedSOS: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  addNewSOS: (newSOS) => set((state) => {
    const updatedQueue = [...state.activeSOSQueue, newSOS];
    updatedQueue.sort((a, b) => getTriageWeight(a.triage_level) - getTriageWeight(b.triage_level));
    return { activeSOSQueue: updatedQueue };
  }),

  updateSOSStatus: (id, status) => set((state) => ({
    activeSOSQueue: state.activeSOSQueue.map(sos => 
      sos.id === id ? { ...sos, status } : sos
    )
  })),

  clearDispatched: () => set((state) => ({
    activeSOSQueue: state.activeSOSQueue.filter(sos => sos.status !== 'RESCUE_DISPATCHED')
  })),

  setSelectedSOS: (sos) => set({ selectedSOS: sos }),
}));