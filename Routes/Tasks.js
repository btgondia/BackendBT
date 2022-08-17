const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Tasks = require("../Models/Tasks");

router.post("/postTask", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let time = new Date();
    value = {
      ...value,
      created_at: time.getTime(),
      task_uuid: uuid(),
      status: 0,
    };

    console.log(value);
    let response = await Tasks.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Task Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetTasksList/:status", async (req, res) => {
  try {
    let data = await Tasks.find({ status: req.params.status });
    console.log(data);
    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Task Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getCounterTask/:counter_uuid", async (req, res) => {
  try {
    let data = await Tasks.findOne({
      counter_uuid: req.params.counter_uuid,
      status: 0,
    });
    console.log(data);
    if (data) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Task Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getCounterList", async (req, res) => {
  try {
    let data = await Tasks.find({
      $in:{counter_uuid: req.body.counter_uuid.map(a=>a)}
      ,
      status: 0,
    });
    console.log(data);
    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Task Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.put("/putTask", async (req, res) => {
  try {
    let result = [];
    for (let value of req.body) {
      if (!value) res.json({ success: false, message: "Invalid Data" });
      value = Object.keys(value)
        .filter((key) => key !== "_id")
        .reduce((obj, key) => {
          obj[key] = value[key];
          return obj;
        }, {});
      console.log(value);
      let time = new Date();
      value = value.completed
        ? {
            ...value,
            completed_at: time.getTime(),
            status:1
          }
        : value;
        console.log(value)
      let response = await Tasks.updateOne(
        { task_uuid: value.task_uuid },
        value
      );
      if (response.acknowledged) {
        result.push({ success: true, result: value });
      } else result.push({ success: false, message: "Task Not created" });
    }
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
