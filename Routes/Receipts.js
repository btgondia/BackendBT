const express = require("express");
const Counters = require("../Models/Counters");
const OrderCompleted = require("../Models/OrderCompleted");
const Orders = require("../Models/Orders");
const Users = require("../Models/Users");

const router = express.Router();
const Receipts = require("../Models/Receipts");
const Details = require("../Models/Details");
const { format } = require("express/lib/response");
const OutStanding = require("../Models/OutStanding");

router.get("/getPendingEntry", async (req, res) => {
  try {
    let receiptData = await Receipts.find({
      entry: 0,
    });
    receiptData = JSON.parse(JSON.stringify(receiptData));
    console.log(receiptData);
    res.json({
      success: true,
      result: receiptData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/postReceipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let next_receipt_number = await Details.find({});
    console.log(next_receipt_number[0].next_receipt_number);
    next_receipt_number = next_receipt_number[0].next_receipt_number;
    let response = await Receipts.create({
      ...value,
      receipt_number: next_receipt_number,
      time: new Date().getTime(),
    });
    next_receipt_number = "R" + (+next_receipt_number.match(/\d+/)[0] + 1);
    await Details.updateMany({}, { next_receipt_number });
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getRecipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid } = value;
    let response = await Receipts.findOne({ order_uuid, counter_uuid });

    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getSingleRecipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid, receipt_number } = value;
    let response = await Receipts.findOne({
      order_uuid,
      counter_uuid,
      receipt_number,
    });

    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putReceipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid, modes, entry = 1 } = value;
    let response = await Receipts.updateOne(
      { order_uuid, counter_uuid },
      { modes, entry }
    );

    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putSingleReceipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid, modes, entry = 1, receipt_number } = value;
    let response = await Receipts.updateOne(
      { order_uuid, counter_uuid, receipt_number },
      { modes, entry }
    );

    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putCompleteOrder", async (req, res) => {
  try {
    let value = req.body;
    console.log(value);
    let data = await Receipts.updateOne(
      { receipt_number: value.receipt_number },
      value
    );
    if (data.acknowledged) {
      res.json({
        success: true,
        result: data,
      });
    } else
      res.status(404).json({
        success: false,
        result: data,
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putReceiptUPIStatus", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let response = await Receipts.findOne({
      $or: [
        { invoice_number: value.invoice_number },
        { order_uuid: value.order_uuid },
      ],
    });
    console.log(response);

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
// const updateStetus = async () => {
//   let response = await Receipts.find({});

//   response = JSON.parse(JSON.stringify(response));
//   for (let item of response) {
//     let modes = item.modes.map((a) => ({ ...a, status: 1 }));
//     let data = await Receipts.updateMany(
//       { order_uuid: item.order_uuid },
//       { modes }
//     );
//   }
//   console.log("done");
// };
// updateStetus()
router.get("/getReceipt", async (req, res) => {
  try {
    let response = await Receipts.find({});
    response = JSON.parse(JSON.stringify(response));
    let usersData = await Users.find({
      user_uuid: { $in: response.map((a) => a.user_uuid).filter((a) => a) },
    });
    console.log(response.length);
    response = response.filter(
      (a) => a.modes.filter((b) => b.status === 0 && b.amt).length
    );
    console.log(response.length);
    if (response.length) {
      let data = [];
      for (let item of response) {
        let modes = item.modes.filter(
          (a) =>
            (a.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002" ||
              a.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002") &&
            a.amt &&
            a.status === 0
        );
        let orderData = await OrderCompleted.findOne({
          order_uuid: item.order_uuid,
        });
        if (!orderData)
          orderData = await Orders.findOne({ order_uuid: item.order_uuid });

        if (orderData) {
          let counterData = await Counters.findOne({
            counter_uuid: orderData.counter_uuid,
          });
          for (let item1 of modes) {
            let obj = {
              mode_title:
                item1.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
                  ? "UPI"
                  : "Cheque",
              mode_uuid: item1.mode_uuid,
              counter_title: counterData?.counter_title || "",
              counter_uuid: counterData?.counter_uuid || "",
              invoice_number: orderData?.invoice_number || "",
              order_date: orderData?.status?.find((a) => +a?.stage === 1)?.time,
              payment_date: item?.time,
              order_uuid: item.order_uuid,
              user_title: usersData.find((a) => item.user_uuid === a.user_uuid)
                ?.user_title,
              amt: item1?.amt,
              remarks: item1?.remarks,
            };
            data.push(obj);
          }
        }
      }
      res.json({ success: true, result: data });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putRemarks", async (req, res) => {
  try {
    let value = req.body;
    console.log(value);
    let orderData = await Receipts.findOne({
      invoice_number: value.invoice_number,
    });
    orderData = JSON.parse(JSON.stringify(orderData));
    let modes = orderData.modes.map((a) =>
      a.mode_uuid === value.mode_uuid ? { ...a, remarks: value.remarks } : a
    );

    console.log(modes);
    let data = await Receipts.updateOne(
      {
        invoice_number: value.invoice_number,
      },
      { modes }
    );
    if (data.acknowledged) {
      res.json({
        success: true,
        result: data,
      });
    } else
      res.status(404).json({
        success: false,
        result: data,
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.put("/putReciptTag", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { selectedOrders, collection_tag_uuid } = value;
    console.log(collection_tag_uuid, selectedOrders);
    let response = await OutStanding.updateMany(
      {
        outstanding_uuid: { $in: selectedOrders },
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
