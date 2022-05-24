const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const AutoBill = require("../Models/AutoBill");
const Companies = require("../Models/Companies");
const CounterGroup = require("../Models/CounterGroup");
const Counters = require("../Models/Counters");
const Item = require("../Models/Item");
const ItemCategories = require("../Models/ItemCategories");
const Routes = require("../Models/Routes");
const User = require("../Models/Users");

router.post("/postUser", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, user_uuid: uuid() };

    console.log(value);
    let response = await User.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "User Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putUser", async (req, res) => {
  try {
    let value = req.body;
    console.log(value);
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = Object.keys(value)
      .filter((key) => key !== "_id")
      .reduce((obj, key) => {
        obj[key] = value[key];
        return obj;
      }, {});

    let response = await User.updateOne({ user_uuid: value.user_uuid }, value);
    console.log(response);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "User Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetUserList", async (req, res) => {
  try {
    let data = await User.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Users Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.post("/login", async (req, res) => {
  console.log(req.body);
  const login_username = req.body.login_username;
  const login_password = req.body.login_password;
  try {
    const result = await User.findOne({ login_username, login_password });
    console.log(result, login_password, login_username);
    if (result && +result.status===1) res.json({ success: true, result });
    else res.json({ success: false, message: "Users Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getDetails", async (req, res) => {
  try {
    const autobill = await AutoBill.find({});
    const companies = await Companies.find({});
    const counter_groups = await CounterGroup.find({});
    const counter = await Counters.find({});
    const item_category = await ItemCategories.find({});
    const items = await Item.find({});
    const routes = await Routes.find({});
    // const payment_modes= await Item.find({  })


      res.json({
        success: true,
        result: {
          autobill,
          companies,
          counter_groups,
          counter,
          item_category,
          items,
          routes,
        },
      });
  
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
