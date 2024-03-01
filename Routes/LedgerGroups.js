const express = require("express");
const router = express.Router();
const LedgerGroup = require("../Models/LedgerGroup");
const { v4: uuid } = require("uuid");

router.post("/postLedgerGroup", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, ledger_group_uuid: value.ledger_group_uuid || uuid() };

    let response = await LedgerGroup.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "LedgerGroup Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/getLedgerGroup", async (req, res) => {
  try {
    let response = await LedgerGroup.find();
    response = response.filter((item) => item.ledger_group_uuid);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "LedgerGroup Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

//put ledger
router.put("/putLedgerGroup", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let response = await LedgerGroup.findOneAndUpdate(
      { ledger_group_uuid: value.ledger_group_uuid },
      value,
      { new: true }
    );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "LedgerGroup Not Updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

//delete ledger
router.delete("/deleteLedgerGroup", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let response = await LedgerGroup.findOneAndDelete({
      ledger_group_uuid: value.ledger_group_uuid,
    });
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "LedgerGroup Not Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
