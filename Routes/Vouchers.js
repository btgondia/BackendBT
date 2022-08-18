const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Item = require("../Models/Item");

const Vochers = require("../Models/Vochers");

router.post("/postVoucher", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let time = new Date();
    value = { ...value, voucher_uuid: uuid(), created_at: time.getTime(),delivered:0 };

    console.log(value);
    // for (let item of value.item_details) {
    //   let itemData = await Item.findOne({
    //     item_uuid: item.item_uuid,
    //   });
    //   itemData = JSON.parse(JSON.stringify(itemData));
    //   let stock = itemData.stock;
    //   console.log("Stock", stock);
    //   let qty = +item.b * +itemData.conversion + item.p;
    //   stock = stock?.filter((a) => a.warehouse_uuid === value.from_warehouse)
    //     ?.length
    //     ? stock.map((a) =>
    //         a.warehouse_uuid === value.from_warehouse
    //           ? { ...a, qty: a.qty - qty }
    //           : a
    //       )
    //     : stock?.length
    //     ? +value.from_warehouse === 0
    //       ? stock || []
    //       : [
    //           ...stock,
    //           {
    //             warehouse_uuid: value.from_warehouse,
    //             min_level: 0,
    //             qty: -qty,
    //           },
    //         ]
    //     : [
    //         {
    //           warehouse_uuid: value.from_warehouse,
    //           min_level: 0,
    //           qty: -qty,
    //         },
    //       ];
    //   console.log("Stock", stock);
    //   stock = stock?.filter((a) => a.warehouse_uuid === value.to_warehouse)
    //     ?.length
    //     ? stock.map((a) =>
    //         a.warehouse_uuid === value.to_warehouse
    //           ? { ...a, qty: a.qty + qty }
    //           : a
    //       )
    //     : stock?.length
    //     ? +value.from_warehouse === 0
    //       ? stock || []
    //       : [
    //           ...stock,
    //           {
    //             warehouse_uuid: value.to_warehouse,
    //             min_level: 0,
    //             qty: +qty,
    //           },
    //         ]
    //     : [
    //         {
    //           warehouse_uuid: value.to_warehouse,
    //           min_level: 0,
    //           qty: +qty,
    //         },
    //       ];
    //   console.log("Stock", stock);
    //   await Item.updateOne(
    //     {
    //       item_uuid: item.item_uuid,
    //     },
    //     { stock }
    //   );
    // }
    let response = await Vochers.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Item Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetItemList", async (req, res) => {
  try {
    let data = await Item.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Item Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.put("/putItem", async (req, res) => {
  try {
    let result = [];
    for (let value of req.body) {
      if (!value) res.json({ success: false, message: "Invalid Data" });
      value = Object.keys(value)
        .filter((key) => key !== "_id")
        .reduce((obj, key) => {
          obj[key] = value[key];
          return obj;
        }, {});
      console.log(value);
      let response = await Item.updateOne(
        { item_uuid: value.item_uuid },
        value
      );
      if (response.acknowledged) {
        result.push({ success: true, result: value });
      } else result.push({ success: false, message: "Item Not created" });
    }
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
