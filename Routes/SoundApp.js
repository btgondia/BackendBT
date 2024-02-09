const express = require("express");

const SoundApp = require("../Models/SoundApp");

const router = express.Router();

router.post("/sound_api", async (req, res) => {
  const { box_id } = req.body;
  try {
   console.log(box_id)
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

// export router

module.exports = router;