const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Item = require("../Models/Item");
const Orders = require("../Models/Orders");
const Vochers = require("../Models/Vochers");
const Warehouse = require("../Models/Warehouse");

router.post("/postWarehouse", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, warehouse_uuid: uuid() };

    //console.log(value);
    let response = await Warehouse.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Warehouse Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetWarehouseList", async (req, res) => {
  try {
    let data = await Warehouse.find({});

    if (data.length)
      res.json({ success: true, result: data.filter((a) => a.warehouse_uuid) });
    else res.json({ success: false, message: "Warehouse Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/GetSuggestionItemsList/:warehouse_uuid", async (req, res) => {
  try {
    let ordersData = await Orders.find({
      warehouse_uuid: req.params.warehouse_uuid,
    });
    ordersData = JSON.parse(JSON.stringify(ordersData));
    let vouchersData = await Vochers.find({
      to_warehouse: req.params.warehouse_uuid,
      delivered: 0,
    });
    vouchersData = JSON.parse(JSON.stringify(vouchersData));
    let vocherItems = [].concat.apply(
      [],
      vouchersData?.map((a) => a.item_details)
    );

    let items = [].concat.apply(
      [],
      ordersData?.map((a) => a.item_details)
    );
    let itemsData = await Item.find({});
    itemsData = JSON.parse(JSON.stringify(itemsData));
    let allItemsData = [...(items || []), ...(itemsData || [])];
    let result = [];
    //console.log("allItems", allItemsData.length);
    for (let item of allItemsData) {
      let itemData = itemsData.find((a) => a.item_uuid === item.item_uuid);
      var existing = result.filter(function (v, i) {
        return v.item_uuid === item.item_uuid;
      });

      if (existing.length === 0) {
        let itemsFilteredData = allItemsData.filter(
          (a) => a.item_uuid === item.item_uuid
        );
        let b =
          itemsFilteredData.length > 1
            ? itemsFilteredData?.map((c) => +c.b || 0).reduce((c, d) => c + d)
            : +itemsFilteredData[0]?.b || 0;
        let p =
          itemsFilteredData.length > 1
            ? itemsFilteredData?.map((c) => +c.p || 0).reduce((c, d) => c + d)
            : +itemsFilteredData[0]?.p || 0;

        let obj = {
          ...item,
          stock: itemData.stock,
          item_title: itemData.item_title,
          category_uuid: itemData.category_uuid,
          status: itemData.status,
          mrp: itemData.mrp,
          conversion: itemData.conversion,
          b: parseInt(+b + +p / +itemData?.conversion),
          p: parseInt(+p % +itemData?.conversion),
        };
        result.push(obj);
      }
    }
    let newVocherItems = [];
  
    for (let item of vocherItems) {
      var existing = newVocherItems.filter(function (v, i) {
        return v.item_uuid === item.item_uuid;
      });

      if (existing.length === 0) {
        let itemsFilteredData = vocherItems.filter(
          (a) => a.item_uuid === item.item_uuid
        );
        let b =
          itemsFilteredData.length > 1
            ? itemsFilteredData?.map((c) => +c.b || 0).reduce((c, d) => c + d)
            : +itemsFilteredData[0]?.b || 0;

        let obj = {
          ...item,

          b: b,
        };

        newVocherItems.push(obj);
      }
    }

    let data = [];
    for (let item of result.filter(a=>a.status)) {
      let warehouseData = item?.stock?.find(
        (a) => a.warehouse_uuid === req.params.warehouse_uuid
      );
      if (warehouseData) {
        let qty = (+item.b || 0) * +item.conversion + +item.p;
        if (+warehouseData.qty - +qty < +warehouseData.min_level) {
          let b =
            (+warehouseData.min_level - +warehouseData.qty + (+item.p || 0)) /
              +item.conversion +
            +item.b;

          b = Math.floor(
            +warehouseData.min_level % +item.conversion ||
              +warehouseData.min_level === 0 ||
              +item.p % +item.conversion
              ? b + 1
              : b
          );
          let vocherItem = newVocherItems?.find(
            (a) => a.item_uuid === item.item_uuid
          );

          if (vocherItem) {
            b = b - vocherItem?.b >= 0 ? b - vocherItem?.b : 0;
          }

          data.push({ ...item, b: Math.floor(b), p: 0, uuid: item.item_uuid });
        }
      }
    }
    if (data.length)
      res.json({
        success: true,
        result: data.filter((a) => a.item_uuid && a.b),
      });
    else res.json({ success: false, message: "Warehouse Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.put("/putWarehouse", async (req, res) => {
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
      //console.log(value);
      let response = await Warehouse.updateOne(
        { warehouse_uuid: value.warehouse_uuid },
        value
      );
      if (response.acknowledged) {
        result.push({ success: true, result: value });
      } else result.push({ success: false, message: "Warehouse Not created" });
    }
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
