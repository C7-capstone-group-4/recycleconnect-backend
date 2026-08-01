import express from "express";
import { markReady, cancelDeclaration, getPartnerDemand } from "./demand.controller.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect); // Protect all routes below

// Household declarations
router.post("/declarations", restrictTo("HOUSEHOLD"), markReady);
router.patch("/declarations/:id/cancel", restrictTo("HOUSEHOLD"), cancelDeclaration);

// Partner view area demand
router.get("/demand", restrictTo("COLLECTION_PARTNER"), getPartnerDemand);

export default router;