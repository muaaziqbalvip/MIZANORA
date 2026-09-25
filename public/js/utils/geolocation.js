// =====================================================================
// MIZANORA — Geolocation → Address helper
//
// Uses the browser's GPS (navigator.geolocation) plus OpenStreetMap's
// free Nominatim reverse-geocoding API (no API key required) to turn
// the user's current location into a fillable address/city/province.
// =====================================================================

const PROVINCE_MAP = {
  "Punjab": "Punjab",
  "Sindh": "Sindh",
  "Khyber Pakhtunkhwa": "Khyber Pakhtunkhwa",
  "Balochistan": "Balochistan",
  "Gilgit-Baltistan": "Gilgit-Baltistan",
  "Azad Kashmir": "Azad Kashmir",
  "Islamabad Capital Territory": "Islamabad Capital Territory",
  "Islamabad": "Islamabad Capital Territory"
};

/**
 * Asks for GPS permission, then reverse-geocodes the coordinates into
 * an address. Throws a friendly Error on any failure (permission
 * denied, no GPS, network failure) — callers should catch and show
 * err.message to the user.
 */
export function getCurrentLocationAddress() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Location isn't supported on this device/browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          if (!res.ok) throw new Error("lookup-failed");
          const data = await res.json();
          const a = data.address || {};

          const line = [a.house_number, a.road || a.neighbourhood || a.suburb]
            .filter(Boolean).join(" ") || data.display_name?.split(",")[0] || "";
          const areaLine = [a.suburb, a.neighbourhood].filter((v, i, arr) => v && arr.indexOf(v) === i).join(", ");

          resolve({
            address: [line, areaLine].filter(Boolean).join(", "),
            city: a.city || a.town || a.village || a.county || "",
            province: PROVINCE_MAP[a.state] || a.state || "",
            postalCode: a.postcode || "",
            lat: latitude,
            lng: longitude
          });
        } catch {
          reject(new Error("Couldn't detect your address from GPS. Please enter it manually."));
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission denied. Please allow location access or enter your address manually."));
        } else {
          reject(new Error("Couldn't get your location. Please enter your address manually."));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}
