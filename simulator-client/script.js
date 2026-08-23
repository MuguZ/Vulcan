const locationText = document.getElementById("location");
const sosButton = document.getElementById("sosButton");
const message = document.getElementById("message");

let latitude = null;
let longitude = null;

// Get citizen GPS location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;

            locationText.textContent =
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        },
        () => {
            locationText.textContent = "Location unavailable";
        }
    );
} else {
    locationText.textContent = "GPS not supported";
}


// Send SOS
sosButton.addEventListener("click", async () => {

    const casualties =
        Number(document.getElementById("casualties").value);

    const medicalStatus =
        document.getElementById("medical").value;

    if (latitude === null || longitude === null) {
        message.textContent = "⚠️ Waiting for GPS location...";
        return;
    }

    if (casualties < 1) {
        message.textContent = "⚠️ Enter at least 1 person.";
        return;
    }

    // Convert our simulator data
    // into the format expected by Vulcan backend
    const sosData = {
        name: "Simulator Citizen",
        phone: "SIMULATOR",
        lat: latitude,
        lng: longitude,
        trapped_count: casualties,
        medical_need: medicalStatus !== "NO_INJURY"
    };

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

        if (response.ok) {

            message.textContent =
                "✅ SOS sent successfully!";

            sosButton.disabled = true;
            sosButton.textContent = "SOS SENT";

            console.log("SOS Response:", result);

        } else {

            message.textContent =
                "❌ SOS failed: " +
                (result.error || "Server error");
        }

    } catch (error) {

        console.error("Connection error:", error);

        message.textContent =
            "❌ Cannot connect to Vulcan backend.";
    }
});