import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ambulancesTable } from "./ambulances";

export const driverVerificationStatusEnum = pgEnum("driver_verification_status", [
  "pending",
  "verified",
  "rejected",
  "suspended",
]);

export const driverAvailabilityStatusEnum = pgEnum("driver_availability_status", [
  "offline",
  "available",
  "busy",
  "on_trip",
]);

export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").notNull(),
  emergencyContact: text("emergency_contact").notNull(),
  address: text("address").notNull(),
  licenseNumber: text("license_number").notNull().unique(),
  licenseExpiry: text("license_expiry").notNull(),
  driverRegistrationId: text("driver_registration_id").notNull().unique(),
  profilePhotoUrl: text("profile_photo_url"),
  verificationStatus: driverVerificationStatusEnum("verification_status").notNull().default("pending"),
  availabilityStatus: driverAvailabilityStatusEnum("availability_status").notNull().default("offline"),
  ambulanceId: integer("ambulance_id").references(() => ambulancesTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;
