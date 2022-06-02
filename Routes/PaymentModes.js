const express = require("express");

const router = express.Router();
const PaymentModes = require("../Models/PaymentModes");

router.get("/GetPaymentModesList", async (req, res) => {
  try {
    let data = await PaymentModes.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Payment Modes Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
