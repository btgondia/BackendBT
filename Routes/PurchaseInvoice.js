const express = require("express");
const router = express.Router();
const PurchaseINvoice = require("../Models/PurchaseInvoice");
const Details = require("../Models/Details");
const { v4: uuid } = require("uuid");
const Item = require("../Models/Item");
const AccountingVouchers = require("../Models/AccountingVoucher");
const Ledger = require("../Models/Ledger");
const {
  updateCounterClosingBalance,
  truncateDecimals,
  removeCommas,
} = require("../utils/helperFunctions");

let ledger_list = [
  {
    value: 0,
    local_purchase_ledger:"d0a3090e-0d51-425b-a123-a00d347e2e65",
    central_purchase_ledger:"5cdf81b8-db0d-47a7-9e95-c4b1d27abaf7"
  },
  {
    value: 5,
    ledger_uuid: [
      "e8a3be31-34df-4888-8050-904bf9392158",
      "57338803-8a12-465e-9333-66f1ddda0b14",
    ],
    local_purchase_ledger: "6462c110-b11d-4753-825c-cac610c5fbcb",
    purchase_igst_ledger: "19e35845-fb93-46ee-8160-20cecc4d52b3",
    central_purchase_ledger: "96a0b1ca-ebd6-43c9-8b15-105c4a1d42a1",
  },
  {
    value: 12,
    ledger_uuid: [
      "e4731567-d4bd-4919-b6e4-19f28450466f",
      "0e447719-f4a1-48c9-8026-75cc7c70f782",
    ],
    local_purchase_ledger: "5475d37c-46b4-437b-88b0-c1fa7e9e9a95",
    purchase_igst_ledger: "d509223b-20e4-4cc2-941e-906ade1668dc",
    central_purchase_ledger: "ea921522-97b9-4ac8-bdff-b8193187264f",
  },
  {
    value: 18,
    ledger_uuid: [
      "afb23db7-3add-472d-93d8-2c18df60d94e",
      "98681c0b-900b-4caa-b397-30a58c1afc05",
    ],
    local_purchase_ledger: "60009e51-2509-4748-8ed7-98dd63092dbe",
    purchase_igst_ledger: "36ef8023-e769-4132-ad18-a368ba516782",
    central_purchase_ledger: "35aa01b0-b0cc-4bcd-8eec-a3219dc7cc5f",
  },
  {
    value: 28,
    ledger_uuid: [
      "6203a8d1-2a5a-4693-9313-c307aba1a36a",
      "53b3e087-f1de-4200-96ce-402bfcdafc8d",
    ],
    local_purchase_ledger: "2a9e683e-e23b-48ff-960b-1f45b1706d6e",
    purchase_igst_ledger: "6aa3f24a-3572-4825-b884-59425f7edbe7",
    central_purchase_ledger: "62e7a642-8738-4d0e-93fa-d2b8f8cafb6a",
  },
];
//delete accounting voucher
const deleteAccountingVoucher = async (order_uuid) => {
  let voucher = await AccountingVouchers.findOne({
    order_uuid,
  });
  console.log({ voucher });
  if (voucher) {
    await updateCounterClosingBalance(voucher.details, "delete");
    await AccountingVouchers.deleteOne({
      order_uuid,
    });
  }
};

const createAccountingVoucher = async (order, type) => {
  let counterData = await Ledger.findOne(
    { ledger_uuid: order.ledger_uuid },
    { gst: 1 }
  );
  let gst = counterData?.gst || "";
  //check is gst starts with 27
  let isGst = gst?.startsWith("27") || !gst ? false : true;

  let arr = [];
  const css_percentage = 0;
  for (let item of order.item_details) {
    if (item.css_percentage)
      css_percentage = item.css_percentage + css_percentage;
  }
  if (css_percentage)
  arr.push({
    amount: css_percentage,
    ledger_uuid: "cf1c57e8-72cf-4d00-af57-e40b7f5d14c7",
  });
  const gst_value = Array.from(
    new Set(order.item_details.map((a) => +a.gst_percentage))
  );

  for (let a of gst_value) {
    const data = order.item_details.filter((b) => +b.gst_percentage === a);
    let amt = 0;
    for (let item of data) {
      amt = +item.item_total + +amt;
      amt = amt.toFixed(2);
    }

    const value = (+amt - (+amt * 100) / (100 + a)).toFixed(2);
    console.log({ value, amt });
    if (amt && value) {
      let ledger = ledger_list.find((b) => b.value === a) || {};
      arr.push({
        amount: -(amt - value).toFixed(3),
        ledger_uuid: isGst
          ? ledger?.central_purchase_ledger
          : ledger?.local_purchase_ledger,
      });
      if (isGst) {
        arr.push({
          amount: -value,
          ledger_uuid: ledger?.purchase_igst_ledger,
        });
      } else
        for (let item of ledger?.ledger_uuid || []) {
          arr.push({
            amount: -truncateDecimals(value / 2, 2),
            ledger_uuid: item,
          });
        }
    }
  }
  let round_off = order.round_off || 0;
  if (round_off)
    arr.push({
      amount: -round_off,
      ledger_uuid: "20327e4d-cd6b-4a64-8fa4-c4d27a5c39a0",
    });
  arr.push({
    ledger_uuid: order.counter_uuid || order.ledger_uuid,
    amount: order.order_grandtotal || 0,
  });

  for (let item of order.deductions || []) {
    arr.push({
      ledger_uuid: item.ledger_uuid,
      amount: -item.amount,
    });
  }
  arr = arr.map((a) => ({
    ...a,
    amount: removeCommas(a.amount),
  }));
  let voucher_round_off = 0;
  for (let item of arr) {
    voucher_round_off = +item.amount + +voucher_round_off;
    voucher_round_off = +voucher_round_off.toFixed(3);
  }
  if (+voucher_round_off) {
    arr.push({
      ledger_uuid: "ebab980c-4761-439a-9139-f70875e8a298",
      amount: -(voucher_round_off || 0).toFixed(3),
    });
  }
  let voucher_difference = 0;
  for (let item of arr) {
    voucher_difference = +voucher_difference + +item.amount;
    voucher_difference = +voucher_difference.toFixed(2);
    console.log({
      voucher_difference,
      amount: item.amount,
      ledger_uuid: item.ledger_uuid,
    });
  }

  const voucher = {
    accounting_voucher_uuid: uuid(),
    type: type,
    voucher_date: new Date().getTime(),
    user_uuid: order.user_uuid,
    counter_uuid: order.counter_uuid,
    order_uuid: order.purchase_order_uuid,
    invoice_number: order.purchase_invoice_number,
    amount: order.order_grandtotal,
    voucher_verification: voucher_difference ? 1 : 0,
    voucher_difference,
    details: arr,
    created_at: new Date().getTime(),
  };
  console.log({ voucher });
  await AccountingVouchers.create(voucher);
  await updateCounterClosingBalance(arr, "add");
};

//update accounting voucher
const updateAccountingVoucher = async (order, type) => {
  let voucher = await AccountingVouchers.findOne({
    order_uuid: order.purchase_order_uuid,
    type,
  });
  if (voucher) {
    await updateCounterClosingBalance(
      voucher.details,
      "delete",
      order.purchase_order_uuid
    );
    await AccountingVouchers.deleteOne({
      order_uuid: order.purchase_order_uuid,
      type,
    });

    createAccountingVoucher(order, type);
  }
};

//post request to create a new purchase invoice

router.post("/postPurchaseInvoice", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    value = {
      ...value,
      purchase_order_uuid: uuid(),
    };

    createAccountingVoucher(value, "PURCHASE_INVOICE");

    let response = await PurchaseINvoice.create(value);
    if (response) {
      for (let item of value.item_details) {
        let item_uuid = item.item_uuid;
        let last_purchase_price = item.price;
        await Item.updateOne({ item_uuid }, { last_purchase_price });
      }

      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "AccountVoucher Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

// putPurchaseInvoice by id
router.put("/putPurchaseInvoice", async (req, res) => {
  try {
    let value = req.body;
    if (!value.purchase_order_uuid)
      res.json({ success: false, message: "Invalid Data" });
    //delete _id
    delete value._id;
    if (value.details.length) updateAccountingVoucher(value, "PURCHASE_INVOICE");
    let response = await PurchaseINvoice.findOneAndUpdate(
      { purchase_order_uuid: value.purchase_order_uuid },
      req.body
    );
    if (response) res.json({ success: true, result: response });
    else res.json({ success: false, message: "AccountVoucher Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

// get purchase invoice by id
router.get("/getPurchaseInvoice/:id", async (req, res) => {
  try {
    let response = await PurchaseINvoice.findOne({
      purchase_order_uuid: req.params.id,
    });
    if (response) res.json({ success: true, result: response });
    else res.json({ success: false, message: "AccountVoucher Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

//delete purchase invoice by id
router.delete("/deletePurchaseInvoice", async (req, res) => {
  try {
    let { order_uuid } = req.body;
    let response = await PurchaseINvoice.deleteOne({
      purchase_order_uuid: order_uuid,
    });

    if (response) {
      await deleteAccountingVoucher(order_uuid);
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "AccountVoucher Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
module.exports = router;
