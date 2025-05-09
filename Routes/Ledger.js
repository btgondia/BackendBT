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
const Item = require("../Models/Item");
const {
  removeCommas,
  truncateDecimals,
  getMidnightTimestamp,
  parseDate,
  updateCounterClosingBalance,
} = require("../utils/helperFunctions");
const PurchaseInvoice = require("../Models/PurchaseInvoice");
const CreditNotes = require("../Models/CreditNotes");

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
    if (response.length) res.json({ success: true, result: response });
    else res.json({ success: false, message: "Ledger Not Found" });
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

    let default_opening_balance_date = await Details.findOne({}, { default_opening_balance_date: 1 });
    default_opening_balance_date = default_opening_balance_date.default_opening_balance_date;

    let response = [];
    let ledgerGroupData = await LedgerGroup.find(
      { ledger_group_uuid: { $in: ledgerData.map((a) => a.ledger_group_uuid) } },
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

    if (response.length) res.json({ success: true, result: response });
    else res.json({ success: false, message: "Ledger Not Found" });
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
    if (/^\d+$/.test(filteredArray[i]) && filteredArray[i].length < 6) {
      // Calculate the number of zeros to add to make the length 6
      const zerosToAdd = 6 - filteredArray[i].length;
      // Prepend the appropriate number of zeros
      let value = "0".repeat(zerosToAdd) + filteredArray[i];
      if (!filteredArray.find((a) => a === value)) {
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
      narrationArray = addZerosToNumericStrings([
        ...narrationArray,
        ...zeroStartedArray,
      ]);
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
      let reciptsData = await Receipts.find(
        {
          pending: 0,
          $or: [
            {
              "modes.mode_uuid": "c67b5794-d2b6-11ec-9d64-0242ac120002",
              "modes.remarks": {
                $in: narrationArray,
              },
            },
            {
              "modes.mode_uuid": "c67b5988-d2b6-11ec-9d64-0242ac120002",
              counter_uuid: countersData.counter_uuid,
            },
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
      //check all recipt order_uuid is valid with order or complete order
      let orderRecipt = [];
      for (let recipt of reciptsData) {
        if (recipt.order_uuid) {
          let orderData = await OrderCompleted.findOne({
            order_uuid: recipt.order_uuid,
          });
          if (!orderData) {
            orderData = await Orders.findOne({
              order_uuid: recipt.order_uuid,
            });
          }
          if (!orderData) {
            orderData = await PurchaseInvoice.findOne({
              purchase_order_uuid: recipt.order_uuid,
            });
          }
          if (orderData) {
            orderRecipt.push(recipt);
          }
        }
      }

      reciptsData = orderRecipt?.find((a) =>
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
        $or: [
          {
            "modes.mode_uuid": "c67b5794-d2b6-11ec-9d64-0242ac120002",
            "modes.remarks": {
              $in: narrationArray,
            },
          },
          {
            "modes.mode_uuid": "c67b5988-d2b6-11ec-9d64-0242ac120002",
            counter_uuid: countersData.counter_uuid,
          },
        ],

        pending: 0,
      });
      if (!allReceiptsData.length)
        allReceiptsData = await Receipts.find({
          counter_uuid: countersData.counter_uuid,
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
        let amount = receipt.modes.find(
          (b) =>
            (b.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" ||
              b.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002") &&
            b.amt
        )?.amt;

        otherReciptsData.push({
          ...receipt,
          ...allCounterData.find(
            (a) => a.counter_uuid === receipt.counter_uuid
          ),
          counter_uuid: receipt.counter_uuid,
          narration: item[getAlphabetIndex(bankStatementItem.narration_column)],
          invoice_number: receipt.invoice_number,
          amount,
        });
      }

      if (reciptsData?.order_uuid) {
        let voucherData = await AccountingVoucher.find({
          order_uuid: reciptsData.order_uuid,
        });
        let existVoucher = voucherData.find((a) =>
          a.details.find((b) => b.ledger_uuid === ledger_uuid)
        );
        value = {
          sr: +bankStatementItem.start_from_line + index,
          reference_no: [reciptsData.invoice_number],
          order_uuid: reciptsData.order_uuid,
          counter_title: countersData.counter_title || "",
          route_title: routeData?.route_title || "",
          counter_uuid: countersData.counter_uuid,
          mode_uuid: reciptsData.modes.find((a) => a.amt === +received_amount)
            .mode_uuid,
          date,
          received_amount,
          paid_amount,
          unMatch: multipleNarration ? true : false,
          ledger_group_uuid: countersData.ledger_group_uuid || "",
          transaction_tags: narrationArray,
          multipleNarration,
          matched_entry: true,
          date_time_stamp,
          narration: item[getAlphabetIndex(bankStatementItem.narration_column)],
          existVoucher: multipleNarration ? true : existVoucher ? true : false,
        };
      } else if (otherReciptsData.length) {
        otherReciptsData = JSON.parse(JSON.stringify(otherReciptsData));
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
          unMatch:
            otherReciptsData.reduce((a, b) => a + b.amount, 0) ===
            +received_amount
              ? false
              : true,
          transaction_tags: narrationArray,
          multipleNarration,
          otherCheckReciptsData:
            otherReciptsData.reduce((a, b) => a + b.amount, 0) ===
            +received_amount
              ? otherReciptsData.map((a) => ({
                  ...a,
                  checked: true,
                }))
              : otherReciptsData,
          mode_uuid: "c67b5794-d2b6-11ec-9d64-0242ac120002",
          date_time_stamp,
          narration: item[getAlphabetIndex(bankStatementItem.narration_column)],
        };
      } else if (countersData.counter_uuid || countersData.ledger_uuid) {
        {
          let otherReciptsData = await Receipts.find(
            {
              counter_uuid: {
                $in: (multipleNarration || []).map((a) => a.counter_uuid),
              },
              pending: 0,
            },
            {
              invoice_number: 1,
              modes: 1,
              counter_uuid: 1,
            }
          );

          otherReciptsData =
            otherReciptsData?.map((a) => ({
              invoice_number: a.invoice_number,
              amount: a.modes.find(
                (b) => b.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
              ).amt,
              counter_uuid: a.counter_uuid,
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
            narration:
              item[getAlphabetIndex(bankStatementItem.narration_column)],
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

router.post("/getOtherReceiptsData", async (req, res) => {
  try {
    let { counter_uuid, narration } = req.body;
    let otherReciptsData = [];

    let allReceiptsData = await Receipts.find({
      counter_uuid,
      pending: 0,
    });

    allReceiptsData = JSON.parse(JSON.stringify(allReceiptsData));
    let allCounterData = await Counters.find(
      {
        counter_uuid,
      },
      { counter_title: 1, counter_uuid: 1 }
    );
    allCounterData = JSON.parse(JSON.stringify(allCounterData));
    for (let receipt of allReceiptsData) {
      otherReciptsData.push({
        ...receipt,
        ...allCounterData.find((a) => a.counter_uuid === receipt.counter_uuid),
        counter_uuid: receipt.counter_uuid,
        narration,
        invoice_number: receipt.invoice_number,
        amount: receipt.modes.find(
          (b) => b.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002"
        ).amt,
      });
    }
    if (otherReciptsData.length) {
      res.json({ success: true, result: otherReciptsData });
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

    let oldAccountingVoucher = await AccountingVoucher.find({
      "details.ledger_uuid": value.counter_uuid || value.ledger_uuid,
      //has voucher_Date exist
      $or: [
        {
          voucher_date: {
            $gte: default_opening_balance_date.default_opening_balance_date,
            $lte: value.startDate,
          },
        },
      ],
    });

    let balance = opening_balance?.amount || 0;

    for (let item of oldAccountingVoucher) {
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
        { voucher_date: { $gte: value.startDate, $lte: endDate } },

        {
          voucher_date: 0,
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
        voucher_date: item.voucher_date || orderData?.party_invoice_date || "",
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
router.get("/getDebitCreditAccountingBalanceDetails", async (req, res) => {
  try {
    let voucherData = await AccountingVoucher.find(
      {},
      {
        voucher_date: 1,
        voucher_number: 1,
        voucher_type: 1,
        details: 1,
        amt: 1,
      }
    );
    voucherData = JSON.parse(JSON.stringify(voucherData));
    let vouchers = [];
    for (let item of voucherData) {
      let credit = 0;
      let debit = 0;

      for (let detail of item.details) {
        if (+detail.amount < 0) {
          debit = +debit + +detail.amount;
          debit = +debit.toFixed(4);
        } else {
          credit = +credit + +detail.amount;
          credit = +credit.toFixed(4);
        }
      }
      if (Math.abs(debit) !== Math.abs(credit)) {
        vouchers.push({
          voucher_date: item.voucher_date,
          voucher_number: item.voucher_number,
          amt: item.amt,
          debit,
          credit,
        });
      }
    }

    if (vouchers.length) {
      res.json({ success: true, result: vouchers });
    } else {
      res.json({ success: false, message: "Ledger Not Found" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
let sale_ledger_list = [
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
router.get("/getGSTErrorDetails", async (req, res) => {
  try {
    let opening_balance_date = await Details.findOne(
      {},
      { default_opening_balance_date: 1 }
    );
    let default_opening_balance_date =
      opening_balance_date.default_opening_balance_date;

    let voucherData = await AccountingVoucher.find(
      {
        type: "SALE_ORDER",
        voucher_date: { $gte: default_opening_balance_date },
      },
      {
        voucher_date: 1,
        voucher_number: 1,
        voucher_type: 1,
        details: 1,
        amt: 1,
        accounting_voucher_number: 1,
        accounting_voucher_uuid: 1,
        invoice_number: 1,
      }
    );
    voucherData = JSON.parse(JSON.stringify(voucherData));
    let counterData = await Counters.find(
      {
        counter_uuid: {
          $in: voucherData
            .map((a) => a.details.map((b) => b.ledger_uuid))
            .flat(),
        },
      },
      { counter_uuid: 1, gst: 1, counter_title: 1 }
    );
    counterData = JSON.parse(JSON.stringify(counterData));
    let vouchers = [];
    for (let item of voucherData) {
      let counter = counterData.find((a) =>
        item.details.find((b) => b.ledger_uuid === a.counter_uuid)
      );
      let gst_number = counter?.gst;

      let central_sale_ledger = item.details.find((a) =>
        sale_ledger_list.find((b) => b.central_sale_ledger === a.ledger_uuid)
      );
      let local_sale_ledger = item.details.find((a) =>
        sale_ledger_list.find((b) => b.local_sale_ledger === a.ledger_uuid)
      );

      let C3 = !gst_number && central_sale_ledger;
      let C1 = gst_number?.startsWith("27") && central_sale_ledger;
      let C2 = gst_number && !gst_number?.startsWith("27") && local_sale_ledger;
      let Gst_error = C1 || C2 || C3;

      if (Gst_error) {
        vouchers.push({
          voucher_date: item.voucher_date,
          voucher_number: item.voucher_number,

          ledger_uuid: counter.counter_uuid,
          title: counter.counter_title,
          error_type: C1 ? "C1" : C2 ? "C2" : C3 ? "C3" : "",
          accounting_voucher_number: item.accounting_voucher_number,
          accounting_voucher_uuid: item.accounting_voucher_uuid,
          invoice_number: item.invoice_number,
        });
      }
    }

    if (vouchers.length) {
      res.json({ success: true, result: vouchers });
    } else {
      res.json({ success: false, message: "Ledger Not Found" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
const createAccountingVoucher = async ({
  order,
  type,
  voucher_date = new Date().getTime(),
  created_at = new Date().getTime(),
}) => {
  let counterData = await Counters.findOne(
    { counter_uuid: order.counter_uuid },
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

    if (amt && value) {
      let ledger = sale_ledger_list.find((b) => b.value === a) || {};
      arr.push({
        narration: `Sales Invoice ${order.invoice_number}`,
        amount: (amt - value).toFixed(3),
        ledger_uuid: isGst
          ? ledger?.central_sale_ledger
          : ledger?.local_sale_ledger,
      });
      if (isGst) {
        arr.push({
          narration: `Sales Invoice ${order.invoice_number}`,
          amount: value,
          ledger_uuid: ledger?.sale_igst_ledger,
        });
      } else {
        for (let item of ledger?.ledger_uuid || []) {
          narration: `Sales Invoice ${order.invoice_number}`,
            arr.push({
              amount: truncateDecimals(value / 2, 2),
              ledger_uuid: item,
            });
        }
      }
    }
  }
  let prevCreditNote = await CreditNotes.findOne(
    {
      credit_notes_invoice_number: `CN-${order.invoice_number}`,
    },
    { credit_note_order_uuid: 1, credit_notes_invoice_number: 1 }
  );
  if (prevCreditNote) {
    await CreditNotes.deleteOne({
      credit_note_order_uuid: prevCreditNote.credit_note_order_uuid,
    });
    let voucherData = await AccountingVoucher.find({
      $or: [
        { invoice_number: prevCreditNote.credit_notes_invoice_number },
        { order_uuid: prevCreditNote.credit_note_order_uuid },
      ],
      type:"CREDIT_NOTE",
    });
    if (voucherData.length) {
      for (let voucher of voucherData){
        await updateCounterClosingBalance(voucher.details, "delete");
      }
        
      await AccountingVoucher.deleteMany({
        $or: [
          { invoice_number: prevCreditNote?.credit_notes_invoice_number },
          { order_uuid: prevCreditNote?.credit_note_order_uuid },
        ],
        type:"CREDIT_NOTE",
      });
    }
  }
  
  if (order?.replacement || order?.shortage || order?.adjustment) {
    await createAutoCreditNote(
      order,
      gst
        ? "7605d5e9-8165-46aa-8899-5c2d40622d30"
        : "d68051cc-573d-4721-b42e-bd226157268b",
      voucher_date
    );
  }
  let total = 0;
  for (let item of order.item_details) {
    total = +item.item_total + +total;
    total = total.toFixed(2);
  }
  if (order?.chargesTotal || 0) {
    arr.push({
      narration: `Sales Invoice ${order.invoice_number}`,
      amount: -order.chargesTotal,
      ledger_uuid: "5350c03e-fea5-4366-a09e-53131552e075",
    });
  }
  let order_total =
    +(order.order_grandtotal || 0) +
    +(order?.replacement || 0) +
    +(order?.shortage || 0) +
    +(order?.coin || 0) +
    +(order?.adjustment || 0);
  if (order.coin) {
    arr.push({
      narration: `Sales Invoice ${order.invoice_number}`,
      amount: order.coin.toFixed(2),
      ledger_uuid: "fc3ad018-b26a-4608-8e16-da1b7117e3e8",
    });
  }
  arr.push({
    narration: `Sales Invoice ${order.invoice_number}`,
    amount: (order_total - total).toFixed(2),
    ledger_uuid: "20327e4d-cd6b-4a64-8fa4-c4d27a5c39a0",
  });
  arr.push({
    narration: `Sales Invoice ${order.invoice_number}`,
    ledger_uuid: order.counter_uuid,
    amount: -order_total || 0,
  });
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
      narration: `Sales Invoice ${order.invoice_number}`,
      ledger_uuid: "ebab980c-4761-439a-9139-f70875e8a298",
      amount: -(voucher_round_off || 0).toFixed(3),
    });
  }

  let voucher_difference = 0;
  for (let item of arr) {
    voucher_difference = +voucher_difference + +item.amount;
    voucher_difference = +voucher_difference.toFixed(2);
  }
  const voucher = {
    accounting_voucher_uuid: uuid(),
    type: type,
    voucher_date,
    user_uuid: order.user_uuid,
    counter_uuid: order.counter_uuid,
    order_uuid: order.order_uuid,
    invoice_number: order.invoice_number,
    amount: order.order_grandtotal,
    voucher_verification: voucher_difference ? 1 : 0,
    voucher_difference,
    details: arr,
    created_at,
  };
  await AccountingVoucher.create(voucher);
  await updateCounterClosingBalance(arr, "add");
};
const createAutoCreditNote = async (
  order,
  item_uuid,
  voucher_date = new Date().getTime()
) => {
  let price =
    +(order.replacement || 0) +
    +(order.shortage || 0) +
    +(order.adjustment || 0);
  let narration =
    (order.replacement ? "Replacement: " + order.replacement : "") +
    (order.shortage ? " Shortage: " + order.shortage : "") +
    (order.adjustment ? " Adjustment: " + order.adjustment : "");
  let item = await Item.findOne({ item_uuid },{conversion:1, item_gst: 1,item_title:1, item_hsn:1,item_uuid :1,item_css:1});
  item = JSON.parse(JSON.stringify(item));
  item = { ...item, item_total: 0 };

  item = {
    ...item,
    b: 1,
    price: price / +(item.conversion || 1),
    item_total: price,
  };

  let order_grandtotal = Math.round(price);
  let credit_note_order_uuid = uuid();

  await CreditNotes.create({
    ...order,
    order_grandtotal,
    old_grandtotal: order_grandtotal,
    item_details: [item],
    credit_note_order_uuid,
    ledger_uuid: order.counter_uuid,
    credit_notes_invoice_date: voucher_date,
    credit_notes_invoice_number: `CN-${order.invoice_number}`,
  });
  await createCreditNotAccountingVoucher(
    {
      ...order,
      order_grandtotal,
      item_details: [item],
      credit_note_order_uuid,
      ledger_uuid: order.counter_uuid,
      voucher_date,
    },
    "CREDIT_NOTE",
    narration
  );
};
const createCreditNotAccountingVoucher = async (order, type, narration) => {
  let counterData = await Counters.findOne(
    { counter_uuid: order.counter_uuid },
    { gst: 1 }
  );
  let gst = counterData?.gst || "";
  //check is gst starts with 27
  let isGst = gst?.startsWith("27") || !gst ? false : true;

  let arr = [];
  // const gst_value = Array.from(
  //   new Set(order.item_details.map((a) => +a.gst_percentage))
  // );

  // for (let a of gst_value) {
  const data = +order.item_details[0]?.item_gst || 0;
  let amt = order.item_details[0]?.item_total || 0;

  const value = (+amt - (+amt * 100) / (100 + data)).toFixed(2);
  if (amt && value) {
    let ledger = sale_ledger_list.find((b) => b.value === data) || {};
    arr.push({
      amount: -(amt - value).toFixed(3),
      ledger_uuid: isGst
        ? ledger?.central_purchase_ledger
        : ledger?.local_sale_ledger,
      narration,
    });
    if (isGst) {
      arr.push({
        amount: -value,
        ledger_uuid: ledger?.sale_igst_ledger,
        narration,
      });
    } else
      for (let item of ledger?.ledger_uuid || []) {
        arr.push({
          amount: -truncateDecimals(value / 2, 2),
          ledger_uuid: item,
          narration,
        });
      }
  }
  // }
  let round_off = order.round_off || 0;
  if (round_off)
    arr.push({
      amount: -round_off,
      ledger_uuid: "20327e4d-cd6b-4a64-8fa4-c4d27a5c39a0",
      narration,
    });
  arr.push({
    ledger_uuid: order.counter_uuid || order.ledger_uuid,
    amount: order.order_grandtotal || 0,
    narration,
  });

  for (let item of order.deductions || []) {
    arr.push({
      ledger_uuid: item.ledger_uuid,
      amount: -item.amount,
      narration,
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
      narration,
    });
  }
  let voucher_difference = 0;
  for (let item of arr) {
    voucher_difference = +voucher_difference + +item.amount;
    voucher_difference = +voucher_difference.toFixed(2);
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
    details: arr,
    created_at: new Date().getTime(),
  };
  await AccountingVoucher.create(voucher);
  await updateCounterClosingBalance(arr, "add");
};

router.post("/removeGSTError", async (req, res) => {
  // try {
  let success = 0;
  let failed = 0;
  let value = req.body;
  if (!value) return res.json({ success: false, message: "Invalid Data" });
  for (let item of value) {
    let voucherData = await AccountingVoucher.findOne({
      accounting_voucher_uuid: item,
    });
    if (voucherData) {
      voucherData = JSON.parse(JSON.stringify(voucherData));
      if (voucherData) {
        let order = await OrderCompleted.findOne({
          order_uuid: voucherData.order_uuid,
        });

        await updateCounterClosingBalance(voucherData.details, "delete");
        await AccountingVoucher.deleteMany({
          accounting_voucher_uuid: item,
        });
        await createAccountingVoucher({
          order,
          type: "SALE_ORDER",
          voucher_date: voucherData.voucher_date,
          created_at: voucherData.created_at,
        });
      }
      success++;
    } else {
      failed++;
    }
  }

  res.json({ success: true, message: "GST Error Removed", success, failed });
  // } catch (err) {
  //   res.status(500).json({ success: false, message: err.message });
  // }
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
          { voucher_date: 0 },
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

      opening_balance = opening_balance?.amount || 0;
      if (amount !== closing_balance) {
        result.push({
          ledger_uuid: item.counter_uuid,
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

router.put("/fixeBalance", async (req, res) => {
  try {
    let success = 0;
    let failed = 0;
    for (let value of req.body) {
      
      let ledgerData = await Ledger.findOne(
        { ledger_uuid: value.ledger_uuid },
        { opening_balance: 1 }
      );
      let response;
      if (ledgerData)
        response = await Ledger.updateOne(
          { ledger_uuid: value.ledger_uuid },
          {
            closing_balance: value.amount,
          }
        );
      else {
        response = await Counters.updateOne(
          { counter_uuid: value.ledger_uuid },
          {
            closing_balance: value.amount,
          }
        );
      }
      if (response.acknowledged) success++;
      else failed++;
    }
    res.json({ success: true, success, failed });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
