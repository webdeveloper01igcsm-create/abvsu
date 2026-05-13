const express = require("express");
const router = express.Router();
const {
  getNotifications,
  addNotification,
  patchNotification,
  deleteNotification,
} = require("../controllers/notification.Controller");
const { checkPermission, verifyToken, verifyStudentToken} = require("../middlewares/auth");

router.get("/", getNotifications);
router.post("/", verifyToken, checkPermission("Notification Management","write"), addNotification);
// router.post("/", verifyStudentToken, addNotificationToken);
router.patch("/:id", verifyToken, checkPermission("Notification Management", "update"), patchNotification);
router.delete("/:id", verifyToken, checkPermission("Notification Management", "delete"), deleteNotification);

module.exports = router;