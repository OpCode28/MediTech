import { pgTable, serial, integer, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { hospitalsTable } from "./hospitals";

export const ambulanceStatusEnum = pgEnum("ambulance_status", ["available", "dispatched", "maintenance", "offline"]);
export const ambulanceTypeEnum = pgEnum("ambulance_type", ["basic", "advanced", "icu", "emergency", "patient_transport"]);

export const ambulancesTable = pgTable("ambulances", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitalsTable.id, { onDelete: "cascade" }),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  driverName: text("driver_name").notNull(),
  driverPhone: text("driver_phone").notNull(),
  status: ambulanceStatusEnum("status").notNull().default("available"),
  type: ambulanceTypeEnum("type").notNull().default("basic"),
  vehicleMake: text("vehicle_make"),
  vehicleModel: text("vehicle_model"),
  vehicleYear: text("vehicle_year"),
  patientCapacity: integer("patient_capacity").default(1),
  insuranceNumber: text("insurance_number"),
  insuranceExpiry: text("insurance_expiry"),
  fitnessCertificate: text("fitness_certificate"),
  latitude: real("latitude").notNull().default(20.2961),
  longitude: real("longitude").notNull().default(85.8245),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAmbulanceSchema = createInsertSchema(ambulancesTable).omit({ id: true, updatedAt: true });
export type InsertAmbulance = z.infer<typeof insertAmbulanceSchema>;
export type Ambulance = typeof ambulancesTable.$inferSelect;
