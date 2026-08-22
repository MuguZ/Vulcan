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

// Relief Shelters Directory
const shelters = [
  { id: "sh_01", name: "Coastal Community Center A", lat: 11.940, lng: 79.835, capacity: 500 },
  { id: "sh_02", name: "Government High School Relief Hall", lat: 11.928, lng: 79.820, capacity: 1200 },
  { id: "sh_03", name: "Central Indoor Stadium", lat: 11.952, lng: 79.815, capacity: 3000 }
];

// Haversine Distance Calculator (km)
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

function findNearestShelter(userLat, userLng) {
  let nearest = null;
  let minDistance = Infinity;

  for (const s of shelters) {
    const dist = calculateDistance(userLat, userLng, s.lat, s.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = { ...s, distance_km: dist };
    }
  }
  return nearest;
}

// Multi-lingual Translation Matrix
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

// 1. Geofence Preview Endpoint (Sara's HUD)
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

// 2. Dispatch Trigger + Localized Routing + Live Telemetry
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

    // Enrich direct citizen targets with nearest shelter & localized messages
    const directUsers = affectedTargets
      .filter(t => t.phone)
      .map(user => {
        const lang = user.language || 'en';
        const localizedBody = customMessage || (alertTranslations[lang] && alertTranslations[lang][alertType]) || alertTranslations.en[alertType];
        const assignedShelter = findNearestShelter(user.lat, user.lng);

        return {
          ...user,
          alertMessage: localizedBody,
          evacuationVector: {
            shelterId: assignedShelter.id,
            shelterName: assignedShelter.name,
            distance_km: assignedShelter.distance_km,
            shelterCoordinates: [assignedShelter.lng, assignedShelter.lat]
          }
        };
      });

    // 1. Operator HTTP Response
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

    // 2. Stage 1: Native Cell Broadcast Radio blast over WebSocket
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

    // 3. Stage 2: WhatsApp Delivery Telemetry Simulation
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

// 3. Static Shelters & Hazard Presets
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