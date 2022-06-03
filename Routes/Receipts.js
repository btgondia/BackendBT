const express = require("express");
const Counters = require("../Models/Counters");
const OrderCompleted = require("../Models/OrderCompleted");
const Orders = require("../Models/Orders");

const router = express.Router();
const Receipts = require("../Models/Receipts");

router.post("/postReceipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    console.log(value);
    let response = await Receipts.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putReceiptUPIStatus", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    console.log(value);
    let response = await Receipts.findOne({ order_uuid: value.order_uuid });
    response = JSON.parse(JSON.stringify(response));
    response = response.modes.map((a) =>
      a.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
        ? { ...a, status: value.status }
        : a
    );
    console.log(response)
    let data = await Receipts.updateMany(
      { order_uuid: value.order_uuid },
      {modes:response}
    );
    if (data.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getReceipt", async (req, res) => {
  try {
    let response = await Receipts.find({});
    response = response.filter(
      (a) =>
        a.modes.filter(
          (b) =>
            b.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002" &&
            b.amt &&
            b.status === 0
        ).length
    );

    console.log(response);
    if (response.length) {
      let data = [];
      for (let item of response) {
        let orderData = await OrderCompleted.findOne({
          order_uuid: item.order_uuid,
        });
        if (!orderData)
          orderData = await Orders.findOne({ order_uuid: item.order_uuid });

        if (orderData) {
          let counterData = await Counters.findOne({
            counter_uuid: orderData.counter_uuid,
          });
          console.log(counterData);
          let obj = {
            counter_title: counterData?.counter_title || "",
            invoice_number: orderData?.invoice_number || "",
            order_date: orderData?.status?.find((a) => +a?.stage === 1)?.time,
            payment_date: item?.time,
            order_uuid:item.order_uuid
          };
          data.push(obj);
        }
      }
      res.json({ success: true, result: data });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
