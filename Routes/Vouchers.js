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

router.get("/GetPendingVoucharsList/:delivered", async (req, res) => {
  try {
    let data = await Vochers.find({ delivered: req.params.delivered });
    data= JSON.parse(JSON.stringify(data))
    console.log(data);
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

    console.log(voucherData);
    for (let item of voucherData.item_details) {
      let itemData = await Item.findOne({
        item_uuid: item.item_uuid,
      });
      itemData = JSON.parse(JSON.stringify(itemData));
      if (itemData) {
        let stock = itemData?.stock || [];
        console.log("Stock", stock, item.item_uuid);
        let qty = +item.b * +itemData.conversion + item.p;
        stock =
          +voucherData.from_warehouse === 0
            ? stock
            : stock?.filter(
                (a) => a.warehouse_uuid === voucherData.from_warehouse
              )?.length
            ? stock?.map((a) =>
                a.warehouse_uuid === voucherData.from_warehouse
                  ? { ...a, qty: a.qty - qty }
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
        console.log("Stock", stock);
        stock = stock?.filter(
          (a) => a.warehouse_uuid === voucherData.to_warehouse
        )?.length
          ? stock.map((a) =>
              a.warehouse_uuid === voucherData.to_warehouse
                ? { ...a, qty: a.qty + qty }
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
        console.log("Stock", stock);
        if (stock.length)
          await Item.updateOne(
            {
              item_uuid: item.item_uuid,
            },
            { stock }
          );
      }
    }
    let response = await Vochers.updateMany(
      { voucher_uuid: value.voucher_uuid },
      { delivered: 1 }
    );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Item Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
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

module.exports = router;
