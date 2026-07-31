import express from  "express";
import { protect, restrictTo } from "../../middlewares/auth.js";
import controller from "./schedules.controller.js";

/**
 * NOTE ON ENDPOINT NAMING:
 * The Technical Specification listed `POST /api/v1/partners/schedule` (singular)
 * while the API Contract Specification listed `POST /partners/schedules` (plural).
 * Resolved to PLURAL ("schedules") because:
 *    It matches the more detailed, request/response-documented API Contract doc.
 *    It's consistent with REST convention for a collection-style resource
 *      (a partner publishes multiple schedule entries, one per zone/day).
 *   It matches sibling resource naming already used elsewhere (e.g. "prices",
 *      "categories", "transactions" are all plural collection endpoints).
 */

// Partner-facing routes, mounted at /api/v1/partners
const partnerRouter = express.Router();
partnerRouter.use(protect, restrictTo("COLLECTION_PARTNER"));
partnerRouter.post("/prices", controller.publishPrice);
partnerRouter.post("/schedules", controller.publishSchedule);
partnerRouter.get("/demand", controller.getAreaDemand);

// Household-facing routes, mounted at /api/v1/households
const householdRouter = express.Router();
householdRouter.use(protect, restrictTo("HOUSEHOLD"));
householdRouter.get("/prices", controller.listPricesForHouseholds);
householdRouter.get("/partners", controller.listPartnersForHouseholds);

export default { partnerRouter, householdRouter };
