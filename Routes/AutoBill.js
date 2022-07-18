const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const AutoBill = require("../Models/AutoBill");


router.post("/CreateAutoQty", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {...value,auto_uuid:uuid()};
    
    console.log(value);
    let response = await AutoBill.create( value );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "AutoBill Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.delete("/DeleteAutoQty", async (req, res) => {
  try {
    let value = req.body;
    if (!value.auto_uuid) res.json({ success: false, message: "Invalid Data" });

    
    console.log(value);
    let response = await AutoBill.deleteMany( {auto_uuid:value.auto_uuid} );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "AutoBill Not Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/UpdateAutoQty", async (req, res) => {
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
    let response = await AutoBill.updateMany( {auto_uuid:value.auto_uuid},value );
    if (response.acknowledged) {
      res.json({ success: true, result: value });
    } else res.json({ success: false, message: "AutoBill Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/autoBillItem", async (req, res) => {
  try {
  
    let response = await AutoBill.find( {type:"auto-item-add"} );
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "AutoBill Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/autoBillQty", async (req, res) => {
  try {
  
    let response = await AutoBill.find( {type:"auto-increase-qty"} );
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "AutoBill Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});


module.exports = router;
