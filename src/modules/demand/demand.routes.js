import express from "express";
import * as demandController from "./demand.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/rbac.js";

const router = express.Router();

// Household: mark materials as ready ahead of collection day
router.post(
  "/households/declarations",
  authenticate,
  authorize("HOUSEHOLD"),
  demandController.markReady,
);

// Household: cancel an active declaration
router.patch(
  "/households/declarations/:id/cancel",
  authenticate,
  authorize("HOUSEHOLD"),
  demandController.cancelDeclaration,
);

// Partner: view accumulated zone demand ahead of a collection trip
router.get(
  "/partners/demand",
  authenticate,
  authorize("COLLECTION_PARTNER"),
  demandController.getPartnerDemand,
);

export default router;
