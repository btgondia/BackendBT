const express = require("express");
const router = express.Router();
const Outstanding = require("../Models/OutStanding");
const SignedBills = require("../Models/SignedBills");
const { v4: uuid } = require("uuid");
router.post("/postOutstanding", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { outstanding_uuid: uuid(), ...value, status: 1 };
    
    let time = new Date();
    let response = await Outstanding.create(value);
    let result = await SignedBills.create({
      time_stamp: time.getTime(),
      user_uuid: value.user_uuid,
      order_uuid: value.order_uuid,
      status: 0,
      amount: value.amount,
    });
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Outstanding Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/postMenualOutstanding", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, outstanding_uuid: uuid() };
    
    let time = new Date();
    let response = await Outstanding.create({
      ...value,
      time: time.getTime(),
      status: 1,
    });

    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Outstanding Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/getTagOutstanding/:collection_tag_uuid", async (req, res) => {
  try {
    let response = await Outstanding.find({
      collection_tag_uuid: req.params.collection_tag_uuid,
      status: 1,
    });
    response = JSON.parse(JSON.stringify(response));

    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Outstanding Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getOutstanding", async (req, res) => {
  try {
    let response = await Outstanding.find({ status: 1 });
    response = JSON.parse(JSON.stringify(response));

    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Outstanding Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getOutstanding", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid } = value;
    let response = await Outstanding.findOne({ order_uuid, counter_uuid });

    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putOutstanding", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid, amount, outstanding_uuid } = value;
    let data = await Outstanding.findOne({ order_uuid, counter_uuid });
    
    if (!amount) {
      await SignedBills.deleteMany({
        order_uuid,
      });
      await Outstanding.deleteOne({
        outstanding_uuid,
      });
      return res.json({ success: true, message: "Outstanding Deleted" });

    }
    let response;
    if (data) {
      await SignedBills.updateMany(
        {
          order_uuid,
        },
        {
          amount,
        }
      );
      if (amount) {
        response = await Outstanding.updateOne(
          { outstanding_uuid },
          { amount }
        );
      } else {
        response = await Outstanding.updateOne(
          { outstanding_uuid },
          { status: 0 }
        );
      }
    } else {
      
      let time = new Date();
      value = { ...value, outstanding_uuid: uuid(), status: 1 };
      response = await Outstanding.create(value);
      result = await SignedBills.create({
        time_stamp: time.getTime(),
        user_uuid: value.user_uuid,
        order_uuid: value.order_uuid,
        status: 0,
        amount: value.amount,
      });
    }

    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putOutstandingReminder", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid, reminder, outstanding_uuid } = value;
    let response = await Outstanding.updateOne(
      { outstanding_uuid },
      { reminder }
    );

    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putOutstandingType", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { invoice_number, counter_uuid, type, outstanding_uuid } = value;

    let response = await Outstanding.updateOne({ outstanding_uuid }, { type });

    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putOutstandingTag", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { selectedOrders, collection_tag_uuid } = value;
    let response = await Outstanding.updateMany(
      {
        outstanding_uuid: {
          $in: selectedOrders,
        },
      },
      { collection_tag_uuid }
    );

    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
