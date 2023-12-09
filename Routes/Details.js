const express = require("express")
const router = express.Router()
const Details = require("../Models/Details")

router.get("/GetDetails", async (req, res) => {
	try {
		let data = await Details.find({})
		if (data.length) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Details Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/getMessageTemplate", async (req, res) => {
	try {
		let data = await Details.findOne({})
		if (data?.order_cancel_message_template?.length) res.json({ success: true, result: data.order_cancel_message_template })
		else res.json({ success: false, message: "Details Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

router.post("/postOrderCancelMessageTemplate", async (req, res) => {
	try {
		let  message  = req.body
		console.log(message)
		let data = await Details.updateOne({}, { $push: { order_cancel_message_template: message } })
		if (data?.acknowledged) {
			let details = await Details.findOne({})
			res.json({ success: true, result: details.order_cancel_message_template })
		}
		else res.json({ success: false, message: "Details Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
}
)
router.delete("/deleteOrderCancelMessageTemplate", async (req, res) => {
	try {

		let {_id}=req.body
		let data = await Details.updateOne({}, { $pull: { order_cancel_message_template: { _id } } })
		if (data?.acknowledged) {
			let details = await Details.findOne({})
			res.json({ success: true, result: details.order_cancel_message_template })
		}
		else res.json({ success: false, message: "Details Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
}
)

module.exports = router
