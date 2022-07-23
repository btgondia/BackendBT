const express = require("express");
const router = express.Router();
const Outstanding = require("../Models/OutStanding");
const SignedBills = require("../Models/SignedBills");

router.post("/postOutstanding", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    console.log(value);
    let time = new Date();
    let response = await Outstanding.create(value);
    let result = await SignedBills.create({
      time_stamp: time.getTime(),
      user_uuid: value.user_uuid,
      order_uuid: value.order_uuid,
      status: 0,
      amount: value.amount,
    });
    console.log(result);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Outstanding Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/getOutstanding", async (req, res) => {
  try {
    let response = await Outstanding.find({});
    response = JSON.parse(JSON.stringify(response));

    console.log(response);
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Outstanding Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
