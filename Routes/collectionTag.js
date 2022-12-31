const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");

const collectionTags = require("../Models/collectionTags");
const Details = require("../Models/Details");
const OutStanding = require("../Models/OutStanding");
const Receipts = require("../Models/Receipts");

router.post("/postTag", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let invoice_number = await Details.findOne({});
    value = {
      ...value,
      collection_tag_uuid: uuid(),
      status: 1,
      collection_tag_number: invoice_number?.next_collection_tag_number,
      created_at: new Date().getTime(),
    };

    console.log(value);
    let response = await collectionTags.create(value);
    if (response) {
      await Details.updateMany(
        {},
        { next_receipt_number: +invoice_number?.next_collection_tag_number + 1 }
      );
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Tag Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getActiveTag", async (req, res) => {
  try {
    let response = await collectionTags.find({ status: 1 });
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Tag Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getUserActiveTag/:user_uuid", async (req, res) => {
  try {
    let data = await collectionTags.find({
      status: 1,
      assigned_to: req.params.user_uuid,
    });
    if (data.length) {
      let result = [];

      for (let a of data) {
        let ordersData = await OutStanding.find({
          collection_tag_uuid: a.collection_tag_uuid,
        });
        console.log(ordersData);
        ordersData = JSON.parse(JSON.stringify(ordersData));
        let orderLength = ordersData.length;
        // console.log(warehouseData, a);
        if (orderLength) result.push(a);
      }

      res.json({
        success: true,
        result,
      });
    } else res.json({ success: false, message: "Trips Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getTag", async (req, res) => {
  try {
    let data = await collectionTags.find({ status: 1 });
    data = JSON.parse(JSON.stringify(data));

    if (data.length) {
      let result = [];

      for (let a of data) {
        let ordersData = await Receipts.find({
          collection_tag_uuid: a.collection_tag_uuid,
        });
        console.log(ordersData);
        ordersData = JSON.parse(JSON.stringify(ordersData));
        let orderLength = ordersData.length;
        // console.log(warehouseData, a);
        result.push({
          ...a,
          outstandings: ordersData,
          orderLength,
        });
      }

      res.json({
        success: true,
        result,
      });
    } else res.json({ success: false, message: "Trips Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putTags", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = Object.keys(value)
      .filter((key) => key !== "_id")
      .reduce((obj, key) => {
        obj[key] = value[key];
        return obj;
      }, {});
    // console.log(value);
    let response = await collectionTags.updateOne(
      { collection_tag_uuid: value.collection_tag_uuid },
      value
    );
    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Trips Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
module.exports = router;
