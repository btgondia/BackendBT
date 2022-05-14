const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Companies = require("../Models/Companies");



router.get("/getCompanies", async (req, res) => {
  try {
    let data = await Companies.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Companies Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
