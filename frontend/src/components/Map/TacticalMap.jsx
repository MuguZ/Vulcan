// src/components/Map/TacticalMap.jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { useVulcanStore } from '../../store/vulcanStore';

const createTriageIcon = (level, status) => {
  let className = 'beacon-BLUE';
  if (status === 'RESCUE_DISPATCHED') className = 'beacon-DISPATCHED';
  else if (level === 'RED') className = 'beacon-RED';
  else if (level === 'YELLOW') className = 'beacon-YELLOW';

  return new DivIcon({
    className: 'custom-div-icon',
    html: `<div class="${className}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function TacticalMap() {
  const activeSOSQueue = useVulcanStore((state) => state.activeSOSQueue);
  const setSelectedSOS = useVulcanStore((state) => state.setSelectedSOS);

  return (
    <MapContainer 
      center={[20.5937, 78.9629]} 
      zoom={5} 
      minZoom={4}
      maxZoom={18}
      style={{ height: '100%', width: '100%' }} 
      zoomControl={true} 
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {activeSOSQueue.map((sos) => {
        return (
          <Marker 
            key={sos.id} 
            position={[sos.lat, sos.lng]} 
            icon={createTriageIcon(sos.triage_level, sos.status)}
            eventHandlers={{
              click: () => setSelectedSOS(sos)
            }}
          >
            <Popup>
              <div>
                <strong style={{color: sos.triage_level === 'RED' ? '#dc2626' : '#000', display: 'block', marginBottom: '4px'}}>
                  [{sos.triage_level}] PRIORITY
                </strong>
                ID: {sos.id.toUpperCase()}<br/>
                NAME: {sos.name}<br/>
                TRAPPED: {sos.trapped_count}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default TacticalMap;