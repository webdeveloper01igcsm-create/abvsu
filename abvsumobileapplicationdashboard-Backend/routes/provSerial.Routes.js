const express = require("express");
const router = express.Router();
const {
  setSerialSeries,
  getAllSerialSeries,
  getSerialSeriesById,
  updateSerialSeries,
  deleteSerialSeries,
} = require("../controllers/provSerial.Controller");
const { checkPermission } = require("../middlewares/auth");

// Create / Upsert
router.post(
  "/serial-series",
  checkPermission("Result Management", "view"),
  setSerialSeries
);

// Read All
router.get(
  "/serial-series",
  checkPermission("Result Management", "view"),
  getAllSerialSeries
);

// Read One
router.get(
  "/serial-series/:id",
  checkPermission("Result Management", "view"),
  getSerialSeriesById
);

// Update
router.put(
  "/serial-series/:id",
  checkPermission("Result Management", "view"),
  updateSerialSeries
);

// Delete
router.delete(
  "/serial-series/:id",
  checkPermission("Result Management", "view"),
  deleteSerialSeries
);

module.exports = router;
