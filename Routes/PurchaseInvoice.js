const express = require('express');
const router = express.Router();
const PurchaseINvoice = require('../Models/PurchaseInvoice');
const Details = require('../Models/Details');
const { v4: uuid } = require('uuid');
const Item = require('../Models/Item');
const AccountingVouchers = require('../Models/AccountingVoucher');


let ledger_list = [
  {
    value: 5,
    ledger_uuid: [
      "e8a3be31-34df-4888-8050-904bf9392158",
      "57338803-8a12-465e-9333-66f1ddda0b14",
    ],
    amount_ledger: "6462c110-b11d-4753-825c-cac610c5fbcb",
  },
  {
    value: 12,
    ledger_uuid: [
      "e4731567-d4bd-4919-b6e4-19f28450466f",
      "0e447719-f4a1-48c9-8026-75cc7c70f782",
    ],
    amount_ledger: "5475d37c-46b4-437b-88b0-c1fa7e9e9a95",
  },
  {
    value: 18,
    ledger_uuid: [
      "afb23db7-3add-472d-93d8-2c18df60d94e",
      "98681c0b-900b-4caa-b397-30a58c1afc05",
    ],
    amount_ledger: "60009e51-2509-4748-8ed7-98dd63092dbe",
  },
  {
    value: 28,
    ledger_uuid: [
      "6203a8d1-2a5a-4693-9313-c307aba1a36a",
      "53b3e087-f1de-4200-96ce-402bfcdafc8d",
    ],
    amount_ledger: "2a9e683e-e23b-48ff-960b-1f45b1706d6e",
  },
];
const createAccountingVoucher = async (order, type) => {
  console.log(order);
  const arr = [];
  const gst_value = Array.from(
    new Set(order.item_details.map((a) => +a.gst_percentage))
  );

  for (let a of gst_value) {
    const data = order.item_details.filter((b) => +b.gst_percentage === a);
    const amt =
      data.length > 1
        ? data.map((b) => +b?.item_total).reduce((a, b) => a + b, 0)
        : data.length
        ? +data[0].item_total
        : 0;

    const value = +amt - (+amt * 100) / (100 + a);

    if (value) {
      let ledger = ledger_list.find((b) => b.value === a) || {};
      arr.push({
        amount: -((amt - value).toFixed(3)),
        ledger_uuid: ledger?.amount_ledger,
      });

      for (let item of ledger?.ledger_uuid || []) {
        arr.push({
          amount: -((value / 2).toFixed(3)),
          ledger_uuid: item,
        });
      }
    }
  }
  arr.push({
    amount:
      order.order_grandtotal -
      (order.item_details
        ?.map((a) => +a?.item_total)
        ?.reduce((a, b) => a + b, 0) || 0),
    ledger_uuid: "20327e4d-cd6b-4a64-8fa4-c4d27a5c39a0",
  });
  arr.push({
    ledger_uuid:order.counter_uuid,
    amount:order.order_grandtotal||0,
  })

  const voucher = {
    accounting_voucher_uuid: uuid(),
    type: type,
    voucher_date: new Date().getTime(),
    user_uuid: order.user_uuid,
    counter_uuid: order.counter_uuid,
    order_uuid: order.order_uuid,
    invoice_number: order.invoice_number,
    amount: order.order_grandtotal,
    voucher_verification:arr.reduce((a,b)=>a+ +b.amount,0)?1:0,
    voucher_difference:arr.reduce((a,b)=>a+ +b.amount,0)||0,
    details: arr,
    created_at: new Date().getTime(),
  };
  await AccountingVouchers.create(voucher);
};

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
      createAccountingVoucher(value, "PURCHASE_INVOICE");
      res.json({ success: false, result: value });
      return;
      let response = await PurchaseINvoice.create(value);
      if (response) {
        for(let item of (value.item_details)){
          let item_uuid = item.item_uuid;
          let last_purchase_price = item.price;
          let item_details = await Item.updateOne({item_uuid},{last_purchase_price});
          console.log(item_details);
        }
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