import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Ambulance, UserCheck, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const driverRegisterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Enter a valid 10-digit mobile number"),
  emergencyContact: z.string().min(10, "Enter emergency contact number"),
  address: z.string().min(5, "Enter full residential address"),
  licenseNumber: z.string().min(5, "Enter valid driver license number"),
  licenseExpiry: z.string().min(4, "Enter license expiry date"),
  vehicleNumber: z.string().min(4, "Enter valid vehicle registration number"),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  patientCapacity: z.string().optional(),
  ambulanceCategory: z.enum(["basic", "advanced", "icu", "emergency", "patient_transport"]),
  insuranceNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
});

type DriverRegisterForm = z.infer<typeof driverRegisterSchema>;

export default function DriverRegister() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<DriverRegisterForm>({
    resolver: zodResolver(driverRegisterSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
      emergencyContact: "",
      address: "",
      licenseNumber: "",
      licenseExpiry: "",
      vehicleNumber: "",
      vehicleMake: "Force Motors",
      vehicleModel: "Traveller Ambulance",
      vehicleYear: "2023",
      patientCapacity: "1",
      ambulanceCategory: "basic",
      insuranceNumber: "",
      insuranceExpiry: "",
    },
  });

  async function onSubmit(values: DriverRegisterForm) {
    setLoading(true);
    try {
      const res = await fetch("/api/drivers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Registration failed");
      }

      const data = await res.json();
      localStorage.setItem("meditech-driver-token", data.token);
      localStorage.setItem("meditech-driver-id", String(data.driver.id));

      setSuccess(true);
      toast({
        title: "Registration Submitted!",
        description: "Your ambulance driver account is verified and ready.",
      });

      setTimeout(() => {
        setLocation("/driver/dashboard");
      }, 1500);
    } catch (err: any) {
      toast({
        title: "Registration Error",
        description: err.message || "Could not complete registration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 text-center space-y-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto animate-bounce" />
        <h2 className="text-2xl font-bold text-emerald-900">Registration Complete!</h2>
        <p className="text-emerald-700">Redirecting to your Ambulance Driver Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-semibold">
          <Ambulance className="h-4 w-4" /> SECTOR 2 — AMBULANCE DRIVER PORTAL
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Driver & Ambulance Onboarding</h1>
        <p className="text-muted-foreground">Register your vehicle and join the MediTech emergency response network.</p>
      </div>

      <Card className="border-t-4 border-t-cyan-600 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserCheck className="h-5 w-5 text-cyan-600" /> Driver & Vehicle Information
          </CardTitle>
          <CardDescription>
            Verification process: <span className="font-semibold text-amber-600">REGISTERED → PENDING → VERIFIED → AVAILABLE</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-cyan-900 border-b pb-1">1. Driver Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl><Input placeholder="e.g. Rajesh Kumar Swain" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number *</FormLabel>
                      <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl><Input type="email" placeholder="driver@meditech.in" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="emergencyContact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Number *</FormLabel>
                      <FormControl><Input placeholder="+91 XXXXX XXXXX" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Residential Address *</FormLabel>
                      <FormControl><Input placeholder="City, State" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* License Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-cyan-900 border-b pb-1">2. Driver License & Verification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver License Number *</FormLabel>
                      <FormControl><Input placeholder="OD-0220201122334" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="licenseExpiry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Expiry Date *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Ambulance Vehicle Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-cyan-900 border-b pb-1">3. Ambulance Vehicle Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="vehicleNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Registration Number *</FormLabel>
                      <FormControl><Input placeholder="OD-02-AM-1081" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ambulanceCategory" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ambulance Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="basic">Basic Life Support (BLS)</SelectItem>
                          <SelectItem value="advanced">Advanced Life Support (ALS)</SelectItem>
                          <SelectItem value="icu">ICU Cardiac Ambulance</SelectItem>
                          <SelectItem value="emergency">Emergency Response</SelectItem>
                          <SelectItem value="patient_transport">Patient Transport Van</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="vehicleMake" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Make</FormLabel>
                      <FormControl><Input placeholder="Force / Tata" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vehicleModel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Model</FormLabel>
                      <FormControl><Input placeholder="Traveller / Winger" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="patientCapacity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient Capacity</FormLabel>
                      <FormControl><Input type="number" placeholder="1" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold bg-cyan-700 hover:bg-cyan-800" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Submitting Onboarding Data...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Register Ambulance & Complete Onboarding
                  </span>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
