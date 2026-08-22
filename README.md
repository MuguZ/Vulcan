# ⚡ Project Vulcan
> **Hyper-Local Precision Disaster Early Warning & Zero-Connectivity Offline SOS Rescue Grid**

---

## 📌 Problem Overview
During major coastal disasters (cyclones, flash floods, tsunamis), telecom backbones collapse. This leaves trapped citizens unable to request emergency aid and forces State Disaster Response Forces (SDRF) into blind rescue operations. Project Vulcan provides a resilient, two-way disaster lifecycle management platform operating across zero-internet and high-bandwidth environments.

---

## 🏗️ System Architecture

[ Citizen Offline SOS PWA ]           [ State Emergency Operator Console ]
│ (GPS Extraction & SMS Fallback)       │ (Leaflet Hazard Polygons & SOS HUD)
▼                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        VULCAN BACKEND CORE                             │
│                                                                        │
│  • Express HTTP REST API              • Python Shapely Spatial Engine  │
│  • Persistent WebSocket Gateway        • Haversine Shelter Routing     │
│  • Multilingual Translation Matrix    • In-Memory Rescue SOS Queue     │
└────────────────────────────────────────────────────────────────────────┘


---

## 🚀 Key Modules & Endpoints

### 1. Inbound Citizen SOS Pipeline
* `POST /api/rescue/sos-request`: Ingests distress calls with GPS coordinates, casualty counts, and medical status.
* `GET /api/rescue/active-sos`: Retrieves pending distress beacons for operator HUD mapping.
* `PATCH /api/rescue/resolve/:id`: Updates rescue status (`PENDING` ➔ `RESCUE_DISPATCHED` ➔ `RESOLVED`).

### 2. Outbound Early Warning & Geofencing
* `POST /api/alert/geofence-preview`: Executes Point-in-Polygon spatial checks against citizen datasets.
* `POST /api/alert/dispatch`: Initiates cell broadcast alerts, WhatsApp queues, and dynamic shelter routing.
* `GET /api/shelters`: Returns cached shelter coordinates for offline navigation.

### 3. Real-Time WebSocket Gateway (`ws://localhost:5000`)
* `EMERGENCY_BROADCAST`: Triggers lock-screen sirens on targeted devices.
* `NEW_SOS_ALERT`: Pushes inbound citizen distress beacons directly to operator dashboards.
* `TELEMETRY_UPDATE`: Streams live delivery counters.

---

## 🛠️ Local Development Setup

### 1. Backend Engine
```bash
cd backend
.\venv\Scripts\Activate.ps1
npm install
node server.js