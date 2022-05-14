const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const User = require("../Models/Users");


router.post("/postUser", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {...value,user_uuid:uuid()};
   
    console.log(value);
    let response = await User.create( value );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "User Not created" });
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

module.exports = router;
