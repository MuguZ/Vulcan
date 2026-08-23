const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const citizens = require('./mock_data/citizens.json');

const app = express();
app.use(cors());
app.use(express.json());

// 1. HTTP & WebSocket Server Initialization
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

function broadcastEvent(payload) {
  const data = JSON.stringify(payload);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// 2. Python Spatial Geofencing Process Hook
const pythonExecutable = path.join(__dirname, 'venv', 'Scripts', 'python.exe');

function runSpatialFilter(polygon, points) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonExecutable, [
      path.join(__dirname, 'python_engine', 'main.py')
    ]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdin.write(JSON.stringify({ polygon, points }));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    pythonProcess.on('close', (code) => {
      if (code !== 0) return reject(new Error(errorOutput || `Exit code ${code}`));
      try {
        const parsed = JSON.parse(output);
        resolve(parsed.data || []);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// 3. Shelters Directory & Dynamic Haversine Routing Engine
const shelters = [
  { id: "sh_01", name: "Coastal Community Center A", lat: 11.940, lng: 79.835, capacity: 500 },
  { id: "sh_02", name: "Government High School Relief Hall", lat: 11.928, lng: 79.820, capacity: 1200 },
  { id: "sh_03", name: "Central Indoor Stadium", lat: 11.952, lng: 79.815, capacity: 3000 }
];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Crowdsourced Ground Obstacles
let activeHazards = [
  {
    id: "haz_01",
    type: "ROAD_FLOODED",
    severity: "CRITICAL",
    description: "Beach Road submerged under 4ft water. Impassable.",
    lat: 11.937,
    lng: 79.834,
    reported_by: "Ground Volunteer 04",
    timestamp: new Date().toISOString()
  }
];

// Obstacle-Aware Safe Shelter Routing
function findSafeShelter(userLat, userLng) {
  let bestShelter = null;
  let minWeightedDist = Infinity;

  for (const s of shelters) {
    let actualDist = calculateDistance(userLat, userLng, s.lat, s.lng);
    let effectiveDist = actualDist;

    // Check if an active severe roadblock is within 400m of the direct vector
    const blockedByHazard = activeHazards.some(h => 
      calculateDistance(h.lat, h.lng, s.lat, s.lng) < 0.4 ||
      calculateDistance(h.lat, h.lng, userLat, userLng) < 0.3
    );

    if (blockedByHazard) {
      effectiveDist += 10.0; // Penalty weight forces routing to alternate safe shelter
    }

    if (effectiveDist < minWeightedDist) {
      minWeightedDist = effectiveDist;
      bestShelter = { ...s, distance_km: actualDist, rerouted: blockedByHazard };
    }
  }
  return bestShelter;
}

const alertTranslations = {
  ta: {
    CYCLONE: "புயல் எச்சரிக்கை: உடனடியாக பாதுகாப்பான நிவாரண முகாமுக்கு செல்லவும்.",
    FLOOD: "வெள்ள எச்சரிக்கை: மேடான பகுதிக்கு உடனடியாக செல்லவும்.",
    TSUNAMI: "சுனாமி எச்சரிக்கை: கடலோர பகுதியை விட்டு உடனடியாக வெளியேறவும்."
  },
  hi: {
    CYCLONE: "चक्रवात चेतावनी: तुरंत निकटतम राहत शिविर में पहुंचे।",
    FLOOD: "बाढ़ चेतावनी: तुरंत ऊंचे स्थान पर जाएं।",
    TSUNAMI: "सुनामी चेतावनी: तुरंत तटीय क्षेत्र खाली करें।"
  },
  en: {
    CYCLONE: "Cyclone Warning: Evacuate to the nearest relief shelter immediately.",
    FLOOD: "Flood Alert: Move to higher ground immediately.",
    TSUNAMI: "Tsunami Alert: Evacuate coastal area immediately."
  }
};

// ==========================================
// 4. INBOUND 3-TIER CITIZEN SOS RESCUE PIPELINE
// ==========================================

const TRIAGE_PRIORITY = { RED: 3, YELLOW: 2, BLUE: 1 };

let rescueRequests = [
  {
    id: "sos_101",
    name: "Ravi Kumar & Family",
    phone: "+919876543210",
    lat: 11.9350,
    lng: 79.8300,
    trapped_count: 3,
    triage_level: "RED",
    priority_score: 3,
    medical_need: true,
    status: "PENDING",
    timestamp: new Date().toISOString()
  }
];

// A. Citizen Ingestion Route (Offline PWA / SMS Fallback / Mobile Simulator)
app.post('/api/rescue/sos-request', (req, res) => {
  const { 
    name, 
    phone, 
    lat, 
    lng, 
    trapped_count = 1, 
    triage_level = "RED", 
    medical_need = false,
    notes 
  } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Valid latitude and longitude coordinates are required." });
  }

  const cleanTriage = ['RED', 'YELLOW', 'BLUE'].includes(String(triage_level).toUpperCase())
    ? String(triage_level).toUpperCase()
    : 'RED';

  const newSOS = {
    id: `sos_${Date.now().toString().slice(-4)}`,
    name: name || "Anonymous Citizen",
    phone: phone || "Unknown",
    lat: Number(lat),
    lng: Number(lng),
    trapped_count: Number(trapped_count),
    triage_level: cleanTriage,
    priority_score: TRIAGE_PRIORITY[cleanTriage],
    medical_need: Boolean(medical_need || cleanTriage === 'YELLOW' || cleanTriage === 'RED'),
    notes: notes || "",
    status: "PENDING",
    timestamp: new Date().toISOString()
  };

  rescueRequests.push(newSOS);
  // Sort queue by priority: RED (3) -> YELLOW (2) -> BLUE (1)
  rescueRequests.sort((a, b) => b.priority_score - a.priority_score);

  // Broadcast immediate high-priority alert to Sara's Command Console
  broadcastEvent({
    event: 'NEW_SOS_ALERT',
    sos: newSOS,
    total_pending: rescueRequests.filter(r => r.status === 'PENDING').length
  });

  console.log(`[SOS INGESTION] ${newSOS.triage_level} Alert Logged: ${newSOS.id} at [${newSOS.lat}, ${newSOS.lng}]`);
  return res.status(201).json({ success: true, message: "Distress beacon queued", sos: newSOS });
});

// B. Operator: Retrieve Active Distress Beacons
app.get('/api/rescue/active-sos', (req, res) => {
  res.json({
    total_pending: rescueRequests.filter(r => r.status === 'PENDING').length,
    requests: rescueRequests
  });
});

// C. Operator: Dispatch Rescue Team / Resolve Status
app.patch('/api/rescue/resolve/:id', (req, res) => {
  const { id } = req.params;
  const target = rescueRequests.find(r => r.id === id);

  if (!target) {
    return res.status(404).json({ error: "Distress request ID not found." });
  }

  target.status = req.body.status || "RESCUE_DISPATCHED";

  broadcastEvent({
    event: 'SOS_STATUS_UPDATED',
    sos_id: id,
    status: target.status
  });

  return res.json({ success: true, updated: target });
});

// ==========================================
// 5. CROWDSOURCED HAZARD & OBSTACLE GRID
// ==========================================

// Ingest Citizen / Volunteer Ground Hazard
app.post('/api/hazards/report', (req, res) => {
  const { type, severity = "HIGH", description, lat, lng, reported_by } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Coordinates required for hazard pinning." });
  }

  const newHazard = {
    id: `haz_${Date.now().toString().slice(-4)}`,
    type: type || "ROAD_BLOCKED",
    severity,
    description: description || "Hazard reported on transit corridor",
    lat: Number(lat),
    lng: Number(lng),
    reported_by: reported_by || "Anonymous Volunteer",
    timestamp: new Date().toISOString()
  };

  activeHazards.unshift(newHazard);

  broadcastEvent({
    event: 'NEW_HAZARD_REPORTED',
    hazard: newHazard,
    total_hazards: activeHazards.length
  });

  console.log(`[HAZARD] Obstacle pinned: ${newHazard.type} at [${newHazard.lat}, ${newHazard.lng}]`);
  return res.status(201).json({ success: true, hazard: newHazard });
});

app.get('/api/hazards/active', (req, res) => {
  res.json({ total_active: activeHazards.length, hazards: activeHazards });
});

// ==========================================
// 6. OUTBOUND WARNING & GEOFENCING ROUTES
// ==========================================

// Geofence Warning Preview
app.post('/api/alert/geofence-preview', async (req, res) => {
  try {
    const { polygon } = req.body;
    if (!polygon || polygon.length < 3) {
      return res.status(400).json({ error: 'Valid polygon coordinates required' });
    }

    const affectedTargets = await runSpatialFilter(polygon, citizens);
    return res.json({
      success: true,
      total_in_zone: affectedTargets.length,
      targets: affectedTargets
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Outbound Disaster Dispatch Trigger
app.post('/api/alert/dispatch', async (req, res) => {
  try {
    const { 
      polygon, 
      alertType = 'CYCLONE', 
      severity = 'EXTREME', 
      customMessage 
    } = req.body;

    const affectedTargets = await runSpatialFilter(polygon, citizens);
    const cellTowers = affectedTargets.filter(t => t.type === 'cell_tower');
    const cellIds = cellTowers.map(t => t.cell_id);

    const directUsers = affectedTargets
      .filter(t => t.phone)
      .map(user => {
        const lang = user.language || 'en';
        const localizedBody = customMessage || (alertTranslations[lang] && alertTranslations[lang][alertType]) || alertTranslations.en[alertType];
        const assignedShelter = findSafeShelter(user.lat, user.lng);

        return {
          ...user,
          alertMessage: localizedBody,
          evacuationVector: {
            shelterId: assignedShelter.id,
            shelterName: assignedShelter.name,
            distance_km: assignedShelter.distance_km,
            rerouted: assignedShelter.rerouted || false,
            shelterCoordinates: [assignedShelter.lng, assignedShelter.lat]
          }
        };
      });

    res.json({
      status: 'DISPATCH_TRIGGERED',
      stats: {
        total_targeted: affectedTargets.length,
        whatsapp_queued: directUsers.length,
        cell_towers_targeted: cellTowers.length
      },
      targets: directUsers,
      timestamp: new Date().toISOString()
    });

    // Native Cell Broadcast blast over WebSocket
    broadcastEvent({
      event: 'EMERGENCY_BROADCAST',
      tier: 'CELL_BROADCAST_RADIO',
      alertType,
      severity,
      message: alertTranslations.en[alertType] || customMessage,
      hazardPolygon: polygon,
      affectedCellIds: cellIds,
      timestamp: new Date().toISOString()
    });

    // Telemetry Delivery Stream Simulation
    let deliveredCount = 0;
    let readCount = 0;

    const interval = setInterval(() => {
      if (deliveredCount < directUsers.length) {
        deliveredCount += Math.min(2, directUsers.length - deliveredCount);
        broadcastEvent({
          event: 'TELEMETRY_UPDATE',
          metric: 'WHATSAPP_DELIVERED',
          delivered: deliveredCount,
          total: directUsers.length,
          timestamp: new Date().toISOString()
        });
      } else if (readCount < directUsers.length) {
        readCount += Math.min(1, directUsers.length - readCount);
        broadcastEvent({
          event: 'TELEMETRY_UPDATE',
          metric: 'WHATSAPP_READ',
          read: readCount,
          total: directUsers.length,
          timestamp: new Date().toISOString()
        });
      } else {
        clearInterval(interval);
        broadcastEvent({
          event: 'DISPATCH_COMPLETED',
          summary: {
            total: directUsers.length,
            delivered: deliveredCount,
            read: readCount
          },
          timestamp: new Date().toISOString()
        });
      }
    }, 600);

  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
  }
});

app.get('/api/shelters', (req, res) => res.json(shelters));

app.get('/api/hazards/presets', (req, res) => {
  res.json({
    preset_cyclone: [
      [79.820, 11.930],
      [79.840, 11.930],
      [79.840, 11.950],
      [79.820, 11.950],
      [79.820, 11.930]
    ]
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Vulcan Backend & WebSocket Server active on http://localhost:${PORT}`);
});