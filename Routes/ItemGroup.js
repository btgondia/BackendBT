const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const ItemGroup = require("../Models/ItemGroup");


router.post("/postItemGroup", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {...value,item_group_uuid:uuid()};

    console.log(value);
    let response = await ItemGroup.create( value );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Group Not created" });
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
