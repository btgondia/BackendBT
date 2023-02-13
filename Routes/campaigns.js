const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Campaigns = require("../Models/Campaigns");
const Counters = require("../Models/Counters");
const Notification_log = require("../Models/notification_log");
const axios = require("axios");
router.post("/CreateCampaigns", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {
      ...value,
      campaign_uuid: uuid(),
      created_at: new Date().getTime(),
    };

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
router.post("/sendMsg", async (req, res) => {
  try {
  let value = req.body;
  if (!value) res.json({ success: false, message: "Invalid Data" });

  let countersData = await Counters.find(
    {
      counter_uuid: { $in: value?.counters },
    },
    { mobile: 1, counter_uuid: 1, counter_title: 1 }
  );
  let data = [];
  for (let counterData of countersData) {
    console.log(counterData);
    let message = value.message?.replace(
      /{counter_title}/g,
      counterData?.counter_title || ""
    )?.replace(
      /{short_link}/g,
      counterData?.short_link || ""
    );

    if (counterData?.mobile?.length) {
      for (let contact of counterData?.mobile) {
        if (
          contact.mobile &&
          contact?.lable?.find((a) => a.type === "wa" && +a.varification)
        ) {
          data.push({
            contact: contact.mobile,
            messages: [{ text: message }],
          });
          await Notification_log.create({
            contact: contact.mobile,
            notification_uuid: value.campaign_title,
            message,
            created_at: new Date().getTime(),
          });
        }
      }
    }
  }
  for (let mobile of value?.mobile) {
    let message = value.message;

    data.push({
      contact: mobile,
      messages: [{ text: message }],
    });
    await Notification_log.create({
      contact: mobile,
      notification_uuid: value.campaign_title,
      message,
      created_at: new Date().getTime(),
    });
  }
  console.log(data);
  let msgResponse = await axios({
    url: "http://15.207.39.69:2000/sendMessage",
    method: "post",
    data,
  });

  res.json({ success: true, message: "Message Shooted Successfully" });
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
    } else res.json({ success: false, message: "Campaigns Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
