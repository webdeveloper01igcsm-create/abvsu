const Notification = require("../models/Notification");
const { z } = require("zod")
const Student = require("../models/Student");
const { Expo } = require("expo-server-sdk");

const expo = new Expo();
const allowedTags = ["exam", "general", "result"];

const notificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  tags: z.array(z.string().refine(tag => allowedTags.includes(tag), {
    message: "Invalid tag"
  })).min(1, "At least one tag is required"),
})

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications. Please try again later.",
    });
  }
};

const addNotification = async (req, res) => {
  try {
    const { title, message, tags } = req.body;

    try {
      notificationSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
    }

    // Step 1: Save Notification to DB
    const newNotification = new Notification({
      title,
      message,
      tags,
    });

    await newNotification.save();

    // Step 2: Fetch all students with valid pushToken(s)
    const students = await Student.find({
      pushToken: { $exists: true, $ne: [] },
    });

    const messages = [];

    students.forEach((student) => {
      student.pushToken.forEach((token) => {
        if (Expo.isExpoPushToken(token)) {
          messages.push({
            to: token,
            sound: "default",
            title,
            body: message,
            data: { notificationId: newNotification._id },
          });
        }
      });
    });

    // Step 3: Send notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (err) {
        console.error("Error sending push chunk:", err);
      }
    }
    console.log("Push notification tickets:", tickets);
    return res.status(201).json({
      success: true,
      message: "Notification added and sent successfully.",
      notification: newNotification,
      notified: messages.length,
    });
  } catch (error) {
    console.error("Error adding notification:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add and send notification. Try again later.",
    });
  }
};

const patchNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, tags } = req.body;
    try {
      notificationSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
    }
    const notification = await Notification.findByIdAndUpdate(id, { title, message, tags }, { new: true });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification updated successfully.",
      notification,
    });


  } catch (error) {
    console.error("Error updating notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification. Please try again later.",
    });
  }
}

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
      notification,
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification. Please try again later.",
    });
  }
}

module.exports = {
  getNotifications,
  addNotification,
  patchNotification,
  deleteNotification,
};