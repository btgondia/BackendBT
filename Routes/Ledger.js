const express = require("express");
const router = express.Router();
const Ledger = require("../Models/Ledger");
const LedgerGroup = require("../Models/LedgerGroup");
const { v4: uuid } = require("uuid");
const AccountingVoucher = require("../Models/AccountingVoucher");
const Counters = require("../Models/Counters");
const Details = require("../Models/Details");
const Receipts = require("../Models/Receipts");

router.post("/postLedger", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, ledger_uuid: value.ledger_uuid || uuid() };

    console.log(value);
    let response = await Ledger.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Ledger Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/getLedger", async (req, res) => {
  try {
    let response = await Ledger.find();
    response = response.filter((item) => item.ledger_uuid);
    console.log(response[0]);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Ledger Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getBankLedger", async (req, res) => {
  try {
    let response = await Ledger.find({
      ledger_group_uuid: "0c0c8cbd-1a2a-4adc-9b65-d5c807f275c7",
    });
    response = response.filter((item) => item.ledger_uuid);
    console.log(response[0]);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Ledger Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
function getAlphabetIndex(alphabet) {
  const sequence = "abcdefghijklmnopqrstuvwxyz";
  return sequence.indexOf(alphabet.toLowerCase());
}
router.post("/getExcelDetailsData", async (req, res) => {
  try {
    let { array, ledger_uuid } = req.body;
    let ledgerData = await Ledger.findOne({ ledger_uuid: ledger_uuid });

    let bankStatementItem = await Details.findOne(
      {},
      { bank_statement_item: 1 }
    );
    bankStatementItem = bankStatementItem.bank_statement_item;
    let arrayData = array.slice(
      bankStatementItem.start_from_line - 2,
      array.length
    );
    let data = [];
    let total_recived_amount = 0;
    let total_paid_amount = 0;
    for (let item of arrayData) {
      let narration =
        item[getAlphabetIndex(bankStatementItem.narration_column)];
      let received_amount =
        item[getAlphabetIndex(bankStatementItem.received_amount_column)];
      let paid_amount =
        item[getAlphabetIndex(bankStatementItem.paid_amount_column)];
      if (received_amount) total_recived_amount += +received_amount;
      if (paid_amount) total_paid_amount += +paid_amount;
      if (!narration) continue;
      let separators = bankStatementItem.separator;

      //get nerations array saperated with separator
      let narrationArray = [];
      for (let separator of separators) {
        if (narration.includes(separator)) {
          narrationArray = narration.split(separator);
          break;
        }
      }

      // find counter or ledger includs transaction_tags matches with narration
      let countersData = await Counters.find(
        { transaction_tags: { $in: narrationArray } },
        { counter_uuid: 1, counter_title: 1, transaction_tags: 1 }
      );
      countersData = JSON.parse(JSON.stringify(countersData));
      if (countersData.length) {
        //check counter with matches more narrations
        let narrationCountersData = [];
        for (let counter of countersData) {
          let counterNarration = counter.transaction_tags.filter((i) =>
            narrationArray.includes(i)
          ).length;
          narrationCountersData.push({
            ...counter,
            narration: counterNarration,
          });
        }
        //get counter with max narration
        countersData = narrationCountersData.sort(
          (a, b) => b.narration - a.narration
        );
        countersData = countersData[0];
      }
      console.log({
        countersData,
        received_amount,
        bankStatementItem: bankStatementItem.received_amount_column,
      });
      if (countersData.counter_uuid) {
        let reciptsData = await Receipts.find({
          counter_uuid: countersData.counter_uuid,
          pending: 0,
          "modes.mode_uuid": "c67b5988-d2b6-11ec-9d64-0242ac120002",
          "modes.amt": received_amount,
        });
        data.push({
          narration,
          received_amount,
          countersData,
          reciptsData,
        });
      }
    }

    let result = [];
    //Total Records	32
    result.push({ name: "Total Records", value: arrayData.length });
    //Matched Records	10
    result.push({ name: "Matched Records", value: data.length });
    //Unmatched Records	22
    result.push({
      name: "Unmatched Records",
      value: arrayData.length - data.length,
    });
    //Total Paid Amount
    result.push({ name: "Total Paid Amount", value: total_paid_amount });
    //Total Received Amount
    result.push({
      name: "Total Received Amount",
      value: total_recived_amount,
    });
    if (result) {
      res.json({ success: true, result });
    } else res.json({ success: false, message: "Ledger Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

//put ledger
router.put("/putLedger", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    //delete _id
    delete value._id;
    console.log(value);
    let response = await Ledger.updateOne(
      { ledger_uuid: value.ledger_uuid },
      {
        ledger_group_uuid: value.ledger_group_uuid,
        ledger_title: value.ledger_title,
        opening_balance: value.opening_balance,
        closing_balance: value.closing_balance,
      }
    );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Ledger Not Updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

//delete ledger
router.delete("/deleteLedger", async (req, res) => {
  try {
    let value = req.body;
    console.log(value);
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let response = await Ledger.deleteMany({
      ledger_uuid: value.ledger_uuid,
    });
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Ledger Not Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.post("/getLegerReport", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    console.log(value);
    let endDate = +value.endDate + 86400000;
    console.log(endDate, value.startDate);
    // ledger_uuid is in details
    let response = await AccountingVoucher.find({
      "details.ledger_uuid": value.counter_uuid,
      created_at: { $gte: value.startDate, $lte: endDate },
    });
    response = JSON.parse(JSON.stringify(response));
    let result = [];
    for (let item of response) {
      result.push({
        ...item,
        amount: item.details.find((i) => i.ledger_uuid === value.counter_uuid)
          .amount,
      });
    }
    if (result.length) {
      res.json({ success: true, result });
    } else res.json({ success: false, message: "Ledger Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
