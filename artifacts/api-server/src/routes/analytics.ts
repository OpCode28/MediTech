import { Router } from "express";
import { db, isDbAvailable, MOCK_HOTSPOTS, MOCK_TRENDS, MOCK_ALERTS, Alert } from "@workspace/db";
import { emergencyHotspotsTable, analyticsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateAlertBody } from "@workspace/api-zod";
import { alertsTable } from "@workspace/db";

const router = Router();

router.get("/analytics/hotspots", async (_req, res) => {
  if (!isDbAvailable) {
    return res.json(MOCK_HOTSPOTS);
  }
  const hotspots = await db.select().from(emergencyHotspotsTable);
  return res.json(hotspots);
});

router.get("/analytics/trends", async (_req, res) => {
  if (!isDbAvailable) {
    return res.json(MOCK_TRENDS);
  }
  const trends = await db.select().from(analyticsTable).orderBy(analyticsTable.id);
  return res.json(trends);
});

router.get("/analytics/response-time", async (_req, res) => {
  const trends = isDbAvailable ? await db.select().from(analyticsTable) : MOCK_TRENDS;
  const totalEmergencies = trends.reduce((s, t) => s + t.emergencyCalls, 0);
  const avgResponseTime = trends.length > 0
    ? trends.reduce((s, t) => s + t.avgResponseTime, 0) / trends.length
    : 8.5;
  const bestResponseTime = trends.length > 0
    ? Math.min(...trends.map(t => t.avgResponseTime))
    : 4.2;

  return res.json({
    avgResponseTimeMinutes: Math.round(avgResponseTime * 10) / 10,
    bestResponseTimeMinutes: Math.round(bestResponseTime * 10) / 10,
    totalEmergencies,
    successRate: 94.7,
    monthlyImprovement: 12.3,
  });
});

router.get("/alerts", async (_req, res) => {
  if (!isDbAvailable) {
    return res.json(MOCK_ALERTS.filter(a => a.isActive === 1));
  }
  const alerts = await db.select().from(alertsTable).where(eq(alertsTable.isActive, 1)).orderBy(alertsTable.createdAt);
  return res.json(alerts);
});

router.post("/alerts", async (req, res) => {
  const parseResult = CreateAlertBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.message });
  }

  if (!isDbAvailable) {
    const newAlert: Alert = {
      id: Math.floor(Math.random() * 900) + 100,
      title: parseResult.data.title,
      message: parseResult.data.message,
      severity: parseResult.data.severity as "critical" | "warning" | "info",
      hospitalId: parseResult.data.hospitalId ?? null,
      isActive: 1,
      createdAt: new Date(),
    };
    MOCK_ALERTS.unshift(newAlert);
    return res.status(201).json(newAlert);
  }

  const alert = await db
    .insert(alertsTable)
    .values({
      title: parseResult.data.title,
      message: parseResult.data.message,
      severity: parseResult.data.severity as "critical" | "warning" | "info",
      hospitalId: parseResult.data.hospitalId,
      isActive: 1,
    })
    .returning();

  return res.status(201).json(alert[0]);
});

export default router;
