import { Request, Response, NextFunction } from "express";

export interface UserPayload {
  id: string;
  name: string;
  role: "admin" | "hospital_staff" | "patient" | "ambulance_driver";
  hospitalId?: number;
  driverId?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    // For demo/development ease when no token is provided, attach default patient role
    req.user = {
      id: "demo-user-1",
      name: "Guest User",
      role: "patient",
    };
    return next();
  }

  // Parse simple dev token (e.g. bearer: "staff-hospital-1", "driver-1", or "admin-system")
  if (token.startsWith("driver-")) {
    const driverId = Number(token.split("-")[1]) || 1;
    req.user = {
      id: `driver-${driverId}`,
      name: `Driver #${driverId}`,
      role: "ambulance_driver",
      driverId,
    };
  } else if (token.startsWith("staff")) {
    const parts = token.split("-");
    const hospitalId = parts[2] ? Number(parts[2]) : 1;
    req.user = {
      id: "staff-1",
      name: "Hospital Staff Member",
      role: "hospital_staff",
      hospitalId,
    };
  } else if (token.startsWith("admin")) {
    req.user = {
      id: "admin-1",
      name: "System Administrator",
      role: "admin",
    };
  } else {
    req.user = {
      id: "patient-1",
      name: "Authenticated Patient",
      role: "patient",
    };
  }

  next();
}

export function requireRole(...allowedRoles: Array<UserPayload["role"]>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}
