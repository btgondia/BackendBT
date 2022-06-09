const express = require("express");
const Counters = require("../Models/Counters");
const OrderCompleted = require("../Models/OrderCompleted");
const Orders = require("../Models/Orders");
const Users = require("../Models/Users");

const router = express.Router();
const Receipts = require("../Models/Receipts");
const Details = require("../Models/Details");

router.post("/postReceipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let next_receipt_number = await Details.find({});
    console.log(next_receipt_number[0].next_receipt_number);
    next_receipt_number = next_receipt_number[0].next_receipt_number;
    let response = await Receipts.create({ ...value,receipt_number: next_receipt_number });
    next_receipt_number = "R" + (+next_receipt_number.match(/\d+/)[0] + 1);
    await Details.updateMany({}, { next_receipt_number });
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
      a.mode_uuid === value.mode_uuid ? { ...a, status: value.status } : a
    );
    console.log(response);
    let data = await Receipts.updateMany(
      { order_uuid: value.order_uuid },
      { modes: response }
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
    response = JSON.parse(JSON.stringify(response));
    let usersData = await Users.find({
      user_uuid: { $in: response.map((a) => a.user_uuid).filter((a) => a) },
    });
    response = response
      .map((a) =>
        a.modes.filter(
          (b) =>
            b.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002" &&
            b.amt &&
            b.status === 0
        ).length
          ? { ...a, mode_title: "UPI" }
          : a.modes.filter(
              (b) =>
                b.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" &&
                b.amt &&
                b.status === 0
            ).length
          ? { ...a, mode_title: "Cheque" }
          : a
      )
      .filter((a) => a.mode_title);

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
            mode_title: item.mode_title,
            mode_uuid: item.mode_uuid,
            counter_title: counterData?.counter_title || "",
            invoice_number: orderData?.invoice_number || "",
            order_date: orderData?.status?.find((a) => +a?.stage === 1)?.time,
            payment_date: item?.time,
            order_uuid: item.order_uuid,
            user_title: usersData.find((a) => item.user_uuid === a.user_uuid)
              ?.user_title,
            amt: item.modes.find(
              (a) => a.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
            )?.amt,
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
