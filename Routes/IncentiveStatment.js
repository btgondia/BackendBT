const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const IncentiveStatment = require("../Models/IncentiveStatment");
const Users = require("../Models/Users");

router.post("/postIncentiveStatment", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let time = new Date();
    value = {
      ...value,
      time: time.getTime(),
      type: "payout",
      incentive_uuid: uuid(),
    };

    let response = await IncentiveStatment.create(value);
    let userData = await Users.findOne({ user_uuid: value.user_uuid });
    await Users.updateMany(
      { user_uuid: value.user_uuid },
      {
        incentive_balance:
          (userData?.incentive_balance - +value.amount || 0).toFixed(2),
      }
    );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Item Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
