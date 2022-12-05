const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const CounterGroup = require("../Models/CounterGroup");


router.post("/postCounterGroup", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {...value,counter_group_uuid:uuid()};

    //console.log(value);
    let response = await CounterGroup.create( value );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Group Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetCounterGroupList", async (req, res) => {
  try {
    let data = await CounterGroup.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Routes Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.put("/putCounterGroup", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value= Object.keys(value)
    .filter((key) => key !== "_id")
    .reduce((obj, key) => {
      obj[key] = value[key];
      return obj;
    }, {})

    //console.log(value);
    let response = await CounterGroup.updateOne({counter_group_uuid:value.counter_group_uuid}, value );
    if (response.acknowledged) {
      res.json({ success: true, result: value });
    } else res.json({ success: false, message: "Group Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
module.exports = router;
