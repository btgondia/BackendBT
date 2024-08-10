const router = require("express").Router();
const GSTReturns = require("../Models/GSTReturns");

router.post("/postGSTReturns", async (req, res) => {
  const value = req.body;
  const newGSTReturns = new GSTReturns(value);
  try {
    const savedGSTReturns = await newGSTReturns.save();
    res.json({success: true,result: savedGSTReturns});
  } catch (err) {
    res.json({success: false,message: err});
  }
});

module.exports = router;
