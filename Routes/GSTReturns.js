const router = require("express").Router();
const GSTReturns = require("../Models/GSTReturns");

router.post("/postGSTReturns", async (req, res) => {
  const value = req.body;
console.log(value.json_data);
  try {
    const savedGSTReturns = await GSTReturns.create(value);
    res.json({success: true,result: savedGSTReturns});
  } catch (err) {
    res.json({success: false,message: err});
  }
});

//get all reports
router.get("/getGSTReturns", async (req, res) => {
  try {
    //get with user_title
    const gstReturns = await GSTReturns.aggregate([
      //check json_data is not null
      {
        $match: {
          json_data: {
            $ne: null,
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "created_by",
          foreignField: "user_uuid",
          as: "user_title",
        },
      },
      {
        $unwind: "$user_title",
      },
      {
        $project: {
          return_uuid: 1,
          created_at: 1,
          created_by: 1,
          type: 1,
          title: 1,
          status: 1,
          accounting_voucher_uuid: 1,
          json_data: 1,
          from_date: 1,
          to_date: 1,
          user_title: "$user_title.user_title",
        },
      },
    ]);
    res.json({success: true,result: gstReturns});
  } catch (err) {
    res.json({success: false,message: err});
  }
});

module.exports = router;
