const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");

const collectionTags = require("../Models/collectionTags");
const Counters = require("../Models/Counters");
const Details = require("../Models/Details");
const OutStanding = require("../Models/OutStanding");
const Receipts = require("../Models/Receipts");
const { increaseNumericString } = require("../utils/helperFunctions");

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

    
    let response = await collectionTags.create(value);
    if (response) {
      await Details.updateMany(
        {},
        {
          next_collection_tag_number:
            increaseNumericString(invoice_number?.next_collection_tag_number),
        }
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
          status: 1,
        });
        ordersData = JSON.parse(JSON.stringify(ordersData));
        let orderLength = ordersData.length;
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
        let ordersData = await OutStanding.find({
          collection_tag_uuid: a.collection_tag_uuid,
          status: 1,
        });
        ordersData = JSON.parse(JSON.stringify(ordersData));
        let orderLength = ordersData.length;
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
    // 
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
router.get("/GetTagSummaryDetails/:collection_tag_uuid", async (req, res) => {
  try {
    let a = await collectionTags.findOne({
      collection_tag_uuid: req.params.collection_tag_uuid,
    });
    a = JSON.parse(JSON.stringify(a));

    let CounterData = await Counters.find(
      {},
      {
        counter_title: 1,
        counter_code: 1,
        sort_order: 1,
        payment_reminder_days: 1,
        outstanding_type: 1,
        credit_allowed: 1,
        gst: 1,
        food_license: 1,
        counter_uuid: 1,
        remarks: 1,
        status: 1,
        route_uuid: 1,
        address: 1,
        mobile: 1,
        company_discount: 1,
        // average_lines_company: 1,
        // average_lines_category: 1,
        item_special_price: 1,
        item_special_discount: 1,
        counter_group_uuid: 1,
        payment_modes: 1,
      }
    );
    CounterData = JSON.parse(JSON.stringify(CounterData));

    if (a) {
      let receiptsData = await Receipts.find({
        collection_tag_uuid: a.collection_tag_uuid,
      });

      receiptsData = JSON.parse(JSON.stringify(receiptsData));
      let receipts = [];
      for (let item of receiptsData) {
        let obj = {
          ...item,
          counter_title: CounterData.find(
            (c) => c.counter_uuid === item.counter_uuid
          )?.counter_title,
          cash:
            item.modes.find(
              (a) => a.mode_uuid === "c67b54ba-d2b6-11ec-9d64-0242ac120002"
            )?.amt || 0,
          cheque:
            item.modes.find(
              (a) => a.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002"
            )?.amt || 0,
          upi:
            item.modes.find(
              (a) => a.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
            )?.amt || 0,
        };
        receipts.push(obj);
      }

      let data = {
        ...a,
        receipts,
      };

      res.json({
        success: true,
        result: data,
      });
    } else res.json({ success: false, message: "Trips Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
module.exports = router;
