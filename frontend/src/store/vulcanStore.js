import { create } from 'zustand';

export const useVulcanStore = create((set) => ({
  isConnected: false,
  sosList: [],
  hazards: [],
  activeAlertPolygon: null,
  selectedLocation: null, // Stores the map click location

  setConnected: (status) => set({ isConnected: status }),
  setSelectedLocation: (loc) => set({ selectedLocation: loc }),
  setAlertPolygon: (polygon) => set({ activeAlertPolygon: polygon }),
  setHazards: (hazards) => set({ hazards }),
  
  addSOSAlert: (sos) => set((state) => {
    if (state.sosList.some((item) => item.id === sos.id)) return state;
    const updated = [sos, ...state.sosList];
    updated.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    return { sosList: updated };
  }),
  
  addHazard: (hazard) => set((state) => {
    const id = hazard.id || hazard._id;
    if (state.hazards.some((h) => (h.id || h._id) === id)) return state;
    return { hazards: [hazard, ...state.hazards] };
  }),
  
  updateHazardStatus: (id, status) => set((state) => ({
    hazards: state.hazards.map((h) => ((h.id || h._id) === id) ? { ...h, status } : h)
  })),
  
  updateSOSStatus: (id, status) => set((state) => ({
    sosList: state.sosList.map((item) => (item.id === id ? { ...item, status } : item))
  })),
  
  clearDispatched: () => set((state) => ({
    sosList: state.sosList.filter(sos => sos.status !== 'RESCUE_DISPATCHED')
  })),
}));