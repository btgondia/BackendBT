const express = require("express");
const router = express.Router();
const Orders = require("../Models/Orders");
const Details = require("../Models/Details");
const Counters = require("../Models/Counters");

router.post("/postOrder", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    console.log(value);
    let invoice_number = await Details.findOne({});

    let response = await Orders.create({
      ...value,
      invoice_number: invoice_number.next_invoice_number || 0,
      order_status: "R",
    });
    if (response) {
      await Details.updateMany(
        {},
        { next_invoice_number: +invoice_number.next_invoice_number + 1 }
      );
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putOrder", async (req, res) => {
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
    let response = await Orders.updateOne(
      { order_uuid: value.order_uuid },
      value
    );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putOrders", async (req, res) => {
  try {
    let response = [];
    for (let value of req.body) {
      if (!value) res.json({ success: false, message: "Invalid Data" });
      value = Object.keys(value)
        .filter((key) => key !== "_id")
        .reduce((obj, key) => {
          obj[key] = value[key];
          return obj;
        }, {});
      console.log(value);
      let data = await Orders.updateOne(
        { order_uuid: value.order_uuid },
        value
      );
      if (data.acknowledged) response.push(value);
    }
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetOrderRunningList", async (req, res) => {
  try {
    let data = await Orders.find({ order_status: "R" });
    data = JSON.parse(JSON.stringify(data));

    let counterData = await Counters.find({
      counter_uuid: {
        $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
      },
    });
    res.json({
      success: true,
      result: data.map((a) => ({
        ...a,
        counter_title: a.counter_uuid
          ? counterData.find((b) => b.counter_uuid === a.counter_uuid)
              ?.counter_title
          : "",
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetOrderProcessingList", async (req, res) => {
  try {
    let data = [];
    let { trip_uuid } = req.body;

    data = await Orders.find({});
    data = JSON.parse(JSON.stringify(data));
    if (+trip_uuid === 0) data = data.filter((a) => !a.trip_uuid);
    else data = data.filter((a) => a.trip_uuid === trip_uuid);
    let counterData = await Counters.find({
      counter_uuid: {
        $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
      },
    });
    result = data
      .map((a) => ({
        ...a,
        counter_title: a.counter_uuid
          ? counterData.find((b) => b.counter_uuid === a.counter_uuid)
              ?.counter_title
          : "",
      }))
      ?.filter((a) =>
        a.status.length > 1
          ? +a.status.reduce((c, d) => Math.max(+c.stage, +d.stage)) === 1
          : +a?.status[0]?.stage === 1
      );

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
