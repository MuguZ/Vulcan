const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const Hazard = require('../models/Hazard');
const { upload, processImage } = require('../services/imageUpload');
const { analyzeHazardImage } = require('../services/aiAnalysis');

const router = express.Router();

const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 reports per IP
  message: { error: 'Too many hazard reports from this IP, please try again later.' }
});

const hazardSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  description: z.string().max(500).optional(),
  reportedBy: z.string().max(100).optional(),
  overrideType: z.string().optional(),
  overrideSeverity: z.string().optional()
});

router.post('/report', reportLimiter, upload.single('image'), async (req, res) => {
  try {
    const validation = hazardSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });

    const { lat, lng, description, reportedBy, overrideType, overrideSeverity } = validation.data;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'Image is required for hazard reporting.' });

    const imageUrl = await processImage(file);
    const aiAnalysis = await analyzeHazardImage(file.path, description);

    const finalType = overrideType || aiAnalysis.detectedType;
    const finalSeverity = overrideSeverity || aiAnalysis.severity;

    const newHazard = new Hazard({
      type: finalType,
      severity: finalSeverity,
      description: description || aiAnalysis.explanation,
      lat, lng, imageUrl,
      reportedBy: reportedBy || 'Anonymous',
      aiAnalysis
    });

    await newHazard.save();

    // Broadcast via WebSocket
    const wss = req.app.locals.wss;
    if (wss) {
      const payload = JSON.stringify({
        event: 'NEW_HAZARD_REPORTED',
        hazard: newHazard,
        total_hazards: await Hazard.countDocuments({ status: { $ne: 'RESOLVED' } })
      });
      wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(payload); // 1 = WebSocket.OPEN
      });
    }

    res.status(201).json({ success: true, hazard: newHazard });
  } catch (error) {
    console.error('[Hazard Report Error]:', error);
    res.status(500).json({ error: 'Failed to process hazard report.' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const hazards = await Hazard.find({ status: { $ne: 'RESOLVED' } }).sort({ reportedAt: -1 });
    res.json({ total_active: hazards.length, hazards });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active hazards.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const hazard = await Hazard.findById(req.params.id);
    if (!hazard) return res.status(404).json({ error: 'Hazard not found.' });
    res.json({ hazard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hazard.' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['PENDING', 'VERIFIED', 'RESOLVED'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    
    const hazard = await Hazard.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!hazard) return res.status(404).json({ error: 'Hazard not found.' });

    const wss = req.app.locals.wss;
    if (wss) {
      const payload = JSON.stringify({ event: 'HAZARD_STATUS_UPDATED', hazard });
      wss.clients.forEach((client) => { if (client.readyState === 1) client.send(payload); });
    }
    res.json({ success: true, hazard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update hazard status.' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await Hazard.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $group: { _id: null, total: { $sum: '$count' }, byStatus: { $push: { status: '$_id', count: '$count' } } } }
    ]);
    res.json({ stats: stats[0] || { total: 0, byStatus: [] } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;