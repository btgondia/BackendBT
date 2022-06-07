const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Details = require("../Models/Details");



router.get("/GetDetails", async (req, res) => {
  try {
    let data = await Details.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Details Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});


module.exports = router;
