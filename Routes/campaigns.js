const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Campaigns = require("../Models/Campaigns");

router.post("/CreateCampaigns", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, campaign_uuid: uuid() ,created_at:new Date().getTime()};

    console.log(value);
    let response = await Campaigns.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else
      res.json({
        success: false,
        message: "Campaigns Not created",
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.delete("/DeleteCampaigns", async (req, res) => {
  try {
    let value = req.body;
    if (!value.campaign_uuid)
      res.json({ success: false, message: "Invalid Data" });

    console.log(value);
    let response = await Campaigns.deleteMany({
      campaign_uuid: value.campaign_uuid,
    });
    if (response) {
      res.json({ success: true, result: response });
    } else
      res.json({
        success: false,
        message: "Campaigns Not Deleted",
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/UpdateCampaigns", async (req, res) => {
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
    let response = await Campaigns.updateMany(
      { campaign_uuid: value.campaign_uuid },
      value
    );
    if (response.acknowledged) {
      res.json({ success: true, result: value });
    } else
      res.json({
        success: false,
        message: "Campaigns Not created",
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getCampaigns", async (req, res) => {
  try {
    let response = await Campaigns.find({});
    if (response.length) {
      res.json({ success: true, result: response });
    } else
      res.json({ success: false, message: "Campaigns Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
