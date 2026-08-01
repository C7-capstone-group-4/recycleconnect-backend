import express from "express";
import { setPartnerPrice, publishSchedule, browsePartners } from "./schedules.controller.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/prices", restrictTo("COLLECTION_PARTNER"), setPartnerPrice);
router.post("/schedules", restrictTo("COLLECTION_PARTNER"), publishSchedule);
router.get("/partners", restrictTo("HOUSEHOLD"), browsePartners);

export default router;