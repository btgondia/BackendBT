const express = require("express")

const router = express.Router()
const CounterCharges = require("../Models/CounterCharges")
const fetchAggregation = filter =>
	(filter ? [{ $match: filter }] : []).concat([
		{
			$lookup: {
				from: "counters",
				localField: "counter_uuid",
				foreignField: "counter_uuid",
				as: "counter_obj"
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "user_uuid",
				foreignField: "user_uuid",
				as: "user_obj"
			}
		},
		{
			$unwind: {
				path: "$counter_obj",
				preserveNullAndEmptyArrays: false
			}
		},
		{
			$unwind: {
				path: "$user_obj",
				preserveNullAndEmptyArrays: false
			}
		},
		{
			$addFields: {
				counter: "$counter_obj.counter_title",
				user: "$user_obj.user_title"
			}
		},
		{
			$project: {
				user_obj: 0,
				counter_obj: 0
			}
		}
	])

router.get("/:status", async (req, res) => {
	try {
		const { status: _status } = req.params
		let status = null
		if (_status === "running") status = { $ne: 1 }
		else if (_status === "completed") status = 1
		else throw new Error("Requested status invalid", { status: 400 })
		const query = fetchAggregation({ status })
		let data = await CounterCharges.aggregate(query)
		return res.json({ success: true, result: data })
	} catch (err) {
		res.status(500).json({ message: err.message })
	}
})

router.post("/list", async (req, res) => {
	try {
		const { counter_uuid, charges_uuid, invoice_number } = req.body
		const query = {}
		if (counter_uuid) {
			query.counter_uuid = counter_uuid
			query.status = 0
		}
		if (charges_uuid) query.charge_uuid = { $in: charges_uuid }
		if (invoice_number) query.invoice_number = invoice_number

		let data = await CounterCharges.find(query, { charge_uuid: 1, amt: 1, narration: 1 })
		return res.json({ success: true, result: data })
	} catch (err) {
		res.status(500).json({ message: err.message })
	}
})

router.post("/", async (req, res) => {
	try {
		let value = req.body
		if (!value) return res.status(401).json({ success: false, message: "Invalid Data" })
		let response = await CounterCharges.create(value)
		if (response) {
			const doc = await CounterCharges.aggregate(fetchAggregation({ charge_uuid: value?.charge_uuid }))
			res.json({ success: true, result: doc?.[0] })
		} else res.json({ success: false, message: "Not created" })
	} catch (err) {
		res.status(500).json({ message: err.message })
	}
})

router.put("/", async (req, res) => {
	try {
		let value = req.body
		if (!value) return res.status(401).json({ success: false, message: "Invalid Data" })
		delete value?._id
		let response = await CounterCharges.updateOne({ charge_uuid: value.charge_uuid }, value)
		if (response.acknowledged) {
			const doc = await CounterCharges.aggregate(fetchAggregation({ charge_uuid: value?.charge_uuid }))
			res.json({ success: true, result: doc?.[0] })
		} else res.json({ success: false, message: "Not updated" })
	} catch (err) {
		res.status(500).json({ message: err.message })
	}
})

router.delete("/:charge_uuid", async (req, res) => {
	try {
		let { charge_uuid } = req.params
		let response = await CounterCharges.deleteOne({ charge_uuid })
		if (response) res.json({ success: true, result: response })
		else res.json({ success: false, message: "Not Deleted" })
	} catch (err) {
		res.status(500).json({ message: err.message })
	}
})

module.exports = router
