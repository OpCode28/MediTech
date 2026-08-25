import { Router } from "express";
import {
  db,
  isDbAvailable,
  MOCK_HOSPITALS,
  MOCK_RESOURCES,
  MOCK_AMBULANCES,
  MOCK_BOOKINGS,
  MOCK_ALERTS,
  MOCK_TRENDS,
} from "@workspace/db";
import {
  hospitalsTable,
  hospitalResourcesTable,
  bookingsTable,
  ambulancesTable,
  alertsTable,
  analyticsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  if (!isDbAvailable) {
    const availableIcuBeds = MOCK_RESOURCES.reduce((s, r) => s + r.icuBedsAvailable, 0);
    const availableGeneralBeds = MOCK_RESOURCES.reduce((s, r) => s + r.generalBedsAvailable, 0);
    const totalDoctorsOnDuty = MOCK_RESOURCES.reduce((s, r) => s + r.doctorsOnDuty, 0);
    const pendingCount = MOCK_BOOKINGS.filter(b => b.status === "pending").length;
    const criticalAlertsCount = MOCK_ALERTS.filter(a => a.severity === "critical" && a.isActive === 1).length;
    const activeAmbulancesCount = MOCK_AMBULANCES.filter(a => a.status === "available").length;

    const hospitalsAtCapacity = MOCK_RESOURCES.filter(r => {
      const icuPct = r.icuBeds > 0 ? r.icuBedsAvailable / r.icuBeds : 1;
      const genPct = r.generalBeds > 0 ? r.generalBedsAvailable / r.generalBeds : 1;
      return icuPct < 0.1 && genPct < 0.1;
    }).length;

    const avgResponseTime = MOCK_TRENDS.reduce((s, t) => s + t.avgResponseTime, 0) / MOCK_TRENDS.length;

    return res.json({
      totalHospitals: MOCK_HOSPITALS.length,
      activeAmbulances: activeAmbulancesCount,
      availableIcuBeds,
      availableGeneralBeds,
      pendingBookings: pendingCount,
      criticalAlerts: criticalAlertsCount,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      hospitalsAtCapacity,
      totalDoctorsOnDuty,
    });
  }

  const hospitals = await db.select().from(hospitalsTable);
  const resources = await db.select().from(hospitalResourcesTable);
  const trends = await db.select().from(analyticsTable);
  
  const pendingBookings = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(eq(bookingsTable.status, "pending"));
  
  const criticalAlerts = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alertsTable)
    .where(eq(alertsTable.severity, "critical"));

  const activeAmbulances = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ambulancesTable)
    .where(eq(ambulancesTable.status, "available"));

  const availableIcuBeds = resources.reduce((s, r) => s + r.icuBedsAvailable, 0);
  const availableGeneralBeds = resources.reduce((s, r) => s + r.generalBedsAvailable, 0);
  const totalDoctorsOnDuty = resources.reduce((s, r) => s + r.doctorsOnDuty, 0);
  
  const hospitalsAtCapacity = resources.filter(r => {
    const icuPct = r.icuBeds > 0 ? r.icuBedsAvailable / r.icuBeds : 1;
    const genPct = r.generalBeds > 0 ? r.generalBedsAvailable / r.generalBeds : 1;
    return icuPct < 0.1 && genPct < 0.1;
  }).length;

  const avgResponseTime = trends.length > 0
    ? trends.reduce((s, t) => s + t.avgResponseTime, 0) / trends.length
    : 8.5;

  return res.json({
    totalHospitals: hospitals.length,
    activeAmbulances: activeAmbulances[0]?.count ?? 0,
    availableIcuBeds,
    availableGeneralBeds,
    pendingBookings: pendingBookings[0]?.count ?? 0,
    criticalAlerts: criticalAlerts[0]?.count ?? 0,
    avgResponseTime: Math.round(avgResponseTime * 10) / 10,
    hospitalsAtCapacity,
    totalDoctorsOnDuty,
  });
});

router.get("/dashboard/recent-bookings", async (_req, res) => {
  if (!isDbAvailable) {
    return res.json(MOCK_BOOKINGS.slice(0, 10));
  }
  const bookings = await db
    .select()
    .from(bookingsTable)
    .orderBy(sql`${bookingsTable.createdAt} DESC`)
    .limit(10);
  return res.json(bookings);
});

router.get("/dashboard/critical-hospitals", async (_req, res) => {
  const resources = isDbAvailable ? await db.select().from(hospitalResourcesTable) : MOCK_RESOURCES;
  const criticalHospitalIds = resources
    .filter(r => {
      const icuPct = r.icuBeds > 0 ? r.icuBedsAvailable / r.icuBeds : 1;
      const genPct = r.generalBeds > 0 ? r.generalBedsAvailable / r.generalBeds : 1;
      return icuPct < 0.3 || genPct < 0.3;
    })
    .map(r => r.hospitalId);

  if (criticalHospitalIds.length === 0) {
    return res.json([]);
  }

  const allHospitals = isDbAvailable ? await db.select().from(hospitalsTable) : MOCK_HOSPITALS;
  const criticalHospitals = allHospitals.filter(h => criticalHospitalIds.includes(h.id));
  
  return res.json(criticalHospitals);
});

export default router;
