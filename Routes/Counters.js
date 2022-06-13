const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Counter = require("../Models/Counters");


router.post("/postCounter", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, counter_uuid: uuid() };
    if (!value.sort_order) {
      let response = await Counter.find({});
      response = JSON.parse(JSON.stringify(response));
      //   console.log(response)
      value.sort_order =
        Math.max(...response.map((o) => o?.sort_order || 0)) + 1 || 0;
    }
    console.log(value);
    let response = await Counter.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Counter Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetCounterList", async (req, res) => {
  try {
    let data = await Counter.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Counters Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.put("/putCounter", async (req, res) => {
  // try {
  let result = []
  for (let value of req.body) {
    if (!value) res.json({ success: false, message: "Invalid Data" });

    value = Object.keys(value)
      .filter((key) => key !== "_id")
      .reduce((obj, key) => {
        obj[key] = value[key];
        return obj;
      }, {})
    console.log(value);
    let response = await Counter.updateOne({ counter_uuid: value.counter_uuid }, value);
    if (response.acknowledged) {
      console.log(response)
      result.push({ success: true, result: value });
    } else result.push({ success: false, message: "Counter Not created" });
  }
  res.json({ success: true, result })

  // } catch (err) {
  //   res.status(500).json({ success: false, message: err });
  // }
});

router.put("/putCounter/sortOrder", async (req, res) => {
  try {
    const counters = await req.body;
    if (!counters?.[0]) return res.status(204).json({ message: 'Empty Payload' })
    const result = { succeed: [], failed: [] }
    let count = 0;
    const respond = () => ++count === counters?.length ? res.json(result) : ''

    counters?.forEach(async counter => {
      try {
        const res = await Counter.findOneAndUpdate({ counter_uuid: counter.counter_uuid }, counter)
        if (res) result.succeed.push(counter.counter_uuid)
        else result.failed.push({ failed: counter.counter_uuid })
        respond()
      } catch (error) {
        result.failed.push({ failed: counter.counter_uuid, error: error.message })
        respond()
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;
