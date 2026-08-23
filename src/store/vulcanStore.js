import { create } from 'zustand';

export const useVulcanStore = create((set) => ({
  isConnected: false,
  sosList: [],
  hazards: [],
  activeAlertPolygon: null,

  setConnected: (status) => set({ isConnected: status }),
  
  setAlertPolygon: (polygon) => set({ activeAlertPolygon: polygon }),
  
  addSOSAlert: (sos) =>
    set((state) => {
      const exists = state.sosList.some((item) => item.id === sos.id);
      if (exists) return state;
      
      const updated = [sos, ...state.sosList];
      updated.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
      return { sosList: updated };
    }),
  
  addHazard: (hazard) =>
    set((state) => {
      const exists = state.hazards.some((h) => h.id === hazard.id);
      if (exists) return state;
      return { hazards: [hazard, ...state.hazards] };
    }),
  
  updateSOSStatus: (id, status) =>
    set((state) => ({
      sosList: state.sosList.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    })),
  
  clearDispatched: () =>
    set((state) => ({
      sosList: state.sosList.filter(sos => sos.status !== 'RESCUE_DISPATCHED')
    })),
}));