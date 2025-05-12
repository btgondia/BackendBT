const express = require("express")

const router = express.Router()
const { v4: uuid } = require("uuid")
const CancelOrders = require("../Models/CancelOrders")

router.post("/postCancelOrder", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })

		let response = await CancelOrders.create(value)
		if (response) {
			res.json({ success: true, result: response })
		} else res.json({ success: false, message: "Order Not created" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

router.get("/GetCancelOrdersList", async (req, res) => {
	try {
		let data = await CancelOrders.find({})

		if (data.length) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Order Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

router.post("/GetCancelOrdersList", async (req, res) => {
	try {
		const { startDate, endDate } = req.body
		let data = await CancelOrders.find({
			status: {
				$elemMatch: {
					stage: "5",
					time: {
						$gte: new Date(startDate).setUTCHours(-5, -30, 0, 0),
						$lt: new Date(endDate).setUTCHours(23 - 5, 60 - 30, 59, 99)
					}
				}
			}
		})

		if (data.length) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Order Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

// router.put("/putItem", async (req, res) => {
//   try {
//     let result=[]
//     for (let value of req.body){
//       if (!value) res.json({ success: false, message: "Invalid Data" });
//       value= Object.keys(value)
//       .filter((key) => key !== "_id")
//       .reduce((obj, key) => {
//         obj[key] = value[key];
//         return obj;
//       }, {})
//
//       let response = await Item.updateOne({item_uuid:value.item_uuid}, value );
//       if (response.acknowledged) {
//         result.push({ success: true, result: value });
//       } else result.push({ success: false, message: "Item Not created" });
//     }
//     res.json({success:true,result})
//   } catch (err) {
//     res.status(500).json({ success: false, message: err });
//   }
// });

module.exports = router
