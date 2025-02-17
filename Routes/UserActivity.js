const express = require("express");
const router = express.Router();
const UserActivity = require("../Models/UserActivity");

router.post("/postUserActivity", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    
    let time = new Date();
    value = { ...value, timestamp: time.getTime() };

    let response = await UserActivity.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Activity Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getUserActivity", async (req, res) => {
  try {
  let value = req.body;
  if (!value) res.json({ success: false, message: "Invalid Data" });
  
  let endDate = +value.endDate + 86400000;
  let response = await UserActivity.find({
    user_uuid: value.user_uuid,
    timestamp: { $gt: value.startDate, $lt: endDate },
  });
  if (response) {
    res.json({ success: true, result: response });
  } else res.json({ success: false, message: "Activity Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
