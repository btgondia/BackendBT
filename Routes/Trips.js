const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Trips = require("../Models/Trips");

router.post("/postTrip", async (req, res) => {
//   try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {
      ...value,
      trip_uuid: uuid(),
      created_at: (new Date()).getTime(),
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

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Trips Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
