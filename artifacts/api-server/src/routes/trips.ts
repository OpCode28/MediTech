import { Router, Request, Response } from "express";
import {
  db,
  isDbAvailable,
  MOCK_TRIPS,
  MOCK_HOSPITALS,
  MOCK_RESOURCES,
  MOCK_DRIVERS,
  MOCK_AMBULANCES,
  tripsTable,
  driverLocationsTable,
  hospitalsTable,
  hospitalResourcesTable,
  driversTable,
  ambulancesTable,
  bookingsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

// Store active SSE client response objects keyed by tripId
const sseClients: Map<number, Set<Response>> = new Map();

// Helper: Broadcast live GPS payload to connected SSE listeners
function broadcastTripLocation(tripId: number, locationPayload: any) {
  const clients = sseClients.get(tripId);
  if (!clients || clients.size === 0) return;

  const sseData = `data: ${JSON.stringify(locationPayload)}\n\n`;
  clients.forEach((res) => {
    try {
      res.write(sseData);
    } catch {
      clients.delete(res);
    }
  });
}

// Haversine distance helper in km
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// POST /api/trips/:id/location
router.post("/trips/:id/location", async (req: AuthenticatedRequest, res) => {
  const tripId = Number(req.params.id);
  const { latitude, longitude, speed, heading, accuracy } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  const driverId = req.user?.driverId || 1;
  const now = new Date();

  const locationPayload = {
    tripId,
    driverId,
    latitude: Number(latitude),
    longitude: Number(longitude),
    speed: speed !== undefined ? Number(speed) : 35,
    heading: heading !== undefined ? Number(heading) : 90,
    accuracy: accuracy !== undefined ? Number(accuracy) : 5,
    timestamp: now.toISOString(),
  };

  if (!isDbAvailable) {
    const trip = MOCK_TRIPS.find((t) => t.id === tripId || t.bookingId === tripId);
    if (trip) {
      trip.currentLatitude = locationPayload.latitude;
      trip.currentLongitude = locationPayload.longitude;
      trip.speed = locationPayload.speed;
      trip.heading = locationPayload.heading;
      trip.accuracy = locationPayload.accuracy;
      trip.updatedAt = now;

      // Update ETA based on remaining distance to target
      const targetLat = trip.status.includes("hospital") ? (trip.hospitalLatitude || trip.pickupLatitude) : trip.pickupLatitude;
      const targetLon = trip.status.includes("hospital") ? (trip.hospitalLongitude || trip.pickupLongitude) : trip.pickupLongitude;
      const dist = calculateHaversineKm(trip.currentLatitude, trip.currentLongitude, targetLat, targetLon);
      trip.roadDistanceKm = Number((dist * 1.3).toFixed(1)); // Road network factor approx
      trip.etaMinutes = Math.max(1, Math.round((trip.roadDistanceKm / 35) * 60));
    }
    broadcastTripLocation(tripId, locationPayload);
    return res.json({ success: true, location: locationPayload });
  }

  // Database mode
  await db
    .update(tripsTable)
    .set({
      currentLatitude: locationPayload.latitude,
      currentLongitude: locationPayload.longitude,
      speed: locationPayload.speed,
      heading: locationPayload.heading,
      accuracy: locationPayload.accuracy,
      updatedAt: now,
    })
    .where(eq(tripsTable.id, tripId));

  await db.insert(driverLocationsTable).values({
    tripId,
    driverId,
    latitude: locationPayload.latitude,
    longitude: locationPayload.longitude,
    speed: locationPayload.speed,
    heading: locationPayload.heading,
    accuracy: locationPayload.accuracy,
  });

  broadcastTripLocation(tripId, locationPayload);
  return res.json({ success: true, location: locationPayload });
});

// GET /api/trips/:id/stream (SSE Stream)
router.get("/trips/:id/stream", (req: Request, res: Response) => {
  const tripId = Number(req.params.id);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (!sseClients.has(tripId)) {
    sseClients.set(tripId, new Set());
  }
  sseClients.get(tripId)!.add(res);

  // Send initial handshake payload
  const initial = {
    tripId,
    status: "connected",
    message: "Real-time location stream established",
    timestamp: new Date().toISOString(),
  };
  res.write(`data: ${JSON.stringify(initial)}\n\n`);

  req.on("close", () => {
    const clients = sseClients.get(tripId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(tripId);
    }
  });
});

// GET /api/trips/:id/location (Latest location single-fetch fallback)
router.get("/trips/:id/location", async (req: Request, res: Response) => {
  const tripId = Number(req.params.id);

  if (!isDbAvailable) {
    const trip = MOCK_TRIPS.find((t) => t.id === tripId || t.bookingId === tripId);
    if (!trip) {
      return res.json({
        latitude: 20.2961,
        longitude: 85.8245,
        speed: 35,
        heading: 90,
        accuracy: 5,
        timestamp: new Date().toISOString(),
      });
    }
    return res.json({
      tripId: trip.id,
      latitude: trip.currentLatitude,
      longitude: trip.currentLongitude,
      speed: trip.speed,
      heading: trip.heading,
      accuracy: trip.accuracy,
      etaMinutes: trip.etaMinutes,
      roadDistanceKm: trip.roadDistanceKm,
      status: trip.status,
      timestamp: trip.updatedAt.toISOString(),
    });
  }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId)).limit(1);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  return res.json({
    tripId: trip.id,
    latitude: trip.currentLatitude || trip.pickupLatitude,
    longitude: trip.currentLongitude || trip.pickupLongitude,
    speed: trip.speed || 35,
    heading: trip.heading || 90,
    accuracy: trip.accuracy || 5,
    etaMinutes: trip.etaMinutes || 10,
    roadDistanceKm: trip.roadDistanceKm || 3.5,
    status: trip.status,
    timestamp: trip.updatedAt.toISOString(),
  });
});

// POST /api/trips/:id/status (Trip state machine transitions)
router.post("/trips/:id/status", async (req: AuthenticatedRequest, res) => {
  const tripId = Number(req.params.id);
  const { status } = req.body;
  const driverId = req.user?.driverId || 1;

  const validStatuses = [
    "accepted",
    "en_route_to_patient",
    "arrived_at_pickup",
    "patient_picked_up",
    "en_route_to_hospital",
    "arrived_at_hospital",
    "completed",
    "declined",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid trip status state transition" });
  }

  const now = new Date();

  if (!isDbAvailable) {
    let trip = MOCK_TRIPS.find((t) => t.id === tripId || t.bookingId === tripId);
    if (!trip) {
      // Fallback to active trip or first mock trip for smooth testing
      trip = MOCK_TRIPS[0];
      if (trip) {
        trip.id = tripId;
      }
    }

    if (!trip) {
      trip = {
        id: tripId,
        bookingId: 102,
        driverId: 1,
        ambulanceId: 1,
        hospitalId: 6,
        status: status as any,
        pickupLatitude: 22.2420,
        pickupLongitude: 84.8520,
        hospitalLatitude: 22.2562,
        hospitalLongitude: 84.8569,
        currentLatitude: 22.2380,
        currentLongitude: 84.8450,
        speed: 38,
        heading: 85,
        accuracy: 5,
        etaMinutes: 7,
        roadDistanceKm: 3.5,
        createdAt: now,
        updatedAt: now,
      };
      MOCK_TRIPS.push(trip);
    }

    trip.status = status as any;
    trip.updatedAt = now;

    if (status === "patient_picked_up") trip.pickedUpAt = now;
    if (status === "arrived_at_hospital") trip.arrivedHospitalAt = now;
    if (status === "completed") {
      trip.completedAt = now;
      const driver = MOCK_DRIVERS.find((d) => d.id === driverId) || MOCK_DRIVERS[0];
      if (driver) driver.availabilityStatus = "available";
      const amb = MOCK_AMBULANCES.find((a) => a.id === trip.ambulanceId) || MOCK_AMBULANCES[0];
      if (amb) amb.status = "available";
      const booking = MOCK_BOOKINGS.find((b) => b.id === trip.bookingId) || MOCK_BOOKINGS[0];
      if (booking) booking.status = "completed";
    }

    return res.json({ success: true, trip });
  }

  // Database mode
  const updateData: any = { status, updatedAt: now };
  if (status === "patient_picked_up") updateData.pickedUpAt = now;
  if (status === "arrived_at_hospital") updateData.arrivedHospitalAt = now;
  if (status === "completed") updateData.completedAt = now;

  const [updatedTrip] = await db
    .update(tripsTable)
    .set(updateData)
    .where(eq(tripsTable.id, tripId))
    .returning();

  if (status === "completed" && updatedTrip) {
    await db
      .update(driversTable)
      .set({ availabilityStatus: "available", updatedAt: now })
      .where(eq(driversTable.id, updatedTrip.driverId));

    await db
      .update(ambulancesTable)
      .set({ status: "available", updatedAt: now })
      .where(eq(ambulancesTable.id, updatedTrip.ambulanceId));

    await db
      .update(bookingsTable)
      .set({ status: "completed", updatedAt: now })
      .where(eq(bookingsTable.id, updatedTrip.bookingId));
  }

  return res.json({ success: true, trip: updatedTrip });
});

// GET /api/trips/:id/nearest-hospitals (Smart Hospital Discovery Engine)
router.get("/trips/:id/nearest-hospitals", async (req: Request, res: Response) => {
  const tripId = Number(req.params.id);
  let currentLat = 20.3533;
  let currentLon = 85.8189;

  if (!isDbAvailable) {
    const trip = MOCK_TRIPS.find((t) => t.id === tripId || t.bookingId === tripId);
    if (trip) {
      currentLat = trip.currentLatitude || trip.pickupLatitude;
      currentLon = trip.currentLongitude || trip.pickupLongitude;
    }

    // Rank hospitals by multi-factor suitability algorithm:
    // Suitability Score = (Road Distance * 1.5) + (ETA * 1.0) - (ICU Beds Available * 3) - (Oxygen * 0.1) - (Ventilators * 2)
    const rankedHospitals = MOCK_HOSPITALS.map((h) => {
      const res = MOCK_RESOURCES.find((r) => r.hospitalId === h.id) || {
        icuBedsAvailable: 5,
        generalBedsAvailable: 20,
        oxygenCylindersAvailable: 30,
        ventilatorsAvailable: 3,
        doctorsOnDuty: 10,
      };

      const straightDistance = calculateHaversineKm(currentLat, currentLon, h.latitude, h.longitude);
      const roadDistanceKm = Number((straightDistance * 1.25).toFixed(1));
      const etaMinutes = Math.max(3, Math.round((roadDistanceKm / 30) * 60));

      const isSuitable = res.icuBedsAvailable > 0 || res.generalBedsAvailable > 0;
      const suitabilityScore = roadDistanceKm * 1.5 + etaMinutes * 1.0 - (res.icuBedsAvailable * 3) - (res.ventilatorsAvailable * 2);

      return {
        hospital: h,
        resources: res,
        roadDistanceKm,
        etaMinutes,
        isSuitable,
        suitabilityScore,
      };
    }).sort((a, b) => a.suitabilityScore - b.suitabilityScore);

    return res.json(rankedHospitals);
  }

  // Database mode
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId)).limit(1);
  if (trip && trip.currentLatitude && trip.currentLongitude) {
    currentLat = trip.currentLatitude;
    currentLon = trip.currentLongitude;
  }

  const hospitals = await db.select().from(hospitalsTable).where(eq(hospitalsTable.status, "active"));
  const resources = await db.select().from(hospitalResourcesTable);

  const rankedHospitals = hospitals.map((h) => {
    const res = resources.find((r) => r.hospitalId === h.id) || {
      icuBedsAvailable: 5,
      generalBedsAvailable: 20,
      oxygenCylindersAvailable: 30,
      ventilatorsAvailable: 3,
      doctorsOnDuty: 10,
    };

    const straightDistance = calculateHaversineKm(currentLat, currentLon, h.latitude, h.longitude);
    const roadDistanceKm = Number((straightDistance * 1.25).toFixed(1));
    const etaMinutes = Math.max(3, Math.round((roadDistanceKm / 30) * 60));

    const isSuitable = res.icuBedsAvailable > 0 || res.generalBedsAvailable > 0;
    const suitabilityScore = roadDistanceKm * 1.5 + etaMinutes * 1.0 - (res.icuBedsAvailable * 3) - (res.ventilatorsAvailable * 2);

    return {
      hospital: h,
      resources: res,
      roadDistanceKm,
      etaMinutes,
      isSuitable,
      suitabilityScore,
    };
  }).sort((a, b) => a.suitabilityScore - b.suitabilityScore);

  return res.json(rankedHospitals);
});

// POST /api/trips/:id/select-hospital
router.post("/trips/:id/select-hospital", async (req: AuthenticatedRequest, res) => {
  const tripId = Number(req.params.id);
  const { hospitalId } = req.body;

  if (!hospitalId) {
    return res.status(400).json({ error: "hospitalId is required" });
  }

  const targetHospitalId = Number(hospitalId);

  if (!isDbAvailable) {
    const trip = MOCK_TRIPS.find((t) => t.id === tripId || t.bookingId === tripId);
    const hospital = MOCK_HOSPITALS.find((h) => h.id === targetHospitalId);
    if (!trip || !hospital) return res.status(404).json({ error: "Trip or Hospital not found" });

    trip.hospitalId = targetHospitalId;
    trip.hospitalLatitude = hospital.latitude;
    trip.hospitalLongitude = hospital.longitude;
    trip.status = "en_route_to_hospital";
    trip.updatedAt = new Date();

    const dist = calculateHaversineKm(trip.currentLatitude, trip.currentLongitude, hospital.latitude, hospital.longitude);
    trip.roadDistanceKm = Number((dist * 1.25).toFixed(1));
    trip.etaMinutes = Math.max(3, Math.round((trip.roadDistanceKm / 30) * 60));

    return res.json({ success: true, trip, hospital });
  }

  // Database mode
  const [hospital] = await db.select().from(hospitalsTable).where(eq(hospitalsTable.id, targetHospitalId)).limit(1);
  if (!hospital) return res.status(404).json({ error: "Hospital not found" });

  const [updatedTrip] = await db
    .update(tripsTable)
    .set({
      hospitalId: targetHospitalId,
      hospitalLatitude: hospital.latitude,
      hospitalLongitude: hospital.longitude,
      status: "en_route_to_hospital",
      updatedAt: new Date(),
    })
    .where(eq(tripsTable.id, tripId))
    .returning();

  return res.json({ success: true, trip: updatedTrip, hospital });
});

export default router;
