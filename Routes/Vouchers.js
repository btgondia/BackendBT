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
    for (let item of value) {
      if (
        (item.order_uuid || item.invoice_number) &&
        item.mode_uuid &&
        item.mark_entry
      ) {
        let response = await Receipts.findOne({
          $or: [
            { invoice_number: { $in: item.invoice_number } },
            { order_uuid: item.order_uuid },
          ],
        });
        response = JSON.parse(JSON.stringify(response));
        response = response.modes.map((a) =>
          a.mode_uuid === item.mode_uuid ? { ...a, status: 1 } : a
        );
        let pending = response.find((b) => b.status === 0 && b.amt) ? 0 : 1;
        console.log({ pending, modes: response });
        await Receipts.updateMany(
          {
            $or: [
              { invoice_number: { $in: item.invoice_number } },
              { order_uuid: item.order_uuid },
            ],
          },
          { modes: response, pending }
        );
      }
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

      await updateCounterClosingBalance(item.details, "add");
      let response = await AccountingVoucher.create(item);
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
module.exports = router;
