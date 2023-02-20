const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Details = require("../Models/Details");
const Item = require("../Models/Item");
const OrderCompleted = require("../Models/OrderCompleted");
const Orders = require("../Models/Orders");
const fs = require("fs");
router.post("/postItem", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, item_uuid: value.item_uuid || uuid() };
    if (!value.sort_order) {
      let response = await Item.find({});
      response = JSON.parse(JSON.stringify(response));
      //   console.log(response)
      value.sort_order =
        Math.max(...response.map((o) => o?.sort_order || 0)) + 1 || 0;
      value.created_at = new Date().getTime();
    }
    console.log(value);
    let response = await Item.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Item Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.delete("/deleteItem", async (req, res) => {
  try {
    let { item_uuid } = req.body;
    if (!item_uuid) res.json({ success: false, message: "Invalid Data" });
    let response = { acknowledged: false };
    let orderData = await Orders.find({
      "item_details.item_uuid": item_uuid,
    });
    let CompleteOrderData = await OrderCompleted.find({
      "item_details.item_uuid": item_uuid,
    });
    if (!(orderData.length || CompleteOrderData.length)) {
      fs.access("./uploads/" + (item_uuid || "") + ".png", (err) => {
        if (err) {
          console.log(err);
          return;
        }
        fs.unlink("./uploads/" + (item_uuid || "") + ".png",(err)=>{
          if (err) {
            console.log(err);
            return;
          }
        });
      });
      fs.access("./uploads/" + (item_uuid || "") + "thumbnail.png", (err) => {
        if (err) {
          console.log(err);
          return;
        }
        fs.unlink("./uploads/" + (item_uuid || "") + "thumbnail.png",(err)=>{
          if (err) {
            console.log(err);
            return;
          }
        });
      });
      response = await Item.deleteOne({ item_uuid });
    }
    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else
      res.status(404).json({ success: false, message: "Item Not Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetItemList", async (req, res) => {
  try {
    let data = await Item.find({});

    if (data.length)
      res.json({
        success: true,
        result: data.filter((a) => a.item_uuid && a.item_title),
      });
    else res.json({ success: false, message: "Item Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetItemList", async (req, res) => {
  try {
    let { items = [] } = req.body;
    let data = await Item.find(
      items?.length ? { item_uuid: { $in: items } } : {},
      {
        item_title: 1,
        item_discount: 1,
        exclude_discount: 1,
        status: 1,
        sort_order: 1,
        item_code: 1,
        free_issue: 1,
        item_uuid: 1,
        one_pack: 1,
        company_uuid: 1,
        category_uuid: 1,
        pronounce: 1,
        mrp: 1,
        item_price: 1,
        item_gst: 1,
        conversion: 1,
        barcode: 1,
        item_group_uuid: 1,
        // stock: 1,
        created_at: 1,
      }
    );

    if (data.length)
      res.json({
        success: true,
        result: data.filter((a) => a.item_uuid && a.item_title),
      });
    else res.json({ success: false, message: "Item Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/GetItemData", async (req, res) => {
  try {
    let data = await Item.find(
      {},
      {
        item_title: 1,
        img_status: 1,
        item_discount: 1,
        exclude_discount: 1,
        status: 1,
        sort_order: 1,
        item_code: 1,
        free_issue: 1,
        item_uuid: 1,
        one_pack: 1,
        company_uuid: 1,
        category_uuid: 1,
        pronounce: 1,
        mrp: 1,
        item_price: 1,
        item_gst: 1,
        conversion: 1,
        barcode: 1,
        item_group_uuid: 1,
        // stock: 1,
        created_at: 1,
      }
    );

    if (data.length)
      res.json({
        success: true,
        result: data.filter((a) => a.item_uuid && a.item_title),
      });
    else res.json({ success: false, message: "Item Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetItemData", async (req, res) => {
  try {
    let value = req.body;
    let json = {};

    for (let i of value) {
      json = { ...json, [i]: 1 };
    }
    console.log(json);
    let data = await Item.find({}, json);

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Counters Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getNewItemReminder", async (req, res) => {
  try {
    let data = await Details.findOne({});

    if (data)
      res.json({
        success: true,
        result: data?.new_item_reminder,
      });
    else res.json({ success: false, message: "Item Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/minValue/:warhouse_uuid/:item_uuid", async (req, res) => {
  try {
    let Itemdata = await Item.findOne({ item_uuid: req.params.item_uuid });
    let ordersData = await Orders.find({
      "item_details.item_uuid": req.params.item_uuid,
      warehouse_uuid: req.params.warhouse_uuid,
    });
    let allItems = [].concat
      .apply(
        [],
        ordersData.map((b) => b?.item_details || [])
      )
      .filter((a) => a.item_uuid === req.params.item_uuid)
      .map((a) => +a.b * Itemdata.conversion + +a.p);
    allItems =
      allItems.length > 1
        ? allItems.reduce((a, b) => +a + b)
        : allItems.length
        ? allItems[0]
        : 0;
    console.log(allItems);
    if (allItems)
      res.json({
        success: true,
        result: allItems,
      });
    else res.json({ success: false, message: "Item Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/GetItemStockList/:warhouse_uuid", async (req, res) => {
  try {
    console.log(req.params.warhouse_uuid);
    let data = await Item.find({});
    data = JSON.parse(JSON.stringify(data));
    if (req.params.warhouse_uuid)
      data = data.map((a) => ({
        ...a,
        qty:
          a.stock.find((b) => b.warehouse_uuid === req.params.warhouse_uuid)
            ?.qty || 0,
      }));

    if (data.length)
      res.json({
        success: true,
        result: data.filter((a) => a.item_uuid && a.item_title),
      });
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
router.put("/flushWarehouse", async (req, res) => {
  try {
    const value = req.body;
    let result = [];
    let itemsData = await Item.find({});
    itemsData = JSON.parse(JSON.stringify(itemsData));

    for (let item of itemsData) {
      let stock = item.stock;
      if (
        stock.filter((a) => a.qty && value?.find((b) => b === a.warehouse_uuid))
          .length
      ) {
        stock = stock.map((b) =>
          value.find((c) => c === b.warehouse_uuid) ? { ...b, qty: 0 } : b
        );
        let response = await Item.updateOne(
          { item_uuid: item.item_uuid },
          { stock }
        );
        if (response.acknowledged) {
          result.push({ item_uuid: item?.item_uuid, success: true });
        } else {
          result.push({ item_uuid: item?.item_uuid, success: false });
        }
      }
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
