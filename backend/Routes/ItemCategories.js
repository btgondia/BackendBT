const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const ItemCategories = require("../Models/ItemCategories");


router.post("/postItemCategories", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {...value,category_uuid:uuid()};
    if (!value.sort_order) {
      let response = await ItemCategories.find({});
      response = JSON.parse(JSON.stringify(response));
    //   console.log(response)
      value.sort_order =
        Math.max(...response.map((o) => o?.sort_order||0)) + 1 || 0;
    }
    console.log(value);
    let response = await ItemCategories.create( value );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Item Categories Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetItemCategoryList", async (req, res) => {
  try {
    let data = await ItemCategories.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Item Categories Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
