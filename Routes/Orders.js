const express = require("express");
const router = express.Router();
const Orders = require("../Models/Orders");
const Details = require("../Models/Details");
const Counters = require("../Models/Counters");
const OrderCompleted = require("../Models/OrderCompleted");

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
      let orderStage =
        value.status.length > 1
          ? +value.status.map((c) => +c.stage).reduce((c, d) => Math.max(c, d))
          : +value?.status[0]?.stage;
      console.log(value, orderStage);

      if (+orderStage === 4) {
        await Orders.deleteOne({ order_uuid: value.order_uuid }, value);
        let data = await OrderCompleted.create(value);
        if (data) response.push(data);
      } else {
        let data = await Orders.updateOne(
          { order_uuid: value.order_uuid },
          value
        );
        if (data.acknowledged) response.push(value);
      }
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
router.post("/GetOrderCheckingList", async (req, res) => {
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
          ? +a.status.reduce((c, d) => Math.max(+c.stage, +d.stage)) === 2
          : +a?.status[0]?.stage === 2
      );

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetOrderDeliveryList", async (req, res) => {
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
          ? +a.status.map((c) => +c.stage).reduce((c, d) => Math.max(c, d)) ===
            3
          : +a?.status[0]?.stage === 3
      );

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getCompleteOrderList", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    console.log(value);
    let endDate = +value.endDate + 86400000;
    console.log(endDate, value.startDate);
    let response = await OrderCompleted.find({});
    response = response.filter(
      (order) =>
        order.status.filter(
          (a) => +a.stage === 1 && a.time > value.startDate && a.time < endDate
        ).length
    );
    let counterData = await Counters.find({
      counter_uuid: { $in: response.map((a) => a.counter_uuid) },
    });

    response = response.map((order) => ({
      invoice_number: order.invoice_number,
      order_date: order.status.find((a) => +a.stage === 1)?.time,
      delivery_date: order.status.find((a) => +a.stage === 4)?.time,
      qty:
        (order?.item_details?.length > 1
          ? order.item_details.map((a) => a.b).reduce((a, b) => +a + b)
          :order?.item_details?.length? order?.item_details[0]?.b :
            0 )+ ":" + (order?.item_details?.length > 1
          ? order.item_details.map((a) => a.p).reduce((a, b) => +a + b)
          :order?.item_details?.length? order?.item_details[0]?.p:0),
      amt: order.order_grandtotal ||0,
      counter_title:counterData.find(a=>a.counter_uuid===order.counter_uuid)?.counter_title
    }));
    console.log(response, endDate);
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Activity Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
