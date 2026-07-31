const express = require("express");
const router = express.Router();

const schedulesController = require("./schedules.controller");
const { authenticate } = require("../../middlewares/auth");
const { authorize } = require("../../middlewares/rbac");

// Partner: publish/update buying price per material category
router.post(
  "/partners/prices",
  authenticate,
  authorize("COLLECTION_PARTNER"),
  schedulesController.setPartnerPrice,
);

// Partner: publish recurring collection schedule
router.post(
  "/partners/schedules",
  authenticate,
  authorize("COLLECTION_PARTNER"),
  schedulesController.publishSchedule,
);

// Household: browse partners, prices, and schedules in their zone
router.get(
  "/households/partners",
  authenticate,
  authorize("HOUSEHOLD"),
  schedulesController.browsePartners,
);

module.exports = router;
