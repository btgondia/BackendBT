const express = require("express");
const router = express.Router();
const Outstanding = require("../Models/OutStanding");

router.post("/postOutstanding", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    console.log(value);
    let response = await Outstanding.create(value);
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
