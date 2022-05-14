const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Routes = require("../Models/Routes");


router.post("/postRoute", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {...value,route_uuid:uuid()};
    if (!value.sort_order) {
      let response = await Routes.find({});
      response = JSON.parse(JSON.stringify(response));
    //   console.log(response)
      value.sort_order =
        Math.max(...response.map((o) => o?.sort_order||0)) + 1 || 0;
    }
    console.log(value);
    let response = await Routes.create( value );
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Routes Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetRouteList", async (req, res) => {
  try {
    let data = await Routes.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Routes Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
