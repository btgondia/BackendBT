const express = require("express");
const router = express.Router();
const CreditNotes = require("../Models/CreditNotes");
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
    value: 5,
    ledger_uuid: [
      "036d4761-e375-4cae-b826-f2c154b3403b",
      "e13f277a-d700-4137-9395-c62598f26513",
    ],
    local_sale_ledger: "1caf98e1-63c0-417c-81c8-fe85657f82e5",
    central_sale_ledger: "8a0cac47-9eb6-40df-918f-ea744e1a142f",
    sale_igst_ledger: "f732ba11-c4fc-40c3-9b57-0f0e83e90c75",
  },
  {
    value: 12,
    ledger_uuid: [
      "b997b4f4-8baf-443c-85b9-0cfcccb013fd",
      "93456bbd-ffbe-4ce6-a2a7-d483c7917f92",
    ],
    local_sale_ledger: "a48035a8-f9c3-4232-8f5b-d168850c016d",
    central_sale_ledger: "6ba8115e-cc94-49f6-bd5b-386f000f8c1d",
    sale_igst_ledger: "61ba70f5-9de6-4a2e-8ace-bd0856358c42",
  },
  {
    value: 18,
    ledger_uuid: [
      "ed787d1b-9b89-44e5-b828-c69352d1e336",
      "28b8428f-f8f3-404f-a696-c5777fbf4096",
    ],
    local_sale_ledger: "81df442d-4106-49de-8a45-649c1ceb00ef",
    central_sale_ledger: "3732892f-d5fa-415b-b72c-3e2d338e0e3f",
    sale_igst_ledger: "2d4f7d50-8c2e-457e-817a-a811bce3ac8d",
  },
  {
    value: 28,
    ledger_uuid: [
      "17612833-5f48-4cf8-8544-c5a1debed3ae",
      "60b6ccb7-37e4-40b2-a7d9-d84123c810e7",
    ],
    local_sale_ledger: "b00a56db-344d-4c08-9d9a-933ab9ee378d",
    central_sale_ledger: "aeae84fa-e4ce-4480-8448-250134d12004",
    sale_igst_ledger: "6aa3f24a-3572-4825-b884-59425f7edbe7",
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
          : ledger?.local_sale_ledger,
      });
      if (isGst) {
        arr.push({
          amount: -value,
          ledger_uuid: ledger?.sale_igst_ledger,
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
    order_uuid: order.credit_note_order_uuid,
    invoice_number: order.credit_notes_invoice_number,
    amount: order.order_grandtotal,
    voucher_verification: voucher_difference ? 1 : 0,
    voucher_difference,
    details:arr,
    created_at: new Date().getTime(),
  };
  console.log({ voucher });
  await AccountingVouchers.create(voucher);
  await updateCounterClosingBalance(arr, "add");
};

//update accounting voucher
const updateAccountingVoucher = async (order, type) => {
  let voucher = await AccountingVouchers.findOne({
    order_uuid: order.credit_note_order_uuid,
    type,
  });
  if (voucher) {
    await updateCounterClosingBalance(
      voucher.details,
      "delete",
      order.credit_note_order_uuid
    );
    await AccountingVouchers.deleteOne({
      order_uuid: order.credit_note_order_uuid,
      type,
    });

    createAccountingVoucher(order, type);
  }
};

//post request to create a new purchase invoice

router.post("/postCreditNote", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    value = {
      ...value,
      credit_note_order_uuid: uuid(),
    };

    createAccountingVoucher(value, "CREDIT_NOTE");

    let response = await CreditNotes.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "AccountVoucher Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

// putPurchaseInvoice by id
router.put("/putCreditNote", async (req, res) => {
  try {
    let value = req.body;
    if (!value.credit_note_order_uuid)
      res.json({ success: false, message: "Invalid Data" });
    //delete _id
    delete value._id;
    if(value.details)
    updateAccountingVoucher(value, "PURCHASE_INVOICE");
    let response = await CreditNotes.findOneAndUpdate(
      { credit_note_order_uuid: value.credit_note_order_uuid },
      req.body
    );
    if (response) res.json({ success: true, result: response });
    else res.json({ success: false, message: "AccountVoucher Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

// get purchase invoice by id
router.get("/getCreditNote/:id", async (req, res) => {
  try {
    let response = await CreditNotes.findOne({
      credit_note_order_uuid: req.params.id,
    });
    if (response) res.json({ success: true, result: response });
    else res.json({ success: false, message: "Credit Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

//delete purchase invoice by id
router.delete("/deleteCreditNote", async (req, res) => {
  try {
    let { order_uuid } = req.body;
    let response = await CreditNotes.deleteOne({
      credit_note_order_uuid: order_uuid,
    });

    if (response) {
      await deleteAccountingVoucher(order_uuid);
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Credit note Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
module.exports = router;
