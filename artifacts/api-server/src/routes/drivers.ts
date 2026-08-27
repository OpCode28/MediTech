import { Router } from "express";
import {
  db,
  isDbAvailable,
  MOCK_DRIVERS,
  MOCK_AMBULANCES,
  MOCK_BOOKINGS,
  MOCK_TRIPS,
  driversTable,
  ambulancesTable,
  bookingsTable,
  tripsTable,
  DriverMock,
  Ambulance,
  Booking,
  TripMock,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

// POST /api/drivers/register
router.post("/drivers/register", async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    emergencyContact,
    address,
    licenseNumber,
    licenseExpiry,
    vehicleNumber,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    patientCapacity,
    ambulanceCategory,
    insuranceNumber,
    insuranceExpiry,
    fitnessCertificate,
  } = req.body;

  if (!fullName || !email || !password || !phone || !licenseNumber || !vehicleNumber) {
    return res.status(400).json({ error: "Missing required registration fields" });
  }

  const registrationId = `DRV-${Math.floor(1000 + Math.random() * 9000)}`;

  if (!isDbAvailable) {
    // Check duplicate
    const existing = MOCK_DRIVERS.find((d) => d.email === email || d.licenseNumber === licenseNumber);
    if (existing) {
      return res.status(409).json({ error: "Driver with this email or license already exists" });
    }

    const newAmbulance: Ambulance = {
      id: MOCK_AMBULANCES.length + 1,
      hospitalId: 1,
      vehicleNumber,
      driverName: fullName,
      driverPhone: phone,
      status: "available",
      type: (ambulanceCategory?.toLowerCase() as any) || "basic",
      latitude: 20.2961,
      longitude: 85.8245,
      updatedAt: new Date(),
    };
    MOCK_AMBULANCES.push(newAmbulance);

    const newDriver: DriverMock = {
      id: MOCK_DRIVERS.length + 1,
      fullName,
      email,
      phone,
      emergencyContact: emergencyContact || phone,
      address: address || "Bhubaneswar, Odisha",
      licenseNumber,
      licenseExpiry: licenseExpiry || "2030-12-31",
      driverRegistrationId: registrationId,
      verificationStatus: "verified", // Auto-verify demo accounts for seamless testing
      availabilityStatus: "available",
      ambulanceId: newAmbulance.id,
    };
    MOCK_DRIVERS.push(newDriver);

    return res.status(201).json({
      message: "Driver registered successfully",
      token: `driver-${newDriver.id}`,
      driver: newDriver,
      ambulance: newAmbulance,
    });
  }

  // Database mode
  const [newAmbulance] = await db
    .insert(ambulancesTable)
    .values({
      vehicleNumber,
      driverName: fullName,
      driverPhone: phone,
      status: "available",
      type: (ambulanceCategory?.toLowerCase() as any) || "basic",
      vehicleMake,
      vehicleModel,
      vehicleYear,
      patientCapacity: Number(patientCapacity) || 1,
      insuranceNumber,
      insuranceExpiry,
      fitnessCertificate,
      latitude: 20.2961,
      longitude: 85.8245,
    })
    .returning();

  const [newDriver] = await db
    .insert(driversTable)
    .values({
      fullName,
      email,
      passwordHash: password, // In production, bcrypt hash
      phone,
      emergencyContact: emergencyContact || phone,
      address: address || "Bhubaneswar",
      licenseNumber,
      licenseExpiry: licenseExpiry || "2030-12-31",
      driverRegistrationId: registrationId,
      verificationStatus: "verified",
      availabilityStatus: "available",
      ambulanceId: newAmbulance.id,
    })
    .returning();

  return res.status(201).json({
    message: "Driver registered successfully",
    token: `driver-${newDriver.id}`,
    driver: newDriver,
    ambulance: newAmbulance,
  });
});

// POST /api/drivers/login
router.post("/drivers/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!isDbAvailable) {
    const driver = MOCK_DRIVERS.find((d) => d.email.toLowerCase() === email.toLowerCase());
    if (!driver) {
      return res.status(401).json({ error: "Invalid driver email or password" });
    }
    const ambulance = MOCK_AMBULANCES.find((a) => a.id === driver.ambulanceId);
    return res.json({
      token: `driver-${driver.id}`,
      driver,
      ambulance,
    });
  }

  const [driver] = await db
    .select()
    .from(driversTable)
    .where(eq(driversTable.email, email.toLowerCase()))
    .limit(1);

  if (!driver) {
    return res.status(401).json({ error: "Invalid driver email or password" });
  }

  let ambulance = null;
  if (driver.ambulanceId) {
    const [amb] = await db
      .select()
      .from(ambulancesTable)
      .where(eq(ambulancesTable.id, driver.ambulanceId))
      .limit(1);
    ambulance = amb || null;
  }

  return res.json({
    token: `driver-${driver.id}`,
    driver,
    ambulance,
  });
});

// GET /api/drivers/me
router.get("/drivers/me", async (req: AuthenticatedRequest, res) => {
  const driverId = req.user?.driverId || 1;

  if (!isDbAvailable) {
    const driver = MOCK_DRIVERS.find((d) => d.id === driverId) || MOCK_DRIVERS[0];
    const ambulance = MOCK_AMBULANCES.find((a) => a.id === driver.ambulanceId) || MOCK_AMBULANCES[0];
    const activeTrip = MOCK_TRIPS.find((t) => t.driverId === driver.id && t.status !== "completed" && t.status !== "cancelled");
    return res.json({ driver, ambulance, activeTrip: activeTrip || null });
  }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId)).limit(1);
  if (!driver) {
    return res.status(404).json({ error: "Driver profile not found" });
  }

  let ambulance = null;
  if (driver.ambulanceId) {
    const [amb] = await db.select().from(ambulancesTable).where(eq(ambulancesTable.id, driver.ambulanceId)).limit(1);
    ambulance = amb || null;
  }

  const activeTrips = await db
    .select()
    .from(tripsTable)
    .where(and(eq(tripsTable.driverId, driver.id)))
    .limit(1);

  const activeTrip = activeTrips.find((t) => t.status !== "completed" && t.status !== "cancelled") || null;

  return res.json({ driver, ambulance, activeTrip });
});

// PUT /api/drivers/availability
router.put("/drivers/availability", async (req: AuthenticatedRequest, res) => {
  const driverId = req.user?.driverId || 1;
  const { status } = req.body;

  if (!["available", "offline"].includes(status)) {
    return res.status(400).json({ error: "Invalid availability status. Use 'available' or 'offline'." });
  }

  if (!isDbAvailable) {
    const driver = MOCK_DRIVERS.find((d) => d.id === driverId);
    if (driver) {
      driver.availabilityStatus = status as any;
      if (driver.ambulanceId) {
        const amb = MOCK_AMBULANCES.find((a) => a.id === driver.ambulanceId);
        if (amb) amb.status = status === "available" ? "available" : "offline";
      }
    }
    return res.json({ success: true, driver });
  }

  const [updatedDriver] = await db
    .update(driversTable)
    .set({ availabilityStatus: status as any, updatedAt: new Date() })
    .where(eq(driversTable.id, driverId))
    .returning();

  if (updatedDriver?.ambulanceId) {
    await db
      .update(ambulancesTable)
      .set({ status: status === "available" ? "available" : "offline", updatedAt: new Date() })
      .where(eq(ambulancesTable.id, updatedDriver.ambulanceId));
  }

  return res.json({ success: true, driver: updatedDriver });
});

// GET /api/driver/requests
router.get("/driver/requests", async (req: AuthenticatedRequest, res) => {
  const driverId = req.user?.driverId || 1;

  if (!isDbAvailable) {
    const driver = MOCK_DRIVERS.find((d) => d.id === driverId);
    // Find pending bookings
    const pendingBookings = MOCK_BOOKINGS.filter((b) => b.status === "pending" || b.status === "confirmed");
    return res.json(pendingBookings);
  }

  const pendingBookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.status, "pending"));

  return res.json(pendingBookings);
});

// POST /api/driver/requests/:id/accept
router.post("/driver/requests/:id/accept", async (req: AuthenticatedRequest, res) => {
  const bookingId = Number(req.params.id);
  const driverId = req.user?.driverId || 1;

  if (!isDbAvailable) {
    const booking = MOCK_BOOKINGS.find((b) => b.id === bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking request not found" });
    }

    const driver = MOCK_DRIVERS.find((d) => d.id === driverId) || MOCK_DRIVERS[0];
    driver.availabilityStatus = "on_trip";
    booking.status = "confirmed";
    booking.ambulanceId = driver.ambulanceId;

    const existingTrip = MOCK_TRIPS.find((t) => t.bookingId === bookingId);
    if (existingTrip) {
      existingTrip.status = "accepted";
      existingTrip.acceptedAt = new Date();
      return res.json({ message: "Request accepted", trip: existingTrip, booking });
    }

    const newTrip: TripMock = {
      id: Math.floor(Math.random() * 900) + 500,
      bookingId: booking.id,
      driverId: driver.id,
      ambulanceId: driver.ambulanceId || 1,
      hospitalId: booking.destinationHospitalId,
      status: "accepted",
      pickupLatitude: 20.3533,
      pickupLongitude: 85.8189,
      hospitalLatitude: 20.3533,
      hospitalLongitude: 85.8189,
      currentLatitude: 20.345,
      currentLongitude: 85.812,
      speed: 40,
      heading: 90,
      accuracy: 5,
      etaMinutes: 10,
      roadDistanceKm: 3.8,
      acceptedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MOCK_TRIPS.unshift(newTrip);

    return res.json({ message: "Emergency request accepted", trip: newTrip, booking });
  }

  // Database mode
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking) {
    return res.status(404).json({ error: "Booking request not found" });
  }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId)).limit(1);
  const ambulanceId = driver?.ambulanceId || 1;

  await db
    .update(bookingsTable)
    .set({ status: "confirmed", ambulanceId, updatedAt: new Date() })
    .where(eq(bookingsTable.id, bookingId));

  await db
    .update(driversTable)
    .set({ availabilityStatus: "on_trip", updatedAt: new Date() })
    .where(eq(driversTable.id, driverId));

  const [newTrip] = await db
    .insert(tripsTable)
    .values({
      bookingId: booking.id,
      driverId,
      ambulanceId,
      hospitalId: booking.destinationHospitalId,
      status: "accepted",
      pickupLatitude: 20.3533,
      pickupLongitude: 85.8189,
      hospitalLatitude: 20.3533,
      hospitalLongitude: 85.8189,
      currentLatitude: 20.345,
      currentLongitude: 85.812,
      etaMinutes: 10,
      roadDistanceKm: 3.8,
      acceptedAt: new Date(),
    })
    .returning();

  return res.json({ message: "Emergency request accepted", trip: newTrip, booking });
});

// POST /api/driver/requests/:id/decline
router.post("/driver/requests/:id/decline", async (_req, res) => {
  return res.json({ message: "Request declined. Dispatching to next available ambulance." });
});

export default router;
