import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ambulance, ShieldCheck, Phone, Navigation, CheckCircle2, AlertTriangle, Clock, MapPin, Navigation2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function DriverDashboard() {
  const { toast } = useToast();
  const [driverData, setDriverData] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const token = localStorage.getItem("meditech-driver-token") || "driver-1";

  async function fetchDashboard() {
    setLoading(true);
    try {
      const meRes = await fetch("/api/drivers/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const data = await meRes.json();
        setDriverData(data);
        setAvailable(data.driver?.availabilityStatus === "available" || data.driver?.availabilityStatus === "on_trip");
      }

      const reqRes = await fetch("/api/driver/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData);
      }
    } catch (err) {
      console.error("Error fetching driver dashboard", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 8000);
    return () => clearInterval(interval);
  }, []);

  async function toggleAvailability(checked: boolean) {
    setAvailable(checked);
    const newStatus = checked ? "available" : "offline";
    try {
      const res = await fetch("/api/drivers/availability", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast({
          title: `Status: ${newStatus.toUpperCase()}`,
          description: checked ? "You are now receiving emergency dispatch requests." : "Status set to Offline.",
        });
      }
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  }

  async function acceptEmergency(bookingId: number) {
    setAcceptingId(bookingId);
    try {
      const res = await fetch(`/api/driver/requests/${bookingId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to accept emergency request");

      const data = await res.json();
      toast({
        title: "🚨 EMERGENCY ACCEPTED!",
        description: "Navigating to patient pickup location...",
      });

      window.location.href = `/driver/trip/${data.trip.id}`;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not accept request",
        variant: "destructive",
      });
    } finally {
      setAcceptingId(null);
    }
  }

  if (loading && !driverData) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center space-y-4">
        <RefreshCw className="h-10 w-10 text-cyan-600 animate-spin mx-auto" />
        <p className="text-muted-foreground font-medium">Connecting to Emergency Dispatch Network...</p>
      </div>
    );
  }

  const driver = driverData?.driver || {
    fullName: "Ramesh Kumar",
    licenseNumber: "OD-0220201122334",
    verificationStatus: "verified",
    availabilityStatus: "available",
  };

  const ambulance = driverData?.ambulance || {
    vehicleNumber: "OD-02-AM-1081",
    type: "icu",
    status: "available",
  };

  const activeTrip = driverData?.activeTrip;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      {/* Mobile Header Badge */}
      <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-600 rounded-lg text-white font-bold">
            <Ambulance className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg leading-tight">{driver.fullName}</h2>
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] uppercase">
                <ShieldCheck className="h-3 w-3 mr-1" /> VERIFIED
              </Badge>
            </div>
            <p className="text-xs text-slate-300">
              Vehicle: <span className="font-semibold text-cyan-400">{ambulance.vehicleNumber}</span> ({ambulance.type.toUpperCase()})
            </p>
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            {available ? "● AVAILABLE" : "○ OFFLINE"}
          </span>
          <Switch checked={available} onCheckedChange={toggleAvailability} />
        </div>
      </div>

      {/* Priority Active Trip Banner */}
      {activeTrip && (
        <Alert className="border-cyan-500 bg-cyan-950 text-cyan-100 shadow-xl">
          <Navigation2 className="h-6 w-6 text-cyan-400 animate-pulse" />
          <AlertTitle className="text-lg font-bold text-cyan-200">
            🚨 ACTIVE TRIP IN PROGRESS (#{activeTrip.id})
          </AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <p className="text-sm">Status: <span className="font-bold text-amber-300 uppercase">{activeTrip.status.replace(/_/g, " ")}</span></p>
            <Button className="w-full bg-cyan-600 hover:bg-cyan-500 font-bold" asChild>
              <Link href={`/driver/trip/${activeTrip.id}`}>
                <Navigation className="h-4 w-4 mr-2" /> RESUME LIVE NAVIGATION MAP
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Emergency Request Inbox */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" /> Dispatch Emergency Requests ({requests.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={fetchDashboard}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        {requests.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-muted-foreground space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="font-semibold text-foreground">No Pending Emergency Calls</p>
            <p className="text-xs">You are on standby. New dispatch requests will appear here instantly.</p>
          </Card>
        ) : (
          requests.map((req) => {
            const isCritical = req.emergency === "critical";
            return (
              <Card
                key={req.id}
                className={`border-2 transition-all shadow-md ${
                  isCritical ? "border-red-500 bg-red-50/40" : "border-amber-400 bg-amber-50/30"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      className={`text-xs px-2.5 py-1 uppercase font-bold ${
                        isCritical ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                      }`}
                    >
                      🚑 {req.emergency} EMERGENCY
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                      <Clock className="h-3 w-3" /> Booking #{req.id}
                    </span>
                  </div>
                  <CardTitle className="text-lg mt-2">{req.patientName}</CardTitle>
                  <CardDescription className="flex items-center gap-1 text-slate-700">
                    <Phone className="h-3.5 w-3.5 text-cyan-600" /> {req.patientPhone}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-3 rounded-lg border space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">PICKUP ADDRESS</p>
                        <p className="font-bold text-slate-900">{req.pickupAddress}</p>
                      </div>
                    </div>
                    {req.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border">
                        <span className="font-semibold text-slate-800">Condition Notes:</span> {req.notes}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="w-full border-slate-300 text-slate-700"
                      onClick={() => toast({ title: "Request declined" })}
                    >
                      DECLINE
                    </Button>
                    <Button
                      className={`w-full font-bold h-11 ${
                        isCritical ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                      disabled={acceptingId === req.id || !available}
                      onClick={() => acceptEmergency(req.id)}
                    >
                      {acceptingId === req.id ? (
                        <span className="flex items-center gap-1">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          Accepting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Navigation className="h-4 w-4" /> ACCEPT EMERGENCY
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Driver Information Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ambulance className="h-4 w-4 text-cyan-600" /> Ambulance & Driver Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded border">
            <p className="text-muted-foreground">REGISTRATION ID</p>
            <p className="font-bold">{driver.driverRegistrationId || "DRV-1001"}</p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border">
            <p className="text-muted-foreground">LICENSE NUMBER</p>
            <p className="font-bold">{driver.licenseNumber}</p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border">
            <p className="text-muted-foreground">VEHICLE TYPE</p>
            <p className="font-bold uppercase">{ambulance.type}</p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border">
            <p className="text-muted-foreground">VERIFICATION</p>
            <p className="font-bold text-emerald-600 uppercase">{driver.verificationStatus}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
