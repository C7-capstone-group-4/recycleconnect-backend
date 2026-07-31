const express = require("express");
const router = express.Router();

const demandController = require("./demand.controller");
const { authenticate } = require("../../middlewares/auth");
const { authorize } = require("../../middlewares/rbac");

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

module.exports = router;
