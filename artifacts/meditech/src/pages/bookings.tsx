import { useListBookings, useUpdateBookingStatus, useListHospitals, getListBookingsQueryKey, getListHospitalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Ambulance, Clock, MapPin, Phone, Building2, Navigation, Activity, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700 border-gray-200",
    confirmed: "bg-blue-100 text-blue-700 border-blue-200",
    dispatched: "bg-amber-100 text-amber-700 border-amber-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${config[status] ?? ""}`} data-testid="badge-booking-status">
      {status}
    </span>
  );
}

function EmergencyBadge({ level }: { level: string }) {
  const config: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    moderate: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${config[level] ?? ""}`} data-testid="badge-emergency-level">
      {level}
    </span>
  );
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["dispatched", "cancelled"],
  dispatched: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export default function Bookings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const { t } = useI18n();
  const b = t.bookings;

  // Live Patient Tracking State
  const [trackingBookingId, setTrackingBookingId] = useState<number | null>(null);
  const [liveLocation, setLiveLocation] = useState<any>(null);
  const [lastUpdatedSecs, setLastUpdatedSecs] = useState(0);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const ambMarker = useRef<L.Marker | null>(null);

  const { data: bookings, isLoading } = useListBookings({ query: { queryKey: getListBookingsQueryKey() } });
  const { data: hospitals } = useListHospitals({}, { query: { queryKey: getListHospitalsQueryKey({}) } });

  const updateStatus = useUpdateBookingStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        toast({ title: b.statusUpdated, description: b.statusUpdatedDesc });
      },
      onError: () => {
        toast({ title: b.updateFailed, description: b.updateFailedDesc, variant: "destructive" });
      },
    },
  });

  const filteredBookings = bookings?.filter(bk => filterStatus === "all" || bk.status === filterStatus) ?? [];

  // Initialize Map when modal opens
  useEffect(() => {
    if (!trackingBookingId || !mapRef.current) return;

    if (!leafletMap.current) {
      const map = L.map(mapRef.current, {
        center: [22.2420, 84.8520],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: "&copy; Google Maps",
        maxZoom: 20,
      }).addTo(map);

      const ambIcon = L.divIcon({
        html: `
          <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:44px; height:44px; background:rgba(14, 116, 144, 0.35); border-radius:50%; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:relative; width:34px; height:34px; background:#0e7490; color:white; border-radius:50%; border:3px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-size:18px;">🚑</div>
          </div>
        `,
        className: "",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const patientIcon = L.divIcon({
        html: `
          <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:44px; height:44px; background:rgba(220, 38, 38, 0.35); border-radius:50%; animation:ping 2s infinite;"></div>
            <div style="position:relative; width:34px; height:34px; background:#dc2626; color:white; border-radius:50%; border:3px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-size:18px;">📍</div>
          </div>
        `,
        className: "",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      ambMarker.current = L.marker([22.2380, 84.8450], { icon: ambIcon }).addTo(map).bindPopup("<b>Ambulance OD-02-AM-1081</b><br>En route to your pickup location");
      L.marker([22.2420, 84.8520], { icon: patientIcon }).addTo(map).bindPopup("<b>Your Pickup Location (Panposh, Rourkela)</b>");

      // Fetch Real OSRM Road Geometry for Patient Map
      fetch(`https://router.project-osrm.org/route/v1/driving/84.8450,22.2380;84.8520,22.2420?overview=full&geometries=geojson`)
        .then((res) => res.json())
        .then((data) => {
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            
            // Outer Glow
            L.polyline(coords, { color: "#0284c7", weight: 10, opacity: 0.3, lineCap: "round", lineJoin: "round" }).addTo(map);
            // Solid Inner Line
            L.polyline(coords, { color: "#2563eb", weight: 6, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(map);

            map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });
          }
        })
        .catch(() => {
          L.polyline([[22.2380, 84.8450], [22.2420, 84.8520]], { color: "#2563eb", weight: 6, opacity: 0.95 }).addTo(map);
        });

      leafletMap.current = map;
    }

    // Fetch initial location
    fetch(`/api/trips/${trackingBookingId}/location`)
      .then((res) => res.json())
      .then((data) => {
        setLiveLocation(data);
        if (data.latitude && data.longitude && ambMarker.current) {
          ambMarker.current.setLatLng([data.latitude, data.longitude]);
          leafletMap.current?.panTo([data.latitude, data.longitude]);
        }
      })
      .catch(() => {});

    // Listen to real-time SSE stream
    const eventSource = new EventSource(`/api/trips/${trackingBookingId}/stream`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.latitude && payload.longitude) {
          setLiveLocation(payload);
          setLastUpdatedSecs(0);
          if (ambMarker.current) {
            ambMarker.current.setLatLng([payload.latitude, payload.longitude]);
            leafletMap.current?.panTo([payload.latitude, payload.longitude]);
          }
        }
      } catch (e) {
        console.error("Error parsing SSE payload", e);
      }
    };

    const interval = setInterval(() => {
      setLastUpdatedSecs((prev) => prev + 1);
    }, 1000);

    return () => {
      eventSource.close();
      clearInterval(interval);
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [trackingBookingId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{b.title}</h1>
          <p className="text-muted-foreground">{b.subtitle}</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]" data-testid="select-booking-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{b.allStatuses}</SelectItem>
            <SelectItem value="pending">{b.pending}</SelectItem>
            <SelectItem value="confirmed">{b.confirmed}</SelectItem>
            <SelectItem value="dispatched">{b.dispatched}</SelectItem>
            <SelectItem value="completed">{b.completed}</SelectItem>
            <SelectItem value="cancelled">{b.cancelled}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Ambulance className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{b.noBookings}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...filteredBookings].reverse().map(booking => {
            const hospital = hospitals?.find(h => h.id === booking.destinationHospitalId);
            const nextStatuses = STATUS_TRANSITIONS[booking.status] ?? [];
            const canTrack = booking.status === "confirmed" || booking.status === "dispatched";

            return (
              <Card key={booking.id} className="hover:shadow-md transition-shadow" data-testid={`card-booking-${booking.id}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 rounded-full p-2 shrink-0">
                        <Ambulance className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold" data-testid={`text-patient-name-${booking.id}`}>{booking.patientName}</span>
                          <StatusBadge status={booking.status} />
                          <EmergencyBadge level={booking.emergency} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{booking.patientPhone}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="truncate">{hospital?.name ?? t.ambulances.unknownHospital}</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{booking.pickupAddress}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{format(new Date(booking.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                          <span className="ml-2 font-mono text-primary/70">#{booking.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {canTrack && (
                        <Button
                          size="sm"
                          className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold"
                          onClick={() => setTrackingBookingId(booking.id)}
                        >
                          <Navigation className="h-4 w-4 mr-1 animate-pulse" /> TRACK LIVE AMBULANCE
                        </Button>
                      )}

                      {nextStatuses.map(nextStatus => (
                        <Button
                          key={nextStatus}
                          size="sm"
                          variant={nextStatus === "cancelled" ? "destructive" : "outline"}
                          onClick={() => updateStatus.mutate({ id: booking.id, data: { status: nextStatus as any } })}
                          disabled={updateStatus.isPending}
                          className="capitalize"
                          data-testid={`button-status-${nextStatus}-${booking.id}`}
                        >
                          {nextStatus === "cancelled" ? b.cancel : `${b.updateStatus}: ${nextStatus}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {booking.notes && (
                    <div className="mt-3 ml-11 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                      <span className="font-medium">Notes: </span>{booking.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Patient Live Ambulance Tracking Modal */}
      <Dialog open={trackingBookingId !== null} onOpenChange={(open) => !open && setTrackingBookingId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-900 text-lg">
              <Ambulance className="h-5 w-5 text-cyan-600 animate-pulse" /> Live Ambulance GPS Tracking
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between text-xs">
              <span>Real-time location stream connected to dispatch vehicle</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Updated {lastUpdatedSecs}s ago
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="h-64 w-full rounded-lg border-2 border-slate-300 overflow-hidden" ref={mapRef} />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-lg text-center">
                <p className="text-[11px] text-cyan-800 font-semibold uppercase">ESTIMATED ARRIVAL (ETA)</p>
                <p className="text-xl font-bold text-cyan-950">{liveLocation?.etaMinutes || 8} mins</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
                <p className="text-[11px] text-emerald-800 font-semibold uppercase">ROAD DISTANCE</p>
                <p className="text-xl font-bold text-emerald-950">{liveLocation?.roadDistanceKm || 3.2} km</p>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-3 rounded-lg text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">ASSIGNED AMBULANCE</span>
                <span className="font-bold text-cyan-400">OD-02-AM-1081 (ICU Cardiac)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">DRIVER NAME</span>
                <span className="font-bold">Ramesh Kumar (+91 98765 43210)</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
