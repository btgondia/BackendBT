const express = require("express");

const router = express.Router();
const Receipts = require("../Models/Receipts");

router.post("/postReceipt", async (req, res) => {
    try {
      let value = req.body;
      if (!value) res.json({ success: false, message: "Invalid Data" });
      
      console.log(value);
      let response = await Receipts.create( value );
      if (response) {
        res.json({ success: true, result: response });
      } else res.json({ success: false, message: "Receipts Not created" });
    } catch (err) {
      res.status(500).json({ success: false, message: err });
    }
  });

module.exports = router;
