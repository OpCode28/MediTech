import { Router } from "express";
import { db, isDbAvailable, MOCK_HOSPITALS, MOCK_RESOURCES } from "@workspace/db";
import { hospitalsTable, hospitalResourcesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListHospitalsQueryParams,
  GetHospitalParams,
  GetHospitalResourcesParams,
  UpdateHospitalResourcesParams,
  UpdateHospitalResourcesBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/hospitals", async (req, res) => {
  const parseResult = ListHospitalsQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.message });
  }

  const { city, state } = parseResult.data;

  if (!isDbAvailable) {
    let result = [...MOCK_HOSPITALS];
    if (city) {
      result = result.filter(h => h.city.toLowerCase() === city.toLowerCase());
    }
    if (state) {
      result = result.filter(h => h.state.toLowerCase() === state.toLowerCase());
    }
    return res.json(result);
  }

  let hospitals;
  if (city && state) {
    hospitals = await db.select().from(hospitalsTable).where(
      and(eq(hospitalsTable.city, city), eq(hospitalsTable.state, state))
    );
  } else if (city) {
    hospitals = await db.select().from(hospitalsTable).where(eq(hospitalsTable.city, city));
  } else if (state) {
    hospitals = await db.select().from(hospitalsTable).where(eq(hospitalsTable.state, state));
  } else {
    hospitals = await db.select().from(hospitalsTable);
  }

  return res.json(hospitals);
});

router.get("/hospitals/:id", async (req, res) => {
  const parseResult = GetHospitalParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (!isDbAvailable) {
    const hospital = MOCK_HOSPITALS.find(h => h.id === parseResult.data.id);
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }
    return res.json(hospital);
  }

  const hospital = await db
    .select()
    .from(hospitalsTable)
    .where(eq(hospitalsTable.id, parseResult.data.id))
    .limit(1);

  if (hospital.length === 0) {
    return res.status(404).json({ error: "Hospital not found" });
  }

  return res.json(hospital[0]);
});

router.get("/hospitals/:id/resources", async (req, res) => {
  const parseResult = GetHospitalResourcesParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (!isDbAvailable) {
    const resource = MOCK_RESOURCES.find(r => r.hospitalId === parseResult.data.id);
    if (!resource) {
      return res.status(404).json({ error: "Resources not found" });
    }
    return res.json(resource);
  }

  const resources = await db
    .select()
    .from(hospitalResourcesTable)
    .where(eq(hospitalResourcesTable.hospitalId, parseResult.data.id))
    .limit(1);

  if (resources.length === 0) {
    return res.status(404).json({ error: "Resources not found" });
  }

  return res.json(resources[0]);
});

router.put("/hospitals/:id/resources", async (req, res) => {
  const paramsResult = UpdateHospitalResourcesParams.safeParse({ id: Number(req.params.id) });
  const bodyResult = UpdateHospitalResourcesBody.safeParse(req.body);

  if (!paramsResult.success || !bodyResult.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  if (!isDbAvailable) {
    const resource = MOCK_RESOURCES.find(r => r.hospitalId === paramsResult.data.id);
    if (!resource) {
      return res.status(404).json({ error: "Resources not found" });
    }
    Object.assign(resource, bodyResult.data, { updatedAt: new Date() });
    return res.json(resource);
  }

  const updated = await db
    .update(hospitalResourcesTable)
    .set({ ...bodyResult.data, updatedAt: new Date() })
    .where(eq(hospitalResourcesTable.hospitalId, paramsResult.data.id))
    .returning();

  if (updated.length === 0) {
    return res.status(404).json({ error: "Resources not found" });
  }

  return res.json(updated[0]);
});

export default router;
