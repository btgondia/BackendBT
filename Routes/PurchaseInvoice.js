const express = require('express');
const router = express.Router();
const PurchaseINvoice = require('../Models/PurchaseInvoice');
const Details = require('../Models/Details');
const { v4: uuid } = require('uuid');

//post request to create a new purchase invoice

router.post("/postAccountVoucher", async (req, res) => {
    // try {
      let value = req.body;
      if (!value) res.json({ success: false, message: "Invalid Data" });
      let next_purchase_invoice_number = await Details.find({});
  
      next_purchase_invoice_number =
        next_purchase_invoice_number[0].next_purchase_invoice_number;
  
      value = {
        ...value,
        purchase_order_uuid: uuid(),
        purchase_invoice_number: "P" + next_purchase_invoice_number,
      };
      console.log(value);
      let response = await PurchaseINvoice.create(value);
      if (response) {
        await Details.updateMany(
          {},
          { next_purchase_invoice_number: +next_purchase_invoice_number + 1 }
        );
        res.json({ success: true, result: response });
      } else res.json({ success: false, message: "AccountVoucher Not created" });
    // } catch (err) {
    //   res.status(500).json({ success: false, message: err });
    // }
  });

  module.exports = router;