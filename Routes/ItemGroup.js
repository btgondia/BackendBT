const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Item = require("../Models/Item");
const ItemGroup = require("../Models/ItemGroup");

router.post("/postItemGroup", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, item_group_uuid: uuid() };

    
    let response = await ItemGroup.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Group Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putItemGroup", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = Object.keys(value)
      .filter((key) => key !== "_id")
      .reduce((obj, key) => {
        obj[key] = value[key];
        return obj;
      }, {});
    
    let response = await ItemGroup.updateOne(
      { item_group_uuid: value.item_group_uuid },
      value
    );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Group Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.delete("/deleteItemGroup", async (req, res) => {
  try {
    let { item_group_uuid } = req.body;
    if (!item_group_uuid) res.json({ success: false, message: "Invalid Data" });
  
    let itemData = await Item.find({
      item_group_uuid,
    });

    if (itemData.length) {
      for (let item of itemData) {
        await Item.updateMany(
          { item_uuid: item.item_uuid },
          {
            item_group_uuid: item.item_group_uuid.filter(
              (a) => a !== item_group_uuid
            ),
          }
        );
      }
    }
    let response = await ItemGroup.deleteMany({item_group_uuid})
    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else
      res.status(404).json({ success: false, message: "Item Not Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/GetItemGroupList", async (req, res) => {
  try {
    let data = await ItemGroup.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Routes Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
