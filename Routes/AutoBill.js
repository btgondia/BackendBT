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


module.exports = router;
