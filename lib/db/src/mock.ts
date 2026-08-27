export interface Hospital {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  latitude: number;
  longitude: number;
  type: "government" | "private" | "trust";
  status: "active" | "inactive";
  createdAt: Date;
}

export interface HospitalResource {
  id: number;
  hospitalId: number;
  icuBeds: number;
  icuBedsAvailable: number;
  generalBeds: number;
  generalBedsAvailable: number;
  oxygenCylinders: number;
  oxygenCylindersAvailable: number;
  ambulancesTotal: number;
  ambulancesAvailable: number;
  doctorsOnDuty: number;
  ventilators: number;
  ventilatorsAvailable: number;
  updatedAt: Date;
}

export interface Ambulance {
  id: number;
  hospitalId: number;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  status: "available" | "dispatched" | "maintenance";
  type: "basic" | "advanced" | "icu";
  latitude: number;
  longitude: number;
  updatedAt: Date;
}

export interface Booking {
  id: number;
  patientName: string;
  patientPhone: string;
  pickupAddress: string;
  destinationHospitalId: number;
  ambulanceId: number | null;
  status: "pending" | "confirmed" | "dispatched" | "completed" | "cancelled";
  emergency: "critical" | "moderate" | "low";
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyHotspot {
  id: number;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  riskLevel: "high" | "medium" | "low";
  incidentCount: number;
  predictedDemand: number;
  description: string;
}

export interface AnalyticsTrend {
  id: number;
  month: string;
  emergencyCalls: number;
  ambulancesDispatched: number;
  avgResponseTime: number;
  criticalCases: number;
}

export interface Alert {
  id: number;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  hospitalId: number | null;
  isActive: number;
  createdAt: Date;
}

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 1,
    name: "AIIMS New Delhi",
    address: "Sri Aurobindo Marg, Ansari Nagar",
    city: "New Delhi",
    state: "Delhi",
    phone: "+91 11 2658 8500",
    latitude: 28.5672,
    longitude: 77.21,
    type: "government",
    status: "active",
    createdAt: new Date(),
  },
  {
    id: 2,
    name: "SCB Medical College & Hospital",
    address: "Mangalabag",
    city: "Cuttack",
    state: "Odisha",
    phone: "+91 671 2414332",
    latitude: 20.4625,
    longitude: 85.8828,
    type: "government",
    status: "active",
    createdAt: new Date(),
  },
  {
    id: 3,
    name: "KIMS Hospital",
    address: "KIIT Campus 5, Patia",
    city: "Bhubaneswar",
    state: "Odisha",
    phone: "+91 674 2725182",
    latitude: 20.3533,
    longitude: 85.8189,
    type: "private",
    status: "active",
    createdAt: new Date(),
  },
  {
    id: 4,
    name: "Apollo Hospitals",
    address: "Plot No 251, Sainik School Rd",
    city: "Bhubaneswar",
    state: "Odisha",
    phone: "+91 674 6661016",
    latitude: 20.3012,
    longitude: 85.8329,
    type: "private",
    status: "active",
    createdAt: new Date(),
  },
  {
    id: 5,
    name: "Fortis Hospital",
    address: "Sector 62, Phase VIII",
    city: "Mohali",
    state: "Punjab",
    phone: "+91 172 5021222",
    latitude: 30.7046,
    longitude: 76.7179,
    type: "private",
    status: "active",
    createdAt: new Date(),
  },
];

export const MOCK_RESOURCES: HospitalResource[] = [
  {
    id: 1,
    hospitalId: 1,
    icuBeds: 120,
    icuBedsAvailable: 14,
    generalBeds: 500,
    generalBedsAvailable: 85,
    oxygenCylinders: 300,
    oxygenCylindersAvailable: 120,
    ambulancesTotal: 15,
    ambulancesAvailable: 6,
    doctorsOnDuty: 45,
    ventilators: 80,
    ventilatorsAvailable: 12,
    updatedAt: new Date(),
  },
  {
    id: 2,
    hospitalId: 2,
    icuBeds: 90,
    icuBedsAvailable: 8,
    generalBeds: 400,
    generalBedsAvailable: 42,
    oxygenCylinders: 250,
    oxygenCylindersAvailable: 95,
    ambulancesTotal: 12,
    ambulancesAvailable: 4,
    doctorsOnDuty: 35,
    ventilators: 60,
    ventilatorsAvailable: 5,
    updatedAt: new Date(),
  },
  {
    id: 3,
    hospitalId: 3,
    icuBeds: 60,
    icuBedsAvailable: 18,
    generalBeds: 300,
    generalBedsAvailable: 110,
    oxygenCylinders: 200,
    oxygenCylindersAvailable: 140,
    ambulancesTotal: 10,
    ambulancesAvailable: 7,
    doctorsOnDuty: 28,
    ventilators: 40,
    ventilatorsAvailable: 15,
    updatedAt: new Date(),
  },
  {
    id: 4,
    hospitalId: 4,
    icuBeds: 50,
    icuBedsAvailable: 22,
    generalBeds: 250,
    generalBedsAvailable: 95,
    oxygenCylinders: 180,
    oxygenCylindersAvailable: 130,
    ambulancesTotal: 8,
    ambulancesAvailable: 5,
    doctorsOnDuty: 25,
    ventilators: 35,
    ventilatorsAvailable: 18,
    updatedAt: new Date(),
  },
  {
    id: 5,
    hospitalId: 5,
    icuBeds: 70,
    icuBedsAvailable: 25,
    generalBeds: 350,
    generalBedsAvailable: 140,
    oxygenCylinders: 220,
    oxygenCylindersAvailable: 160,
    ambulancesTotal: 9,
    ambulancesAvailable: 6,
    doctorsOnDuty: 30,
    ventilators: 45,
    ventilatorsAvailable: 20,
    updatedAt: new Date(),
  },
];

export const MOCK_AMBULANCES: Ambulance[] = [
  { id: 1, hospitalId: 1, vehicleNumber: "DL-01-AM-1081", driverName: "Ramesh Kumar", driverPhone: "+91 98765 43210", status: "available", type: "icu", latitude: 28.5672, longitude: 77.21, updatedAt: new Date() },
  { id: 2, hospitalId: 1, vehicleNumber: "DL-01-AM-1082", driverName: "Suresh Singh", driverPhone: "+91 98765 43211", status: "dispatched", type: "advanced", latitude: 28.57, longitude: 77.22, updatedAt: new Date() },
  { id: 3, hospitalId: 2, vehicleNumber: "OD-05-AM-2081", driverName: "Bijay Mohanty", driverPhone: "+91 98765 43212", status: "available", type: "advanced", latitude: 20.4625, longitude: 85.8828, updatedAt: new Date() },
  { id: 4, hospitalId: 2, vehicleNumber: "OD-05-AM-2082", driverName: "Debasis Sahoo", driverPhone: "+91 98765 43213", status: "dispatched", type: "basic", latitude: 20.47, longitude: 85.89, updatedAt: new Date() },
  { id: 5, hospitalId: 3, vehicleNumber: "OD-02-AM-3081", driverName: "Pradeep Swain", driverPhone: "+91 98765 43214", status: "available", type: "icu", latitude: 20.3533, longitude: 85.8189, updatedAt: new Date() },
  { id: 6, hospitalId: 4, vehicleNumber: "OD-02-AM-4081", driverName: "Manas Das", driverPhone: "+91 98765 43215", status: "available", type: "basic", latitude: 20.3012, longitude: 85.8329, updatedAt: new Date() },
];

export const MOCK_BOOKINGS: Booking[] = [
  { id: 101, patientName: "Aarav Sharma", patientPhone: "+91 98111 22233", pickupAddress: "Connaught Place, New Delhi", destinationHospitalId: 1, ambulanceId: 2, status: "dispatched", emergency: "critical", notes: "Severe chest pain", createdAt: new Date(Date.now() - 15 * 60000), updatedAt: new Date() },
  { id: 102, patientName: "Priyanka Naik", patientPhone: "+91 98222 33344", pickupAddress: "Patia, Bhubaneswar", destinationHospitalId: 3, ambulanceId: 5, status: "confirmed", emergency: "moderate", notes: "High fever and dizziness", createdAt: new Date(Date.now() - 40 * 60000), updatedAt: new Date() },
  { id: 103, patientName: "Soumya Ranjan", patientPhone: "+91 98333 44455", pickupAddress: "Cuttack Railway Station", destinationHospitalId: 2, ambulanceId: 4, status: "dispatched", emergency: "critical", notes: "Road accident victim", createdAt: new Date(Date.now() - 55 * 60000), updatedAt: new Date() },
];

export const MOCK_HOTSPOTS: EmergencyHotspot[] = [
  { id: 1, area: "Chandni Chowk / Old Delhi", city: "New Delhi", latitude: 28.6506, longitude: 77.23, riskLevel: "high", incidentCount: 42, predictedDemand: 15, description: "High density traffic zone with elevated cardiac emergency reports." },
  { id: 2, area: "Badambadi Bus Stand", city: "Cuttack", latitude: 20.4533, longitude: 85.8672, riskLevel: "high", incidentCount: 28, predictedDemand: 10, description: "Major transit hub with high vehicular accident probability during peak hours." },
  { id: 3, area: "Jayadev Vihar Square", city: "Bhubaneswar", latitude: 20.2961, longitude: 85.8245, riskLevel: "medium", incidentCount: 19, predictedDemand: 8, description: "Intersection prone to evening traffic surges and minor collisions." },
];

export const MOCK_TRENDS: AnalyticsTrend[] = [
  { id: 1, month: "Jan", emergencyCalls: 340, ambulancesDispatched: 310, avgResponseTime: 9.4, criticalCases: 85 },
  { id: 2, month: "Feb", emergencyCalls: 380, ambulancesDispatched: 355, avgResponseTime: 8.8, criticalCases: 92 },
  { id: 3, month: "Mar", emergencyCalls: 410, ambulancesDispatched: 390, avgResponseTime: 8.2, criticalCases: 105 },
  { id: 4, month: "Apr", emergencyCalls: 450, ambulancesDispatched: 430, avgResponseTime: 7.9, criticalCases: 118 },
];

export interface DriverMock {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  emergencyContact: string;
  address: string;
  licenseNumber: string;
  licenseExpiry: string;
  driverRegistrationId: string;
  verificationStatus: "pending" | "verified" | "rejected" | "suspended";
  availabilityStatus: "offline" | "available" | "busy" | "on_trip";
  ambulanceId: number | null;
}

export interface TripMock {
  id: number;
  bookingId: number;
  driverId: number;
  ambulanceId: number;
  hospitalId: number | null;
  status:
    | "requested"
    | "offered"
    | "accepted"
    | "en_route_to_patient"
    | "arrived_at_pickup"
    | "patient_picked_up"
    | "en_route_to_hospital"
    | "arrived_at_hospital"
    | "completed"
    | "declined"
    | "cancelled";
  pickupLatitude: number;
  pickupLongitude: number;
  hospitalLatitude: number | null;
  hospitalLongitude: number | null;
  currentLatitude: number;
  currentLongitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  etaMinutes: number;
  roadDistanceKm: number;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  arrivedHospitalAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const MOCK_DRIVERS: DriverMock[] = [
  {
    id: 1,
    fullName: "Ramesh Kumar",
    email: "ramesh.driver@meditech.in",
    phone: "+91 98765 43210",
    emergencyContact: "+91 98765 00001",
    address: "Ansari Nagar, New Delhi",
    licenseNumber: "DL-0120201122334",
    licenseExpiry: "2030-12-31",
    driverRegistrationId: "DRV-DL-1001",
    verificationStatus: "verified",
    availabilityStatus: "available",
    ambulanceId: 1,
  },
  {
    id: 2,
    fullName: "Pradeep Swain",
    email: "pradeep.swain@meditech.in",
    phone: "+91 98765 43214",
    emergencyContact: "+91 98765 00002",
    address: "Patia, Bhubaneswar, Odisha",
    licenseNumber: "OD-0220199988776",
    licenseExpiry: "2029-08-15",
    driverRegistrationId: "DRV-OD-2002",
    verificationStatus: "verified",
    availabilityStatus: "available",
    ambulanceId: 5,
  },
];

export const MOCK_TRIPS: TripMock[] = [
  {
    id: 501,
    bookingId: 102,
    driverId: 2,
    ambulanceId: 5,
    hospitalId: 3,
    status: "accepted",
    pickupLatitude: 20.3533,
    pickupLongitude: 85.8189,
    hospitalLatitude: 20.3533,
    hospitalLongitude: 85.8189,
    currentLatitude: 20.345,
    currentLongitude: 85.812,
    speed: 35,
    heading: 120,
    accuracy: 8,
    etaMinutes: 12,
    roadDistanceKm: 4.5,
    acceptedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const MOCK_ALERTS: Alert[] = [
  { id: 1, title: "ICU Bed Shortage Notice", message: "SCB Cuttack ICU occupancy exceeds 90%. Divert non-critical cases.", severity: "critical", hospitalId: 2, isActive: 1, createdAt: new Date() },
  { id: 2, title: "Ambulance Fleet Active", message: "5 new Advanced Life Support ambulances deployed in Bhubaneswar.", severity: "info", hospitalId: 3, isActive: 1, createdAt: new Date() },
];

