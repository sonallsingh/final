import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const doctorIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedDoctorIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type DoctorRow = {
  id: number;
  name?: string;
  specialization?: string;
  distanceKm: number;
  latitude?: number;
  longitude?: number;
};

type BookingState = {
  doctorId: number;
  datetime: string;
  notes: string;
  status: "idle" | "loading" | "success" | "error";
  message?: string;
};

type RouteInfo = {
  doctorId: number;
  coords: [number, number][];
  distanceKm: number;
  durationMin: number;
};

// ── Haversine distance (km) ────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Decode Google-style polyline ───────────────────────────────────────────────
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 13); }, [lat, lng, map]);
  return null;
}

export default function NearbyDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [bookings, setBookings] = useState<Record<number, BookingState>>({});
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState<number | null>(null);

  // ── Routing via OSRM (free, no API key) ──────────────────────────────────────
  async function getRoute(doc: DoctorRow) {
    if (!userPos || !doc.latitude || !doc.longitude) return;
    if (route?.doctorId === doc.id) { setRoute(null); return; } // toggle off
    setRouteLoading(doc.id);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/` +
        `${userPos.lng},${userPos.lat};${doc.longitude},${doc.latitude}` +
        `?overview=full&geometries=polyline`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.code === "Ok" && json.routes?.[0]) {
        const r = json.routes[0];
        setRoute({
          doctorId: doc.id,
          coords: decodePolyline(r.geometry),
          distanceKm: r.distance / 1000,
          durationMin: Math.round(r.duration / 60),
        });
      } else {
        // Fallback: straight line with haversine
        const dist = haversineKm(userPos.lat, userPos.lng, doc.latitude, doc.longitude);
        setRoute({
          doctorId: doc.id,
          coords: [[userPos.lat, userPos.lng], [doc.latitude, doc.longitude]],
          distanceKm: dist,
          durationMin: Math.round((dist / 30) * 60),
        });
      }
    } catch {
      // Fallback on network error
      const dist = haversineKm(userPos.lat, userPos.lng, doc.latitude!, doc.longitude!);
      setRoute({
        doctorId: doc.id,
        coords: [[userPos.lat, userPos.lng], [doc.latitude!, doc.longitude!]],
        distanceKm: dist,
        durationMin: Math.round((dist / 30) * 60),
      });
    } finally {
      setRouteLoading(null);
    }
  }

  async function fetchDoctors(lat: number, lng: number) {    setErr(null);
    setLoading(true);
    setUserPos({ lat, lng });
    try {
      const { data } = await api.post<DoctorRow[]>("/nearest-doctors", {
        latitude: lat,
        longitude: lng,
        limit: 5,
      });
      setDoctors(data);
      if (data.length === 0) {
        setErr("No doctors found nearby. Doctors need to set their location in their profile.");
      }
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setErr(ax.response?.data?.message ?? ax.message ?? "Failed to fetch doctors");
    } finally {
      setLoading(false);
    }
  }

  function locate() {
    setErr(null);
    setLoading(true);
    if (!navigator.geolocation) {
      setErr("Geolocation is not supported by your browser.");
      setGeoBlocked(true);
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchDoctors(pos.coords.latitude, pos.coords.longitude),
      () => {
        setGeoBlocked(true);
        setLoading(false);
        setErr("Location access denied. Please enter your coordinates manually below.");
      }
    );
  }

  function manualSearch(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      setErr("Please enter valid latitude and longitude values.");
      return;
    }
    fetchDoctors(lat, lng);
  }

  function initBooking(doctorId: number) {
    setBookings((prev) => ({
      ...prev,
      [doctorId]: { doctorId, datetime: "", notes: "", status: "idle" },
    }));
  }

  async function confirmBooking(doctorId: number) {
    const booking = bookings[doctorId];
    if (!booking?.datetime) return;
    setBookings((prev) => ({ ...prev, [doctorId]: { ...prev[doctorId], status: "loading" } }));
    try {
      const iso = new Date(booking.datetime).toISOString().slice(0, 19);
      await api.post("/appointments", {
        doctorId,
        appointmentDate: iso,
        notes: booking.notes || null,
      });
      setBookings((prev) => ({
        ...prev,
        [doctorId]: { ...prev[doctorId], status: "success", message: "Appointment booked! You'll receive a confirmation email." },
      }));
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setBookings((prev) => ({
        ...prev,
        [doctorId]: {
          ...prev[doctorId],
          status: "error",
          message: ax.response?.data?.message ?? ax.message ?? "Booking failed",
        },
      }));
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-ayur-leaf">Nearby Doctors</h2>
        <p className="text-sm text-stone-500 mt-1">
          Find the closest Ayurvedic doctors using your location.
        </p>
      </div>

      {/* Location controls */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <button
          type="button"
          onClick={locate}
          disabled={loading}
          className="w-full py-2 rounded-lg bg-ayur-moss text-white font-semibold hover:bg-ayur-leaf transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {loading ? "Locating…" : "📍 Use my location"}
        </button>

        {(geoBlocked || !userPos) && (
          <form onSubmit={manualSearch} className="space-y-2 pt-2 border-t border-stone-100">
            <p className="text-sm text-stone-600 font-medium">Or enter coordinates manually:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Latitude</label>
                <input
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                  placeholder="e.g. 28.6139"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Longitude</label>
                <input
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                  placeholder="e.g. 77.2090"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg border border-ayur-moss text-ayur-moss text-sm font-medium hover:bg-ayur-moss/5 transition"
            >
              Search
            </button>
          </form>
        )}
      </div>

      {/* Error */}
      {err && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
          {err}
        </div>
      )}

      {/* Map */}
      {userPos && (
        <div className="space-y-2">
          {route && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-800 flex items-center gap-3">
              <span>🗺️ Route to Dr. {doctors.find(d => d.id === route.doctorId)?.name}:</span>
              <span className="font-semibold">{route.distanceKm.toFixed(1)} km</span>
              <span>·</span>
              <span className="font-semibold">~{route.durationMin} min by car</span>
              <button
                type="button"
                onClick={() => setRoute(null)}
                className="ml-auto text-blue-500 hover:text-blue-700 text-xs"
              >
                ✕ Clear
              </button>
            </div>
          )}
          <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm" style={{ height: 360 }}>
            <MapContainer
              center={[userPos.lat, userPos.lng]}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap lat={userPos.lat} lng={userPos.lng} />

              {/* User location */}
              <Circle
                center={[userPos.lat, userPos.lng]}
                radius={300}
                pathOptions={{ color: "#4f7942", fillColor: "#4f7942", fillOpacity: 0.15 }}
              />
              <Marker position={[userPos.lat, userPos.lng]}>
                <Popup>📍 Your location</Popup>
              </Marker>

              {/* Route polyline */}
              {route && (
                <Polyline
                  positions={route.coords}
                  pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.8 }}
                />
              )}

              {/* Doctor markers */}
              {doctors.map((doc) =>
                doc.latitude && doc.longitude ? (
                  <Marker
                    key={doc.id}
                    position={[doc.latitude, doc.longitude]}
                    icon={route?.doctorId === doc.id ? selectedDoctorIcon : doctorIcon}
                  >
                    <Popup>
                      <strong>Dr. {doc.name}</strong><br />
                      {doc.specialization}<br />
                      <span className="text-green-700">{doc.distanceKm.toFixed(2)} km away</span>
                      {route?.doctorId === doc.id && (
                        <><br /><span className="text-blue-700">🗺️ {route.distanceKm.toFixed(1)} km · ~{route.durationMin} min</span></>
                      )}
                    </Popup>
                  </Marker>
                ) : null
              )}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Doctor cards */}
      {doctors.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">
            {doctors.length} doctor{doctors.length > 1 ? "s" : ""} found nearby
          </h3>
          {doctors.map((doc) => {
            const booking = bookings[doc.id];
            return (
              <div key={doc.id} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-stone-800">Dr. {doc.name ?? "Doctor"}</p>
                    <p className="text-sm text-stone-500">{doc.specialization ?? "General"}</p>
                  </div>
                  <span className="text-sm font-mono text-ayur-moss bg-ayur-moss/10 px-2 py-1 rounded-lg">
                    {doc.distanceKm.toFixed(2)} km
                  </span>
                </div>

                {!booking ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => initBooking(doc.id)}
                      className="flex-1 py-2 rounded-lg border border-ayur-moss text-ayur-moss text-sm font-medium hover:bg-ayur-moss/5 transition"
                    >
                      📅 Book Appointment
                    </button>
                    {doc.latitude && doc.longitude && (
                      <button
                        type="button"
                        onClick={() => getRoute(doc)}
                        disabled={routeLoading === doc.id}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition flex items-center gap-1 ${
                          route?.doctorId === doc.id
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-blue-300 text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {routeLoading === doc.id ? (
                          <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "🗺️"
                        )}
                        {route?.doctorId === doc.id ? "Hide Route" : "Directions"}
                      </button>
                    )}
                  </div>
                ) : booking.status === "success" ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                    ✅ {booking.message}
                  </div>
                ) : (
                  <div className="space-y-2 bg-stone-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-stone-600">Select date & time:</p>
                    <input
                      type="datetime-local"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                      value={booking.datetime}
                      onChange={(e) =>
                        setBookings((prev) => ({
                          ...prev,
                          [doc.id]: { ...prev[doc.id], datetime: e.target.value },
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                      value={booking.notes}
                      onChange={(e) =>
                        setBookings((prev) => ({
                          ...prev,
                          [doc.id]: { ...prev[doc.id], notes: e.target.value },
                        }))
                      }
                    />
                    {booking.status === "error" && (
                      <p className="text-xs text-red-600">{booking.message}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => confirmBooking(doc.id)}
                        disabled={!booking.datetime || booking.status === "loading"}
                        className="flex-1 py-2 rounded-lg bg-ayur-moss text-white text-sm font-medium disabled:opacity-50 hover:bg-ayur-leaf transition flex items-center justify-center gap-1"
                      >
                        {booking.status === "loading" && (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        Confirm Booking
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBookings((prev) => {
                            const next = { ...prev };
                            delete next[doc.id];
                            return next;
                          })
                        }
                        className="px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
