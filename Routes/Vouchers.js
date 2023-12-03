const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Details = require("../Models/Details");
const Item = require("../Models/Item");

const Vochers = require("../Models/Vochers");

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
        { next_vocher_number: +vocher_number.next_vocher_number + 1 }
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
    if (data.length)
      res.json({
        success: true,
        result: data.map((a) => ({
          ...a,
          vocher_number: a.vocher_number || 0,
        })),
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
    if (data.length)
      res.json({
        success: true,
        result: data.map((a) => ({
          ...a,
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
        { conversion: 1, item_title: 1 }
      );
      if (itemData) {
        let obj = {
          item_uuid: itemData.item_uuid,
          item_title: itemData.item_title,
          qty: +item.b * +itemData.conversion + +item.p,
        };
        if (result.filter((a) => a.item_uuid === item.item_uuid).length) {
          result = result.map((a) =>
            a.item_uuid === item.item_uuid
              ? { ...a, qty: +a.qty + +obj.qty }
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
