const router = require("express").Router();
const HSNCode = require("../Models/hsn_code");
const Item = require("../Models/Item");

router.post("/postHSNCode", async (req, res) => {
  const value = req.body;

  try {
    const savedHSNCode = await HSNCode.create(value);
    res.json({ success: true, result: savedHSNCode });
  } catch (err) {
    res.json({ success: false, message: err });
  }
});

//put request
router.put("/putHSNCode", async (req, res) => {
  const value = req.body;
  try {
    //remove _id
    delete value._id;
    delete value.created_at;
    delete value.__v;
    console.log(value);
    const updatedHSNCode = await HSNCode.updateMany(
      { hsn_code_uuid: value.hsn_code_uuid },
      value
    );
    let itemsWithHSNCode = await Item.find({
      hsn_code_uuid: value.hsn_code_uuid,
    });
    if (itemsWithHSNCode.length > 0) {
      await Item.updateMany(
        { hsn_code_uuid: value.hsn_code_uuid },
        { hsn_code: value.hsn_code }
      );
    }

    if (updatedHSNCode.acknowledged) {
      res.json({ success: true, result: updatedHSNCode });
    } else res.json({ success: false, message: "HSN Code not found" });
  } catch (err) {
    res.json({ success: false, message: err });
  }
});

//get all reports
router.get("/getHSNCode", async (req, res) => {
  try {
    const hsnCode = await HSNCode.find(
      { hsn_code_uuid: { $ne: null } },
      { hsn_code_uuid: 1, hsn_code: 1, title: 1, gst_percentage: 1 }
    );
    res.json({ success: true, result: hsnCode });
  } catch (err) {
    res.json({ success: false, message: err });
  }
});

//delete request
router.delete("/deleteHSNCode", async (req, res) => {
  const value = req.body;
  try {
    const deletedHSNCode = await HSNCode.deleteOne({
      hsn_code_uuid: value.hsn_code_uuid,
    });
    res.json({ success: true, result: deletedHSNCode });
  } catch (err) {
    res.json({ success: false, message: err });
  }
});

module.exports = router;
