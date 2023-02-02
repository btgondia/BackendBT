const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Counter_schemes = require("../Models/counter_schems");
const Counters = require("../Models/Counters");

router.post("/CreateCounter_scheme", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, counter_scheme_uuid: uuid(), status: 1 };

    console.log(value);
    let response = await Counter_schemes.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Incentive Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.delete("/DeleteCounter_scheme", async (req, res) => {
  try {
    let value = req.body;
    if (!value.counter_scheme_uuid)
      res.json({ success: false, message: "Invalid Data" });

    console.log(value);
    let response = await Counter_schemes.deleteMany({
      counter_scheme_uuid: value.counter_scheme_uuid,
    });
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Incentive Not Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/UpdateCounter_scheme", async (req, res) => {
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
    let response = await Counter_schemes.updateMany(
      { counter_scheme_uuid: value.counter_scheme_uuid },
      value
    );
    if (response.acknowledged) {
      res.json({ success: true, result: value });
    } else res.json({ success: false, message: "Incentive Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getRangeOrderDisount", async (req, res) => {
  try {
    let response = await Counter_schemes.find({
      type: { $in: ["range-discount-company", "range-discount-category"] },
    });
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Incentive Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getRangeOrderEligibleDiscounts", async (req, res) => {
  // try {
  let { items, counter_uuid, user_uuid } = req.body;

  let counterSchemeData = await Counter_schemes.find({
    $or: [
      {
        type: "range-discount-company",
        company: { $in: items.map((a) => a.company_uuid) },
      },
      {
        type: "range-discount-category",
        category: { $in: items.map((a) => a.category_uuid) },
      },
    ],
    user_uuid,
    status: 1,
  });
  counterSchemeData = JSON.parse(JSON.stringify(counterSchemeData));

  let counterData = await Counters.findOne({ counter_uuid });
  counterData = JSON.parse(JSON.stringify(counterData));
  let response = [];
  for (let scheme of counterSchemeData) {
    if (scheme.type === "range-discount-company") {
      let { lines = 0 } = counterData.average_lines_company.find(
        (a) => a.company_uuid === scheme.company_uuid
      );
      let itemsLength = items.filter(
        (a) => a.company_uuid === scheme.company_uuid
      )?.length;
      let eligiablility = lines
        ? (((itemsLength.length || 0) - lines) * 100) / lines
        : 0;
      if(eligiablility){
        response=[...response,scheme]
      }
    } else if (scheme.type === "range-discount-category") {
      let { lines = 0 } = counterData.average_lines_category.find(
        (a) => a.category_uuid === scheme.category_uuid
      );
      let itemsLength = items.filter(
        (a) => a.category_uuid === scheme.category_uuid
      )?.length;
      let eligiablility = lines
        ? (((itemsLength.length || 0) - lines) * 100) / lines
        : 0;
        if(eligiablility){
          response=[...response,scheme]
        }
    }
  }
  if (response.length) {
    res.json({ success: true, result: response });
  } else res.json({ success: false, message: "Incentive Not found" });
  // } catch (err) {
  //   res.status(500).json({ success: false, message: err });
  // }
});
router.get("/getDeliveryCounter_scheme", async (req, res) => {
  try {
    let response = await Counter_schemes.find({ type: "delivery-incentive" });
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Incentive Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getItemCounter_scheme", async (req, res) => {
  try {
    let response = await Counter_schemes.find({ type: "item-incentive" });
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Incentive Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
