const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Details = require("../Models/Details");
const Item = require("../Models/Item");
const AccountingVoucher = require("../Models/AccountingVoucher");

const Vochers = require("../Models/Vochers");
const {
  updateCounterClosingBalance,
  increaseNumericString,
  truncateDecimals,
} = require("../utils/helperFunctions");
const PurchaseInvoice = require("../Models/PurchaseInvoice");
const Counters = require("../Models/Counters");
const Ledger = require("../Models/Ledger");
const Receipts = require("../Models/Receipts");
const OrderCompleted = require("../Models/OrderCompleted");
const CreditNotes = require("../Models/CreditNotes");
const Users = require("../Models/Users");
const Orders = require("../Models/Orders");
const Routes = require("../Models/Routes");

//get all accounting vouchers voucher_date = ""
router.get("/getUnknownVouchers", async (req, res) => {
  // try {
  let data = await AccountingVoucher.find({ voucher_date: 0 });
  data = JSON.parse(JSON.stringify(data));
  let result = [];
  for (let item of data) {
    let amt = 0;
    for (let detail of item.details) {
      if (detail.amount > 0) amt += +detail.amount;
    }
    let ledgerData = await Ledger.find(
      {
        ledger_uuid: { $in: item.details.map((a) => a.ledger_uuid) },
      },
      { ledger_title: 1, ledger_uuid: 1 }
    );

    let counterData = await Counters.find(
      {
        counter_uuid: { $in: item.details.map((a) => a.ledger_uuid) },
      },
      { counter_title: 1, counter_uuid: 1 }
    );
    ledgerData = JSON.parse(JSON.stringify(ledgerData));
    counterData = JSON.parse(JSON.stringify(counterData));
    let ledger_title = [
      ...(counterData?.map((a) => a.counter_title) || []),
      ...(ledgerData?.map((a) => a.ledger_title) || []),
    ].join(",");
    result.push({
      ...item,
      amt: amt || item.amt,
      ledger_title,
      reference_no: item.invoice_number.length
        ? item.invoice_number.join(",")
        : item.recept_number || "",
    });
  }

  if (result.length) res.json({ success: true, result });
  else res.json({ success: false, message: "AccountVoucher Not found" });
  // } catch (err) {
  //   res.status(500).json({ success: false, message: err });
  // }
});

//change accounting voucher date in bulk
router.put("/updateAccountVoucherDate", async (req, res) => {
  try {
    let { accounting_voucher_uuid, voucher_date } = req.body;
    console.log({ accounting_voucher_uuid, voucher_date });
    let response = await AccountingVoucher.updateMany(
      { accounting_voucher_uuid: { $in: accounting_voucher_uuid } },
      { voucher_date }
    );
    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "AccountVoucher Not Updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.post("/postAccountVoucher", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let next_accounting_voucher_number = await Details.find({});

    next_accounting_voucher_number =
      next_accounting_voucher_number[0].next_accounting_voucher_number;

    value = {
      ...value,
      accounting_voucher_uuid: value.accounting_voucher_uuid || uuid(),
      accounting_voucher_number: next_accounting_voucher_number,
    };
    console.log(value);
    await updateCounterClosingBalance(value.details, "add");
    let response = await AccountingVoucher.create(value);
    if (response) {
      await Details.updateMany(
        {},
        {
          next_accounting_voucher_number: increaseNumericString(
            next_accounting_voucher_number
          ),
        }
      );
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "AccountVoucher Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/postAccountVouchers", async (req, res) => {
  try {
    let value = req.body;
    let success = 0;
    let failed = 0;
    let count = 0;
    for (let item of value) {
      count++;
      console.log(count);

      for (let detail of item.invoice_number) {
        if (detail && item.mode_uuid && item.mark_entry) {
          let response = await Receipts.findOne({
            invoice_number: detail,
          });

          // console.log({ response });
          response = JSON.parse(JSON.stringify(response));
          response = response.modes.map((a) => ({ ...a, status: 1 }));
          let pending = response.find((b) => !b.status && +b.amt) ? 0 : 1;
          await OrderCompleted.updateMany(
            {
              invoice_number: detail,
            },
            { entry: 1 }
          );

          await Receipts.updateMany(
            {
              invoice_number: detail,
            },
            { modes: response, pending }
          );
        }
        let voucherData = await AccountingVoucher.findOne({
          invoice_number: detail,
          type: "RECEIPT_ORDER",
          voucher_date: 0,
        });
        if (voucherData && item.matched_entry) {
          await AccountingVoucher.updateMany(
            { invoice_number: detail, type: "RECEIPT_ORDER", voucher_date: 0 },
            { voucher_date: item.voucher_date }
          );
          success++;
        } else {
          let next_accounting_voucher_number = await Details.find({});

          next_accounting_voucher_number =
            next_accounting_voucher_number[0].next_accounting_voucher_number;

          item = {
            ...item,
            accounting_voucher_uuid: item.accounting_voucher_uuid || uuid(),
            accounting_voucher_number: next_accounting_voucher_number,
            details: item.details.map((a) => ({
              ...a,
              amount: truncateDecimals(a.amount || 0, 2),
            })),
          };
          if (item.voucher_date && voucherData) {
            let response = await AccountingVoucher.updateMany(
              {
                invoice_number: { $in: item.invoice_number },
                voucher_date: 0,
              },
              { voucher_date: item.voucher_date }
            );
            if (response.acknowledged) {
              success++;
            } else failed++;
          } else {
            let response = await AccountingVoucher.create(item);
            await updateCounterClosingBalance(item.details, "add");
            if (response) {
              await Details.updateMany(
                {},
                {
                  next_accounting_voucher_number: increaseNumericString(
                    next_accounting_voucher_number
                  ),
                }
              );
              success++;
            } else failed++;
          }
        }
      }
      if (!item.invoice_number.length) {
        let next_accounting_voucher_number = await Details.find({});

        next_accounting_voucher_number =
          next_accounting_voucher_number[0].next_accounting_voucher_number;

        item = {
          ...item,
          accounting_voucher_uuid: item.accounting_voucher_uuid || uuid(),
          accounting_voucher_number: next_accounting_voucher_number,
          details: item.details.map((a) => ({
            ...a,
            amount: truncateDecimals(a.amount || 0, 2),
          })),
        };

        console.log({ amount: item.details });
        let response = await AccountingVoucher.create(item);
        await updateCounterClosingBalance(item.details, "add");

        if (response) {
          await Details.updateMany(
            {},
            {
              next_accounting_voucher_number: increaseNumericString(
                next_accounting_voucher_number
              ),
            }
          );
          success++;
        } else failed++;
      }
    }
    res.json({ success: true, result: { success, failed } });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
//delete accounting voucher by accounting_voucher_uuid
router.delete("/deleteAccountVoucher", async (req, res) => {
  try {
    let { accounting_voucher_uuid, order_uuid } = req.body;
    let voucherData = await AccountingVoucher.findOne(
      {
        accounting_voucher_uuid,
      },
      { details: 1 }
    );
    await updateCounterClosingBalance(voucherData.details, "delete");

    let response = await AccountingVoucher.deleteMany({
      accounting_voucher_uuid,
    });
    if (order_uuid) {
      await PurchaseInvoice.deleteOne({
        purchase_order_uuid: order_uuid,
      });
      await CreditNotes.deleteOne({
        credit_note_order_uuid: order_uuid,
      });
    }
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "AccountVoucher Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
//get accounting voucher by accounting_voucher_uuid
router.get("/getAccountVoucher/:accounting_voucher_uuid", async (req, res) => {
  try {
    let { accounting_voucher_uuid } = req.params;
    console.log({ accounting_voucher_uuid });
    let data = await AccountingVoucher.findOne({
      $or: [
        { accounting_voucher_uuid },
        { order_uuid: accounting_voucher_uuid },
      ],
    });
    if (data) res.json({ success: true, result: data });
    else res.json({ success: false, message: "AccountVoucher Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
//put accounting voucher by accounting_voucher_uuid
router.put("/putAccountVoucher", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {
      ...value,
      details: value.details.map((a) => ({
        ...a,
        amount: truncateDecimals(a.amount || 0, 2),
      })),
    };
    await updateCounterClosingBalance(
      value.details,
      "update",
      value.accounting_voucher_uuid
    );
    let response = await AccountingVoucher.updateOne(
      { accounting_voucher_uuid: value.accounting_voucher_uuid },
      value
    );
    if (response) res.json({ success: true, result: response });
    else res.json({ success: false, message: "AccountVoucher Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/postVoucher", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let time = new Date();
    let vocher_number = await Details.findOne({});

    value = {
      ...value,
      voucher_uuid: uuid(),
      created_at: time.getTime(),
      delivered: 0,
      vocher_number: vocher_number.next_vocher_number || 0,
    };

    console.log(value);

    let response = await Vochers.create(value);
    if (response) {
      await Details.updateMany(
        {},
        {
          next_vocher_number: increaseNumericString(
            vocher_number.next_vocher_number
          ),
        }
      );
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Item Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetPendingVoucharsList", async (req, res) => {
  try {
    let data = await Vochers.find({ delivered: 0 });
    data = JSON.parse(JSON.stringify(data));
    let result = [];
    for (let item of data) {
      let item_details = item.item_details;
      let item_uuids = item_details.map((a) => a.item_uuid);
      let itemData = await Item.find(
        { item_uuid: { $in: item_uuids } },
        { item_uuid: 1, item_title: 1, item_price: 1, conversion: 1 }
      );
      itemData = JSON.parse(JSON.stringify(itemData));
      item_details = item_details.map((a) => {
        let item = itemData.find((b) => b.item_uuid === a.item_uuid);
        let estValue =
          (+a.b || 0) * +item.item_price * +item.conversion +
          (+a.p || 0) * +item.item_price;
        return {
          ...a,
          item_title: item.item_title,
          item_price: item.item_price,
          conversion: item.conversion,
          vocher_number: a.vocher_number || 0,
          estValue,
        };
      });
      result = [...result, { ...item, item_details }];
    }
    if (result.length)
      res.json({
        success: true,
        result,
      });
    else res.json({ success: false, message: "Item Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.post("/deliveredVouchers", async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const query = { delivered: 1, created_at: {} };

    if (fromDate) query.created_at["$gte"] = fromDate;
    if (toDate) query.created_at["$lte"] = toDate;

    console.log(fromDate, toDate);
    console.log(query);

    let data = await Vochers.find(query);
    data = JSON.parse(JSON.stringify(data));
    let item_uuids = data.map((a) => a.item_details);
    item_uuids = item_uuids.flat().map((a) => a.item_uuid);
    const itemData = await Item.find({ item_uuid: { $in: item_uuids } });
    if (data.length)
      res.json({
        success: true,
        result: data.map((a) => ({
          ...a,
          item_details: a.item_details.map((b) => {
            let item = itemData.find((c) => c.item_uuid === b.item_uuid);
            return {
              ...b,
              estValue:
                +b.b * +item.item_price * +item.conversion +
                +b.p * +item.item_price,
            };
          }),
          vocher_number: a.vocher_number || 0,
        })),
      });
    else res.json({ success: false, message: "Item Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.put("/ConfirmVoucher", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let voucherData = await Vochers.findOne({
      voucher_uuid: value.voucher_uuid,
    });
    voucherData = JSON.parse(JSON.stringify(voucherData));

    for (let item of voucherData.item_details) {
      let itemData = await Item.findOne({ item_uuid: item.item_uuid });
      itemData = JSON.parse(JSON.stringify(itemData));

      if (itemData) {
        let stock = itemData?.stock || [];
        let qty = +(+item.b * +itemData.conversion) + (+item.p || 0);

        stock =
          +voucherData.from_warehouse === 0
            ? stock
            : stock?.filter(
                (a) => a.warehouse_uuid === voucherData.from_warehouse
              )?.length
            ? stock?.map((a) =>
                a.warehouse_uuid === voucherData.from_warehouse
                  ? { ...a, qty: +a.qty - qty }
                  : a
              )
            : stock?.length
            ? [
                ...stock,
                {
                  warehouse_uuid: voucherData.from_warehouse,
                  min_level: 0,
                  qty: -qty,
                },
              ]
            : [
                {
                  warehouse_uuid: voucherData.from_warehouse,
                  min_level: 0,
                  qty: -qty,
                },
              ];
        stock = stock?.filter(
          (a) => a.warehouse_uuid === voucherData.to_warehouse
        )?.length
          ? stock.map((a) =>
              a.warehouse_uuid === voucherData.to_warehouse
                ? { ...a, qty: +a.qty + qty }
                : a
            )
          : stock?.length
          ? [
              ...stock,
              {
                warehouse_uuid: voucherData.to_warehouse,
                min_level: 0,
                qty: +qty,
              },
            ]
          : [
              {
                warehouse_uuid: voucherData.to_warehouse,
                min_level: 0,
                qty: +qty,
              },
            ];
        if (stock.length)
          await Item.updateOne({ item_uuid: item.item_uuid }, { stock });
      }
    }

    let response = await Vochers.updateMany(
      { voucher_uuid: value.voucher_uuid },
      { delivered: 1 }
    );
    if (response) res.json({ success: true, result: response });
    else res.json({ success: false, message: "Item Not created" });
  } catch (err) {
    console.log(err.message);
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.delete("/DeleteVoucher", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let response = await Vochers.deleteMany({
      voucher_uuid: value.voucher_uuid,
    });
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Item Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/PutVoucher", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let response = await Vochers.updateMany(
      { voucher_uuid: value.voucher_uuid },
      value
    );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Item Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.post("/GetStockReportSummary", async (req, res) => {
  try {
    const { startDate, endDate, warehouse_uuid, type, visibility } = req.body;

    let voucherData = await Vochers.find({
      type: "SA",
      $or: [
        { from_warehouse: warehouse_uuid },
        { to_warehouse: warehouse_uuid },
      ],
      created_at: { $gte: startDate, $lte: endDate },
    });
    voucherData = JSON.parse(JSON.stringify(voucherData));
    if (type === "+") {
      voucherData = voucherData.filter(
        (a) => a.to_warehouse === warehouse_uuid
      );
    } else if (type === "-") {
      voucherData = voucherData.filter(
        (a) => a.from_warehouse === warehouse_uuid
      );
    }

    let data = voucherData.map((a) => a.item_details);
    data = data.flat().filter((a) => a.item_uuid && +visibility === +a.visible);
    let result = [];
    for (let item of data) {
      const itemData = await Item.findOne(
        { item_uuid: item.item_uuid },
        { conversion: 1, item_title: 1, item_price: 1 }
      );
      if (itemData) {
        let obj = {
          item_uuid: itemData.item_uuid,
          item_title: itemData.item_title,
          qty: +item.b * +itemData.conversion + +item.p,
          estValue: (
            (+item.b * +itemData.conversion + +item.p) *
            +itemData.item_price
          ).toFixed(2),
        };
        if (result.filter((a) => a.item_uuid === item.item_uuid).length) {
          result = result.map((a) =>
            a.item_uuid === item.item_uuid
              ? {
                  ...a,
                  qty: +a.qty + +obj.qty,
                  estValue: +a.estValue + +obj.estValue,
                }
              : a
          );
        } else {
          result = [...result, obj];
        }
      }
    }

    if (result.length)
      res.json({
        success: true,
        result,
      });
    else res.json({ success: false, message: "Item Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
const getCompleteVoucherReceipts = async () => {
  let response = await Receipts.find({ pending: 0 });
  response = await JSON.parse(JSON.stringify(response));
  let usersData = await Users.find(
    { user_uuid: { $in: response.map((a) => a.user_uuid).filter((a) => a) } },
    { user_uuid: 1, user_title: 1 }
  );
  response = response.filter(
    (a) => a.modes.filter((b) => b.status === 0 && b.amt).length
  );
  if (!response?.length)
    return { success: false, message: "Receipts Not created" };

  let data = [];
  for (let item of response) {
    let voucher_data = await AccountingVoucher.findOne({
      order_uuid: item.order_uuid,
      type: "RECEIPT_ORDER",
      voucher_date: { $ne: "" },
    });
    console.log({ voucher_data });
    if (!voucher_data) continue;
    let item1 = item.modes.find(
      (a) =>
        (a.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002" ||
          a.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002") &&
        a.amt &&
        a.status === 0
    );
    let orderData = await OrderCompleted.findOne({
      order_uuid: item.order_uuid,
    });
    if (!orderData)
      orderData = await Orders.findOne({ order_uuid: item.order_uuid });

    if (orderData) {
      let counterData = await Counters.findOne(
        { counter_uuid: orderData.counter_uuid || item.counter_uuid },
        {
          counter_title: 1,
          counter_uuid: 1,
          payment_reminder_days: 1,
          route_uuid: 1,
        }
      );
      let route_title = await Routes.findOne(
        { route_uuid: counterData.route_uuid },
        { route_title: 1 }
      );

      let obj = {
        mode_title:
          item1.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
            ? "UPI"
            : "Cheque",
        mode_uuid: item1.mode_uuid,
        counter_title:
          (counterData?.counter_title || "") +
          ", " +
          (route_title?.route_title || ""),
        counter_uuid: counterData?.counter_uuid || "",
        invoice_number: orderData?.invoice_number || "",
        order_date: orderData?.status?.find((a) => +a?.stage === 1)?.time,
        payment_date: item?.time,
        order_uuid: item.order_uuid,
        user_title: usersData.find((a) => item.user_uuid === a.user_uuid)
          ?.user_title,
        amt: item1?.amt,
        remarks: item1?.remarks,
        payment_reminder_days: counterData?.payment_reminder_days || 0,
        voucher_date: voucher_data.voucher_date,
        accounting_voucher_number: voucher_data.accounting_voucher_number,
        accounting_voucher_uuid: voucher_data.accounting_voucher_uuid,
        recept_number: voucher_data.recept_number,
      };
      data.push(obj);
    }
  }

  return { success: true, result: data };
};
router.get("/getCompleteVoucherList", async (req, res) => {
  try {
  let data = await getCompleteVoucherReceipts();
  if (data.success) res.json(data);
  else res.json({ success: false, message: "Vouchers Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err })
  }
});

module.exports = router;
