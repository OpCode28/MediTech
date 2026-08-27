import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Navigation, MapPin, Hospital, CheckCircle2, Clock, ShieldCheck, RefreshCw, Activity, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function TripNavigation() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const tripId = Number(id);
  const token = localStorage.getItem("meditech-driver-token") || "driver-1";

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const ambulanceMarker = useRef<L.Marker | null>(null);
  const pickupMarker = useRef<L.Marker | null>(null);
  const hospitalMarker = useRef<L.Marker | null>(null);
  const polyline = useRef<L.Polyline | null>(null);

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gpsActive, setGpsActive] = useState(true);
  const [lastGpsSecs, setLastGpsSecs] = useState(0);
  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
  const [suitableHospitals, setSuitableHospitals] = useState<any[]>([]);
  const [selectingHospital, setSelectingHospital] = useState(false);

  // Default coordinates (Bhubaneswar, Odisha)
  const [ambPos, setAmbPos] = useState<[number, number]>([20.345, 85.812]);
  const [pickupPos, setPickupPos] = useState<[number, number]>([20.3533, 85.8189]);
  const [hospitalPos, setHospitalPos] = useState<[number, number] | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: ambPos,
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Custom Icon Generators
    const ambIcon = L.divIcon({
      html: `<div style="background:#0e7490; color:white; padding:6px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.5); text-align:center;">🚑</div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const pickupIcon = L.divIcon({
      html: `<div style="background:#dc2626; color:white; padding:6px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.5); text-align:center;">📍</div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    ambulanceMarker.current = L.marker(ambPos, { icon: ambIcon }).addTo(map).bindPopup("Ambulance Position");
    pickupMarker.current = L.marker(pickupPos, { icon: pickupIcon }).addTo(map).bindPopup("Patient Pickup Location");

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Fetch initial trip data
  async function fetchTrip() {
    try {
      const res = await fetch(`/api/trips/${tripId}/location`);
      if (res.ok) {
        const data = await res.json();
        setTrip(data);
        if (data.latitude && data.longitude) {
          const newAmb: [number, number] = [data.latitude, data.longitude];
          setAmbPos(newAmb);
          if (ambulanceMarker.current) ambulanceMarker.current.setLatLng(newAmb);
        }
      }
    } catch (err) {
      console.error("Error fetching trip location", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrip();
    const timer = setInterval(() => {
      setLastGpsSecs((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [tripId]);

  // Simulate or capture live device GPS movement
  useEffect(() => {
    const geoWatch = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsActive(true);
        setLastGpsSecs(0);
        updateLocationOnServer(lat, lng, pos.coords.speed || 35, pos.coords.heading || 90, pos.coords.accuracy || 5);
      },
      (err) => {
        console.warn("Geolocation watch error", err);
        setGpsActive(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );

    return () => navigator.geolocation.clearWatch(geoWatch);
  }, [tripId]);

  async function updateLocationOnServer(lat: number, lng: number, speed = 35, heading = 90, accuracy = 5) {
    const newPos: [number, number] = [lat, lng];
    setAmbPos(newPos);
    setLastGpsSecs(0);

    if (ambulanceMarker.current) {
      ambulanceMarker.current.setLatLng(newPos);
    }

    try {
      await fetch(`/api/trips/${tripId}/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng, speed, heading, accuracy }),
      });
    } catch (e) {
      console.error("Error posting location update", e);
    }
  }

  // Handle Trip State Machine Transitions
  async function advanceTripStatus(nextStatus: string) {
    try {
      const res = await fetch(`/api/trips/${tripId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error("Failed to update trip status");

      const data = await res.json();
      setTrip(data.trip);

      toast({
        title: "Status Updated",
        description: `Trip status set to ${nextStatus.replace(/_/g, " ").toUpperCase()}`,
      });

      if (nextStatus === "completed") {
        setTimeout(() => setLocation("/driver/dashboard"), 1500);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  // Fetch Smart Hospital Suitability Rankings
  async function loadNearestSuitableHospitals() {
    setHospitalModalOpen(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/nearest-hospitals`);
      if (res.ok) {
        const data = await res.json();
        setSuitableHospitals(data);
      }
    } catch (err) {
      toast({ title: "Error loading hospitals", variant: "destructive" });
    }
  }

  async function selectHospital(hospitalId: number) {
    setSelectingHospital(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/select-hospital`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hospitalId }),
      });

      if (!res.ok) throw new Error("Failed to assign hospital");

      const data = await res.json();
      setTrip(data.trip);
      setHospitalModalOpen(false);

      if (data.hospital) {
        const hPos: [number, number] = [data.hospital.latitude, data.hospital.longitude];
        setHospitalPos(hPos);

        const hospitalIcon = L.divIcon({
          html: `<div style="background:#16a34a; color:white; padding:6px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.5); text-align:center;">🏥</div>`,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        if (leafletMap.current) {
          hospitalMarker.current = L.marker(hPos, { icon: hospitalIcon }).addTo(leafletMap.current).bindPopup(data.hospital.name);
          leafletMap.current.fitBounds([ambPos, hPos], { padding: [50, 50] });
        }
      }

      toast({
        title: "Hospital Selected!",
        description: `En route to ${data.hospital.name}`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSelectingHospital(false);
    }
  }

  const currentStatus = trip?.status || "accepted";
  const isHospitalPhase = ["patient_picked_up", "en_route_to_hospital", "arrived_at_hospital"].includes(currentStatus);

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12">
      {/* Top Status & GPS Bar */}
      <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-600 rounded-lg">
            <Navigation className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-none text-cyan-300">
              TRIP #{tripId} — {currentStatus.replace(/_/g, " ").toUpperCase()}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              {isHospitalPhase ? "Route Phase 2: Patient → Hospital" : "Route Phase 1: Ambulance → Patient"}
            </p>
          </div>
        </div>

        <div className="text-right text-[11px]">
          {gpsActive ? (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> GPS: ACTIVE
            </span>
          ) : (
            <span className="font-bold text-amber-400">⚠️ GPS RECONNECTING</span>
          )}
          <p className="text-slate-400 text-[10px]">Updated {lastGpsSecs}s ago</p>
        </div>
      </div>

      {/* Interactive Map Box */}
      <Card className="overflow-hidden border-2 border-slate-300 shadow-md">
        <div ref={mapRef} className="h-72 w-full z-0" />
      </Card>

      {/* ETA & Distance Telemetry Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-cyan-50 border-cyan-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-cyan-700 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5" /> ESTIMATED ETA
            </div>
            <p className="text-2xl font-bold text-cyan-950 mt-1">{trip?.etaMinutes || 8} mins</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-700 text-xs font-semibold">
              <Navigation className="h-3.5 w-3.5" /> ROAD DISTANCE
            </div>
            <p className="text-2xl font-bold text-emerald-950 mt-1">{trip?.roadDistanceKm || 3.2} km</p>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Action Buttons based on Trip Lifecycle */}
      <Card className="border-t-4 border-t-cyan-600 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-600" /> Driver Dispatch Control Action
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentStatus === "accepted" && (
            <Button
              className="w-full h-12 text-base font-bold bg-cyan-700 hover:bg-cyan-800"
              onClick={() => advanceTripStatus("en_route_to_patient")}
            >
              <Navigation className="h-5 w-5 mr-2" /> START NAVIGATION TO PATIENT
            </Button>
          )}

          {currentStatus === "en_route_to_patient" && (
            <Button
              className="w-full h-12 text-base font-bold bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => advanceTripStatus("arrived_at_pickup")}
            >
              <MapPin className="h-5 w-5 mr-2" /> ARRIVED AT PATIENT PICKUP LOCATION
            </Button>
          )}

          {currentStatus === "arrived_at_pickup" && (
            <Button
              className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => advanceTripStatus("patient_picked_up")}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" /> CONFIRM PATIENT PICKED UP
            </Button>
          )}

          {currentStatus === "patient_picked_up" && (
            <Button
              className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white animate-pulse"
              onClick={loadNearestSuitableHospitals}
            >
              <Hospital className="h-5 w-5 mr-2" /> DISCOVER NEARBY SUITABLE HOSPITALS
            </Button>
          )}

          {currentStatus === "en_route_to_hospital" && (
            <Button
              className="w-full h-12 text-base font-bold bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => advanceTripStatus("arrived_at_hospital")}
            >
              <Hospital className="h-5 w-5 mr-2" /> ARRIVED AT HOSPITAL EMERGENCY WARD
            </Button>
          )}

          {currentStatus === "arrived_at_hospital" && (
            <Button
              className="w-full h-12 text-base font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={() => advanceTripStatus("completed")}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" /> COMPLETE TRIP & RETURN TO STANDBY
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => updateLocationOnServer(ambPos[0] + 0.002, ambPos[1] + 0.002)}
            >
              <Activity className="h-3.5 w-3.5 mr-1" /> Simulate GPS Step
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/driver/dashboard")}>
              Exit Control
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Smart Nearest Suitable Hospital Selector Modal */}
      <Dialog open={hospitalModalOpen} onOpenChange={setHospitalModalOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-cyan-900">
              <Hospital className="h-5 w-5 text-cyan-600" /> Nearest Suitable Hospitals
            </DialogTitle>
            <DialogDescription>
              Ranked by road travel time, emergency capacity, ICU beds, and oxygen availability.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {suitableHospitals.map((item, idx) => {
              const h = item.hospital;
              const r = item.resources;
              const isBest = idx === 0;

              return (
                <Card
                  key={h.id}
                  className={`border-2 transition-all hover:border-cyan-500 cursor-pointer ${
                    isBest ? "border-cyan-500 bg-cyan-50/50 shadow-md" : "border-slate-200"
                  }`}
                  onClick={() => selectHospital(h.id)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-slate-900">{h.name}</h4>
                          {isBest && (
                            <Badge className="bg-emerald-600 text-white text-[10px]">RECOMMENDED</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{h.address}, {h.city}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded border text-center text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold">ROAD ETA</p>
                        <p className="font-bold text-cyan-800">{item.etaMinutes} min</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold">ICU BEDS</p>
                        <p className="font-bold text-emerald-600">{r.icuBedsAvailable} Available</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold">OXYGEN</p>
                        <p className="font-bold text-blue-600">{r.oxygenCylindersAvailable} Cylinders</p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
                      disabled={selectingHospital}
                    >
                      SELECT THIS HOSPITAL & START NAV
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
