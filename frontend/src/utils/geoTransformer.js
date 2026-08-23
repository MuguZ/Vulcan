// src/utils/geoTransformer.js

// Flips Leaflet [lat, lng] to GeoJSON [lng, lat] for Mugu's Python Engine
export const leafletToGeoJSON = (latlngArray) => {
  return latlngArray.map(point => ({ type: 'Point', coordinates: [point.lng, point.lat] }));
};

// Flips Mugu's GeoJSON [lng, lat] to Leaflet [lat, lng]
export const geoJSONToLeaflet = (geoJSONCoords) => {
  return [geoJSONCoords[1], geoJSONCoords[0]];
};

// Formats Mugu's raw SOS object into a Leaflet array
export const formatSOSForLeaflet = (sosObject) => {
  return [sosObject.lat, sosObject.lng];
};