const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Incentive = require("../Models/Incentive");


router.post("/CreateIncentive", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {...value,incentive_uuid:uuid(),status:1};
    
    console.log(value);
    let response = await Incentive.create( value );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Incentive Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.delete("/DeleteIncentive", async (req, res) => {
  try {
    let value = req.body;
    if (!value.incentive_uuid) res.json({ success: false, message: "Invalid Data" });

    
    console.log(value);
    let response = await Incentive.deleteMany( {incentive_uuid:value.incentive_uuid} );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Incentive Not Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/UpdateIncentive", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value= Object.keys(value)
    .filter((key) => key !== "_id")
    .reduce((obj, key) => {
      obj[key] = value[key];
      return obj;
    }, {})
    console.log(value);
    let response = await Incentive.updateMany( {incentive_uuid:value.incentive_uuid},value );
    if (response.acknowledged) {
      res.json({ success: true, result: value });
    } else res.json({ success: false, message: "Incentive Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getRangeOrderIncentive", async (req, res) => {
  try {
  
    let response = await Incentive.find( {type:"range-order"} );
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Incentive Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getDeliveryIncentive", async (req, res) => {
  try {
  
    let response = await Incentive.find( {type:"delivery-incentive"} );
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Incentive Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getItemIncentive", async (req, res) => {
  try {
  
    let response = await Incentive.find( {type:"item-incentive"} );
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Incentive Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});



module.exports = router;
