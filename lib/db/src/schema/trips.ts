import { pgTable, serial, integer, real, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";
import { driversTable } from "./drivers";
import { ambulancesTable } from "./ambulances";
import { hospitalsTable } from "./hospitals";

export const tripStatusEnum = pgEnum("trip_status", [
  "requested",
  "offered",
  "accepted",
  "en_route_to_patient",
  "arrived_at_pickup",
  "patient_picked_up",
  "en_route_to_hospital",
  "arrived_at_hospital",
  "completed",
  "declined",
  "cancelled",
]);

export const tripsTable = pgTable("trips", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  driverId: integer("driver_id").notNull().references(() => driversTable.id),
  ambulanceId: integer("ambulance_id").notNull().references(() => ambulancesTable.id),
  hospitalId: integer("hospital_id").references(() => hospitalsTable.id),
  status: tripStatusEnum("status").notNull().default("requested"),
  pickupLatitude: real("pickup_latitude").notNull(),
  pickupLongitude: real("pickup_longitude").notNull(),
  hospitalLatitude: real("hospital_latitude"),
  hospitalLongitude: real("hospital_longitude"),
  currentLatitude: real("current_latitude"),
  currentLongitude: real("current_longitude"),
  speed: real("speed"),
  heading: real("heading"),
  accuracy: real("accuracy"),
  etaMinutes: integer("eta_minutes"),
  roadDistanceKm: real("road_distance_km"),
  acceptedAt: timestamp("accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  arrivedHospitalAt: timestamp("arrived_hospital_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const driverLocationsTable = pgTable("driver_locations", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  driverId: integer("driver_id").notNull().references(() => driversTable.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  speed: real("speed"),
  heading: real("heading"),
  accuracy: real("accuracy"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertTripSchema = createInsertSchema(tripsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof tripsTable.$inferSelect;
export type DriverLocation = typeof driverLocationsTable.$inferSelect;
