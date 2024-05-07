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
const {
  removeCommas,
  truncateDecimals,
  getMidnightTimestamp,
  parseDate,
} = require("../utils/helperFunctions");
const PurchaseInvoice = require("../Models/PurchaseInvoice");
const { all } = require("./Orders");

router.get("/getLedgerClosingBalance", async (req, res) => {
  try {
    let ledgerData = await Ledger.find(
      {},
      {
        closing_balance: 1,
        ledger_uuid: 1,
        ledger_group_uuid: 1,
        ledger_title: 1,
        opening_balance: 1,
      }
    );
    ledgerData = JSON.parse(JSON.stringify(ledgerData));
    let counterData = await Counters.find(
      { status: { $ne: 0 } },
      {
        closing_balance: 1,
        counter_uuid: 1,
        route_uuid: 1,
        counter_title: 1,
        opening_balance: 1,
      }
    );
    counterData = JSON.parse(JSON.stringify(counterData));
    let default_opening_balance_date = await Details.findOne(
      {},
      { default_opening_balance_date: 1 }
    );
    default_opening_balance_date =
      default_opening_balance_date.default_opening_balance_date;
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
        opening_balance:
          item.opening_balance.find(
            (a) =>
              getMidnightTimestamp(+a.date) === default_opening_balance_date
          )?.amount || 0,
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
        ledger_group_title: "Sundry Debtors",
        opening_balance:
          item.opening_balance.find(
            (a) =>
              getMidnightTimestamp(+a.date) === default_opening_balance_date
          )?.amount || 0,
      });
    }
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Ledger Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getLedgerCounterTagsList", async (req, res) => {
  try {
    let ledgerData = await Ledger.find(
      {},
      {
        closing_balance: 1,
        ledger_uuid: 1,
        ledger_group_uuid: 1,
        ledger_title: 1,
        opening_balance: 1,
        transaction_tags: 1,
      }
    );
    ledgerData = JSON.parse(JSON.stringify(ledgerData));
    let counterData = await Counters.find(
      { status: { $ne: 0 } },
      {
        closing_balance: 1,
        counter_uuid: 1,
        route_uuid: 1,
        counter_title: 1,
        opening_balance: 1,
        transaction_tags: 1,
      }
    );
    counterData = JSON.parse(JSON.stringify(counterData));
    let default_opening_balance_date = await Details.findOne(
      {},
      { default_opening_balance_date: 1 }
    );
    default_opening_balance_date =
      default_opening_balance_date.default_opening_balance_date;
    let response = [];
    let ledgerGroupData = await LedgerGroup.find(
      {
        ledger_group_uuid: { $in: ledgerData.map((a) => a.ledger_group_uuid) },
      },
      { ledger_group_title: 1, ledger_group_uuid: 1 }
    );
    for (let item of ledgerData) {
      if (!item.ledger_uuid || !item.transaction_tags?.length) continue;
      let ledger_group_title =
        ledgerGroupData.find(
          (a) => a.ledger_group_uuid === item.ledger_group_uuid
        )?.ledger_group_title || "";
      response.push({
        ledger_uuid: item.ledger_uuid,
        closing_balance: item.closing_balance,
        transaction_tags: item.transaction_tags,
        ledger_group_title,
        title: item.ledger_title,
        opening_balance:
          item.opening_balance.find(
            (a) =>
              getMidnightTimestamp(+a.date) === default_opening_balance_date
          )?.amount || 0,
      });
    }
    let routeData = await Routes.find(
      { route_uuid: { $in: counterData.map((a) => a.route_uuid) } },
      { route_title: 1, route_uuid: 1 }
    );
    for (let item of counterData) {
      if (!item.counter_uuid || !item.transaction_tags?.length) continue;
      let route_title =
        routeData.find((a) => a.route_uuid === item.route_uuid)?.route_title ||
        "";

      response.push({
        counter_uuid: item.counter_uuid,
        closing_balance: item.closing_balance,
        transaction_tags: item.transaction_tags,
        route_title,
        title: item.counter_title,
        ledger_group_title: "Sundry Debtors",
        opening_balance:
          item.opening_balance.find(
            (a) =>
              getMidnightTimestamp(+a.date) === default_opening_balance_date
          )?.amount || 0,
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
              getMidnightTimestamp(+a.date) ===
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
function addZerosToNumericStrings(arr) {
  // Filter out elements longer than 5 characters
  const filteredArray = arr;

  // Iterate through the filtered array
  for (let i = 0; i < filteredArray.length; i++) {
      
      if (/^\d+$/.test(filteredArray[i])&&filteredArray[i].length<6) {
          // Calculate the number of zeros to add to make the length 6
          const zerosToAdd = 6 - filteredArray[i].length;
          // Prepend the appropriate number of zeros
          let value = "0".repeat(zerosToAdd) + filteredArray[i];
          if(!filteredArray.find((a)=>a===value)){
            filteredArray.push(value);
          }
      }
  }

  return filteredArray;
}

router.post("/getExcelDetailsData", async (req, res) => {
  try {
    let { array, ledger_uuid } = req.body;

    let bankStatementItem = await Details.findOne(
      {},
      { bank_statement_item: 1 }
    );
    bankStatementItem = bankStatementItem.bank_statement_item;
    let arrayData = array.slice(
      bankStatementItem.start_from_line - 1,
      array.length
    );

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
      narrationArray = addZerosToNumericStrings([...narrationArray, ...zeroStartedArray]);
      narrationArray = Array.from(new Set(narrationArray));
      console.log({narrationArray})
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

      let reciptsData = await Receipts.find(
        {
          $or: [
            { counter_uuid: countersData.counter_uuid },
            {
              "modes.remarks": {
                $in: narrationArray,
              },
            },
          ],
          pending: 0,
          $or: [
            { "modes.mode_uuid": "c67b5794-d2b6-11ec-9d64-0242ac120002" },
            { "modes.mode_uuid": "c67b5988-d2b6-11ec-9d64-0242ac120002" },
          ],
          "modes.amt": received_amount,
        },
        {
          invoice_number: 1,
          order_uuid: 1,
          counter_uuid: 1,
          modes: 1,
        }
      );
      
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
      if (countersData?.route_uuid) {
        routeData = await Routes.findOne(
          {
            route_uuid: countersData.route_uuid,
          },
          {
            route_title: 1,
          }
        );
      }
      let date = item[getAlphabetIndex(bankStatementItem.data_column)];
      if (typeof date === "number") {
        date = new Date((date - (25567 + 1)) * 86400 * 1000);

        date = "dd/mm/yyyy"
          .replace("dd", ("00" + (date?.getMonth() + 1)?.toString()).slice(-2))
          .replace("yyyy", ("0000" + date?.getFullYear()?.toString()).slice(-4))
          .replace("mm", ("00" + (date?.getDate() - 1)?.toString()).slice(-2));

        date = parseDate(date, bankStatementItem.date_column);
      } else {
        // Date string in the format "31-05-2024"

        let dateString = date;
        // Split the date string into day, month, and year components
        var parts = dateString.split("-");
        // Rearrange the parts into the "yyyy-mm-dd" format
        var rearrangedDateString = parts[2] + "-" + parts[1] + "-" + parts[0];

        // Convert the rearranged date string to a timestamp
        var timestamp = Date.parse(rearrangedDateString);
        date = new Date(timestamp);
      }

      let date_time_stamp = getMidnightTimestamp(date);
      date = bankStatementItem.date_column
        .replace("mm", ("00" + (date?.getMonth() + 1)?.toString()).slice(-2))
        .replace("yyyy", ("0000" + date?.getFullYear()?.toString()).slice(-4))
        .replace("yy", ("0000" + date?.getFullYear()?.toString()).slice(-2))
        .replace("dd", ("00" + date?.getDate()?.toString()).slice(-2));
      let value;
      let otherReciptsData = [];

      let allReceiptsData = await Receipts.find({
        "modes.remarks": { $in: narrationArray },
        pending: 0,
      });

      

      allReceiptsData = JSON.parse(JSON.stringify(allReceiptsData));
      let allCounterData = await Counters.find(
        {
          counter_uuid: { $in: allReceiptsData.map((a) => a.counter_uuid) },
        },
        { counter_title: 1, counter_uuid: 1 }
      );
      allCounterData = JSON.parse(JSON.stringify(allCounterData));
      for (let receipt of allReceiptsData) {
        otherReciptsData.push({
          ...receipt,
          ...allCounterData.find(
            (a) => a.counter_uuid === receipt.counter_uuid
          ),
          narration: item[getAlphabetIndex(bankStatementItem.narration_column)],
          invoice_number: receipt.invoice_number,
          amount: receipt.modes.find(
            (b) => b.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002"
          ).amt,
        });
      }

      if (reciptsData?.order_uuid)
        value = {
          sr: +bankStatementItem.start_from_line + index,
          reference_no: [reciptsData.invoice_number],
          order_uuid: reciptsData.order_uuid,
          counter_title: countersData.counter_title || "",
          route_title: routeData?.route_title || "",
          counter_uuid: countersData.counter_uuid,
          mode_uuid:
            ledger_uuid === "6fb56620-fb72-4e35-bd66-b439c78a4d2e"
              ? "c67b5794-d2b6-11ec-9d64-0242ac120002"
              : "c67b5988-d2b6-11ec-9d64-0242ac120002",
          date,
          received_amount,
          paid_amount,
          unMatch: multipleNarration ? true : false,
          ledger_group_uuid: countersData.ledger_group_uuid || "",
          transaction_tags: narrationArray,
          multipleNarration,
          matched_entry: true,
          date_time_stamp,
        };
      else if (otherReciptsData.length) {
        value = {
          sr: +bankStatementItem.start_from_line + index,
          reference_no: "",
          counter_title: "",
          route_title: "",
          counter_uuid: "",
          ledger_group_uuid: "",
          multipleCounter: true,
          date,
          received_amount,
          paid_amount,
          unMatch: true,
          transaction_tags: narrationArray,
          multipleNarration,
          otherReciptsData,
          mode_uuid: "c67b5794-d2b6-11ec-9d64-0242ac120002",
          date_time_stamp,
        };
      } else if (countersData.counter_uuid || countersData.ledger_uuid) {
        {
          let otherReciptsData = await Receipts.find(
            {
              counter_uuid:
                countersData.counter_uuid || countersData.ledger_uuid,
              pending: 0,
            },
            {
              invoice_number: 1,
              modes: 1,
            }
          );

          otherReciptsData =
            otherReciptsData?.map((a) => ({
              invoice_number: a.invoice_number,
              amount: a.modes.find(
                (b) => b.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
              ).amt,
            })) || [];
          value = {
            sr: +bankStatementItem.start_from_line + index,
            reference_no: "",
            counter_title:
              countersData.counter_title || countersData.ledger_title || "",
            route_title: routeData?.route_title || "",
            counter_uuid: countersData.counter_uuid || countersData.ledger_uuid,
            ledger_group_uuid: countersData.ledger_group_uuid || "",
            date,
            received_amount,
            paid_amount,
            unMatch: true,
            transaction_tags: narrationArray,
            multipleNarration,
            otherReciptsData,
            mode_uuid: "c67b5988-d2b6-11ec-9d64-0242ac120002",
            date_time_stamp,
          };
        }
      } else {
        value = {
          sr: +bankStatementItem.start_from_line + index,
          reference_no: "",
          counter_title: "",
          route_title: "",
          received_amount,
          paid_amount,
          unMatch: true,
          transaction_tags: narrationArray,
          ledger_group_uuid: countersData.ledger_group_uuid || "",
          narration,
          date,
          date_time_stamp,
        };
      }
      
      data.push(value);
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
          getMidnightTimestamp(+a.date) ===
          default_opening_balance_date.default_opening_balance_date
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
      //has voucher_Date exist
      voucher_date: { $ne: "" },
      voucher_date: {
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
      $or: [
        { voucher_date: { $gte: value.startDate, $lte: endDate } },
        {
          voucher_date: "",
        },
      ],
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

      result.push({
        ...item,
        amount,
        invoice_number:
          item.recept_number ||
          item.invoice_number ||
          orderData?.invoice_number ||
          orderData?.purchase_invoice_number ||
          "",
        voucher_date: orderData?.party_invoice_date || item.voucher_date || "",
      });
    }
    if (result.length) {
      return res.json({
        success: true,
        result,
        opening_balance: opening_balance?.amount || 0,
        oldBalance: balance,
      });
    } else return res.json({ success: false, message: "Ledger Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.post("/getOpeningBalanceReport", async (req, res) => {
  try {
    let { date } = req.body;
    date = date ? getMidnightTimestamp(+date) : 0;
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
      let opening_balance =
        +date === 0
          ? item.opening_balance.filter((a) => a.amount)
          : item.opening_balance.find(
              (a) => getMidnightTimestamp(+a.date) == date
            );
      if (item.ledger_title && (+date !== 0 || opening_balance.length))
        result.push({
          ledger_uuid: item.ledger_uuid,
          opening_balance:
            +date === 0 ? opening_balance : opening_balance?.amount || 0,
          title: item.ledger_title,
        });
    }
    for (let item of countersData) {
      let opening_balance =
        +date === 0
          ? item.opening_balance.filter((a) => a.amount)
          : item.opening_balance.find((a) => a.date == date);

      if (item.counter_title && (+date !== 0 || opening_balance.length))
        result.push({
          counter_uuid: item.counter_uuid,
          opening_balance:
            +date === 0 ? opening_balance : opening_balance?.amount || 0,
          title: item.counter_title,
        });
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

//update opening balance of ledger or counter
router.put("/updateOpeningBalance", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { date, opening_balance: amount } = value;
    date = date === 0 ? 0 : getMidnightTimestamp(+date);
    let response;
    if (value.ledger_uuid) {
      let ledgerData = await Ledger.findOne(
        { ledger_uuid: value.ledger_uuid },
        { opening_balance: 1 }
      );
      opening_balance =
        +date === 0 ? amount : ledgerData?.opening_balance || [];
      if (+date !== 0) {
        if (opening_balance.length) {
          let index = opening_balance.findIndex((a) => +a.date === +date);
          if (index > -1) {
            opening_balance[index].amount = amount;
          } else {
            opening_balance.push({
              amount: amount,
              date,
            });
          }
        } else {
          opening_balance = [{ amount: amount, date }];
        }
      }

      response = await Ledger.updateOne(
        { ledger_uuid: value.ledger_uuid },
        {
          opening_balance,
        }
      );
    } else {
      let counterData = await Counters.findOne(
        { counter_uuid: value.counter_uuid },
        { opening_balance: 1 }
      );
      opening_balance =
        +date === 0 ? amount : counterData?.opening_balance || [];
      if (+date !== 0) {
        if (opening_balance.length) {
          let index = opening_balance.findIndex((a) => +a.date === +date);
          if (index > -1) {
            opening_balance[index].amount = amount;
          } else {
            opening_balance.push({
              amount: amount,
              date,
            });
          }
        } else {
          opening_balance = [{ amount: amount, date }];
        }
      }

      response = await Counters.updateOne(
        { counter_uuid: value.counter_uuid },
        {
          opening_balance,
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
router.post("/updateLedgerTransitionTags", async (req, res) => {
  try {
    let { ledger_uuid, counter_uuid, transaction_tags } = req.body;
    if (!ledger_uuid && !counter_uuid)
      return res.json({ success: false, message: "Invalid Data" });

    let response;
    if (ledger_uuid) {
      response = await Ledger.updateOne(
        { ledger_uuid: ledger_uuid },
        {
          transaction_tags,
        }
      );
    } else {
      response = await Counters.updateOne(
        { counter_uuid: counter_uuid },
        {
          transaction_tags,
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
  try {
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
        $or: [
          { voucher_date: { $gte: default_opening_balance_date } },
          { voucher_date: "" },
        ],
      },
      { details: 1 }
    );
    for (let item of ledgerData) {
      let opening_balance =
        item.opening_balance.find(
          (a) => getMidnightTimestamp(+a.date) === default_opening_balance_date
        )?.amount || 0;
      let closing_balance = item.closing_balance || 0;
      let amount = 0;
      for (let voucher of AccountingVoucherData) {
        let detail = voucher.details.find(
          (a) => a.ledger_uuid === item.ledger_uuid
        );
        if (detail) {
          amount = +detail.amount + +amount;
          amount = amount.toFixed(2);
        }
      }
      amount = truncateDecimals(amount, 2);
      closing_balance = truncateDecimals(closing_balance, 2);
      opening_balance = truncateDecimals(opening_balance?.amount || 0, 2);
      if (amount !== closing_balance) {
        result.push({
          ledger_uuid: item.ledger_uuid,
          title: item.ledger_title,
          opening_balance,
          closing_balance,
          amount,
        });
      }
    }
    for (let item of counterData) {
      let opening_balance =
        item.opening_balance.find(
          (a) => getMidnightTimestamp(+a.date) === default_opening_balance_date
        )?.amount || 0;
      let closing_balance = item.closing_balance || 0;
      let amount = 0;
      for (let voucher of AccountingVoucherData) {
        let detail = voucher.details.find(
          (a) => a.ledger_uuid === item.counter_uuid
        );
        if (detail) amount += detail.amount;
      }
      amount = truncateDecimals(amount, 2);
      closing_balance = truncateDecimals(closing_balance, 2);
      opening_balance = truncateDecimals(opening_balance?.amount || 0, 2);
      if (amount !== closing_balance) {
        result.push({
          counter_uuid: item.counter_uuid,
          title: item.counter_title,
          opening_balance,
          closing_balance,
          amount,
        });
      }
    }

    if (result.length) {
      res.json({ success: true, result });
    } else res.json({ success: false, message: "Ledger Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
