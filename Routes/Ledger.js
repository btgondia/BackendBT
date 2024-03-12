const express = require("express");
const router = express.Router();
const Ledger = require("../Models/Ledger");
const LedgerGroup = require("../Models/LedgerGroup");
const { v4: uuid } = require("uuid");
const AccountingVoucher = require("../Models/AccountingVoucher");
const Counters = require("../Models/Counters");
const Details = require("../Models/Details");
const Receipts = require("../Models/Receipts");
const Routes = require("../Models/Routes");
const OrderCompleted = require("../Models/OrderCompleted");
const Orders = require("../Models/Orders");

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
    let { array } = req.body;

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
    let total_received_amount = 0;
    let total_paid_amount = 0;
    for (let [index, item] of arrayData.entries()) {
      let narration =
        item[getAlphabetIndex(bankStatementItem.narration_column)];
      let received_amount =
        item[getAlphabetIndex(bankStatementItem.received_amount_column)];
      let paid_amount =
        item[getAlphabetIndex(bankStatementItem.paid_amount_column)];
      if (received_amount) total_received_amount += +received_amount;
      if (paid_amount) total_paid_amount += +paid_amount;
      if (!narration) continue;
      let separators = bankStatementItem.separator;

      //get nerations array saperated with separator also separate with balnk sapces
      let narrationArray = [];
      for (let separator of separators) {
        let narrationArrayTemp = narration.split(separator);
        for (let narrationTemp of narrationArrayTemp) {
          let narrationTempArray = narrationTemp.split(" ");
          narrationArray = [...narrationArray, ...narrationTempArray];
        }
      }
      //remove empty string from array
      narrationArray = narrationArray.filter((i) => i);

      //check anny neration starts with one or more 0 digit
      let zeroStartedArray = narrationArray.filter((i) => i.match(/^0+/));
      if (zeroStartedArray.length) {
        //remove all stating zero from narration array
        zeroStartedArray = zeroStartedArray.map((i) => i.replace(/^0+/, ""));
      }
      narrationArray = [...narrationArray, ...zeroStartedArray];
      console.log({ narrationArray });

      // find counter or ledger includs transaction_tags matches with narration
      let countersData = await Counters.find(
        { transaction_tags: { $in: narrationArray } },
        {
          counter_uuid: 1,
          counter_title: 1,
          transaction_tags: 1,
          route_uuid: 1,
        }
      );
      let ledgerData = await Ledger.find(
        { transaction_tags: { $in: narrationArray } },
        {
          ledger_uuid: 1,
          ledger_title: 1,
          transaction_tags: 1,
        }
      );
      
      countersData = JSON.parse(JSON.stringify(countersData));
      ledgerData = JSON.parse(JSON.stringify(ledgerData));
      countersData = [...countersData, ...ledgerData];
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

      let reciptsData = await Receipts.find({
        ...(countersData.counter_uuid
          ? { counter_uuid: countersData.counter_uuid }
          : {
              "modes.remarks": { $in: narrationArray },
            }),
        pending: 0,
        "modes.mode_uuid": countersData.counter_uuid
          ? "c67b5988-d2b6-11ec-9d64-0242ac120002"
          : "c67b5794-d2b6-11ec-9d64-0242ac120002",
        "modes.amt": received_amount,
      });
      reciptsData = JSON.parse(JSON.stringify(reciptsData));
      reciptsData = reciptsData?.find((a) =>
        a.modes.find((b) => {
          if (!countersData.counter_uuid) {
            let check =
              b.amt === received_amount &&
              b.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" &&
              narrationArray.find((i) => b.remarks === i);

            return check;
          } else
            return (
              b.amt === received_amount &&
              b.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
            );
        })
      );
      console.log({ reciptsData, countersData });
      if (!countersData?.route_uuid && reciptsData?.counter_uuid) {
        countersData = await Counters.findOne(
          { counter_uuid: reciptsData.counter_uuid },
          { counter_uuid: 1, counter_title: 1, route_uuid: 1 }
        );
      }
      let routeData;
      if (countersData.route_uuid) {
        routeData = await Routes.findOne({
          route_uuid: countersData.route_uuid,
        });
      }

      if (reciptsData)
        data.push({
          sr: +bankStatementItem.start_from_line + index,
          reference_no: reciptsData.invoice_number,
          counter_title: countersData.counter_title || "",
          route_title: routeData?.route_title || "",
          counter_uuid: countersData.counter_uuid,
          date: item[getAlphabetIndex(bankStatementItem.date_column)],
          received_amount,
          paid_amount,
          unMatch: false,
        });
      else if (countersData.counter_uuid) {
        data.push({
          sr: +bankStatementItem.start_from_line + index,
          reference_no: "Unmatched",
          counter_title: countersData.counter_title || "",
          route_title: routeData?.route_title || "",
          counter_uuid: countersData.counter_uuid,
          date: item[getAlphabetIndex(bankStatementItem.date_column)],
          received_amount,
          paid_amount,
          unMatch: true,
        });
      } else {
        data.push({
          sr: +bankStatementItem.start_from_line + index,
          reference_no: "",
          counter_title: "Unmatched",
          route_title: "",
          received_amount,
          paid_amount,
          unMatch: true,
        });
      }
    }
    let result = {
      total_recode: arrayData.length,
      matched_recode: data.filter((a) => !a.unMatch).length,
      unmatched_recode: data.filter((a) => a.unMatch).length,
      total_paid_amount,
      total_received_amount,
      data,
    };

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

    let endDate = +value.endDate + 86400000;
    let ledgerData = await Ledger.findOne(
      { ledger_uuid: value.counter_uuid },
      { ledger_uuid: 1, opening_balance: 1 }
    );
    if (!ledgerData)
      ledgerData = await Counters.findOne(
        { ledger_uuid: value.ledger_uuid },
        { ledger_uuid: 1, opening_balance: 1 }
      );

    if (!ledgerData) res.json({ success: false, message: "Ledger Not Found" });

    let opening_balance = ledgerData.opening_balance?.filter(
      (a) => a.date < value.startDate
    );

    //get max date from opening balance
    if (opening_balance.length > 1) {
      let maxDate = Math.max(...opening_balance.map((a) => a.date));

      //get opening balance of max date
      opening_balance = opening_balance.find((a) => a.date === maxDate);
    } else if (opening_balance.length === 1) {
      opening_balance = opening_balance[0];
    }
    let oldAccountingVouchers = await AccountingVoucher.find({
      "details.ledger_uuid": value.counter_uuid,
      created_at: { $gte: opening_balance.date, $lte: value.startDate },
    });
    let balance = opening_balance?.amount || 0;

    for(let item of oldAccountingVouchers){
      let amount = item.details.find(
        (i) => i.ledger_uuid === value.counter_uuid
      ).amount;
      balance += amount;
    }

    // ledger_uuid is in details
    let response = await AccountingVoucher.find({
      "details.ledger_uuid": value.counter_uuid,
      created_at: { $gte: value.startDate, $lte: endDate },
    });
    response = JSON.parse(JSON.stringify(response));
    let result = [];
    
    for (let item of response) {
      let orderData;
      if (!item.invoice_number)
        orderData = await OrderCompleted.findOne({
          order_uuid: item.order_uuid,
        });
      if (!orderData) {
        orderData = await Orders.findOne({
          order_uuid: item.order_uuid,
        });
      }
      let amount = item.details.find(
        (i) => i.ledger_uuid === value.counter_uuid
      ).amount;
      balance += amount;
      result.push({
        ...item,
        amount,
        invoice_number: item.invoice_number || orderData?.invoice_number || "",
        balance,
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
