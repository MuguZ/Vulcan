const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();
const hazardRoutes = require('./routes/hazards');
const citizens = require('./mock_data/citizens.json');

const app = express();

// Enable CORS for Codespaces
app.use(cors({
  origin: true,  // Allow all origins (for development)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 1. HTTP & WEBSOCKET SERVER INITIALIZATION
// ==========================================
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
let clients = [];

wss.on('connection', (ws) => {
  clients.push(ws);
  console.log(`[WS] Client connected. Total active clients: ${clients.length}`);
  ws.send(JSON.stringify({ event: 'CONNECTED', message: 'Connected to Vulcan Realtime Engine' }));
  ws.on('close', () => {
    clients = clients.filter((c) => c !== ws);
    console.log(`[WS] Client disconnected. Total active clients: ${clients.length}`);
  });
});

app.locals.wss = wss; // Attach WSS to app locals for routes to access

function broadcastEvent(payload) {
  const data = JSON.stringify(payload);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

// ==========================================
// 2. MONGODB CONNECTION
// ==========================================
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('[DB] MongoDB connected successfully'))
    .catch((err) => console.error('[DB] MongoDB connection error:', err));
} else {
  console.warn('[DB] MONGO_URI not set. Hazard persistence will fail.');
}

// ==========================================
// 3. PYTHON SPATIAL GEOFENCING PROCESS HOOK
// ==========================================
const pythonExecutable = process.platform === 'win32' 
  ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
  : path.join(__dirname, 'venv', 'bin', 'python');

function runSpatialFilter(polygon, points) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonExecutable, [path.join(__dirname, 'python_engine', 'main.py')]);
    let output = '', errorOutput = '';
    pythonProcess.stdin.write(JSON.stringify({ polygon, points }));
    pythonProcess.stdin.end();
    pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });
    pythonProcess.on('close', (code) => {
      if (code !== 0) return reject(new Error(errorOutput || `Exit code ${code}`));
      try { resolve(JSON.parse(output).data || []); } catch (err) { reject(err); }
    });
  });
}

// ==========================================
// 4. SHELTERS & HAVERSINE ROUTING ENGINE
// ==========================================
const shelters = [
  { id: "sh_01", name: "Coastal Community Center A", lat: 11.940, lng: 79.835, capacity: 500, status: "OPEN" },
  { id: "sh_02", name: "Government High School Relief Hall", lat: 11.928, lng: 79.820, capacity: 1200, status: "OPEN" },
  { id: "sh_03", name: "Central Indoor Stadium", lat: 11.952, lng: 79.815, capacity: 3000, status: "OPEN" }
];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

let activeHazards = [];
async function syncHazardsToMemory() {
  try {
    const Hazard = require('./models/Hazard');
    const dbHazards = await Hazard.find({ status: { $ne: 'RESOLVED' } });
    activeHazards = dbHazards.map(h => ({
      id: h._id.toString(), type: h.type, severity: h.severity, description: h.description,
      lat: h.lat, lng: h.lng, image_url: h.imageUrl, reported_by: h.reportedBy, timestamp: h.reportedAt.toISOString()
    }));
  } catch (e) { console.log('[DB] Could not sync hazards to memory.'); }
}
syncHazardsToMemory();

function isPathBlockedByHazard(cLat, cLng, sLat, sLng, hLat, hLng, thresholdKm = 0.4) {
  const d1 = calculateDistance(cLat, cLng, hLat, hLng);
  const d2 = calculateDistance(hLat, hLng, sLat, sLng);
  const direct = calculateDistance(cLat, cLng, sLat, sLng);
  return (d1 + d2) <= (direct + thresholdKm);
}

function findSafeShelter(userLat, userLng) {
  let bestShelter = null, minWeightedDist = Infinity;
  for (const s of shelters) {
    let actualDist = calculateDistance(userLat, userLng, s.lat, s.lng);
    let effectiveDist = actualDist;
    if (activeHazards.some(h => isPathBlockedByHazard(userLat, userLng, s.lat, s.lng, h.lat, h.lng))) effectiveDist += 10.0;
    if (effectiveDist < minWeightedDist) {
      minWeightedDist = effectiveDist;
      bestShelter = { ...s, distance_km: actualDist, rerouted: effectiveDist > actualDist };
    }
  }
  return bestShelter;
}

const alertTranslations = {
  ta: { CYCLONE: "புயல் எச்சரிக்கை: உடனடியாக பாதுகாப்பான நிவாரண முகாமுக்கு செல்லவும்.", FLOOD: "வெள்ள எச்சரிக்கை: மேடான பகுதிக்கு உடனடியாக செல்லவும்.", TSUNAMI: "சுனாமி எச்சரிக்கை: கடலோர பகுதியை விட்டு உடனடியாக வெளியேறவும்." },
  hi: { CYCLONE: "चक्रवात चेतावनी: तुरंत निकटतम राहत शिविर में पहुंचे।", FLOOD: "बाढ़ चेतावनी: तुरंत ऊंचे स्थान पर जाएं।", TSUNAMI: "सुनामी चेतावनी: तुरंत तटीय क्षेत्र खाली करें।" },
  en: { CYCLONE: "Cyclone Warning: Evacuate to the nearest relief shelter immediately.", FLOOD: "Flood Alert: Move to higher ground immediately.", TSUNAMI: "Tsunami Alert: Evacuate coastal area immediately." }
};

// ==========================================
// 5. INBOUND 3-TIER CITIZEN SOS PIPELINE
// ==========================================
const TRIAGE_PRIORITY = { RED: 3, YELLOW: 2, BLUE: 1 };
let rescueRequests = [
  { id: "sos_101", name: "Ravi Kumar & Family", phone: "+919876543210", lat: 11.9350, lng: 79.8300, trapped_count: 3, triage_level: "RED", priority_score: 3, medical_need: true, status: "PENDING", timestamp: new Date().toISOString() }
];

app.post('/api/rescue/sos-request', (req, res) => {
  const { name, phone, lat, lng, trapped_count = 1, triage_level = "RED", medical_need = false, notes } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: "Valid latitude and longitude coordinates are required." });
  const cleanTriage = ['RED', 'YELLOW', 'BLUE'].includes(String(triage_level).toUpperCase()) ? String(triage_level).toUpperCase() : 'RED';
  const newSOS = {
    id: `sos_${Date.now().toString().slice(-4)}`, name: name || "Anonymous Citizen", phone: phone || "Unknown",
    lat: Number(lat), lng: Number(lng), trapped_count: Number(trapped_count), triage_level: cleanTriage,
    priority_score: TRIAGE_PRIORITY[cleanTriage], medical_need: Boolean(medical_need || cleanTriage === 'YELLOW' || cleanTriage === 'RED'),
    notes: notes || "", status: "PENDING", timestamp: new Date().toISOString()
  };
  rescueRequests.push(newSOS);
  rescueRequests.sort((a, b) => b.priority_score - a.priority_score);
  broadcastEvent({ event: 'NEW_SOS_ALERT', sos: newSOS, total_pending: rescueRequests.filter(r => r.status === 'PENDING').length });
  return res.status(201).json({ success: true, message: "Distress beacon queued", sos: newSOS });
});

app.get('/api/rescue/active-sos', (req, res) => res.json({ total_pending: rescueRequests.filter(r => r.status === 'PENDING').length, requests: rescueRequests }));
app.patch('/api/rescue/resolve/:id', (req, res) => {
  const target = rescueRequests.find(r => r.id === req.params.id);
  if (!target) return res.status(404).json({ error: "Distress request ID not found." });
  target.status = req.body.status || "RESCUE_DISPATCHED";
  broadcastEvent({ event: 'SOS_STATUS_UPDATED', sos_id: req.params.id, status: target.status });
  return res.json({ success: true, updated: target });
});

// ==========================================
// 6. CROWDSOURCED HAZARDS & DYNAMIC ROUTING
// ==========================================
app.use('/api/hazards', hazardRoutes);

app.post('/api/routing/evacuation-route', (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ success: false, message: "Valid latitude and longitude required." });
  const evaluatedShelters = shelters.map(shelter => {
    let baseDistanceKm = calculateDistance(lat, lng, shelter.lat, shelter.lng);
    let penaltyScoreKm = 0, blockingHazards = [];
    activeHazards.forEach(hazard => {
      if (isPathBlockedByHazard(lat, lng, shelter.lat, shelter.lng, hazard.lat, hazard.lng)) {
        penaltyScoreKm += 10.0; blockingHazards.push(hazard);
      }
    });
    return { shelter, direct_distance_km: baseDistanceKm, weighted_distance_km: Number((baseDistanceKm + penaltyScoreKm).toFixed(2)), has_hazard_penalty: blockingHazards.length > 0, blocking_hazards: blockingHazards };
  });
  evaluatedShelters.sort((a, b) => a.weighted_distance_km - b.weighted_distance_km);
  const bestOption = evaluatedShelters[0];
  const waypoints = [[lat, lng], ...(bestOption.has_hazard_penalty ? [[(lat + bestOption.shelter.lat) / 2 + 0.004, (lng + bestOption.shelter.lng) / 2 - 0.004]] : []), [bestOption.shelter.lat, bestOption.shelter.lng]];
  return res.json({
    success: true, destination_shelter: bestOption.shelter,
    route_metrics: { direct_distance_km: bestOption.direct_distance_km, weighted_distance_km: bestOption.weighted_distance_km, avoided_hazards_count: bestOption.blocking_hazards.length, estimated_travel_time_mins: Math.ceil(bestOption.weighted_distance_km * 4) },
    waypoints, alternative_shelters: evaluatedShelters.slice(1).map(e => ({ name: e.shelter.name, distance_km: e.direct_distance_km }))
  });
});

app.get('/api/routing/shelters', (req, res) => res.json({ success: true, shelters }));
app.post('/api/alert/geofence-preview', async (req, res) => {
  try {
    const { polygon } = req.body;
    if (!polygon || polygon.length < 3) return res.status(400).json({ error: 'Valid polygon coordinates required' });
    const affectedTargets = await runSpatialFilter(polygon, citizens);
    return res.json({ success: true, total_in_zone: affectedTargets.length, targets: affectedTargets });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

app.post('/api/alert/dispatch', async (req, res) => {
  try {
    const { polygon, alertType = 'CYCLONE', severity = 'EXTREME', customMessage } = req.body;
    const affectedTargets = await runSpatialFilter(polygon, citizens);
    const cellTowers = affectedTargets.filter(t => t.type === 'cell_tower');
    const directUsers = affectedTargets.filter(t => t.phone).map(user => {
      const lang = user.language || 'en';
      const localizedBody = customMessage || (alertTranslations[lang] && alertTranslations[lang][alertType]) || alertTranslations.en[alertType];
      const assignedShelter = findSafeShelter(user.lat, user.lng);
      return { ...user, alertMessage: localizedBody, evacuationVector: { shelterId: assignedShelter.id, shelterName: assignedShelter.name, distance_km: assignedShelter.distance_km, rerouted: assignedShelter.rerouted || false, shelterCoordinates: [assignedShelter.lng, assignedShelter.lat] } };
    });
    res.json({ status: 'DISPATCH_TRIGGERED', stats: { total_targeted: affectedTargets.length, whatsapp_queued: directUsers.length, cell_towers_targeted: cellTowers.length }, targets: directUsers, timestamp: new Date().toISOString() });
    broadcastEvent({ event: 'EMERGENCY_BROADCAST', tier: 'CELL_BROADCAST_RADIO', alertType, severity, message: alertTranslations.en[alertType] || customMessage, hazardPolygon: polygon, affectedCellIds: cellTowers.map(t => t.cell_id), timestamp: new Date().toISOString() });
  } catch (error) { if (!res.headersSent) return res.status(500).json({ error: error.message }); }
});

app.get('/api/shelters', (req, res) => res.json(shelters));
app.get('/api/hazards/presets', (req, res) => res.json({ preset_cyclone: [[79.820, 11.930], [79.840, 11.930], [79.840, 11.950], [79.820, 11.950], [79.820, 11.930]] }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`[VULCAN CORE] Backend & WebSocket Server active on http://localhost:${PORT}`));