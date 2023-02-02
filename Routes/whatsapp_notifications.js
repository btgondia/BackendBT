const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Whatsapp_notifications = require("../Models/whatsapp_notifications");

router.post("/CreateWhatsapp_notifications", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, notification_uuid: uuid(), status: 1 };

    console.log(value);
    let response = await Whatsapp_notifications.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else
      res.json({
        success: false,
        message: "whatsapp_notifications Not created",
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.delete("/DeleteWhatsapp_notifications", async (req, res) => {
  try {
    let value = req.body;
    if (!value.notification_uuid)
      res.json({ success: false, message: "Invalid Data" });

    console.log(value);
    let response = await Whatsapp_notifications.deleteMany({
      notification_uuid: value.notification_uuid,
    });
    if (response) {
      res.json({ success: true, result: response });
    } else
      res.json({
        success: false,
        message: "whatsapp_notifications Not Deleted",
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/UpdateWhatsapp_notifications", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = Object.keys(value)
      .filter((key) => key !== "_id")
      .reduce((obj, key) => {
        obj[key] = value[key];
        return obj;
      }, {});
    console.log(value);
    let response = await Whatsapp_notifications.updateMany(
      { notification_uuid: value.notification_uuid },
      value
    );
    if (response.acknowledged) {
      res.json({ success: true, result: value });
    } else
      res.json({
        success: false,
        message: "whatsapp_notifications Not created",
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getWhatsapp_notifications", async (req, res) => {
  try {
    let response = await Whatsapp_notifications.find({});
    if (response.length) {
      res.json({ success: true, result: response });
    } else
      res.json({ success: false, message: "whatsapp_notifications Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
