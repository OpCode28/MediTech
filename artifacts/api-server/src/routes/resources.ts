import { Router } from "express";
import { db, isDbAvailable, MOCK_RESOURCES, MOCK_BOOKINGS } from "@workspace/db";
import { hospitalResourcesTable, bookingsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router = Router();

router.get("/resources/summary", async (_req, res) => {
  const resources = isDbAvailable ? await db.select().from(hospitalResourcesTable) : MOCK_RESOURCES;

  const totalHospitals = resources.length;
  const totalIcuBeds = resources.reduce((s, r) => s + r.icuBeds, 0);
  const availableIcuBeds = resources.reduce((s, r) => s + r.icuBedsAvailable, 0);
  const totalGeneralBeds = resources.reduce((s, r) => s + r.generalBeds, 0);
  const availableGeneralBeds = resources.reduce((s, r) => s + r.generalBedsAvailable, 0);
  const totalAmbulances = resources.reduce((s, r) => s + r.ambulancesTotal, 0);
  const availableAmbulances = resources.reduce((s, r) => s + r.ambulancesAvailable, 0);
  const totalOxygen = resources.reduce((s, r) => s + r.oxygenCylinders, 0);
  const availableOxygen = resources.reduce((s, r) => s + r.oxygenCylindersAvailable, 0);
  const totalDoctors = resources.reduce((s, r) => s + r.doctorsOnDuty, 0);

  let activeBookings = 0;
  if (isDbAvailable) {
    const activeBookingsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookingsTable)
      .where(eq(bookingsTable.status, "dispatched"));
    activeBookings = activeBookingsResult[0]?.count ?? 0;
  } else {
    activeBookings = MOCK_BOOKINGS.filter(b => b.status === "dispatched").length;
  }

  return res.json({
    totalHospitals,
    totalIcuBeds,
    availableIcuBeds,
    totalGeneralBeds,
    availableGeneralBeds,
    totalAmbulances,
    availableAmbulances,
    totalOxygen,
    availableOxygen,
    totalDoctors,
    activeBookings,
  });
});

export default router;
