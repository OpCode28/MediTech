import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hospitalsRouter from "./hospitals";
import resourcesRouter from "./resources";
import ambulancesRouter from "./ambulances";
import bookingsRouter from "./bookings";
import analyticsRouter from "./analytics";
import dashboardRouter from "./dashboard";
import driversRouter from "./drivers";
import tripsRouter from "./trips";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hospitalsRouter);
router.use(resourcesRouter);
router.use(ambulancesRouter);
router.use(bookingsRouter);
router.use(analyticsRouter);
router.use(dashboardRouter);
router.use(driversRouter);
router.use(tripsRouter);

export default router;
