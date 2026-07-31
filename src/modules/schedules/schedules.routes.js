import express from "express";
import * as schedulesController from "./schedules.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/rbac.js";

const router = express.Router();

router.post(
  "/partners/prices",
  authenticate,
  authorize("COLLECTION_PARTNER"),
  schedulesController.setPartnerPrice,
);

router.post(
  "/partners/schedules",
  authenticate,
  authorize("COLLECTION_PARTNER"),
  schedulesController.publishSchedule,
);

router.get(
  "/households/partners",
  authenticate,
  authorize("HOUSEHOLD"),
  schedulesController.browsePartners,
);

export default router;
