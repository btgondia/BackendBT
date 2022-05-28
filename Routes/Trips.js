const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Trips = require("../Models/Trips");
const Orders = require("../Models/Orders");

router.post("/postTrip", async (req, res) => {
  //   try {
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
  //   } catch (err) {
  //     res.status(500).json({ success: false, message: err });
  //   }
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
        },
        ...data.map((a) => ({
          ...a,
          orderLength: ordersData.filter((b) => a.trip_uuid === b.trip_uuid)
            .length,
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
router.get("/GetProcessingTripList", async (req, res) => {
  try {
    let data = await Trips.find({});
    data = JSON.parse(JSON.stringify(data));
    let ordersData = await Orders.find({});
    ordersData = JSON.parse(JSON.stringify(ordersData));
    
      let result = [
        {
          trip_uuid: 0,
          trip_title: "Unknown",
          orderLength: ordersData.filter((b) => !b.trip_uuid)?.filter((a) =>
          a.status.length > 1
            ? +a.status.reduce((c, d) => Math.max(+c.stage, +d.stage)) === 1
            : +a?.status[0]?.stage === "1"
        ).length,
        },
        ...data.map((a) => ({
          ...a,
          orderLength: ordersData
            .filter((b) => a.trip_uuid === b.trip_uuid)
            ?.filter((a) =>
              a.status.length > 1
                ? +a.status.reduce((c, d) => Math.max(+c.stage, +d.stage)) === 1
                : +a?.status[0]?.stage === 1
            ).length,
        })),
      ].filter(a=>a.orderLength);
      console.log(result);
      res.json({
        success: true,
        result,
      });

  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
