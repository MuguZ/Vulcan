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

// 1. Create HTTP & WebSocket server wrapper
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on('connection', (ws) => {
  clients.push(ws);
  console.log(`[WS] Client connected. Total active clients: ${clients.length}`);

  // Send initial handshake confirmation to the client
  ws.send(JSON.stringify({ event: 'CONNECTED', message: 'Connected to Vulcan Realtime Engine' }));

  ws.on('close', () => {
    clients = clients.filter((c) => c !== ws);
    console.log(`[WS] Client disconnected. Total active clients: ${clients.length}`);
  });
});

// Broadcast helper to stream data to test client, Sara's dashboard, and Muthu's simulator
function broadcastEvent(payload) {
  const data = JSON.stringify(payload);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Windows Python venv binary path
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

// 2. Dispatch Trigger + Live Telemetry Streaming
app.post('/api/alert/dispatch', async (req, res) => {
  try {
    const { 
      polygon, 
      alertType = 'CYCLONE', 
      severity = 'EXTREME', 
      message = 'Evacuate to nearest shelter immediately.' 
    } = req.body;

    const affectedTargets = await runSpatialFilter(polygon, citizens);
    const directUsers = affectedTargets.filter(t => t.phone);
    const cellTowers = affectedTargets.filter(t => t.type === 'cell_tower');
    const cellIds = cellTowers.map(t => t.cell_id);

    // Immediate HTTP response back to operator
    res.json({
      status: 'DISPATCH_TRIGGERED',
      stats: {
        total_targeted: affectedTargets.length,
        whatsapp_queued: directUsers.length,
        cell_towers_targeted: cellTowers.length
      },
      timestamp: new Date().toISOString()
    });

    // Stage 1: Native Cell Broadcast blast over WebSocket (<200ms)
    broadcastEvent({
      event: 'EMERGENCY_BROADCAST',
      tier: 'CELL_BROADCAST_RADIO',
      alertType,
      severity,
      message,
      hazardPolygon: polygon,
      affectedCellIds: cellIds,
      timestamp: new Date().toISOString()
    });

    // Stage 2: Incremental WhatsApp Delivery Simulation
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

// 3. Shelters and Presets Endpoints
app.get('/api/shelters', (req, res) => {
  res.json([
    { id: "sh_01", name: "Coastal Community Center A", lat: 11.940, lng: 79.835, capacity: 500 },
    { id: "sh_02", name: "Government High School Relief Hall", lat: 11.928, lng: 79.820, capacity: 1200 },
    { id: "sh_03", name: "Central Indoor Stadium", lat: 11.952, lng: 79.815, capacity: 3000 }
  ]);
});

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

// Listen on HTTP server (which holds the WebSocket listener)
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Vulcan Backend & WebSocket Server active on http://localhost:${PORT}`);
});