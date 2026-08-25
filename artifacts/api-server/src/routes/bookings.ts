import { Router } from "express";
import { db, isDbAvailable, MOCK_BOOKINGS, MOCK_AMBULANCES, Booking } from "@workspace/db";
import { bookingsTable, ambulancesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateBookingBody,
  GetBookingParams,
  UpdateBookingStatusParams,
  UpdateBookingStatusBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/bookings", async (_req, res) => {
  if (!isDbAvailable) {
    return res.json(MOCK_BOOKINGS);
  }
  const bookings = await db.select().from(bookingsTable).orderBy(bookingsTable.createdAt);
  return res.json(bookings);
});

router.post("/bookings", async (req, res) => {
  const parseResult = CreateBookingBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.message });
  }

  const { destinationHospitalId, emergency, notes, patientName, patientPhone, pickupAddress } = parseResult.data;

  if (!isDbAvailable) {
    const availAmbulance = MOCK_AMBULANCES.find(a => a.status === "available");
    if (availAmbulance) {
      availAmbulance.status = "dispatched";
    }
    const newBooking: Booking = {
      id: Math.floor(Math.random() * 900) + 100,
      patientName,
      patientPhone,
      pickupAddress,
      destinationHospitalId,
      ambulanceId: availAmbulance ? availAmbulance.id : null,
      status: availAmbulance ? "confirmed" : "pending",
      emergency: emergency as "critical" | "moderate" | "low",
      notes: notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MOCK_BOOKINGS.unshift(newBooking);
    return res.status(201).json(newBooking);
  }

  // Find an available ambulance
  const availableAmbulances = await db
    .select()
    .from(ambulancesTable)
    .where(eq(ambulancesTable.status, "available"))
    .limit(1);

  const ambulanceId = availableAmbulances.length > 0 ? availableAmbulances[0].id : null;

  const booking = await db
    .insert(bookingsTable)
    .values({
      patientName,
      patientPhone,
      pickupAddress,
      destinationHospitalId,
      ambulanceId,
      status: ambulanceId ? "confirmed" : "pending",
      emergency: emergency as "critical" | "moderate" | "low",
      notes,
    })
    .returning();

  // Update ambulance status if assigned
  if (ambulanceId) {
    await db
      .update(ambulancesTable)
      .set({ status: "dispatched", updatedAt: new Date() })
      .where(eq(ambulancesTable.id, ambulanceId));
  }

  return res.status(201).json(booking[0]);
});

router.get("/bookings/:id", async (req, res) => {
  const parseResult = GetBookingParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (!isDbAvailable) {
    const booking = MOCK_BOOKINGS.find(b => b.id === parseResult.data.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    return res.json(booking);
  }

  const booking = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, parseResult.data.id))
    .limit(1);

  if (booking.length === 0) {
    return res.status(404).json({ error: "Booking not found" });
  }

  return res.json(booking[0]);
});

router.put("/bookings/:id/status", async (req, res) => {
  const paramsResult = UpdateBookingStatusParams.safeParse({ id: Number(req.params.id) });
  const bodyResult = UpdateBookingStatusBody.safeParse(req.body);

  if (!paramsResult.success || !bodyResult.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  if (!isDbAvailable) {
    const booking = MOCK_BOOKINGS.find(b => b.id === paramsResult.data.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    booking.status = bodyResult.data.status as any;
    booking.updatedAt = new Date();
    if (booking.ambulanceId && (booking.status === "completed" || booking.status === "cancelled")) {
      const amb = MOCK_AMBULANCES.find(a => a.id === booking.ambulanceId);
      if (amb) amb.status = "available";
    }
    return res.json(booking);
  }

  const updated = await db
    .update(bookingsTable)
    .set({ status: bodyResult.data.status as "pending" | "confirmed" | "dispatched" | "completed" | "cancelled", updatedAt: new Date() })
    .where(eq(bookingsTable.id, paramsResult.data.id))
    .returning();

  if (updated.length === 0) {
    return res.status(404).json({ error: "Booking not found" });
  }

  // If completed, free up the ambulance
  if (bodyResult.data.status === "completed" || bodyResult.data.status === "cancelled") {
    const booking = updated[0];
    if (booking.ambulanceId) {
      await db
        .update(ambulancesTable)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(ambulancesTable.id, booking.ambulanceId));
    }
  }

  return res.json(updated[0]);
});

export default router;
