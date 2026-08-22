const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const citizens = require('./mock_data/citizens.json');

const app = express();
app.use(cors());
app.use(express.json());

// Path to python executable inside your venv (Windows)
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

// 1. Preview endpoint for Sara's map drawer
app.post('/api/alert/geofence-preview', async (req, res) => {
  try {
    const { polygon } = req.body; // array of [lng, lat]
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

// 2. Dispatch trigger endpoint
app.post('/api/alert/dispatch', async (req, res) => {
  try {
    const { polygon, alertType, severity, message } = req.body;
    
    const affectedTargets = await runSpatialFilter(polygon, citizens);
    const directUsers = affectedTargets.filter(t => t.phone);
    const cellTowers = affectedTargets.filter(t => t.type === 'cell_tower');

    console.log(`[DISPATCH] Alert Triggered: ${directUsers.length} users, ${cellTowers.length} cell towers targeted.`);

    return res.json({
      status: 'DISPATCH_TRIGGERED',
      stats: {
        whatsapp_queued: directUsers.length,
        cell_towers_targeted: cellTowers.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Vulcan Backend Engine running on http://localhost:${PORT}`);
});