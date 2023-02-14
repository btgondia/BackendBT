const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Details = require("../Models/Details");
const OrderForm = require("../Models/orderForms");

router.post("/postForm", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, form_uuid: uuid() };

    console.log(value);
    let response = await OrderForm.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Form Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.delete("/deleteForm", async (req, res) => {
  try {
    let { form_uuid } = req.body;
    if (!form_uuid) res.json({ success: false, message: "Invalid Data" });
    let response = { acknowledged: false };

    response = await OrderForm.deleteOne({ form_uuid });
    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else
      res.status(404).json({ success: false, message: "Form Not Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetFormList", async (req, res) => {
  try {
    let data = await OrderForm.find({});

    if (data.length)
      res.json({
        success: true,
        result: data.filter((a) => a.form_uuid),
      });
    else res.json({ success: false, message: "Item Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetFormList", async (req, res) => {
  try {
    let value = req.body;
    let json = {};

    for (let i of value) {
      json = { ...json, [i]: 1 };
    }
    console.log(json);
    let data = await OrderForm.find({}, json);

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Order Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});


router.put("/putForm", async (req, res) => {
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
      let response = await OrderForm.updateOne(
        { form_uuid: value.form_uuid },
        value
      );
      if (response.acknowledged) {
        result.push({ success: true, result: value });
      } else result.push({ success: false, message: "Form Not created" });
    }
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});


module.exports = router;
