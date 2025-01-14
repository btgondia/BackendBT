const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const ItemCategories = require("../Models/ItemCategories");

router.post("/postItemCategories", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, category_uuid: uuid() };
    if (!value.sort_order) {
      let response = await ItemCategories.find({});
      response = JSON.parse(JSON.stringify(response));
      value.sort_order =
        Math.max(...response.map((o) => o?.sort_order || 0)) + 1 || 0;
    }
    
    let response = await ItemCategories.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Item Categories Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putItemCategories", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = Object.keys(value)
      .filter((key) => key !== "_id")
      .reduce((obj, key) => {
        obj[key] = value[key];
        return obj;
      }, {});
    
    let response = await ItemCategories.updateOne(
      { category_uuid: value.category_uuid },
      value
    );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Item Categories Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetItemCategoryList", async (req, res) => {
  const { company_uuid } = req.query;
  try {
    let data = await ItemCategories.find({
      ...(company_uuid ? { company_uuid } : {}),
    });

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Item Categories Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putItemCategories/sortOrder", async (req, res) => {
  try {
    const itemCategories = await req.body;
    if (!itemCategories?.[0])
      return res.status(204).json({ message: "Empty Payload" });
    const result = { succeed: [], failed: [] };



    for (let item of itemCategories) {
      try {
        const res = await ItemCategories.updateOne(
          { category_uuid: item.category_uuid },
          item
        );
        if (res) result.succeed.push(item.category_uuid);
        else result.failed.push({ failed: item.category_uuid });

      
      } catch (error) {
        result.failed.push({
          failed: item.category_uuid,
          error: error.message,
        });

      }
    }
    res.json({ result, success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
