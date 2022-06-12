const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Trips = require("../Models/Trips");
const Orders = require("../Models/Orders");
const Users = require("../Models/Users");
const Receipts = require("../Models/Receipts");
const CompleteOrder = require("../Models/OrderCompleted");
const Counters = require("../Models/Counters");

const Item = require("../Models/Item");
const OutStanding = require("../Models/OutStanding");

router.post("/postTrip", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {
      ...value,
      trip_uuid: uuid(),
      created_at: new Date().getTime(),
      status: 1,
    };
    console.log(value);
    let response = await Trips.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Trip Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putTrip", async (req, res) => {
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
    let response = await Trips.updateOne({ trip_uuid: value.trip_uuid }, value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Trips Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetTripList", async (req, res) => {
  try {
    let data = await Trips.find({});
    data = JSON.parse(JSON.stringify(data));
    let ordersData = await Orders.find({});
    ordersData = JSON.parse(JSON.stringify(ordersData));
    if (ordersData.length) {
      let result = [
        {
          trip_uuid: 0,
          trip_title: "Unknown",
          orderLength: ordersData.filter((b) => !b.trip_uuid).length,
          processingLength: ordersData.filter(
            (b) =>
              !b.trip_uuid &&
              (b.status.length > 1
                ? +b.status
                    .map((x) => +x.stage)
                    .reduce((c, d) => Math.max(c, d)) === 1
                : +b?.status[0]?.stage === 1)
          ).length,
          checkingLength: ordersData.filter(
            (b) =>
              !b.trip_uuid &&
              (b.status.length > 1
                ? +b.status
                    .map((x) => +x.stage)
                    .reduce((c, d) => Math.max(c, d)) === 2
                : +b?.status[0]?.stage === 2)
          ).length,
          deliveryLength: ordersData.filter(
            (b) =>
              !b.trip_uuid &&
              (b.status.length > 1
                ? +b.status
                    .map((x) => +x.stage)
                    .reduce((c, d) => Math.max(c, d)) === 3
                : +b?.status[0]?.stage === 3)
          ).length,
        },
        ...data.map((a) => ({
          ...a,
          orderLength: ordersData.filter((b) => a.trip_uuid === b.trip_uuid)
            .length,
          processingLength: ordersData.filter(
            (b) =>
              a.trip_uuid === b.trip_uuid &&
              (b.status.length > 1
                ? +b.status
                    .map((x) => +x.stage)
                    .reduce((c, d) => Math.max(c, d)) === 1
                : +b?.status[0]?.stage === 1)
          ).length,
          checkingLength: ordersData.filter(
            (b) =>
              a.trip_uuid === b.trip_uuid &&
              (b.status.length > 1
                ? +b.status
                    .map((x) => +x.stage)
                    .reduce((c, d) => Math.max(c, d)) === 2
                : +b?.status[0]?.stage === 2)
          ).length,
          deliveryLength: ordersData.filter(
            (b) =>
              a.trip_uuid === b.trip_uuid &&
              (b.status.length > 1
                ? +b.status
                    .map((x) => +x.stage)
                    .reduce((c, d) => Math.max(c, d)) === 3
                : +b?.status[0]?.stage === 3)
          ).length,
        })),
      ];
      console.log(result);
      res.json({
        success: true,
        result,
      });
    } else res.json({ success: false, message: "Trips Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/GetTripListSummary", async (req, res) => {
  try {
    let data = await Trips.find({});
    data = JSON.parse(JSON.stringify(data));
    let CounterData = await Counters.find({});
    CounterData = JSON.parse(JSON.stringify(CounterData));
    let OutstandingData = await OutStanding.find({});
    OutstandingData = JSON.parse(JSON.stringify(OutstandingData));
    let ordersData = await Orders.find({});
    ordersData = JSON.parse(JSON.stringify(ordersData));
    let CompleteOrdersData = await CompleteOrder.find({});
    CompleteOrdersData = JSON.parse(JSON.stringify(CompleteOrdersData));
    let receiptsData = await Receipts.find({
      order_uuid: { $in: CompleteOrdersData.map((a) => a.order_uuid) },
    });
    receiptsData = JSON.parse(JSON.stringify(receiptsData));
    CompleteOrdersData = CompleteOrdersData.map((a) => ({
      ...a,
      ...(receiptsData.find((b) => b.order_uuid === a.order_uuid) || {}),
    }));
    console.log(CompleteOrdersData);
    if (ordersData.length) {
      let result = [];

      for (let a of data) {
        let receiptItems = CompleteOrdersData.filter(
          (b) => b.trip_uuid === a.trip_uuid
        );
        let sales_return = [].concat.apply(
          [],
          receiptItems.map((b) => b?.delivery_return || [])
        );
        sales_return =
          sales_return.length > 1
            ? sales_return.reduce((acc, curr) => {
                let item = acc.find(
                  (item) => item.item_uuid === curr.item_uuid
                );

                if (item) {
                  item.p = +item.p + curr.p;
                  item.p = +item.b + curr.b;
                } else {
                  acc.push(curr);
                }

                return acc;
              }, [])
            : sales_return;
        let itemData = await Item.find({
          item_uuid: sales_return.map((a) => a.item_uuid),
        });
        sales_return = sales_return.map((b) => ({
          ...b,
          item_title: itemData.find((c) => c.item_uuid === b.item_uuid)
            ?.item_title,
        }));
        result.push({
          ...a,
          orderLength: ordersData.filter((b) => a.trip_uuid === b.trip_uuid)
            .length,
          unpaid_invoice: OutstandingData.filter(
            (b) => b.trip_uuid === a.trip_uuid
          ),
          receiptItems,
          amt:
            receiptItems?.length > 1
              ? receiptItems.reduce(
                  (c, d) =>
                    c?.modes?.map((x) => +x.amt || 0)?.reduce((x, y) => x + y) +
                    d?.modes?.map((x) => +x.amt || 0)?.reduce((x, y) => x + y)
                )
              : receiptsData[0]?.modes
                  ?.map((x) => +x.amt || 0)
                  ?.reduce((x, y) => x + y) || 0,
          coin:
            receiptItems.length > 1
              ? receiptItems.reduce(
                  (c, d) =>
                    c.modes?.map((x) => +x.coin || 0)?.reduce((x, y) => x + y) +
                    d.modes?.map((x) => +x.amt || 0)?.reduce((x, y) => x + y)
                )
              : receiptsData[0]?.modes
                  ?.map((x) => +x.coin || 0)
                  ?.reduce((x, y) => x + y) || 0,
          cheque: receiptItems
            ?.filter(
              (b) =>
                b?.modes?.filter(
                  (c) =>
                    c.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" &&
                    c.amt
                ).length
            )
            .map((b) => ({
              counter: CounterData.find(
                (c) => c.counter_uuid === b.counter_uuid
              )?.counter_title,
              amt: b?.modes?.find(
                (c) => c.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002"
              )?.amt,
              invoice_number: b.invoice_number,
            })),
          replacement: receiptItems
            .filter((b) => b.replacement || b.replacement_mrp)
            .map((b) => ({
              replacement: b.replacement,
              replacement_mrp: b.replacement_mrp,
              counter: CounterData.find(
                (c) => c.counter_uuid === b.counter_uuid
              )?.counter_title,
              invoice_number: b.invoice_number,
            })),
          sales_return,
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
router.post("/GetCompletedTripList", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    console.log(value);
    let ordersData = await Orders.find({});
    ordersData = JSON.parse(JSON.stringify(ordersData));
    let endDate = +value.endDate + 86400000;
    console.log(endDate, value.startDate);
    let response = await Trips.find({
      user_uuid: value.user_uuid,
      timestamp: { $gt: value.startDate, $lt: endDate },
      status: 1,
    });
    response = JSON.parse(JSON.stringify(response));
    let data = [];
    for (let item of response) {
      let orderLength = ordersData.filter(
        (b) => item.trip_uuid === b.trip_uuid
      ).length;
      let users = [];
      if (item.users.length)
        users = await Users.find({ user_uuid: { $in: item.users } });
      data.push({ ...item, orderLength, users });
    }
    if (data) {
      res.json({ success: true, result: data });
    } else res.json({ success: false, message: "Trip Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetProcessingTripList", async (req, res) => {
  try {
    let data = await Trips.find({ users: req.body.user_uuid });
    data = JSON.parse(JSON.stringify(data));
    let ordersData = await Orders.find({});
    ordersData = JSON.parse(JSON.stringify(ordersData));

    let result = [
      {
        trip_uuid: 0,
        trip_title: "Unknown",
        orderLength: ordersData
          .filter((b) => !b.trip_uuid)
          ?.filter((a) =>
            a.status.length > 1
              ? +a.status.reduce((c, d) => Math.max(+c.stage, +d.stage)) === 1
              : +a?.status[0]?.stage === 1
          ).length,
      },
      ...data.map((a) => ({
        ...a,
        orderLength: ordersData
          .filter((b) => a.trip_uuid === b.trip_uuid)
          ?.filter((b) =>
            b.status.length > 1
              ? +b.status.reduce((c, d) => Math.max(+c.stage, +d.stage)) === 1
              : +b?.status[0]?.stage === 1
          ).length,
      })),
    ].filter((a) => a.orderLength);
    console.log(result);
    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetCheckingTripList", async (req, res) => {
  try {
    console.log(req.body);
    let data = await Trips.find({ users: req.body.user_uuid });
    data = JSON.parse(JSON.stringify(data));
    let ordersData = await Orders.find({});
    ordersData = JSON.parse(JSON.stringify(ordersData));
    console.log(data);
    let result = [
      {
        trip_uuid: 0,
        trip_title: "Unknown",
        orderLength: ordersData
          .map((a) => ({
            ...a,
          }))
          .filter((b) => !b.trip_uuid)
          ?.filter(
            (a) =>
              (a.status.length > 1
                ? +a.status
                    .map((b) => +b.stage || 0)
                    .reduce((c, d) => Math.max(c, d)) === 2
                : +a?.status[0]?.stage === 2) &&
              a.item_details.filter((b) => +b.status === 1).length
          ).length,
      },
      ...data.map((a) => ({
        ...a,
        orderLength: ordersData
          .filter((b) => a.trip_uuid === b.trip_uuid)
          ?.filter(
            (b) =>
              (b.status.length > 1
                ? +b.status
                    .map((c) => +c.stage || 0)
                    .reduce((c, d) => Math.max(c, d)) === 2
                : +b?.status[0]?.stage === 2) &&
              b.item_details.filter((c) => +c.status === 1).length
          ).length,
      })),
    ].filter((a) => a.orderLength);
    console.log(result);
    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetDeliveryTripList", async (req, res) => {
  try {
    let data = await Trips.find({ users: req.body.user_uuid });
    data = JSON.parse(JSON.stringify(data));
    let ordersData = await Orders.find({});
    ordersData = JSON.parse(JSON.stringify(ordersData));

    let result = [
      ...data.map((a) => ({
        ...a,
        orderLength: ordersData
          .filter((b) => a.trip_uuid === b.trip_uuid)
          ?.filter(
            (b) =>
              (b.status.length > 1
                ? +b.status
                    .map((c) => +c.stage)
                    .reduce((c, d) => Math.max(c, d)) === 3
                : +b?.status[0]?.stage === 3) &&
              b.item_details.filter((c) => +c.status === 1).length
          ).length,
      })),
    ].filter((a) => a.orderLength);
    console.log(result);
    res.json({
      success: true,
      result: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
