const express = require("express");

const SoundApp = require("../Models/SoundApp");
const client = require("../config/mqtt");

const router = express.Router();

router.post("/sound_api", async (req, res) => {
  const { box_id } = req.body;
  try {
    const soundApp = await SoundApp.findOne({ box_id });
    // if box_id exists
    if (soundApp) {
      // increment server_calls
      soundApp.server_calls += 1;
      // save
      await soundApp.save();
      // return soundApp
      return res.status(200).json(soundApp);
    }
    // if box_id does not exist return
    return res.status(400).json({ message: "Box ID does not exist" });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post("/progress_report", async (req, res) => {
  try {
    let {
      completed_requests = [],
      completed_plays: [],
    } = req.body;

    res.status(200).json({ message: "Received Progress Report" });
  } catch (error) {
    res.status(500).send(error);
  }
});
router.post("/send_message", (req, res) => {
  const { deviceName, message } = req.body;

  // Publish message to a topic
  client.publish(deviceName, message, (error) => {
    if (error) {
      console.error("Error publishing message:", error);
      res.status(500).json({ error: "Error publishing message" });
    } else {
      console.log("Message published successfully");
      res.status(200).json({ message: "Message published successfully" });
    }
  });
});

module.exports = router;
