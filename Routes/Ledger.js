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
const { removeCommas } = require("../utils/helperFunctions");
const PurchaseInvoice = require("../Models/PurchaseInvoice");

router.get("/getLedgerClosingBalance", async (req, res) => {
  try {
    let ledgerData = await Ledger.find(
      {},
      {
        closing_balance: 1,
        ledger_uuid: 1,
        ledger_group_uuid: 1,
        ledger_title: 1,
      }
    );
    ledgerData = JSON.parse(JSON.stringify(ledgerData));
    let counterData = await Counters.find(
      { status: 1 },
      { closing_balance: 1, counter_uuid: 1, route_uuid: 1, counter_title: 1 }
    );
    counterData = JSON.parse(JSON.stringify(counterData));
    let response = [];
    let ledgerGroupData = await LedgerGroup.find(
      {
        ledger_group_uuid: { $in: ledgerData.map((a) => a.ledger_group_uuid) },
      },
      { ledger_group_title: 1, ledger_group_uuid: 1 }
    );
    for (let item of ledgerData) {
      if (!item.ledger_uuid) continue;
      let ledger_group_title =
        ledgerGroupData.find(
          (a) => a.ledger_group_uuid === item.ledger_group_uuid
        )?.ledger_group_title || "";
      response.push({
        ledger_uuid: item.ledger_uuid,
        closing_balance: item.closing_balance,
        ledger_group_title,
        title: item.ledger_title,
      });
    }
    let routeData = await Routes.find(
      { route_uuid: { $in: counterData.map((a) => a.route_uuid) } },
      { route_title: 1, route_uuid: 1 }
    );
    for (let item of counterData) {
      if (!item.counter_uuid) continue;
      let route_title =
        routeData.find((a) => a.route_uuid === item.route_uuid)?.route_title ||
        "";

      response.push({
        counter_uuid: item.counter_uuid,
        closing_balance: item.closing_balance,
        route_title,
        title: item.counter_title,
      });
    }
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Ledger Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

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
    response = JSON.parse(JSON.stringify(response));
    let default_opening_balance_date = await Details.findOne(
      {},
      { default_opening_balance_date: 1 }
    );
    let result = response.map((item) => {
      return {
        ...item,
        opening_balance_amount:
          item.opening_balance.find(
            (a) =>
              a.date ===
              default_opening_balance_date.default_opening_balance_date
          )?.amount || 0,
      };
    });

    if (result.length) {
      res.json({ success: true, result });
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
      bankStatementItem.start_from_line - 1,
      array.length
    );
    console.log(arrayData[0]);
    let data = [];
    let total_received_amount = 0;
    let total_paid_amount = 0;
    for (let [index, item] of arrayData.entries()) {
      let narration =
        item[getAlphabetIndex(bankStatementItem.narration_column)];
      let received_amount = removeCommas(
        item[getAlphabetIndex(bankStatementItem.received_amount_column)]
      );
      let paid_amount = removeCommas(
        item[getAlphabetIndex(bankStatementItem.paid_amount_column)]
      );

      if (received_amount) total_received_amount += +received_amount;
      if (paid_amount) total_paid_amount += +paid_amount;
      if (!narration) continue;
      let separators = bankStatementItem.separator;
      console.log({ separators });

      let narrationArray = [];
      for (let separator of separators) {
        let narrationArrayTemp = narration.split(separator);
        for (let narrationTemp of narrationArrayTemp) {
          let narrationTempArray = narrationTemp.split(" ");
          narrationArray = [
            ...narrationArray,
            narrationTemp,
            ...narrationTempArray,
          ];
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
      //remove dulicates from narration array
      narrationArray = Array.from(new Set(narrationArray));

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
          ledger_group_uuid: 1,
        }
      );

      countersData = JSON.parse(JSON.stringify(countersData));
      ledgerData = JSON.parse(JSON.stringify(ledgerData));
      countersData = [...countersData, ...ledgerData];
      let multipleNarration = countersData.length > 1 ? countersData : false;
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
          return +b.amt === +received_amount;
        })
      );
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
      let date = item[getAlphabetIndex(bankStatementItem.data_column)];
      console.log({ date, reciptsData, multipleNarration });
      if (reciptsData)
        data.push({
          sr: +bankStatementItem.start_from_line + index,
          reference_no: reciptsData.invoice_number,
          counter_title: countersData.counter_title || "",
          route_title: routeData?.route_title || "",
          counter_uuid: countersData.counter_uuid,
          date,
          received_amount,
          paid_amount,
          unMatch: multipleNarration ? true : false,
          ledger_group_uuid: countersData.ledger_group_uuid || "",
          transaction_tags: narrationArray,
          multipleNarration,
        });
      else if (countersData.counter_uuid || countersData.ledger_uuid) {
        data.push({
          sr: +bankStatementItem.start_from_line + index,
          reference_no: "",
          counter_title:
            countersData.counter_title || countersData.ledger_title || "",
          route_title: routeData?.route_title || "",
          counter_uuid: countersData.counter_uuid || countersData.ledger_uuid,
          date,
          received_amount,
          paid_amount,
          unMatch: true,
          transaction_tags: narrationArray,
          multipleNarration,
        });
      } else {
        data.push({
          sr: +bankStatementItem.start_from_line + index,
          reference_no: "",
          counter_title: "",
          route_title: "",
          received_amount,
          paid_amount,
          unMatch: true,
          transaction_tags: narrationArray,
          narration,
          date,
        });
      }
    }
    let result = data;

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
        transaction_tags: value.transaction_tags,
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
    if (!value) return res.json({ success: false, message: "Invalid Data" });

    let endDate = +value.endDate + 86400000;
    console.log(value);
    let ledgerData = await Ledger.findOne(
      { ledger_uuid: value.counter_uuid },
      { ledger_uuid: 1, opening_balance: 1 }
    );
    if (!ledgerData)
      ledgerData = await Counters.findOne(
        { counter_uuid: value.counter_uuid },
        { ledger_uuid: 1, opening_balance: 1 }
      );

    if (!ledgerData)
      return res.json({ success: false, message: "Ledger Not Found" });
    let default_opening_balance_date = await Details.findOne(
      {},
      { default_opening_balance_date: 1 }
    );
    let opening_balance =
      ledgerData?.opening_balance?.filter(
        (a) =>
          a.date === default_opening_balance_date.default_opening_balance_date
      ) || [];

    //get max date from opening balance
    if (opening_balance.length > 1) {
      let maxDate = Math.max(...opening_balance.map((a) => a.date));

      //get opening balance of max date
      opening_balance = opening_balance.find((a) => a.date === maxDate);
    } else if (opening_balance.length === 1) {
      opening_balance = opening_balance[0];
    } else {
      opening_balance = {
        amount: 0,
      };
    }

    let oldAccountingVouchers = await AccountingVoucher.find({
      "details.ledger_uuid": value.counter_uuid || value.ledger_uuid,
      created_at: {
        $gte: default_opening_balance_date.default_opening_balance_date,
        $lte: value.startDate,
      },
    });
    let balance = opening_balance?.amount || 0;

    for (let item of oldAccountingVouchers) {
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
      if (!item.accounting_voucher_uuid) {
        continue;
      }
      if (!item.invoice_number)
        orderData = await OrderCompleted.findOne({
          order_uuid: item.order_uuid,
        });
      if (!orderData) {
        orderData = await Orders.findOne({
          order_uuid: item.order_uuid,
        });
      }
      if (!orderData) {
        orderData = await PurchaseInvoice.findOne({
          purchase_order_uuid: item.order_uuid,
        });
      }
      let amount = item.details.find(
        (i) => i.ledger_uuid === value.counter_uuid
      ).amount;
      balance += amount;
      result.push({
        ...item,
        amount,
        invoice_number:
          item.invoice_number ||
          orderData?.invoice_number ||
          orderData?.purchase_invoice_number ||
          "",
        voucher_date: orderData?.party_invoice_date || item.voucher_date || "",
        balance,
      });
    }
    if (result.length) {
      return res.json({ success: true, result });
    } else return res.json({ success: false, message: "Ledger Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.post("/getOpeningBalanceReport", async (req, res) => {
  try {
    let { date } = req.body;
    let ledgersData = await Ledger.find(
      {},
      { ledger_uuid: 1, opening_balance: 1, ledger_title: 1 }
    );
    let countersData = await Counters.find(
      {},
      { counter_uuid: 1, opening_balance: 1, counter_title: 1 }
    );
    ledgersData = JSON.parse(JSON.stringify(ledgersData));
    countersData = JSON.parse(JSON.stringify(countersData));
    let result = [];
    for (let item of ledgersData) {
      let opening_balance = item.opening_balance.find((a) => a.date == date);
      if (item.ledger_title)
        result.push({
          ledger_uuid: item.ledger_uuid,
          opening_balance: opening_balance?.amount || 0,
          title: item.ledger_title,
        });
    }
    for (let item of countersData) {
      let opening_balance = item.opening_balance.find((a) => +a.date === +date);
      if (item.opening_balance.length) {
        console.log(item.opening_balance, date, opening_balance);
      }
      if (item.counter_title)
        result.push({
          counter_uuid: item.counter_uuid,
          opening_balance: opening_balance?.amount || 0,
          title: item.counter_title,
        });
    }
    if (result.length) {
      res.json({ success: true, result });
    } else res.json({ success: false, message: "Ledger Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

//update opening balance of ledger or counter
router.put("/updateOpeningBalance", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let response;
    if (value.ledger_uuid) {
      let ledgerData = await Ledger.findOne(
        { ledger_uuid: value.ledger_uuid },
        { opening_balance: 1 }
      );
      opening_balance = ledgerData.opening_balance;
      if (opening_balance.length) {
        let index = opening_balance.findIndex((a) => a.date === value.date);
        if (index > -1) {
          opening_balance[index].amount = value.amount;
        } else {
          opening_balance.push({ amount: value.amount, date: value.date });
        }
      } else {
        opening_balance = [{ amount: value.amount, date: value.date }];
      }
      console.log({ opening_balance });
      response = await Ledger.updateOne(
        { ledger_uuid: value.ledger_uuid },
        {
          $set: {
            opening_balance,
          },
        }
      );
    } else {
      let counterData = await Counters.findOne(
        { counter_uuid: value.counter_uuid },
        { opening_balance: 1 }
      );
      opening_balance = counterData.opening_balance;
      if (opening_balance.length) {
        let index = opening_balance.findIndex((a) => a.date === value.date);
        if (index > -1) {
          opening_balance[index].amount = value.amount;
        } else {
          opening_balance.push({ amount: value.amount, date: value.date });
        }
      } else {
        opening_balance = [{ amount: value.amount, date: value.date }];
      }
      console.log({ opening_balance });
      response = await Counters.updateOne(
        { counter_uuid: value.counter_uuid },
        {
          $set: {
            opening_balance,
          },
        }
      );
    }
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Opening Balance Not Updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
//updateTransactionTags
router.post("/updateTransactionTags", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let response;
    let ledgerData = await Ledger.findOne(
      { ledger_uuid: value.ledger_uuid || value.counter_uuid },
      { transaction_tags: 1, ledger_uuid: 1 }
    );
    if (ledgerData) {
      ledgerData = JSON.parse(JSON.stringify(ledgerData));
      let transaction_tags = [
        ...value.transaction_tags,
        ...(ledgerData.transaction_tags || []),
      ];
      //remove duplicate transaction tags
      transaction_tags = Array.from(new Set(transaction_tags));

      response = await Ledger.updateOne(
        { ledger_uuid: value.ledger_uuid || value.counter_uuid },
        {
          $set: {
            transaction_tags,
          },
        }
      );
    } else {
      let counterData = await Counters.findOne(
        { counter_uuid: value.counter_uuid },
        { transaction_tags: 1 }
      );
      counterData = JSON.parse(JSON.stringify(counterData));
      let transaction_tags = [
        ...value.transaction_tags,
        ...(counterData?.transaction_tags || []),
      ];
      //remove duplicate transaction tags
      transaction_tags = Array.from(new Set(transaction_tags));
      response = await Counters.updateOne(
        { counter_uuid: value.counter_uuid },
        {
          $set: {
            transaction_tags,
          },
        }
      );
    }
    if (response) {
      res.json({ success: true, result: response });
    } else
      res.json({ success: false, message: "Transaction Tags Not Updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
//updateLedgerClosingBalance
router.post("/updateLedgerClosingBalance", async (req, res) => {
  try {
    let { ledger_uuid, counter_uuid, closing_balance } = req.body;
    if (!ledger_uuid && !counter_uuid)
      return res.json({ success: false, message: "Invalid Data" });

    let response;
    if (ledger_uuid) {
      response = await Ledger.updateOne(
        { ledger_uuid: ledger_uuid },
        {
          closing_balance,
        }
      );
    } else {
      response = await Counters.updateOne(
        { counter_uuid: counter_uuid },
        {
          closing_balance,
        }
      );
    }

    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Closing Balance Not Updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

//getAccountingBalanceDetails
router.get("/getAccountingBalanceDetails", async (req, res) => {
  // try {
  let ledgerData = await Ledger.find(
    {},
    {
      ledger_uuid: 1,
      ledger_title: 1,
      opening_balance: 1,
      closing_balance: 1,
    }
  );
  ledgerData = JSON.parse(JSON.stringify(ledgerData));
  let counterData = await Counters.find(
    {},
    {
      counter_uuid: 1,
      counter_title: 1,
      opening_balance: 1,
      closing_balance: 1,
    }
  );
  counterData = JSON.parse(JSON.stringify(counterData));
  let default_opening_balance_date = await Details.findOne(
    {},
    { default_opening_balance_date: 1 }
  );
  default_opening_balance_date =
    default_opening_balance_date.default_opening_balance_date;
  let result = [];
  let AccountingVoucherData = await AccountingVoucher.find(
    {
      "details.ledger_uuid": {
        $in: [
          ...ledgerData.map((a) => a.ledger_uuid),
          ...counterData.map((a) => a.counter_uuid),
        ],
      },
      voucher_date: { $gte: default_opening_balance_date },
    },
    { details: 1 }
  );
  for (let item of ledgerData) {
    let opening_balance =
      item.opening_balance.find((a) => a.date === default_opening_balance_date)
        ?.amount || 0;
    let closing_balance = item.closing_balance || 0;
    let amount = 0;
    for (let voucher of AccountingVoucherData) {
      let detail = voucher.details.find(
        (a) => a.ledger_uuid === item.ledger_uuid
      );
      if (detail) amount += detail.amount;
    }
    if (amount !== closing_balance) {
      result.push({
        ledger_uuid: item.ledger_uuid,
        title: item.ledger_title,
        opening_balance: opening_balance?.amount || 0,
        closing_balance,
        amount,
      });
    }
  }
  for (let item of counterData) {
    let opening_balance =
      item.opening_balance.find((a) => a.date === default_opening_balance_date)
        ?.amount || 0;
    let closing_balance = item.closing_balance || 0;
    let amount = 0;
    for (let voucher of AccountingVoucherData) {
      let detail = voucher.details.find(
        (a) => a.ledger_uuid === item.counter_uuid
      );
      if (detail) amount += detail.amount;
    }
    if (amount !== closing_balance) {
      result.push({
        counter_uuid: item.counter_uuid,
        title: item.counter_title,
        opening_balance: opening_balance?.amount || 0,
        closing_balance,
        amount,
      });
    }
  }
  if (result.length) {
    res.json({ success: true, result });
  } else res.json({ success: false, message: "Ledger Not Found" });
  // } catch (err) {
  //   res.status(500).json({ success: false, message: err });
  // }
});
module.exports = router;
