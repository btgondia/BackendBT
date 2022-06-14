const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Routes = require("../Models/Routes");
const Orders = require("../Models/Orders");
const Counters = require("../Models/Counters");

router.post("/postRoute", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, route_uuid: uuid() };
    if (!value.sort_order) {
      let response = await Routes.find({});
      response = JSON.parse(JSON.stringify(response));
      //   console.log(response)
      value.sort_order =
        Math.max(...response.map((o) => o?.sort_order || 0)) + 1 || 0;
    }
    console.log(value);
    let response = await Routes.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Routes Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putRoute", async (req, res) => {
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
    let response = await Routes.updateOne(
      { route_uuid: value.route_uuid },
      value
    );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Routes Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetRouteList", async (req, res) => {
  try {
    let data = await Routes.find({});

    if (data) {
      res.json({ success: true, result: data });
    } else res.json({ success: false, message: "Routes Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/GetOrderRouteList", async (req, res) => {
  try {
    let data = await Routes.find({});
    data = JSON.parse(JSON.stringify(data));
    let counter = await Counters.find({});
    counter = JSON.parse(JSON.stringify(counter));

    let ordersData = await Orders.find({});
    ordersData = JSON.parse(JSON.stringify(ordersData));
    if (ordersData.length) {
      let result = [
        {
          route_uuid: 0,
          route_title: "Unknown",
          orderLength: ordersData.filter(
            (a) =>
              counter.filter(
                (c) => c.counter_uuid === a.counter_uuid && !c.route_uuid
              ).length
          ).length,
          checkingLength: ordersData.filter(
            (b) =>
              counter.filter(
                (c) => c.counter_uuid === b.counter_uuid && !c.route_uuid
              ).length &&
              (b.status.length > 1
                ? +b.status
                    .map((x) => +x.stage || 0)
                    .reduce((c, d) => Math.max(c, d)) === 2
                : +b?.status[0]?.stage === 2)
          ).length,
          processingLength: ordersData.filter(
            (b) =>
              counter.filter(
                (c) => c.counter_uuid === b.counter_uuid && !c.route_uuid
              ).length &&
              (b.status.length > 1
                ? +b.status
                    .map((x) => +x.stage || 0)
                    .reduce((c, d) => Math.max(c, d)) === 1
                : +b?.status[0]?.stage === 1)
          ).length,
          deliveryLength: ordersData.filter(
            (b) =>
              counter.filter(
                (c) => c.counter_uuid === b.counter_uuid && !c.route_uuid
              ).length &&
              (b.status.length > 1
                ? +b.status
                    .map((x) => +x.stage || 0)
                    .reduce((c, d) => Math.max(c, d)) === 3
                : +b?.status[0]?.stage === 3)
          ).length,
        },
        ...data.map((a) => {
          return {
            ...a,
            orderLength: ordersData.filter(
              (b) =>
              counter.filter(
                (c) =>
                  c.counter_uuid === b.counter_uuid &&
                  (a.route_uuid === c.route_uuid )
              ).length
            ).length,

            processingLength: ordersData.filter(
              (b) =>
              counter.filter(
                (c) =>
                  c.counter_uuid === b.counter_uuid &&
                  (a.route_uuid === c.route_uuid )
              ).length &&
                (b.status.length > 1
                  ? +b.status
                      .map((x) => +x.stage || 0)
                      .reduce((c, d) => Math.max(c, d)) === 1
                  : +b?.status[0]?.stage === 1)
            ).length,
            checkingLength: ordersData.filter(
              (b) =>
              counter.filter(
                (c) =>
                  c.counter_uuid === b.counter_uuid &&
                  (a.route_uuid === c.route_uuid )
              ).length &&
                (b.status.length > 1
                  ? +b.status
                      .map((x) => +x.stage || 0)
                      .reduce((c, d) => Math.max(c, d)) === 2
                  : +b?.status[0]?.stage === 2)
            ).length,
            deliveryLength: ordersData.filter(
              (b) =>
              counter.filter(
                (c) =>
                  c.counter_uuid === b.counter_uuid &&
                  (a.route_uuid === c.route_uuid )
              ).length &&
                (b.status.length > 1
                  ? +b.status
                      .map((x) => +x.stage || 0)
                      .reduce((c, d) => Math.max(c, d)) === 3
                  : +b?.status[0]?.stage === 3)
            ).length,
          };
        }),
      ].filter((a) => a.orderLength);
      res.json({ success: true, result });
    } else res.json({ success: false, message: "Routes Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
