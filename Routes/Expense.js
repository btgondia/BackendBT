const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Expense = require("../Models/Expenses");

router.post("/PostExpense", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {
      ...value,
      expense_uuid: uuid(),
    };

    let data = await Expense.create(value);

    if (data) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Error" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetAllExpenses", async (req, res) => {
  try {
    let data = await Expense.find({});
    data = data.filter((a) => a.expense_uuid && a.expense_title);
    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Expenses Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetExpense/:expense_uuid", async (req, res) => {
  try {
    let { expense_uuid } = req.params;
    let data = await Expense.findOne({ expense_uuid });

    if (data) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Expense Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.put("/UpdateExpense", async (req, res) => {
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
      let response = await Expense.updateOne(
        { expense_uuid: value.expense_uuid },
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

router.delete("/DeleteExpense/:expense_uuid", async (req, res) => {
  try {
    let { expense_uuid } = req.params;
    let data = await Expense.findOneAndDelete({ expense_uuid });

    if (data) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Expense Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
