const express = require("express")

const router = express.Router()
const { v4: uuid } = require("uuid")

const CashRegister = require("../Models/cash_register")
const cash_register_transections = require("../Models/cash_register_transections")

router.get("/GetAllActiveCashRegistrations/:user_id", async (req, res) => {
	try {
		let { user_id } = req.params
		let data = await CashRegister.find({ status: 1 ,created_by:user_id})

		if (data.length) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Cash Registrations Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.post("/PostCashRegister", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		value = {
			...value,
			register_uuid: uuid(),
			created_at: new Date().getTime(),
			status: 1
		}

		let verification = await CashRegister.find({
			created_by: value.created_by,
			status: 1
		})
		if (verification.length) {
			res.json({ success: false, message: "Please Settle Open Register" })
			return
		}
		let data = await CashRegister.create(value)

		if (data) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Cash Registrations Not created" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.put("/PutCashRegister", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })

		let data = await CashRegister.updateMany({ register_uuid: value.register_uuid }, value)

		if (data.acknowledged) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Cash Registrations Not created" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.put("/PutExpenseCashRegister", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })

		let RegisterData = await CashRegister.findOne({
			register_uuid: value.register_uuid
		})
		if (!RegisterData) res.json({ success: false, message: "Invalid Data" })

		let data = await CashRegister.updateMany(
			{
				register_uuid: value.register_uuid
			},
			{ $inc: { balance: -+value.amt } }
		)
		await cash_register_transections.create({
			title: value.title,
			amount: value.amt,
			created_at: new Date().getTime(),
			type: "out",
			register_uuid: value.register_uuid,
			transaction_uuid: uuid()
		})

		if (data.acknowledged) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Cash Registrations Not created" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

router.get("/statement/:register_uuid", async (req, res) => {
	try {
		const { register_uuid } = req.params
		const transactions = await cash_register_transections.aggregate([
			{
				$match: {
					register_uuid: register_uuid
				}
			},
			{
				$lookup: {
					from: "completed_orders",
					localField: "order_uuid",
					foreignField: "order_uuid",
					as: "order"
				}
			},
			{
				$unwind: {
					path: "$order",
					preserveNullAndEmptyArrays: false
				}
			},
			{
				$addFields: {
					invoice_number: "$order.invoice_number"
				}
			},
			{
				$project: {
					created_at: 1,
					invoice_number: 1,
					amount: 1
				}
			},
			{
				$sort: {
					created_at: -1
				}
			}
		])
		res.json({ result: transactions })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

module.exports = router
