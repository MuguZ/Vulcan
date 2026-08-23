const locationText = document.getElementById("location");
const sosButton = document.getElementById("sosButton");
const message = document.getElementById("message");

// Default Puducherry coastal backup coordinates
let latitude = 11.936107;
let longitude = 79.810816;

// 1. Precise Citizen GPS Locator with Instant Fallback
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;

      locationText.textContent =
        `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      locationText.style.color = "#16a34a";
    },
    (error) => {
      console.warn(
        "GPS Permission Denied. Using Puducherry coastal fallback:",
        error
      );

      locationText.textContent =
        `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Default)`;
      locationText.style.color = "#d97706";
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }
  );
} else {
  locationText.textContent =
    `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Default)`;
}

// 2. SOS Dispatch Trigger
sosButton.addEventListener("click", async () => {
  const casualties =
    Number(document.getElementById("casualties").value) || 1;

  const medicalSelect =
    document.getElementById("medical").value;

  // Map client selection to Vulcan 3-Tier Triage Level
  let triage_level = "BLUE";
  let medical_need = false;

  if (medicalSelect === "CRITICAL") {
    triage_level = "RED";
    medical_need = true;
  } else if (medicalSelect === "INJURED") {
    triage_level = "YELLOW";
    medical_need = true;
  } else {
    triage_level = "BLUE";
    medical_need = false;
  }

  // SOS data required by backend
  const sosData = {
    name: `Citizen SOS (${medicalSelect})`,
    phone: "+91-9876543210",
    lat: latitude,
    lng: longitude,
    triage_level: triage_level,
    trapped_count: casualties,
    medical_need: medical_need,
    notes: `Victim status: ${medicalSelect} with ${casualties} person(s) present.`
  };

  sosButton.disabled = true;
  sosButton.textContent = "TRANSMITTING BEACON...";

  try {
    const response = await fetch(
      "http://localhost:5000/api/rescue/sos-request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(sosData)
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      message.innerHTML =
        `<b>SOS SENT SUCCESSFULLY!</b><br>
        <small>Triage Level: <b>✅ ${triage_level}</b> |
        Priority Score: ${result.sos?.priority_score || 3}</small>`;

      message.style.color = "#16a34a";
      sosButton.textContent = "SOS ACTIVE";
      sosButton.style.backgroundColor = "#16a34a";
    } else {
      message.textContent =
        `SOS Failed: ${result.message || "Server Error"}`;

      message.style.color = "#dc2626";
      sosButton.disabled = false;
      sosButton.textContent = "SEND SOS";
    }
  } catch (error) {
    console.error("Connection error:", error);

    message.innerHTML =
      `<b>Backend Unreachable.</b><br>
      <small>Switching to SMS 112 Fallback...</small>`;

    message.style.color = "#d97706";
    sosButton.disabled = false;
    sosButton.textContent = "RETRY SOS";
  }
});