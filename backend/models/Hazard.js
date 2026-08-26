const mongoose = require('mongoose');

const hazardSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['COLLAPSED_BRIDGE', 'ROAD_FLOODED', 'BUILDING_COLLAPSE', 'DOWNED_POWER_LINE', 'LANDSLIDE', 'FIRE_DAMAGE', 'BLOCKED_ROAD', 'OTHER'], 
    required: true 
  },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  description: { type: String, maxlength: 500 },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  imageUrl: { type: String },
  reportedBy: { type: String, default: 'Anonymous' },
  reportedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['PENDING', 'VERIFIED', 'RESOLVED'], default: 'PENDING' },
  aiAnalysis: {
    detectedType: { type: String },
    confidence: { type: Number, min: 0, max: 1 },
    severity: { type: String },
    explanation: { type: String }
  }
}, { timestamps: true });

// Geo index for future spatial queries
hazardSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model('Hazard', hazardSchema);