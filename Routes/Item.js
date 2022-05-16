const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Item = require("../Models/Item");


router.post("/postItem", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {...value,item_uuid:uuid()};
    if (!value.sort_order) {
      let response = await Item.find({});
      response = JSON.parse(JSON.stringify(response));
    //   console.log(response)
      value.sort_order =
        Math.max(...response.map((o) => o?.sort_order||0)) + 1 || 0;
    }
    console.log(value);
    let response = await Item.create( value );
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
    let result=[]
    for (let value of req.body){
      if (!value) res.json({ success: false, message: "Invalid Data" });
      value= Object.keys(value)
      .filter((key) => key !== "_id")
      .reduce((obj, key) => {
        obj[key] = value[key];
        return obj;
      }, {})
      console.log(value);
      let response = await Item.updateOne({item_uuid:value.item_uuid}, value );
      if (response.acknowledged) {
        result.push({ success: true, result: value });
      } else result.push({ success: false, message: "Item Not created" });
    }
    res.json({success:true,result})
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
